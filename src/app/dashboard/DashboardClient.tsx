"use client";

import React, { useEffect, useState, ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import GlobalFooter from "@/components/GlobalFooter";
import NotificationBell from "@/components/NotificationBell";
import { supabase } from "@/lib/supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import CurrencyExchangeTicker from "@/components/CurrencyExchangeTicker";
import { useAuth } from "@/providers/AuthProvider";
import { useSettings } from "@/providers/SettingsProvider";
import ProductSelection from "@/components/ProductSelection";
import ComparisonTable from "@/components/ComparisonTable";
import { TIERS, getTierByAmount, formatUSD } from "@/lib/tierUtils";

export default function DashboardClient() {
    const { user: authUser, role: authRole, isVerified: authVerified, refresh: refreshAuth, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [lang, setLang] = useState<"en" | "zh">("en");
    const [user, setUser] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const { forexRate, monthlyRate, yearlyRate } = useSettings();
    const [dividendHistory, setDividendHistory] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"overview" | "products" | "statements" | "profile" | "security">("overview");
    const [isComparisonOpen, setIsComparisonOpen] = useState(false);
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
    const [successRefId, setSuccessRefId] = useState("");
    const [actionToast, setActionToast] = useState<{message: string, actionUrl?: string, actionText?: string} | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Form States
    const [depositAmount, setDepositAmount] = useState("");
    const [depositDate, setDepositDate] = useState("");
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

    const fetchedRef = React.useRef<string | null>(null);

    useEffect(() => {
        const urlLang = searchParams?.get("lang") || "en";
        setLang(urlLang as "en" | "zh");
        
        if (authLoading) return;

        if (!authUser) {
            setIsCheckingAuth(false);
            return;
        }



        const fetchUserData = async () => {
            console.log("FETCHING DASHBOARD DATA for:", authUser.email);
            
            try {
                console.log('Effective Forex Rate (Global):', forexRate);

                // 2. Fetch Profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact' })
                    .eq('id', authUser.id)
                    .single();

                if (profile) {
                    let dbIsVerified = profile.role === 'admin' || profile.is_verified === true || profile.is_verified === 'Approved' || profile.is_verified === 'true';
                    let kycApproved = dbIsVerified || profile.kyc_status === 'Approved' || profile.kyc_completed === true;

                    // Master Bypass
                    if (authUser.email === "thenja96@gmail.com") {
                        dbIsVerified = true;
                        kycApproved = true;
                        profile.role = "admin";
                    }

                    // Standardizing RM-Base with USD-Anchored Tiers
                    const totalAssetsRM = Number(profile.balance || 0) + Number(profile.profit || 0);
                    const balUSD = Number(profile.balance || 0) / forexRate;
                    
                    console.log('Balance (RM):', profile.balance, 'Profit (RM):', profile.profit, 'Total Assets (RM):', totalAssetsRM, 'USD Equiv for Tier:', balUSD);
                    
                    setUser({
                        ...authUser,
                        ...profile,
                        is_verified: dbIsVerified,
                        kyc_completed: kycApproved,
                        fullName: profile.full_name || authUser.user_metadata?.full_name,
                        total_assets: totalAssetsRM, // Now in RM
                        totalEquity: totalAssetsRM,  // Now in RM
                        balanceUSD: balUSD           // Used for Tier check
                    });
                } else {
                    console.warn("No profile found for ID:", authUser.id);
                }

                // 3. Fetch Transactions
                let txQuery = supabase.from('transactions').select('*');
                if (authUser.email !== "thenja96@gmail.com") {
                    txQuery = txQuery.eq('user_id', authUser.id);
                }
                const { data: txs } = await txQuery.order('created_at', { ascending: false });
                if (txs) {
                    setTransactions(txs);
                    setDividendHistory(txs.filter((t: any) => 
                        t.type?.toLowerCase() === 'dividend' || 
                        t.type?.toLowerCase() === 'bonus'
                    ).slice(0, 6).reverse());
                }

                const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('referred_by', authUser.id);
                setReferredCount(count || 0);

                fetchedRef.current = authUser.id;
            } catch (err) {
                console.error("Dashboard Fetch Error:", err);
            } finally {
                setIsCheckingAuth(false);
            }
        };

        fetchUserData();

        // Real-time listener
        const channel = supabase
            .channel(`profile-updates-${authUser.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${authUser.id}` }, 
            (payload: any) => {
                const p = payload.new;
                console.log("[REALTIME] Dashboard Profile Update:", p);
                const verified = p.role === 'admin' || p.is_verified === true || p.is_verified === 'Approved';
                const totalAssetsCalc = Number(p.balance || 0) + Number(p.profit || 0);
                setUser((prev: any) => ({ 
                    ...prev, 
                    ...p, 
                    is_verified: verified,
                    total_assets: totalAssetsCalc,
                    totalEquity: totalAssetsCalc
                }));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [authUser, searchParams]);

    const formatCurrency = (val: number) => {
        return `RM ${Number(val || 0).toFixed(2)}`;
    };

    const handleProtectedAction = (e: React.MouseEvent, onSuccess: () => void) => {
        e.preventDefault();
        if (user?.is_verified) {
            onSuccess();
        } else if (user?.kyc_step === 3) {
            setActionToast({
                message: "Your documents are under review. Access will be granted shortly."
            });
        } else {
            setActionToast({
                message: "KYC required",
                actionText: "Verify Now",
                actionUrl: `/dashboard/kyc`
            });
        }
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

            const refId = `TXN-${Math.floor(1000 + Math.random() * 9000)}`;
            const { error: insertError } = await supabase
                .from('transactions')
                .insert([{
                    user_id: user.id,
                    type: 'Deposit',
                    amount: parseFloat(depositAmount),
                    transfer_date: depositDate ? new Date(depositDate).toISOString() : new Date().toISOString(),
                    status: 'Pending',
                    receipt_url: uploadData.path,
                    ref_id: refId
                }]);

            if (insertError) throw insertError;

            setIsDepositModalOpen(false);
            setDepositAmount("");
            setDepositDate("");
            setDepositReceipt(null);
            setSuccessRefId(refId);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);

            let refetchTxQuery = supabase.from('transactions').select('*');
            if (user?.email !== "thenja96@gmail.com") {
                refetchTxQuery = refetchTxQuery.eq('user_id', user.id);
            }
            const { data: txs } = await refetchTxQuery.order('created_at', { ascending: false });
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

            let refetchWithdrawalQuery = supabase.from('transactions').select('*');
            if (user?.email !== "thenja96@gmail.com") {
                refetchWithdrawalQuery = refetchWithdrawalQuery.eq('user_id', user.id);
            }
            const { data: txs } = await refetchWithdrawalQuery.order('created_at', { ascending: false });
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
            welcome: "Welcome, ",
            nav: "Dashboard",
            logout: "Log Out",
            totalAssets: "Total Wallet Amount",
            activeInvestment: "Active Investment",
            totalProfit: "Total Dividend",
            totalEquity: "Total Investment",
            dividendNote: "(Withdrawable)",
            investmentNote: "(6 month lock period)",
            currentPackage: "Current Package",
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
            profile: "Profile",
            personalInfo: "Personal Information",
            compliance: "Compliance & Industry",
            bankDetails: "Bank Information",
            fullName: "Full Name",
            username: "Username",
            email: "Email Address",
            phone: "Phone Number",
            country: "Country",
            occupation: "Occupation",
            industry: "Industry",
            wealthSource: "Source of Wealth",
            riskProfile: "Risk Profile",
            bankName: "Bank Name",
            accNumber: "Account Number",
            pendingVerification: "Account Pending Verification. Please contact your Agent or Admin to activate your account.",
        },
        zh: {
            welcome: "欢迎, ",
            nav: "控制台",
            logout: "退出登录",
            totalAssets: "钱包总额",
            activeInvestment: "活跃投资",
            totalProfit: "总股息",
            totalEquity: "总投资",
            dividendNote: "(可提取)",
            investmentNote: "(6个月锁定期)",
            currentPackage: "当前配套",
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
            profile: "个人资料",
            personalInfo: "个人信息",
            compliance: "合规与行业",
            bankDetails: "银行资料",
            fullName: "全名",
            username: "用户名",
            email: "电子邮件",
            phone: "电话号码",
            country: "国家",
            occupation: "职业",
            industry: "行业",
            wealthSource: "财富来源",
            riskProfile: "风险评估",
            bankName: "银行名称",
            accNumber: "银行账号",
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
                            onClick={() => setActiveTab("products")}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "products" ? "bg-gv-gold text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                            Products
                        </button>
                        <button
                            onClick={() => setActiveTab("statements")}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "statements" ? "bg-gv-gold text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Statements
                        </button>
                        <button
                            onClick={() => setActiveTab("profile")}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "profile" ? "bg-gv-gold text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            {t.profile}
                        </button>
                        <button
                            onClick={() => setActiveTab("security")}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "security" ? "bg-gv-gold text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            {t.securityTitle}
                        </button>
                    </nav>
                </div>
                <div className="space-y-4">
                    {/* DEBUG MODE INFO */}
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-left space-y-1">
                        <div className="text-[9px] font-black uppercase text-red-500 tracking-widest">Debug Mode</div>
                        <div className="text-[10px] text-white/50 font-mono truncate">{user?.email}</div>
                        <div className="text-xs text-white font-mono">Role: {user?.role || 'null'}</div>
                        <div className="text-xs text-white font-mono">Verified: {String(user?.is_verified)}</div>
                    </div>

                    <button onClick={() => setLang(lang === "en" ? "zh" : "en")} className="w-full rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/5 transition-all text-zinc-400">
                        {lang === "en" ? "切换至 简体中文" : "Switch to English"}
                    </button>
                    <button onClick={handleLogout} className="w-full text-zinc-500 hover:text-red-400 transition-colors text-sm font-medium flex items-center gap-3 px-4 py-2">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
                        {t.logout}
                    </button>
                </div>
            </aside>

            {/* Mobile Sidebar (Slide-in) */}
            <div
                className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
                    isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                onClick={() => setIsSidebarOpen(false)}
            />
            <aside
                className={`fixed inset-y-0 left-0 z-[60] w-72 bg-[#0a0a0a] border-r border-white/10 p-6 flex flex-col justify-between transition-transform duration-500 ease-out md:hidden ${
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="space-y-12">
                    <div className="flex items-center justify-between">
                        <img src="/logo.png" alt="GV Capital" className="h-[50px] w-auto object-contain mix-blend-screen" />
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="p-2 rounded-full border border-white/10 text-white"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <nav className="space-y-2">
                        <button
                            onClick={() => { setActiveTab("overview"); setIsSidebarOpen(false); }}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "overview" ? "bg-gv-gold text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            {t.nav}
                        </button>
                        <button
                            onClick={() => { setActiveTab("products"); setIsSidebarOpen(false); }}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "products" ? "bg-gv-gold text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                            Products
                        </button>
                        <button
                            onClick={() => { setActiveTab("statements"); setIsSidebarOpen(false); }}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "statements" ? "bg-gv-gold text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Statements
                        </button>
                        <button
                            onClick={() => { setActiveTab("profile"); setIsSidebarOpen(false); }}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "profile" ? "bg-gv-gold text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            {t.profile}
                        </button>
                        <button
                            onClick={() => { setActiveTab("security"); setIsSidebarOpen(false); }}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "security" ? "bg-gv-gold text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            {t.securityTitle}
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
                <div className="flex items-center justify-between p-4 border-b border-white/5 md:hidden bg-[#0a0a0a]">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <img src="/logo.png" alt="GV" className="h-8 w-auto mix-blend-screen" />
                    </div>
                    {user && <NotificationBell userId={user.id} />}
                </div>

                <CurrencyExchangeTicker />
                <div className="max-w-7xl mx-auto w-full space-y-12 flex-1 pb-20 p-6 md:p-12">
                    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                        <div>
                            <p className="text-zinc-500 text-[10px] sm:text-sm font-black uppercase tracking-[0.3em] mb-2">{t.nav}</p>
                            <h1 className="text-3xl sm:text-4xl font-black">
                                {t.welcome}<span className="text-gv-gold tracking-tighter">{user?.fullName || "Member"}</span>
                            </h1>
                        </div>
                        <div className="flex items-center gap-6 hidden sm:flex">
                            {user && <NotificationBell userId={user.id} />}
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-gv-gold to-[#B8860B] flex items-center justify-center font-black text-black text-xl border border-gv-gold/30 shadow-lg capitalize">
                                {user?.fullName?.[0] || user?.email?.[0] || "U"}
                            </div>
                        </div>
                    </header>

                    {activeTab === "overview" ? (
                        <>
                            {(!user?.is_verified && user?.email !== "thenja96@gmail.com") ? (
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
                                                onClick={() => router.push(`/verify?lang=${lang}`)}
                                                className="bg-white text-red-600 font-black px-10 py-5 rounded-2xl uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
                                            >
                                                Re-upload Documents
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-[#1a1a1a] p-12 rounded-[40px] border border-white/5 shadow-xl space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700 text-center py-20">
                                        <div className="h-24 w-24 bg-gv-gold/10 rounded-full flex items-center justify-center mx-auto text-gv-gold shadow-[0_0_50px_rgba(212,175,55,0.1)]">
                                            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                        </div>
                                        <div className="space-y-4">
                                            <h2 className="text-3xl font-black uppercase tracking-tighter">
                                                {user?.kyc_status === 'Draft' ? "Verification in Progress" : "Complete Your Profile"}
                                            </h2>
                                            <p className="text-zinc-500 font-medium leading-relaxed max-w-lg mx-auto">
                                                {user?.kyc_status === 'Draft' 
                                                    ? "You have a saved draft. Please complete our 3-step verification process to unlock all features." 
                                                    : "Please complete our 3-step verification process to unlock investment features and secure your account."}
                                            </p>
                                        </div>
                                        <Link 
                                            href={`/verify?lang=${lang}`}
                                            className="inline-block bg-gv-gold text-black font-black text-xl px-12 py-5 rounded-[28px] hover:bg-gv-gold/90 transition-all shadow-[0_20px_40px_rgba(212,175,55,0.2)] uppercase tracking-widest"
                                        >
                                            {user?.kyc_status === 'Draft' || (user?.kyc_step && user.kyc_step > 1) ? "Resume Verification" : "Start Verification"}
                                        </Link>
                                    </div>
                                )
                            ) : (
                                <>
                                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {/* Total Wallet Amount */}
                                        <div className="bg-[#1a1a1a] border border-white/5 p-8 rounded-[40px] shadow-xl hover:border-gv-gold/20 transition-all group">
                                            <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-4 group-hover:text-zinc-400 transition-colors">{t.totalAssets}</p>
                                            <div className="flex flex-col gap-2">
                                                <h2 className="text-3xl font-black tracking-tighter">
                                                    {isCheckingAuth ? "..." : (user?.kyc_completed ? `RM ${Number(user?.total_assets || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "RM 0.00")}
                                                </h2>
                                                {!isCheckingAuth && user?.kyc_completed && (
                                                    <p className="text-[10px] font-bold text-zinc-500">
                                                        (${(Number(user?.total_assets || 0) / forexRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Total Investment */}
                                        <div className="bg-[#1a1a1a] border border-white/5 p-8 rounded-[40px] shadow-xl hover:border-gv-gold/20 transition-all group">
                                            <div className="flex justify-between items-start mb-4">
                                                <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest group-hover:text-zinc-400 transition-colors">{t.totalEquity}</p>
                                                <span className="text-[8px] font-black text-gv-gold border border-gv-gold/20 px-2 py-0.5 rounded-full uppercase">{t.investmentNote}</span>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <h2 className="text-3xl font-black tracking-tighter text-gv-gold">
                                                    {isCheckingAuth ? "..." : `RM ${Number(user?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                                </h2>
                                                {!isCheckingAuth && (
                                                    <p className="text-[10px] font-bold text-zinc-500">
                                                        (${(Number(user?.balance || 0) / forexRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Total Dividend */}
                                        <div className="bg-[#1a1a1a] border border-white/5 p-8 rounded-[40px] shadow-xl hover:border-gv-gold/20 transition-all group">
                                            <div className="flex justify-between items-start mb-4">
                                                <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest group-hover:text-zinc-400 transition-colors">{t.totalProfit}</p>
                                                <span className="text-[8px] font-black text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">{t.dividendNote}</span>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <h2 className="text-3xl font-black tracking-tighter text-emerald-500">
                                                    {isCheckingAuth ? "..." : `RM ${Number(user?.profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                                </h2>
                                                {!isCheckingAuth && (
                                                    <p className="text-[10px] font-bold text-zinc-500">
                                                        (${(Number(user?.profit || 0) / forexRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Current Package */}
                                        <div className="bg-gv-gold/5 border border-gv-gold/10 p-8 rounded-[40px] shadow-xl relative overflow-hidden group">
                                            <p className="text-gv-gold text-[10px] font-black uppercase tracking-widest mb-4">{t.currentPackage}</p>
                                            <div className="flex flex-col gap-1">
                                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                                                    {getTierByAmount(Number(user?.balance || 0) / forexRate).name}
                                                </h2>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <div className="h-2 w-2 rounded-full bg-gv-gold animate-pulse"></div>
                                                    <span className="text-[10px] font-black text-gv-gold uppercase tracking-widest">Active Status</span>
                                                </div>
                                            </div>
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <svg className="h-12 w-12 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                                    <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-2.06 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946 2.06 3.42 3.42 0 012.219 4.438 3.42 3.42 0 00-2.06 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 002.06 1.946 3.42 3.42 0 01-2.219 4.438 3.42 3.42 0 00-1.946-2.06 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946 2.06 3.42 3.42 0 01-2.219-4.438 3.42 3.42 0 002.06-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00-2.06-1.946 3.42 3.42 0 012.219-4.438z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="bg-[#111] border border-white/5 p-10 rounded-[40px] relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-all">
                                                <svg className="h-20 w-20 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-4">{t.expectedMonthly}</p>
                                            {(() => {
                                                const currentTier = getTierByAmount(Number(user?.balance || 0) / forexRate);
                                                const monthlyMin = Number(user?.balance || 0) * currentTier.minDividend;
                                                const monthlyMax = Number(user?.balance || 0) * currentTier.maxDividend;
                                                return (
                                                    <h3 className="text-3xl font-black text-white">
                                                        RM {monthlyMin.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} - RM {monthlyMax.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                    </h3>
                                                );
                                            })()}
                                            <p className="text-[10px] text-zinc-600 font-bold uppercase mt-4 tracking-tighter">
                                                Based on {getTierByAmount(Number(user?.balance || 0) / forexRate).minDividend * 100}-{getTierByAmount(Number(user?.balance || 0) / forexRate).maxDividend * 100}% {getTierByAmount(Number(user?.balance || 0) / forexRate).name} Returns
                                            </p>
                                        </div>
                                        <div className="bg-[#111] border border-white/5 p-10 rounded-[40px] relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-all">
                                                <svg className="h-20 w-20 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                            </div>
                                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-4">{t.projectedYearly}</p>
                                            {(() => {
                                                const currentTier = getTierByAmount(Number(user?.balance || 0) / forexRate);
                                                const yearlyMin = Number(user?.balance || 0) * currentTier.minDividend * 12;
                                                const yearlyMax = Number(user?.balance || 0) * currentTier.maxDividend * 12;
                                                return (
                                                    <h3 className="text-3xl font-black text-emerald-500">
                                                        RM {yearlyMin.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} - RM {yearlyMax.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                    </h3>
                                                );
                                            })()}
                                            <p className="text-[10px] text-zinc-600 font-bold uppercase mt-4 tracking-tighter">Yearly Forecast (Based on {getTierByAmount(Number(user?.balance || 0) / forexRate).name})</p>
                                        </div>
                                    </section>

                                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 bg-[#1a1a1a] border border-white/5 p-10 rounded-[40px] space-y-8">
                                            <h3 className="text-xl font-black uppercase tracking-tighter">{t.dividendTrends}</h3>
                                            <div className="h-64 flex items-end justify-between gap-4 px-4">
                                                {dividendHistory.length > 0 ? dividendHistory.map((div: any, i: number) => (
                                                    <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                                                        <div
                                                            className="w-full bg-gv-gold rounded-t-xl transition-all duration-500 group-hover:brightness-125"
                                                            style={{ height: `${Math.max(10, (div.amount / (Math.max(...dividendHistory.map((d: any) => d.amount)) || 1)) * 100)}%` }}
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
                                            {transactions.find((t: any) => t.type === 'Deposit') ? (
                                                <>
                                                    <div className={`h-24 w-24 rounded-full flex items-center justify-center border-2 ${transactions.find((t: any) => t.type === 'Deposit').status === 'Approved' ? 'border-emerald-500/20 text-emerald-500' : transactions.find((t: any) => t.type === 'Deposit').status === 'Rejected' ? 'border-red-500/20 text-red-500' : 'border-amber-500/20 text-amber-500'}`}>
                                                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    </div>
                                                    <div>
                                                        <h4 className={`text-2xl font-black uppercase tracking-tighter ${transactions.find((t: any) => t.type === 'Deposit').status === 'Approved' ? 'text-emerald-500' : transactions.find((t: any) => t.type === 'Deposit').status === 'Rejected' ? 'text-red-500' : 'text-amber-500'}`}>{transactions.find((t: any) => t.type === 'Deposit').status}</h4>
                                                        <p className="text-zinc-600 text-[10px] font-bold uppercase mt-1">{formatCurrency(transactions.find((t: any) => t.type === 'Deposit').amount)} Ref: {transactions.find((t: any) => t.type === 'Deposit').ref_id}</p>
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
                                    className={`flex-1 font-black text-xl py-6 rounded-[28px] transition-all flex items-center justify-center gap-3 ${user?.is_verified ? "bg-gv-gold text-black hover:bg-gv-gold/90 hover:-translate-y-1 shadow-[0_15px_30px_rgba(212,175,55,0.2)]" : "bg-white/5 text-zinc-600 cursor-not-allowed grayscale"}`}
                                    onClick={(e) => handleProtectedAction(e, () => router.push(`/deposit?lang=${lang}`))}
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>
                                    {t.deposit}
                                </Link>
                                <button
                                    onClick={(e) => handleProtectedAction(e, () => setIsWithdrawModalOpen(true))}
                                    className={`flex-1 font-black text-xl py-6 rounded-[28px] transition-all flex items-center justify-center gap-3 ${user?.is_verified ? "bg-[#222] text-white hover:bg-[#333] hover:-translate-y-1 border border-white/10" : "bg-white/5 text-zinc-600 cursor-not-allowed grayscale"}`}
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
                                                <p className="text-xl font-black text-gv-gold tracking-widest">{user?.username}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(user?.username);
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
                                                const url = typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${user?.username}` : `https://gvcapital.com/register?ref=${user?.username}`;
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
                                            {transactions.map((tx: any, idx: number) => (
                                                <tr key={idx} className="text-sm font-bold group hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-8 py-6 text-zinc-500">{new Date(tx.created_at || tx.date).toISOString().split('T')[0]}</td>
                                                    <td className="px-8 py-6 font-mono text-xs text-white/40">{tx.ref_id || tx.ref}</td>
                                                    <td className="px-8 py-6 uppercase tracking-widest text-[10px]">{tx.type}</td>
                                                    <td className={`px-8 py-6 text-lg tracking-tighter ${Number(tx.amount) >= 0 ? "text-emerald-400" : "text-white"}`}>
                                                        <div className="flex flex-col">
                                                            <span>RM {Number(tx.amount || 0).toFixed(2)}</span>
                                                            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">(${(Number(tx.amount || 0) / (forexRate || 4.0)).toFixed(2)})</span>
                                                        </div>
                                                    </td>
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
                    ) : activeTab === "products" ? (
                        <ProductSelection
                            currentInvestment={Number(user?.balance || 0) / (forexRate || 4.0)}
                            lang={lang}
                            onOpenComparison={() => setIsComparisonOpen(true)}
                            forexRate={forexRate}
                        />
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
                                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedMonth(parseInt(e.target.value))}
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
                                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedYear(parseInt(e.target.value))}
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
                    ) : activeTab === "profile" ? (
                        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Personal Information */}
                                <div className="bg-[#1a1a1a] border border-white/5 p-10 rounded-[40px] shadow-2xl space-y-8 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gv-gold/5 blur-[50px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-1000"></div>
                                    <div className="relative z-10">
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-gv-gold mb-8 flex items-center gap-3">
                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            {t.personalInfo}
                                        </h3>
                                        <div className="grid gap-6">
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{t.fullName}</p>
                                                <p className="text-lg font-bold text-white tracking-tight">{user?.fullName || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{t.username}</p>
                                                <p className="text-lg font-bold text-white tracking-tight">@{user?.username || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{t.email}</p>
                                                <p className="text-lg font-bold text-white tracking-tight">{user?.email || "-"}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{t.phone}</p>
                                                    <p className="text-lg font-bold text-white tracking-tight">{user?.phone || "-"}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{t.country}</p>
                                                    <p className="text-lg font-bold text-white tracking-tight">{user?.country || "-"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Compliance & Industry */}
                                <div className="bg-[#1a1a1a] border border-white/5 p-10 rounded-[40px] shadow-2xl space-y-8 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gv-gold/5 blur-[50px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-1000"></div>
                                    <div className="relative z-10">
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-gv-gold mb-8 flex items-center gap-3">
                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                            {t.compliance}
                                        </h3>
                                        <div className="grid gap-6">
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{t.occupation}</p>
                                                <p className="text-lg font-bold text-white tracking-tight">{user?.occupation || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{t.industry}</p>
                                                <p className="text-lg font-bold text-white tracking-tight">{user?.industry || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{t.wealthSource}</p>
                                                <p className="text-lg font-bold text-white tracking-tight">{user?.source_of_wealth || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{t.riskProfile}</p>
                                                <p className="text-lg font-bold text-emerald-400 tracking-tight">{user?.risk_profile || "-"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bank Details */}
                            <div className="bg-gv-gold/5 border border-gv-gold/10 p-10 rounded-[40px] shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/5 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-1000"></div>
                                <div className="relative z-10">
                                    <h3 className="text-xl font-black uppercase tracking-tighter text-gv-gold mb-8 flex items-center gap-3">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 00-3 3z" /></svg>
                                        {t.bankDetails}
                                    </h3>
                                    <div className="flex flex-col md:flex-row gap-12">
                                        <div className="space-y-1 flex-1">
                                            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{t.bankName}</p>
                                            <p className="text-2xl font-black text-white tracking-widest uppercase">{user?.bank_name || "-"}</p>
                                        </div>
                                        <div className="space-y-1 flex-1">
                                            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{t.accNumber}</p>
                                            <p className="text-2xl font-black text-white tracking-[0.2em] font-mono">{user?.account_number ? `**** **** ${user.account_number.slice(-4)}` : "-"}</p>
                                        </div>
                                    </div>
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
                                <input type="number" value={depositAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepositAmount(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-2xl font-black focus:outline-none focus:border-gv-gold transition-all" placeholder="0.00" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Transfer Date</label>
                                <input type="date" value={depositDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepositDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xl font-black focus:outline-none focus:border-gv-gold transition-all text-white inverted-scheme-date-picker" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Bank Receipt (Image/PDF)</label>
                                <div className="border border-white/10 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-colors cursor-pointer relative group">
                                    <svg className="h-10 w-10 text-zinc-600 mb-4 group-hover:text-gv-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{depositReceipt ? (depositReceipt as File).name : "Select Document"}</span>
                                    <input type="file" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepositReceipt(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,.pdf" />
                                </div>
                            </div>
                            <button onClick={handleDepositSubmit} disabled={isSubmitting || !depositAmount || !depositReceipt} className="w-full bg-gv-gold text-black font-black py-5 rounded-2xl flex justify-center items-center gap-3 uppercase tracking-widest shadow-xl disabled:opacity-50 transition-all hover:-translate-y-1">
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
                                <input type="number" value={withdrawAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWithdrawAmount(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-2xl font-black focus:outline-none focus:border-gv-gold transition-all" placeholder="0.00" />
                            </div>
                             <button onClick={() => handleWithdrawInitiate()} disabled={!withdrawAmount} className="w-full bg-white text-black font-black py-5 rounded-2xl flex justify-center items-center gap-3 uppercase tracking-widest shadow-xl disabled:opacity-50">
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
                                 onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWithdrawPIN(e.target.value)}
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

            {isComparisonOpen && (
                <ComparisonTable lang={lang} onClose={() => setIsComparisonOpen(false)} />
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
                    <p className="text-zinc-400 max-w-md font-medium text-lg leading-relaxed mb-6">
                        {kycShowSuccess ? "Our compliance team will review your account within 24 hours. Your portfolio will activate automatically upon approval." : t.successDesc}
                    </p>
                    {successRefId && !kycShowSuccess && (
                        <div className="bg-white/10 px-8 py-4 rounded-full border border-emerald-500/30 text-emerald-400 font-black tracking-widest uppercase text-lg animate-in zoom-in-95 delay-150 duration-500 text-center flex items-center gap-3">
                           <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Ref: {successRefId}
                        </div>
                    )}
                </div>
            )}
            {/* Action Toast */}
            {actionToast && (
                <div className="fixed bottom-6 right-6 z-[600] bg-[#1a1a1a] border border-gv-gold/30 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-5 max-w-sm shadow-gv-gold/10">
                    <div className="flex flex-col gap-5">
                        <div className="flex items-start justify-between gap-4">
                            <p className="text-white font-black text-sm uppercase tracking-widest leading-relaxed">{actionToast.message}</p>
                            <button onClick={() => setActionToast(null)} className="text-zinc-500 hover:text-white transition-colors shrink-0">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        {actionToast.actionUrl && (
                            <button
                                onClick={() => {
                                    setActionToast(null);
                                    router.push(actionToast.actionUrl as string);
                                }}
                                className="w-full bg-gv-gold text-black font-black py-3 px-6 rounded-xl uppercase tracking-widest text-xs hover:bg-gv-gold/90 transition-all shadow-lg active:scale-95"
                            >
                                {actionToast.actionText}
                            </button>
                        )}
                    </div>
                </div>
            )}
            {/* Global style tag for date pickers avoiding messy classes */}
            <style jsx>{`
                .inverted-scheme-date-picker::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
}
