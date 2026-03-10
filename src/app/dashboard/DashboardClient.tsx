"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import GlobalFooter from "@/components/GlobalFooter";
import NotificationBell from "@/components/NotificationBell";
import { supabase } from "@/lib/supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import CurrencyExchangeTicker from "@/components/CurrencyExchangeTicker";

export default function DashboardClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [lang, setLang] = useState<"en" | "zh">("en");
    const [user, setUser] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [monthlyRate, setMonthlyRate] = useState(0.08); // 8% Default
    const [yearlyRate, setYearlyRate] = useState(0.96); // 96% Default
    const [dividendHistory, setDividendHistory] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"overview" | "statements" | "security">("overview");
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [referredCount, setReferredCount] = useState(0);

    // UI States
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Form States
    const [depositAmount, setDepositAmount] = useState("");
    const [depositReceipt, setDepositReceipt] = useState<File | null>(null);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawPIN, setWithdrawPIN] = useState("");

    // KYC Form States
    const [idPhoto, setIdPhoto] = useState<File | null>(null);
    const [occupation, setOccupation] = useState("");
    const [employer, setEmployer] = useState("");
    const [sourceOfWealth, setSourceOfWealth] = useState("Salary");
    const [riskProfile, setRiskProfile] = useState("Balanced");
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [signature, setSignature] = useState("");
    const [kycIsLoading, setKycIsLoading] = useState(false);
    const [kycShowSuccess, setKycShowSuccess] = useState(false);
    const [isReuploading, setIsReuploading] = useState(false);

    useEffect(() => {
        const urlLang = searchParams?.get("lang") || "en";
        setLang(urlLang as "en" | "zh");

        const fetchUserData = async (currentSession: any) => {
            if (!currentSession) {
                router.push(`/login?lang=${urlLang}`);
                return;
            }

            // Fetch the latest profile directly from the database using ID (not relying on cached session metadata)
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentSession.user.id)
                .single();

            if (profile) {
                // Verification relies on profile.is_verified or kyc_status, not Supabase email verification
                const dbIsVerified = profile.is_verified === true || profile.is_verified === 'true' || profile.is_verified === 'Approved' || profile.is_verified === 'Verified';
                const kycApproved = profile.kyc_status === 'Approved' || profile.kyc_completed === true || profile.kyc_completed === 'true' || dbIsVerified;

                setUser({
                    ...currentSession.user,
                    ...profile,
                    is_verified: dbIsVerified,
                    kyc_completed: kycApproved,
                    fullName: profile.full_name || currentSession.user.user_metadata?.full_name,
                    totalEquity: profile.total_equity || (Number(profile.balance) + Number(profile.investment))
                });
            } else {
                setUser({
                    ...currentSession.user,
                    fullName: currentSession.user.user_metadata?.full_name,
                    balance: 0,
                    investment: 0,
                    profit: 0,
                    totalEquity: 0,
                    kyc_completed: false,
                    is_verified: false
                });
            }

            const { data: txs } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', currentSession.user.id)
                .order('created_at', { ascending: false });

            if (txs) {
                setTransactions(txs);
                // Filter last 6 months of dividends
                const divs = txs
                    .filter((t: any) => (t.type === 'Dividend' || t.type === 'bonus'))
                    .slice(0, 6)
                    .reverse();
                setDividendHistory(divs);
            }

            // Fetch Rates from Settings
            const { data: rates } = await supabase.from('settings').select('*').in('key', ['monthly_return_rate', 'yearly_return_rate']);
            if (rates) {
                const mRate = rates.find((r: any) => r.key === 'monthly_return_rate')?.value;
                const yRate = rates.find((r: any) => r.key === 'yearly_return_rate')?.value;
                if (mRate) setMonthlyRate(parseFloat(mRate));
                if (yRate) setYearlyRate(parseFloat(yRate));
            }

            // Fetch referred count
            const { count } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('referred_by', currentSession.user.id);
            setReferredCount(count || 0);

            setIsCheckingAuth(false);
        };

        // Explicitly fetch latest data on mount to avoid stale session metadata
        const initializeDashboard = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await fetchUserData(session);
            } else {
                setIsCheckingAuth(false);
            }
        };
        initializeDashboard();

        // Standard way to handle session reliably
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
            if (event === 'SIGNED_OUT') {
                router.push(`/login?lang=${urlLang}`);
            } else if (session) {
                fetchUserData(session);
            } else {
                const { data: { session: checkSession } } = await supabase.auth.getSession();
                if (!checkSession) {
                    router.push(`/login?lang=${urlLang}`);
                } else {
                    fetchUserData(checkSession);
                }
            }
        });

        // Real-time listener for profile updates (especially verification status)
        const setupProfileSubscription = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const channel = supabase
                    .channel(`profile-updates-${session.user.id}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'profiles',
                            filter: `id=eq.${session.user.id}`
                        },
                        (payload: any) => {
                            console.log('Real-time profile update received:', payload.new);
                            const updatedProfile = payload.new;
                            const dbIsVerified = updatedProfile.is_verified === true || updatedProfile.is_verified === 'true' || updatedProfile.is_verified === 'Approved' || updatedProfile.is_verified === 'Verified';
                            const kycApproved = updatedProfile.kyc_status === 'Approved' || updatedProfile.kyc_completed === true || updatedProfile.kyc_completed === 'true' || dbIsVerified;
                            
                            setUser((prevUser: any) => {
                                if (!prevUser) return { ...updatedProfile, is_verified: dbIsVerified, kyc_completed: kycApproved };
                                return {
                                    ...prevUser,
                                    ...updatedProfile,
                                    is_verified: dbIsVerified,
                                    kyc_completed: kycApproved,
                                    fullName: updatedProfile.full_name || prevUser.fullName,
                                    totalEquity: updatedProfile.total_equity || (Number(updatedProfile.balance) + Number(updatedProfile.investment))
                                };
                            });
                        }
                    )
                    .subscribe();
                
                return channel;
            }
            return null;
        };

        let profileChannel: any = null;
        setupProfileSubscription().then(channel => {
            profileChannel = channel;
        });

        return () => {
            authSubscription.unsubscribe();
            if (profileChannel) {
                supabase.removeChannel(profileChannel);
            }
        };
    }, [searchParams, router]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-MY', {
            style: 'currency',
            currency: 'MYR',
            minimumFractionDigits: 2
        }).format(val || 0).replace("MYR", "RM");
    };

    const handleDepositSubmit = async () => {
        if (!depositAmount || !depositReceipt || !user) {
            alert("Please provide both amount and receipt.");
            return;
        }

        setIsSubmitting(true);
        const fileName = `${user.id}_${Date.now()}_${depositReceipt.name}`;

        try {
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('agreements')
                .upload(fileName, depositReceipt);

            if (uploadError) throw uploadError;

            const { error: insertError } = await supabase
                .from('transactions')
                .insert([{
                    user_id: user.id,
                    type: 'Deposit',
                    amount: parseFloat(depositAmount),
                    status: 'Pending',
                    receipt_url: uploadData.path,
                    ref_id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`
                }]);

            if (insertError) throw insertError;

            setIsDepositModalOpen(false);
            setDepositAmount("");
            setDepositReceipt(null);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);

            const { data: txs } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
            if (txs) setTransactions(txs);

        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleWithdrawInitiate = () => {
        if (!withdrawAmount) return;
        setIsPinModalOpen(true);
    };

    const handleWithdrawConfirm = async () => {
        if (withdrawPIN.length !== 6) {
            alert("Please enter a 6-digit Security PIN.");
            return;
        }
        setIsSubmitting(true);

        try {
            const { error } = await supabase
                .from('transactions')
                .insert([{
                    user_id: user.id,
                    type: 'Withdrawal',
                    amount: parseFloat(withdrawAmount),
                    status: 'Pending',
                    ref_id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`
                }]);

            if (error) throw error;

            setIsPinModalOpen(false);
            setIsWithdrawModalOpen(false);
            setWithdrawAmount("");
            setWithdrawPIN("");
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);

            const { data: txs } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
            if (txs) setTransactions(txs);

        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const currentPassword = formData.get("currentPassword") as string;
        const newPassword = formData.get("newPassword") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (newPassword !== confirmPassword) {
            alert("New passwords do not match.");
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            alert("Password updated successfully.");
            (e.target as HTMLFormElement).reset();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push(`/?lang=${lang}`);
    };

    const generateStatement = (m?: number, y?: number) => {
        const doc = new jsPDF();
        const targetMonth = m !== undefined ? m : selectedMonth;
        const targetYear = y !== undefined ? y : selectedYear;

        const dateObj = new Date(targetYear, targetMonth);
        const statementDate = new Date().toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' });
        const monthName = dateObj.toLocaleString('en-MY', { month: 'long' });

        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("GV CAPITAL TRUST", 20, 25);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("MONTHLY STATEMENT - " + monthName.toUpperCase() + " " + targetYear, 20, 32);

        const periodTxs = transactions.filter((tx: any) => {
            const txDate = new Date(tx.created_at || tx.date);
            return txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear;
        });
        const periodProfit = periodTxs.filter((t: any) => (t.type === 'Dividend' || t.type === 'bonus') && t.status === 'Approved').reduce((acc: number, t: any) => acc + Number(t.amount), 0);

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(140, 10, 55, 20, 3, 3, 'F');
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL PROFIT THIS MONTH", 145, 18);
        doc.setFontSize(12);
        doc.setTextColor(16, 185, 129);
        doc.text(formatCurrency(periodProfit), 145, 26);

        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Client Name: ${user?.fullName || "Not Specified"}`, 20, 55);
        doc.text(`Account UID: ${user?.id?.substring(0, 8)}...`, 20, 60);
        doc.text(`Statement Date: ${statementDate}`, 140, 55);

        const totalDeposits = periodTxs.filter((t: any) => t.type === 'Deposit' && t.status === 'Approved').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
        const closingBalance = user?.totalEquity || 0;
        const openingBalance = closingBalance - totalDeposits - periodProfit;

        autoTable(doc, {
            startY: 70,
            head: [['Description', 'Amount (RM)']],
            body: [
                ['Opening Balance', formatCurrency(openingBalance).replace("RM ", "")],
                ['Total Deposits', formatCurrency(totalDeposits).replace("RM ", "")],
                ['Total Dividends/Bonuses', formatCurrency(periodProfit).replace("RM ", "")],
                ['Closing Balance', formatCurrency(closingBalance).replace("RM ", "")]
            ],
            theme: 'striped',
            headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
            styles: { fontSize: 9, font: "helvetica" }
        });

        doc.setFont("helvetica", "bold");
        doc.setTextColor(50, 50, 50);
        doc.text("Activity Details", 20, (doc as any).lastAutoTable.finalY + 15);

        const tableBody = periodTxs.map((tx: any) => [
            new Date(tx.created_at || tx.date).toISOString().split('T')[0],
            tx.ref_id || tx.ref || "-",
            tx.type,
            tx.status,
            formatCurrency(Number(tx.amount)).replace("RM ", "")
        ]);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [['Date', 'Reference ID', 'Type', 'Status', 'Amount (RM)']],
            body: tableBody,
            headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255] },
            styles: { fontSize: 8 }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 30;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("This is a computer-generated document and requires no signature.", 105, finalY, { align: "center" });
        doc.text("GV Capital Trust is a registered investment platform. All financial activities are subject to terms and conditions.", 105, finalY + 5, { align: "center" });

        doc.save(`GV_Statement_${user?.id?.substring(0, 8)}_${monthName}.pdf`);
    };

    const handleKycSubmit = async () => {
        if (!idPhoto || !signature || !occupation || !bankName || !accountNumber) {
            alert(lang === "en" ? "Please complete all required fields and upload your ID." : "请填写所有必填字段并上传您的证件照片。");
            return;
        }

        setKycIsLoading(true);

        try {
            // 1. Upload ID Photo to Supabase Storage (agreements bucket)
            const fileName = `${user.id}_IC_${Date.now()}_${idPhoto.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('agreements')
                .upload(fileName, idPhoto);

            if (uploadError) throw uploadError;

            // 2. Update Profile in Supabase
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    occupation,
                    employer,
                    source_of_wealth: sourceOfWealth,
                    risk_profile: riskProfile,
                    bank_name: bankName,
                    account_number: accountNumber,
                    kyc_document_url: uploadData.path,
                    kyc_status: 'Pending',
                    is_verified: 'Pending',
                    signed_agreement: true,
                    full_name: signature 
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // 3. Show Success
            setKycShowSuccess(true);
            setIsReuploading(false);
            setTimeout(() => {
                setKycShowSuccess(false);
                // The real-time subscription will update the UI automatically
            }, 5000);

        } catch (err: any) {
            alert(err.message);
        } finally {
            setKycIsLoading(false);
        }
    };

    const content = {
        en: {
            welcome: "Welcome back, ",
            nav: "Dashboard",
            logout: "Log Out",
            totalBalance: "Total Balance",
            activeInvestment: "Active Investment",
            totalProfit: "Total Profit",
            deposit: "Deposit",
            withdraw: "Withdraw",
            history: "Transaction History",
            unverifiedBanner: "⚠️ Account Unverified. Access to Deposits, Withdrawals, and Trading is restricted.",
            verifyNow: "Verify Now",
            securityPin: "Withdrawal Security PIN",
            enterPin: "Enter your 6-digit withdrawal PIN to authorize this request.",
            confirmWithdraw: "Authorize Withdrawal",
            successTitle: "Submission Successful",
            successDesc: "Our team will review your request within 24 hours.",
            whatsapp: "Contact Support via WhatsApp",
            expectedMonthly: "Expected Monthly Dividend",
            projectedYearly: "Projected Yearly Profit",
            latestDeposit: "Latest Deposit Status",
            dividendTrends: "6-Month Dividend Trends",
            downloadStatement: "Download Monthly Statement",
            referTitle: "Refer a Friend",
            referSubtitle: "Invite others to join GV Capital and grow the community together.",
            copyCode: "Copy Code",
            copied: "Copied!",
            shareWA: "Share on WhatsApp",
            totalReferred: "Total Friends Referred",
            securityTitle: "Security Settings",
            securitySubtitle: "Update your account password to ensure your funds remain protected.",
            currentPass: "Current Password",
            newPass: "New Password",
            confirmPass: "Confirm New Password",
            updateBtn: "Update Password",
            pendingVerification: "Account Pending Verification. Please contact your Agent or Admin to activate your account.",
        },
        zh: {
            welcome: "欢迎回来，",
            nav: "控制台",
            logout: "退出登录",
            totalBalance: "总余额",
            activeInvestment: "活跃投资",
            totalProfit: "总收益",
            deposit: "入金",
            withdraw: "提款",
            history: "交易历史",
            unverifiedBanner: "⚠️ 账户未核实。存款、取款和交易功能受限。",
            verifyNow: "立即核实",
            securityPin: "取款安全密码",
            enterPin: "请输入您的 6 位取款密码以授权此申请。",
            confirmWithdraw: "授权提款",
            successTitle: "提交成功",
            successDesc: "我们的团队将在 24 小时内审核您的申请。",
            whatsapp: "通过 WhatsApp 联系支持",
            expectedMonthly: "预计月度股息",
            projectedYearly: "预计年度利润",
            latestDeposit: "最新存款状态",
            dividendTrends: "6 个月股息趋势",
            downloadStatement: "下载月度账单",
            referTitle: "推荐朋友",
            referSubtitle: "邀请他人加入 GV 资本，共同发展社区。",
            copyCode: "复制推荐码",
            copied: "已复制!",
            shareWA: "在 WhatsApp 上分享",
            totalReferred: "已成功推荐人数",
            securityTitle: "安全设置",
            securitySubtitle: "更新您的账户密码以确保您的资金得到保护。",
            currentPass: "当前密码",
            newPass: "新密码",
            confirmPass: "确认新密码",
            updateBtn: "更新密码",
            pendingVerification: "账户待审核。请联系您的代理或管理员以激活您的账户。",
        },
    };

    const t = (content as any)[lang];

    if (isCheckingAuth) {
        return <div className="min-h-screen bg-[#121212] flex items-center justify-center p-6"><div className="h-12 w-12 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;
    }

    // Strict verification check
    const isUserVerified = user?.is_verified === true;

    // We no longer block access to the dashboard entirely. 
    // Instead, we will conditionally render the content inside the main area.

    return (
        <div className="min-h-screen bg-[#121212] text-white flex font-sans overflow-hidden">
            <title>{`Dashboard | GV Capital Trust`}</title>

            <aside className="w-64 border-r border-white/10 p-6 flex flex-col justify-between hidden md:flex bg-[#0a0a0a]">
                <div className="space-y-12">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="GV Capital" className="h-[60px] w-auto object-contain mix-blend-screen" />
                    </div>

                    <nav className="space-y-2">
                        <button
                            onClick={() => setActiveTab("overview")}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "overview" ? "bg-gv-gold text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            {t.nav}
                        </button>
                        <button
                            onClick={() => setActiveTab("statements")}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "statements" ? "bg-gv-gold text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Statements
                        </button>
                        <button
                            onClick={() => setActiveTab("security")}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "security" ? "bg-gv-gold text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            Security
                        </button>
                    </nav>
                </div>
                <div className="space-y-4">
                    <button onClick={() => setLang(lang === "en" ? "zh" : "en")} className="w-full rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/5 transition-all text-zinc-400">
                        {lang === "en" ? "切换至 简体中文" : "Switch to English"}
                    </button>
                    <button onClick={handleLogout} className="w-full text-zinc-500 hover:text-red-400 transition-colors text-sm font-medium flex items-center gap-3 px-4 py-2">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
                        {t.logout}
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto bg-[#121212] relative flex flex-col">
                <CurrencyExchangeTicker />
                <div className="max-w-7xl mx-auto w-full space-y-12 flex-1 pb-20 p-8 md:p-12">
                    <header className="flex justify-between items-center">
                        <div>
                            <p className="text-zinc-500 text-sm font-black uppercase tracking-[0.3em] mb-2">{t.nav}</p>
                            <h1 className="text-4xl font-black">
                                {t.welcome}<span className="text-gv-gold tracking-tighter">{user?.fullName || "Member"}</span>
                            </h1>
                        </div>
                        <div className="flex items-center gap-6">
                            {user && <NotificationBell userId={user.id} />}
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-gv-gold to-[#B8860B] flex items-center justify-center font-black text-black text-xl border border-gv-gold/30 shadow-lg capitalize">
                                {user?.fullName?.[0] || user?.email?.[0] || "U"}
                            </div>
                        </div>
                    </header>

                    {activeTab === "overview" ? (
                        <>
                            {!user?.is_verified ? (
                                (user?.kyc_status === 'Pending' || user?.kyc_status === 'pending') ? (
                                    <div className="bg-amber-400 p-12 rounded-[40px] text-center space-y-8 py-24 animate-in fade-in zoom-in-95 duration-700 max-w-3xl mx-auto shadow-[0_30px_60px_rgba(0,0,0,0.5)] border border-amber-500/20">
                                        <div className="h-28 w-28 bg-amber-950/20 rounded-full flex items-center justify-center mx-auto border-4 border-amber-950/10">
                                            <svg className="h-16 w-16 text-amber-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div className="space-y-6 text-amber-950">
                                            <h2 className="text-4xl font-black uppercase tracking-tighter">Account Verification in Progress</h2>
                                            <p className="text-amber-900 font-bold text-xl leading-relaxed max-w-2xl mx-auto">
                                                Thank you for choosing GV Capital. Our Compliance Team is currently reviewing your documents. Manual verification typically takes 1 to 3 business days. Once approved, you will have full access to our investment and deposit features.
                                            </p>
                                        </div>
                                    </div>
                                ) : (user?.kyc_status === 'Rejected' || user?.kyc_status === 'rejected') && !isReuploading ? (
                                    <div className="bg-red-500 p-12 rounded-[40px] text-center space-y-8 py-24 animate-in fade-in zoom-in-95 duration-700 max-w-3xl mx-auto shadow-[0_30px_60px_rgba(239,68,68,0.3)] border border-red-600/20">
                                        <div className="h-28 w-28 bg-white/20 rounded-full flex items-center justify-center mx-auto border-4 border-white/10">
                                            <svg className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                        <div className="space-y-6 text-white">
                                            <h2 className="text-4xl font-black uppercase tracking-tighter">Verification Unsuccessful</h2>
                                            <div className="bg-white/10 p-6 rounded-3xl border border-white/20 max-w-2xl mx-auto">
                                                <p className="text-white font-bold text-xl leading-relaxed">
                                                    Our team was unable to verify your documents for the following reason:<br/>
                                                    <span className="text-black bg-white/90 px-3 py-1 mt-3 inline-block rounded-xl font-black uppercase tracking-tight">
                                                        {user?.rejection_reason || "Invalid Document Clarity / Mismatch Information"}
                                                    </span>
                                                </p>
                                            </div>
                                            <p className="text-white/80 font-medium">Please re-upload a clear copy of your ID to proceed.</p>
                                            <button 
                                                onClick={() => setIsReuploading(true)}
                                                className="bg-white text-red-600 font-black px-10 py-5 rounded-2xl uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
                                            >
                                                Re-upload Documents
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-[#1a1a1a] p-10 rounded-[40px] border border-white/5 shadow-xl space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
                                        <div className="space-y-4">
                                            <h2 className="text-3xl font-black uppercase tracking-tighter">Activate Your Portfolio</h2>
                                            <p className="text-zinc-500 font-medium leading-relaxed">Please complete your profile and upload your identity document to begin investing.</p>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-8">
                                                <section className="space-y-6">
                                                    <h3 className="text-sm font-black uppercase tracking-widest text-gv-gold flex items-center gap-2">
                                                        <span className="h-6 w-6 rounded-full bg-gv-gold text-black flex items-center justify-center text-[10px]">1</span>
                                                        Identity Document
                                                    </h3>
                                                    <div className="border border-white/10 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-colors cursor-pointer relative group">
                                                        <svg className="h-10 w-10 text-zinc-600 mb-4 group-hover:text-gv-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">{idPhoto ? idPhoto.name : "Upload Passport / ID Card"}</span>
                                                        <input type="file" onChange={(e) => setIdPhoto(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                    </div>
                                                </section>

                                                <section className="space-y-6">
                                                    <h3 className="text-sm font-black uppercase tracking-widest text-gv-gold flex items-center gap-2">
                                                        <span className="h-6 w-6 rounded-full bg-gv-gold text-black flex items-center justify-center text-[10px]">2</span>
                                                        Financial Profile
                                                    </h3>
                                                    <div className="space-y-4">
                                                        <input type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold focus:border-gv-gold/50 outline-none transition-all" placeholder="Occupation / Job Title" />
                                                        <input type="text" value={employer} onChange={(e) => setEmployer(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold focus:border-gv-gold/50 outline-none transition-all" placeholder="Employer Name" />
                                                        <select value={sourceOfWealth} onChange={(e) => setSourceOfWealth(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold appearance-none focus:border-gv-gold/50 outline-none transition-all">
                                                            <option className="bg-[#1a1a1a]">Salary</option>
                                                            <option className="bg-[#1a1a1a]">Business Profit</option>
                                                            <option className="bg-[#1a1a1a]">Investments</option>
                                                            <option className="bg-[#1a1a1a]">Inheritance</option>
                                                        </select>
                                                    </div>
                                                </section>
                                            </div>

                                            <div className="space-y-8">
                                                <section className="space-y-6">
                                                    <h3 className="text-sm font-black uppercase tracking-widest text-gv-gold flex items-center gap-2">
                                                        <span className="h-6 w-6 rounded-full bg-gv-gold text-black flex items-center justify-center text-[10px]">3</span>
                                                        Payout Bank Details
                                                    </h3>
                                                    <div className="space-y-4">
                                                        <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold focus:border-gv-gold/50 outline-none transition-all" placeholder="Bank Name (e.g., Maybank)" />
                                                        <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold focus:border-gv-gold/50 outline-none transition-all" placeholder="Account Number" />
                                                    </div>
                                                </section>

                                                <section className="space-y-6">
                                                    <h3 className="text-sm font-black uppercase tracking-widest text-gv-gold flex items-center gap-2">
                                                        <span className="h-6 w-6 rounded-full bg-gv-gold text-black flex items-center justify-center text-[10px]">4</span>
                                                        Digital Signature
                                                    </h3>
                                                    <div className="space-y-4">
                                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Type your full legal name to authorize</p>
                                                        <input type="text" value={signature} onChange={(e) => setSignature(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xl font-black italic tracking-wider text-gv-gold placeholder:text-zinc-700 placeholder:italic focus:border-gv-gold/50 outline-none transition-all" placeholder="Full Name" />
                                                    </div>
                                                </section>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-white/5 flex flex-col gap-6">
                                            <button 
                                                onClick={handleKycSubmit} 
                                                disabled={kycIsLoading} 
                                                className="w-full bg-gv-gold text-black font-black text-xl py-6 rounded-[28px] hover:bg-gv-gold/90 transition-all shadow-[0_20px_40px_rgba(212,175,55,0.2)] uppercase tracking-widest flex items-center justify-center gap-3 disabled:grayscale disabled:opacity-50"
                                            >
                                                {kycIsLoading ? <div className="h-6 w-6 border-4 border-black border-t-transparent animate-spin rounded-full"></div> : "Confirm & Sign Documents"}
                                            </button>
                                            <p className="text-[10px] text-zinc-600 text-center font-bold uppercase tracking-widest max-w-xl mx-auto leading-relaxed">
                                                By submitting this form, you consent to GV Capital Trust processing your personal data in accordance with the PDPA 2010 for identity verification.
                                            </p>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <>
                                    <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="bg-[#1a1a1a] border border-white/5 p-10 rounded-[40px] shadow-xl hover:border-gv-gold/20 transition-all group">
                                    <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-4 group-hover:text-zinc-400 transition-colors uppercase">{t.totalBalance}</p>
                                    <h2 className="text-4xl font-black tracking-tighter">{user?.kyc_completed ? formatCurrency(user?.totalEquity) : "RM 0.00"}</h2>
                                </div>
                                <div className="bg-[#1a1a1a] border border-white/5 p-10 rounded-[40px] shadow-xl">
                                    <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-4">{t.activeInvestment}</p>
                                    <h2 className="text-4xl font-black tracking-tighter">{user?.kyc_completed ? formatCurrency(user?.investment) : "RM 0.00"}</h2>
                                </div>
                                <div className="bg-[#1a1a1a] border border-white/5 p-10 rounded-[40px] shadow-xl">
                                    <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-4">{t.totalProfit}</p>
                                    <h2 className="text-4xl font-black tracking-tighter text-gv-gold">{formatCurrency(user?.profit)}</h2>
                                </div>
                            </section>

                            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-[#111] border border-white/5 p-10 rounded-[40px] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-all">
                                        <svg className="h-20 w-20 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-4">{t.expectedMonthly}</p>
                                    <h3 className="text-3xl font-black text-white">{formatCurrency(user?.totalEquity * monthlyRate)}</h3>
                                    <p className="text-[10px] text-zinc-600 font-bold uppercase mt-4 tracking-tighter">Based on {monthlyRate * 100}% Monthly Return</p>
                                </div>
                                <div className="bg-[#111] border border-white/5 p-10 rounded-[40px] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-all">
                                        <svg className="h-20 w-20 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                    </div>
                                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-4">{t.projectedYearly}</p>
                                    <h3 className="text-3xl font-black text-emerald-500">{formatCurrency(user?.totalEquity * yearlyRate)}</h3>
                                    <p className="text-[10px] text-zinc-600 font-bold uppercase mt-4 tracking-tighter">Yearly Forecast ({(yearlyRate * 100).toFixed(0)}% ROI)</p>
                                </div>
                            </section>

                            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 bg-[#1a1a1a] border border-white/5 p-10 rounded-[40px] space-y-8">
                                    <h3 className="text-xl font-black uppercase tracking-tighter">{t.dividendTrends}</h3>
                                    <div className="h-64 flex items-end justify-between gap-4 px-4">
                                        {dividendHistory.length > 0 ? dividendHistory.map((div, i) => (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                                                <div
                                                    className="w-full bg-gv-gold rounded-t-xl transition-all duration-500 group-hover:brightness-125"
                                                    style={{ height: `${Math.max(10, (div.amount / (Math.max(...dividendHistory.map(d => d.amount)) || 1)) * 100)}%` }}
                                                ></div>
                                                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">{new Date(div.created_at).toLocaleDateString('en-US', { month: 'short' })}</span>
                                            </div>
                                        )) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-700 font-black uppercase tracking-widest text-xs">No Dividend Data Yet</div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-[#1a1a1a] border border-white/5 p-10 rounded-[40px] flex flex-col justify-center items-center text-center space-y-6">
                                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{t.latestDeposit}</p>
                                    {transactions.find(t => t.type === 'Deposit') ? (
                                        <>
                                            <div className={`h-24 w-24 rounded-full flex items-center justify-center border-2 ${transactions.find(t => t.type === 'Deposit').status === 'Approved' ? 'border-emerald-500/20 text-emerald-500' : transactions.find(t => t.type === 'Deposit').status === 'Rejected' ? 'border-red-500/20 text-red-500' : 'border-amber-500/20 text-amber-500'}`}>
                                                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <div>
                                                <h4 className={`text-2xl font-black uppercase tracking-tighter ${transactions.find(t => t.type === 'Deposit').status === 'Approved' ? 'text-emerald-500' : transactions.find(t => t.type === 'Deposit').status === 'Rejected' ? 'text-red-500' : 'text-amber-500'}`}>{transactions.find(t => t.type === 'Deposit').status}</h4>
                                                <p className="text-zinc-600 text-[10px] font-bold uppercase mt-1">{formatCurrency(transactions.find(t => t.type === 'Deposit').amount)} Ref: {transactions.find(t => t.type === 'Deposit').ref_id}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-zinc-700 font-black uppercase tracking-widest text-xs">No Deposits Found</p>
                                    )}
                                </div>
                            </section>

                            <section className="flex flex-col sm:flex-row gap-6">
                                <Link
                                    href={`/deposit?lang=${lang}`}
                                    className={`flex-1 font-black text-xl py-6 rounded-[28px] transition-all flex items-center justify-center gap-3 ${user?.kyc_completed ? "bg-gv-gold text-black hover:bg-gv-gold/90 hover:-translate-y-1 shadow-[0_15px_30px_rgba(212,175,55,0.2)]" : "bg-white/5 text-zinc-600 cursor-not-allowed grayscale"}`}
                                    onClick={(e) => !user?.kyc_completed && (e.preventDefault(), alert(t.unverifiedBanner))}
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>
                                    {t.deposit}
                                </Link>
                                <button
                                    onClick={() => user?.kyc_completed ? setIsWithdrawModalOpen(true) : alert(t.unverifiedBanner)}
                                    className={`flex-1 font-black text-xl py-6 rounded-[28px] transition-all flex items-center justify-center gap-3 ${user?.kyc_completed ? "bg-[#222] text-white hover:bg-[#333] hover:-translate-y-1 border border-white/10" : "bg-white/5 text-zinc-600 cursor-not-allowed grayscale"}`}
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                    {t.withdraw}
                                </button>
                            </section>

                            <section className="bg-[#1a1a1a] border border-white/5 p-10 rounded-[40px] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-gv-gold/5 blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
                                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                                    <div className="space-y-4 max-w-lg">
                                        <h3 className="text-2xl font-black uppercase tracking-tighter">{t.referTitle}</h3>
                                        <p className="text-zinc-500 font-medium leading-relaxed">{t.referSubtitle}</p>
                                        <div className="flex items-center gap-4 mt-8">
                                            <div className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl">
                                                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Your Code</p>
                                                <p className="text-xl font-black text-gv-gold tracking-widest">{user?.id}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(user?.id);
                                                    alert(t.copied);
                                                }}
                                                className="h-full px-6 py-4 bg-gv-gold text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gv-gold/90 transition-all shadow-lg"
                                            >
                                                {t.copyCode}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-6 text-center md:text-right md:items-end">
                                        <div className="bg-[#222] border border-white/10 p-6 rounded-[32px] w-full md:w-auto">
                                            <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-1">{t.totalReferred}</p>
                                            <h4 className="text-4xl font-black text-white">{referredCount}</h4>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const url = typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${user?.id}` : `https://gvcapital.com/register?ref=${user?.id}`;
                                                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(t.referSubtitle + " " + url)}`);
                                            }}
                                            className="flex items-center gap-3 bg-[#25D366] text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-xl"
                                        >
                                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.41 0 .01 5.403.01 12.039c0 2.121.554 4.191 1.607 6.039L0 24l6.135-1.61a11.748 11.748 0 005.911 1.586h.005c6.637 0 12.04-5.403 12.04-12.039a11.82 11.82 0 00-3.417-8.416" /></svg>
                                            {t.shareWA}
                                        </button>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-8">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                    <h3 className="text-2xl font-black uppercase tracking-tighter">{t.history}</h3>
                                    <button
                                        onClick={() => generateStatement()}
                                        className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-xs py-3 px-6 rounded-xl uppercase tracking-widest transition-all flex items-center gap-2"
                                    >
                                        <svg className="h-4 w-4 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
                                        {t.downloadStatement}
                                    </button>
                                </div>
                                <div className="border border-white/10 rounded-[40px] overflow-hidden bg-[#1a1a1a]/50 backdrop-blur-md shadow-2xl">
                                    <table className="w-full text-left">
                                        <thead className="bg-white/5 border-b border-white/10 text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">
                                            <tr><th className="px-8 py-6">Date</th><th className="px-8 py-6">Ref ID</th><th className="px-8 py-6">Type</th><th className="px-8 py-6">Amount</th><th className="px-8 py-6 text-right">Status</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.03]">
                                            {transactions.map((tx, idx) => (
                                                <tr key={idx} className="text-sm font-bold group hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-8 py-6 text-zinc-500">{new Date(tx.created_at || tx.date).toISOString().split('T')[0]}</td>
                                                    <td className="px-8 py-6 font-mono text-xs text-white/40">{tx.ref_id || tx.ref}</td>
                                                    <td className="px-8 py-6 uppercase tracking-widest text-[10px]">{tx.type}</td>
                                                    <td className={`px-8 py-6 text-lg tracking-tighter ${Number(tx.amount) >= 0 ? "text-emerald-400" : "text-white"}`}>{formatCurrency(Number(tx.amount))}</td>
                                                    <td className="px-8 py-6 text-right"><span className={`px-4 py-2 rounded-xl text-[9px] uppercase font-black tracking-widest ${tx.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : tx.status === 'Rejected' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>{tx.status}</span></td>
                                                </tr>
                                            ))}
                                            {transactions.length === 0 && (
                                                <tr><td colSpan={5} className="px-8 py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">No transaction history found</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </>
                    )}
                </>
            ) : activeTab === "statements" ? (
                        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="bg-[#1a1a1a] border border-white/5 p-12 rounded-[40px] shadow-2xl overflow-hidden relative group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/5 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-1000"></div>
                                <div className="relative z-10 max-w-2xl">
                                    <h2 className="text-3xl font-black uppercase tracking-tighter mb-4 text-white">Statement Center</h2>
                                    <p className="text-zinc-500 font-medium mb-12">Select your desired period to generate and download a professional investment statement.</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
                                        <div className="space-y-4">
                                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Month</label>
                                            <select
                                                value={selectedMonth}
                                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-lg font-black focus:outline-none focus:border-gv-gold transition-all appearance-none cursor-pointer"
                                            >
                                                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                                                    <option key={i} value={i} className="bg-[#1a1a1a] text-white">{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Year</label>
                                            <select
                                                value={selectedYear}
                                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-lg font-black focus:outline-none focus:border-gv-gold transition-all appearance-none cursor-pointer"
                                            >
                                                {[2024, 2025, 2026].map(y => (
                                                    <option key={y} value={y} className="bg-[#1a1a1a] text-white">{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => generateStatement()}
                                        className="bg-gv-gold text-black font-black py-6 px-12 rounded-2xl uppercase tracking-widest shadow-xl hover:shadow-gv-gold/20 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-4"
                                    >
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
                                        Generate & Download PDF
                                    </button>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="bg-[#1a1a1a] border border-white/5 p-12 rounded-[40px] shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/5 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-1000"></div>
                                <div className="relative z-10 max-w-xl text-center mx-auto space-y-10">
                                    <div>
                                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 text-white">{t.securityTitle}</h2>
                                        <p className="text-zinc-500 font-medium">{t.securitySubtitle}</p>
                                    </div>

                                    <form onSubmit={handlePasswordUpdate} className="space-y-6 text-left">
                                        <div className="space-y-2">
                                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">{t.currentPass}</label>
                                            <input
                                                name="currentPassword"
                                                type="password"
                                                required
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xl font-bold focus:outline-none focus:border-gv-gold transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">{t.newPass}</label>
                                            <input
                                                name="newPassword"
                                                type="password"
                                                required
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xl font-bold focus:outline-none focus:border-gv-gold transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">{t.confirmPass}</label>
                                            <input
                                                name="confirmPassword"
                                                type="password"
                                                required
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xl font-bold focus:outline-none focus:border-gv-gold transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full bg-gv-gold text-black font-black py-6 rounded-2xl uppercase tracking-widest shadow-xl hover:shadow-gv-gold/20 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-4 mt-10"
                                        >
                                            {isSubmitting ? <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : t.updateBtn}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
                <GlobalFooter />
            </main>

            {/* Deposit Modal */}
            {isDepositModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1a1a1a] border border-gv-gold/30 rounded-[40px] p-10 max-w-lg w-full space-y-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-black text-gv-gold tracking-tighter uppercase">Deposit</h2>
                            <button onClick={() => setIsDepositModalOpen(false)} className="text-zinc-600 hover:text-white transition-colors">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Amount (MYR)</label>
                                <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-2xl font-black focus:outline-none focus:border-gv-gold transition-all" placeholder="0.00" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Bank Receipt (Image/PDF)</label>
                                <div className="border border-white/10 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-colors cursor-pointer relative group">
                                    <svg className="h-10 w-10 text-zinc-600 mb-4 group-hover:text-gv-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{depositReceipt ? (depositReceipt as File).name : "Select Document"}</span>
                                    <input type="file" onChange={(e) => setDepositReceipt(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                            </div>
                            <button onClick={handleDepositSubmit} disabled={isSubmitting || !depositAmount || !depositReceipt} className="w-full bg-gv-gold text-black font-black py-5 rounded-2xl flex justify-center items-center gap-3 uppercase tracking-widest shadow-xl disabled:opacity-50">
                                {isSubmitting ? <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : "Confirm Deposit"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Withdraw Modal */}
            {isWithdrawModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-[40px] p-10 max-w-lg w-full space-y-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Withdrawal</h2>
                            <button onClick={() => setIsWithdrawModalOpen(false)} className="text-zinc-600 hover:text-white transition-colors">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Amount (MYR)</label>
                                <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-2xl font-black focus:outline-none focus:border-gv-gold transition-all" placeholder="0.00" />
                            </div>
                            <button onClick={handleWithdrawInitiate} disabled={!withdrawAmount} className="w-full bg-white text-black font-black py-5 rounded-2xl flex justify-center items-center gap-3 uppercase tracking-widest shadow-xl disabled:opacity-50">
                                Request Withdrawal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PIN Modal */}
            {isPinModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
                    <div className="bg-[#111] border border-gv-gold/50 rounded-[40px] p-12 max-w-md w-full text-center space-y-10 shadow-[0_0_100px_rgba(212,175,55,0.15)] animate-in fade-in zoom-in-90 duration-300">
                        <div className="h-20 w-20 bg-gv-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-gv-gold/20">
                            <svg className="h-10 w-10 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">{t.securityPin}</h3>
                            <p className="text-zinc-500 font-medium text-sm px-4">{t.enterPin}</p>
                        </div>
                        <div className="flex justify-center gap-3">
                            <input
                                type="password"
                                maxLength={6}
                                value={withdrawPIN}
                                onChange={(e) => setWithdrawPIN(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-4xl font-black text-center tracking-[1em] focus:outline-none focus:border-gv-gold transition-all text-gv-gold"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-4">
                            <button onClick={handleWithdrawConfirm} disabled={isSubmitting || withdrawPIN.length !== 6} className="w-full bg-gv-gold text-black font-black py-5 rounded-2xl flex justify-center items-center gap-3 uppercase tracking-widest shadow-xl disabled:opacity-50">
                                {isSubmitting ? <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : t.confirmWithdraw}
                            </button>
                            <button onClick={() => setIsPinModalOpen(false)} className="text-zinc-600 font-bold hover:text-white transition-colors uppercase tracking-widest text-xs">
                                Cancel Transaction
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Overlays */}
            {(showSuccess || kycShowSuccess) && (
                <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500 px-8">
                    <div className="h-32 w-32 bg-emerald-500 rounded-full flex items-center justify-center mb-10 shadow-[0_0_80px_rgba(16,185,129,0.3)] animate-bounce-subtle">
                        <svg className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-5xl font-black mb-4 uppercase tracking-tighter text-white">
                        {kycShowSuccess ? "Documents Submitted" : t.successTitle}
                    </h2>
                    <p className="text-zinc-400 max-w-md font-medium text-lg leading-relaxed">
                        {kycShowSuccess ? "Our compliance team will review your account within 24 hours. Your portfolio will activate automatically upon approval." : t.successDesc}
                    </p>
                </div>
            )}
        </div>
    );
}
