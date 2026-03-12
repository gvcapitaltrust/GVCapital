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

export default function DashboardClient() {
    const { user: authUser, role: authRole, isVerified: authVerified, refresh: refreshAuth } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [lang, setLang] = useState<"en" | "zh">("en");
    const [user, setUser] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [monthlyRate, setMonthlyRate] = useState(0.08); // 8% Default
    const [yearlyRate, setYearlyRate] = useState(0.96); // 96% Default
    const [dividendHistory, setDividendHistory] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"overview" | "statements" | "security" | "profile">("overview");
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [referredCount, setReferredCount] = useState(0);
    const [forexRate, setForexRate] = useState(1.0); // Safe fallback as requested

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // UI States
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successRefId, setSuccessRefId] = useState("");
    const [actionToast, setActionToast] = useState<{message: string, actionUrl?: string, actionText?: string} | null>(null);

    // Form States
    const [depositAmount, setDepositAmount] = useState("");
    const [depositDate, setDepositDate] = useState("");
    const [depositReceipt, setDepositReceipt] = useState<File | null>(null);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawPIN, setWithdrawPIN] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [otpSending, setOtpSending] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otpError, setOtpError] = useState("");

    // Profile Edit States
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({ full_name: "", phone: "", address: "", city: "" });
    const [profileSaving, setProfileSaving] = useState(false);

    // Lock Countdown
    const [lockCountdown, setLockCountdown] = useState("");
    const [earliestUnlock, setEarliestUnlock] = useState<Date | null>(null);

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
        
        if (!authUser) {
            if (!isCheckingAuth) setIsCheckingAuth(false);
            return;
        }



        const fetchUserData = async () => {
            console.log("FETCHING DASHBOARD DATA for:", authUser.email);
            
            try {
                // 1. Fetch Forex Rate first for global calculations
                const { data: psRate, error: psError } = await supabase.from('platform_settings').select('value').eq('key', 'usd_to_myr_rate').single();
                const currentRate = (!psRate || psError) ? 4.0 : parseFloat(psRate.value) || 4.0;
                setForexRate(currentRate);
                console.log('Effective Forex Rate (Loaded or Fallback):', currentRate);

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

                    const totalAssetsCalc = Number(profile.balance || 0) + Number(profile.profit || 0);
                    console.log('Balance:', profile.balance, 'Profit:', profile.profit, 'Total Assets Calc:', totalAssetsCalc, 'Rate:', currentRate);
                    setUser({
                        ...authUser,
                        ...profile,
                        is_verified: dbIsVerified,
                        kyc_completed: kycApproved,
                        fullName: profile.full_name || authUser.user_metadata?.full_name,
                        total_assets: totalAssetsCalc,
                        totalEquity: totalAssetsCalc
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
                    setDividendHistory(txs.filter((t: any) => t.type === 'Dividend' || t.type === 'bonus').slice(0, 6).reverse());

                    // Calculate 6-month lock from approved deposits
                    const approvedDeposits = txs.filter((t: any) => t.type === 'Deposit' && t.status === 'Approved');
                    if (approvedDeposits.length > 0) {
                        const lockDates = approvedDeposits.map((d: any) => {
                            const depositDate = new Date(d.created_at || d.date);
                            const lockEnd = new Date(depositDate);
                            lockEnd.setMonth(lockEnd.getMonth() + 6);
                            return lockEnd;
                        });
                        // Find the earliest lock that hasn't expired yet
                        const now = new Date();
                        const futureLocks = lockDates.filter((d: Date) => d > now);
                        if (futureLocks.length > 0) {
                            const earliest = futureLocks.reduce((a: Date, b: Date) => a < b ? a : b);
                            setEarliestUnlock(earliest);
                        }
                    }
                }

                // Pre-fill profile form
                if (profile) {
                    setProfileForm({
                        full_name: profile.full_name || authUser.user_metadata?.full_name || "",
                        phone: profile.phone || "",
                        address: profile.address || "",
                        city: profile.city || "",
                    });
                }

                // 4. Fetch Rates & Referrals
                const { data: rates } = await supabase.from('settings').select('*').in('key', ['monthly_return_rate', 'yearly_return_rate']);
                if (rates) {
                    setMonthlyRate(parseFloat(rates.find((r: any) => r.key === 'monthly_return_rate')?.value || "0.08"));
                    setYearlyRate(parseFloat(rates.find((r: any) => r.key === 'yearly_return_rate')?.value || "0.96"));
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
        // Send OTP for email verification
        handleSendOtp();
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

    // Countdown timer for locked capital
    useEffect(() => {
        if (!earliestUnlock) return;
        const timer = setInterval(() => {
            const now = new Date();
            const diff = earliestUnlock.getTime() - now.getTime();
            if (diff <= 0) {
                setLockCountdown("Unlocked");
                setEarliestUnlock(null);
                clearInterval(timer);
                return;
            }
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setLockCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }, 1000);
        return () => clearInterval(timer);
    }, [earliestUnlock]);

    // OTP Handlers
    const handleSendOtp = async () => {
        if (!user) return;
        setOtpSending(true);
        setOtpError("");
        try {
            const res = await fetch("/api/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    userId: user.id, 
                    email: user.email,
                    amount: withdrawAmount 
                }),
            });
            const data = await res.json();
            if (data.success) {
                setOtpSent(true);
                setIsOtpModalOpen(true);
                // In dev mode, auto-fill OTP for testing
                if (data._dev_otp) {
                    setOtpCode(data._dev_otp);
                }
            } else {
                setOtpError(data.error || "Failed to send OTP");
            }
        } catch (err: any) {
            setOtpError(err.message);
        } finally {
            setOtpSending(false);
        }
    };

    const verifyOTP = async (code: string) => {
        if (!user) return false;
        
        const { data: otpRecord, error: otpErr } = await supabase
            .from("otp_codes")
            .select("*")
            .eq("user_id", user.id)
            .eq("code", code)
            .gte("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (otpErr || !otpRecord) {
            return false;
        }

        // Delete the OTP code after verification as requested
        await supabase.from("otp_codes").delete().eq("id", otpRecord.id);
        return true;
    };

    const handleOtpWithdraw = async () => {
        if (otpCode.length !== 6) {
            setOtpError("Please enter the 6-digit OTP code.");
            return;
        }
        setIsSubmitting(true);
        setOtpError("");

        try {
            const isValid = await verifyOTP(otpCode);

            if (!isValid) {
                setOtpError("Invalid or expired OTP. Please request a new one.");
                setIsSubmitting(false);
                return;
            }

            // Create the withdrawal transaction
            const refId = `TXN-${Math.floor(1000 + Math.random() * 9000)}`;
            const { error } = await supabase
                .from("transactions")
                .insert([{
                    user_id: user.id,
                    type: "Withdrawal",
                    amount: parseFloat(withdrawAmount),
                    status: "Pending",
                    ref_id: refId,
                }]);

            if (error) throw error;

            // Clean up
            setIsOtpModalOpen(false);
            setIsWithdrawModalOpen(false);
            setWithdrawAmount("");
            setOtpCode("");
            setOtpSent(false);
            setSuccessRefId(refId);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);

            // Refetch transactions
            let refetchQuery = supabase.from("transactions").select("*");
            if (user?.email !== "thenja96@gmail.com") {
                refetchQuery = refetchQuery.eq("user_id", user.id);
            }
            const { data: txs } = await refetchQuery.order("created_at", { ascending: false });
            if (txs) setTransactions(txs);

        } catch (err: any) {
            setOtpError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Profile Save Handler
    const handleProfileSave = async () => {
        if (!user) return;
        setProfileSaving(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    full_name: profileForm.full_name,
                    phone: profileForm.phone,
                    address: profileForm.address,
                    city: profileForm.city,
                })
                .eq("id", user.id);

            if (error) throw error;
            setIsEditingProfile(false);
            // Update local user state
            setUser((prev: any) => ({ ...prev, ...profileForm, fullName: profileForm.full_name }));
            alert(lang === "en" ? "Profile updated successfully." : "涓汉璧勬枡宸叉垚鍔熸洿鏂般€?);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setProfileSaving(false);
        }
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
            alert(lang === "en" ? "Please complete all required fields and upload your ID." : "璇峰～鍐欐墍鏈夊繀濉瓧娈靛苟涓婁紶鎮ㄧ殑璇佷欢鐓х墖銆?);
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
            totalAssets: "Total Assets",
            activeInvestment: "Active Investment",
            totalProfit: "Total Profit",
            totalEquity: "Total Equity",
            deposit: "Deposit",
            withdraw: "Withdraw",
            history: "Transaction History",
            unverifiedBanner: "鈿狅笍 Account Unverified. Access to Deposits, Withdrawals, and Trading is restricted.",
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
            welcome: "娆㈣繋鍥炴潵锛?,
            nav: "鎺у埗鍙?,
            logout: "閫€鍑虹櫥褰?,
            totalAssets: "鎬昏祫浜?,
            activeInvestment: "娲昏穬鎶曡祫",
            totalProfit: "鎬绘敹鐩?,
            totalEquity: "鎬绘潈鐩?,
            deposit: "鍏ラ噾",
            withdraw: "鎻愭",
            history: "浜ゆ槗鍘嗗彶",
            unverifiedBanner: "鈿狅笍 璐︽埛鏈牳瀹炪€傚瓨娆俱€佸彇娆惧拰浜ゆ槗鍔熻兘鍙楅檺銆?,
            verifyNow: "绔嬪嵆鏍稿疄",
            securityPin: "鍙栨瀹夊叏瀵嗙爜",
            enterPin: "璇疯緭鍏ユ偍鐨?6 浣嶅彇娆惧瘑鐮佷互鎺堟潈姝ょ敵璇枫€?,
            confirmWithdraw: "鎺堟潈鎻愭",
            successTitle: "鎻愪氦鎴愬姛",
            successDesc: "鎴戜滑鐨勫洟闃熷皢鍦?24 灏忔椂鍐呭鏍告偍鐨勭敵璇枫€?,
            whatsapp: "閫氳繃 WhatsApp 鑱旂郴鏀寔",
            expectedMonthly: "棰勮鏈堝害鑲℃伅",
            projectedYearly: "棰勮骞村害鍒╂鼎",
            latestDeposit: "鏈€鏂板瓨娆剧姸鎬?,
            dividendTrends: "6 涓湀鑲℃伅瓒嬪娍",
            downloadStatement: "涓嬭浇鏈堝害璐﹀崟",
            referTitle: "鎺ㄨ崘鏈嬪弸",
            referSubtitle: "閭€璇蜂粬浜哄姞鍏?GV 璧勬湰锛屽叡鍚屽彂灞曠ぞ鍖恒€?,
            copyCode: "澶嶅埗鎺ㄨ崘鐮?,
            copied: "宸插鍒?",
            shareWA: "鍦?WhatsApp 涓婂垎浜?,
            totalReferred: "宸叉垚鍔熸帹鑽愪汉鏁?,
            securityTitle: "瀹夊叏璁剧疆",
            securitySubtitle: "鏇存柊鎮ㄧ殑璐︽埛瀵嗙爜浠ョ‘淇濇偍鐨勮祫閲戝緱鍒颁繚鎶ゃ€?,
            currentPass: "褰撳墠瀵嗙爜",
            newPass: "鏂板瘑鐮?,
            confirmPass: "纭鏂板瘑鐮?,
            updateBtn: "鏇存柊瀵嗙爜",
            pendingVerification: "璐︽埛寰呭鏍搞€傝鑱旂郴鎮ㄧ殑浠ｇ悊鎴栫鐞嗗憳浠ユ縺娲绘偍鐨勮处鎴枫€?,
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
        <div className="min-h-screen bg-[#0F0F0F] text-white flex font-sans overflow-hidden relative">
            <title>{`Dashboard | GV Capital Trust`}</title>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}

            <aside className={`
                fixed md:relative z-[101] h-full w-64 border-r border-white/10 p-6 flex flex-col justify-between 
                bg-[#0F0F0F] transition-transform duration-300 md:translate-x-0
                ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
            `}>
                <div className="space-y-12">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="GV Capital" className="h-10 md:h-12 w-auto object-contain mix-blend-screen" />
                    </div>

                    <nav className="space-y-2">
                        <button
                            onClick={() => setActiveTab("overview")}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-[12px] font-bold uppercase tracking-[0.1em] transition-all duration-300 duration-300 ${activeTab === "overview" ? "bg-gv-gold text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            {t.nav}
                        </button>
                        <button
                            onClick={() => setActiveTab("statements")}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-[12px] font-bold uppercase tracking-[0.1em] transition-all duration-300 duration-300 ${activeTab === "statements" ? "bg-gv-gold text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Statements
                        </button>
                        <button
                            onClick={() => setActiveTab("security")}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-[12px] font-bold uppercase tracking-[0.1em] transition-all duration-300 duration-300 ${activeTab === "security" ? "bg-gv-gold text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            Security
                        </button>
                        <button
                            onClick={() => setActiveTab("profile")}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-[12px] font-bold uppercase tracking-[0.1em] transition-all duration-300 duration-300 ${activeTab === "profile" ? "bg-gv-gold text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            Profile
                        </button>
                    </nav>
                </div>
                <div className="space-y-4">
                    {/* DEBUG MODE INFO */}
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-left space-y-1">
                        <div className="text-[9px] font-black uppercase text-red-500 tracking-widest">Debug Mode</div>
                        <div className="text-[10px] text-white/50 font-mono truncate">{user?.email}</div>
                        <div className="text-xs text-white font-mono">Role: {user?.role || 'null'}</div>
                        <div className="text-xs text-white font-mono">Verified: {String(user?.is_verified)}</div>
                    </div>

                    <button onClick={() => setLang(lang === "en" ? "zh" : "en")} className="w-full rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/5 transition-all duration-300 duration-300 text-zinc-400">
                        {lang === "en" ? "鍒囨崲鑷?绠€浣撲腑鏂? : "Switch to English"}
                    </button>
                    <button onClick={handleLogout} className="w-full text-zinc-500 hover:text-red-400 transition-colors text-sm font-medium flex items-center gap-3 px-4 py-2">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
                        {t.logout}
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#0F0F0F] relative flex flex-col">
                <CurrencyExchangeTicker />
                <div className="main-container space-y-12 flex-1 pb-20 p-4 md:p-12">
                    <header className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex flex-col items-center md:items-start w-full md:w-auto">
                            <div className="md:hidden mb-6">
                                <img src="/logo.png" alt="GV Capital" className="h-8 md:h-12 w-auto object-contain mix-blend-screen" />
                            </div>
                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">{t.nav}</p>
                            <h1 className="text-3xl md:text-5xl font-bold text-center md:text-left tracking-[-0.02em]">
                                {t.welcome}<span className="text-gv-gold tracking-tighter drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">{user?.fullName || "Member"}</span>
                            </h1>
                        </div>
                        <div className="flex items-center gap-4 md:gap-6 bg-white/5 p-2 rounded-lg border border-white/10 glass-card">
                            <button 
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="md:hidden h-12 w-12 rounded-lg bg-white/5 flex items-center justify-center border border-white/10"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                            </button>
                            {user && <NotificationBell userId={user.id} />}
                            <div className="h-14 w-14 rounded-lg bg-gv-gold-gradient metallic-shine flex items-center justify-center font-black text-black text-xl border border-gv-gold/30 shadow-lg capitalize">
                                {user?.fullName?.[0] || user?.email?.[0] || "U"}
                            </div>
                        </div>
                    </header>

                    {activeTab === "overview" ? (
                        <>
                            {(!user?.is_verified && user?.email !== "thenja96@gmail.com") ? (
                                (user?.kyc_status === 'Pending' || user?.kyc_status === 'pending') ? (
                                    <div className="bg-amber-400 p-12 rounded-lg text-center space-y-8 py-24 animate-in fade-in zoom-in-95 duration-700 max-w-3xl mx-auto shadow-[0_30px_60px_rgba(0,0,0,0.5)] border border-amber-500/20">
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
                                    <div className="bg-red-500 p-12 rounded-lg text-center space-y-8 py-24 animate-in fade-in zoom-in-95 duration-700 max-w-3xl mx-auto shadow-[0_30px_60px_rgba(239,68,68,0.3)] border border-red-600/20">
                                        <div className="h-28 w-28 bg-white/20 rounded-full flex items-center justify-center mx-auto border-4 border-white/10">
                                            <svg className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                        <div className="space-y-6 text-white">
                                            <h2 className="text-4xl font-black uppercase tracking-tighter">Verification Unsuccessful</h2>
                                            <div className="bg-white/10 p-6 rounded-lg border border-white/20 max-w-2xl mx-auto">
                                                <p className="text-white font-bold text-xl leading-relaxed">
                                                    Our team was unable to verify your documents for the following reason:<br/>
                                                    <span className="text-black bg-white/90 px-3 py-1 mt-3 inline-block rounded-lg font-black uppercase tracking-tight">
                                                        {user?.rejection_reason || "Invalid Document Clarity / Mismatch Information"}
                                                    </span>
                                                </p>
                                            </div>
                                            <p className="text-white/80 font-medium">Please re-upload a clear copy of your ID to proceed.</p>
                                            <button 
                                                onClick={() => router.push(`/verify?lang=${lang}`)}
                                                className="bg-white text-red-600 font-black px-10 py-5 rounded-lg uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
                                            >
                                                Re-upload Documents
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-[#1a1a1a] p-12 rounded-lg border border-white/5 shadow-xl space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700 text-center py-20">
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
                                            className="inline-block bg-gv-gold text-black font-black text-xl px-12 py-5 rounded-[28px] hover:bg-gv-gold/90 transition-all duration-300 shadow-[0_20px_40px_rgba(212,175,55,0.2)] uppercase tracking-widest"
                                        >
                                            {user?.kyc_status === 'Draft' || (user?.kyc_step && user.kyc_step > 1) ? "Resume Verification" : "Start Verification"}
                                        </Link>
                                    </div>
                                )
                            ) : (
                                <>
                                    {/* Dual Wallet Cards */}
                                    <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Locked Capital Wallet */}
                                        <div className="bg-[#1a1a1a] border border-white/5 p-10 rounded-lg shadow-xl relative overflow-hidden group hover:border-amber-500/20 transition-all duration-300">
                                            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                                        <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Locked Capital</p>
                                                        <p className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest">6-Month Lock Period</p>
                                                    </div>
                                                </div>
                                                <h2 className="text-4xl font-black tracking-tighter text-white mb-2">
                                                    {isCheckingAuth ? "..." : `RM ${Number(user?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                                </h2>
                                                {!isCheckingAuth && (
                                                    <p className="text-sm font-bold text-zinc-500">
                                                        (${(Number(user?.balance || 0) / (forexRate || 4.0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                                    </p>
                                                )}
                                                {/* Lock Countdown */}
                                                {earliestUnlock && lockCountdown && lockCountdown !== "Unlocked" && (
                                                    <div className="mt-6 flex items-center gap-3 bg-amber-500/5 border border-amber-500/10 rounded-lg px-5 py-4">
                                                        <svg className="h-4 w-4 text-amber-500 shrink-0 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        <div>
                                                            <p className="text-[9px] font-black text-amber-500/70 uppercase tracking-widest">Next Unlock In</p>
                                                            <p className="text-sm font-black text-amber-400 tracking-wider font-mono">{lockCountdown}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {lockCountdown === "Unlocked" && (
                                                    <div className="mt-6 flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-5 py-4">
                                                        <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Capital Unlocked</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Available Dividends Wallet */}
                                        <div className="bg-[#1a1a1a] border border-white/5 p-10 rounded-lg shadow-xl relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
                                            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                                        <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Available Dividends</p>
                                                        <p className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest">Withdrawable Balance</p>
                                                    </div>
                                                </div>
                                                <h2 className="text-4xl font-black tracking-tighter text-emerald-500 mb-2">
                                                    {isCheckingAuth ? "..." : `RM ${Number(user?.profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                                </h2>
                                                {!isCheckingAuth && (
                                                    <p className="text-sm font-bold text-zinc-500">
                                                        (${(Number(user?.profit || 0) / (forexRate || 4.0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                                    </p>
                                                )}
                                                <div className="mt-6 flex items-center gap-2 text-[9px] font-black text-emerald-500/50 uppercase tracking-widest">
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
                                                    Available for withdrawal
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Total Assets Summary */}
                                    <section className="bg-[#111] border border-white/5 p-8 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-lg bg-gv-gold/10 border border-gv-gold/20 flex items-center justify-center">
                                                <svg className="h-6 w-6 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                                            </div>
                                            <div>
                                                <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">{t.totalAssets}</p>
                                                <h3 className="text-2xl font-black text-gv-gold tracking-tighter">
                                                    {isCheckingAuth ? "..." : (user?.kyc_completed ? `RM ${Number(user?.total_assets || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "RM 0.00")}
                                                </h3>
                                            </div>
                                        </div>
                                        {!isCheckingAuth && user?.kyc_completed && (
                                            <p className="text-sm font-bold text-zinc-500">
                                                (${(Number(user?.total_assets || 0) / (forexRate || 4.0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                            </p>
                                        )}
                                    </section>

                            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-[#111] border border-white/5 p-10 rounded-lg relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-all duration-300">
                                        <svg className="h-20 w-20 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <h3 className="text-3xl font-black text-white">RM {(user?.total_assets * monthlyRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                                    <p className="text-[10px] text-zinc-600 font-bold uppercase mt-4 tracking-tighter">Based on {(monthlyRate * 100).toFixed(0)}% Monthly Return</p>
                                </div>
                                <div className="bg-[#111] border border-white/5 p-10 rounded-lg relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-all duration-300">
                                        <svg className="h-20 w-20 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                    </div>
                                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-4">{t.projectedYearly}</p>
                                    <h3 className="text-3xl font-black text-emerald-500">RM {(user?.total_assets * yearlyRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                                    <p className="text-[10px] text-zinc-600 font-bold uppercase mt-4 tracking-tighter">Yearly Forecast ({(yearlyRate * 100).toFixed(0)}% ROI)</p>
                                </div>
                            </section>

                            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 bg-[#1a1a1a] border border-white/5 p-10 rounded-lg space-y-8">
                                    <h3 className="text-xl font-black uppercase tracking-tighter">{t.dividendTrends}</h3>
                                    <div className="h-64 flex items-end justify-between gap-4 px-4">
                                        {dividendHistory.length > 0 ? dividendHistory.map((div: any, i: number) => (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                                                <div
                                                    className="w-full bg-gv-gold-gradient metallic-shine rounded-t-xl transition-all duration-300 duration-500 group-hover:brightness-110"
                                                    style={{ height: `${Math.max(10, (div.amount / (Math.max(...dividendHistory.map((d: any) => d.amount)) || 1)) * 100)}%` }}
                                                ></div>
                                                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">{new Date(div.created_at).toLocaleDateString('en-US', { month: 'short' })}</span>
                                            </div>
                                        )) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-700 font-black uppercase tracking-widest text-xs">No Dividend Data Yet</div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-[#1a1a1a] border border-white/5 p-10 rounded-lg flex flex-col justify-center items-center text-center space-y-6">
                                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{t.latestDeposit}</p>
                                    {transactions.find((t: any) => t.type === 'Deposit') ? (
                                        <>
                                            <div className={`h-24 w-24 rounded-full flex items-center justify-center border-2 ${transactions.find(t => t.type === 'Deposit').status === 'Approved' ? 'border-emerald-500/20 text-emerald-500' : transactions.find(t => t.type === 'Deposit').status === 'Rejected' ? 'border-red-500/20 text-red-500' : 'border-amber-500/20 text-amber-500'}`}>
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
                                    className={`flex-1 font-black text-xl py-6 rounded-[28px] transition-all duration-300 flex items-center justify-center gap-3 ${user?.is_verified ? "bg-gv-gold text-black hover:bg-gv-gold/90 hover:-translate-y-1 shadow-[0_15px_30px_rgba(212,175,55,0.2)]" : "bg-white/5 text-zinc-600 cursor-not-allowed grayscale"}`}
                                    onClick={(e) => handleProtectedAction(e, () => router.push(`/deposit?lang=${lang}`))}
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>
                                    {t.deposit}
                                </Link>
                                <button
                                    onClick={(e) => handleProtectedAction(e, () => setIsWithdrawModalOpen(true))}
                                    className={`flex-1 font-black text-xl py-6 rounded-[28px] transition-all duration-300 flex items-center justify-center gap-3 ${user?.is_verified ? "bg-gv-gold-gradient metallic-shine text-black shadow-lg hover:-translate-y-1" : "bg-white/5 text-zinc-600 cursor-not-allowed grayscale"}`}
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                    {t.withdraw}
                                </button>
                            </section>

                            <section className="bg-[#1a1a1a] border border-white/5 p-10 rounded-lg relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-gv-gold/5 blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
                                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                                    <div className="space-y-4 max-w-lg">
                                        <h3 className="text-2xl font-black uppercase tracking-tighter">{t.referTitle}</h3>
                                        <p className="text-zinc-500 font-medium leading-relaxed">{t.referSubtitle}</p>
                                        <div className="flex items-center gap-4 mt-8">
                                            <div className="px-6 py-4 bg-white/5 border border-white/10 rounded-lg">
                                                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Your Code</p>
                                                <p className="text-xl font-black text-gv-gold tracking-widest">{user?.id}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(user?.id);
                                                    alert(t.copied);
                                                }}
                                                className="h-full px-6 py-4 bg-gv-gold text-black font-black text-xs uppercase tracking-widest rounded-lg hover:bg-gv-gold/90 transition-all duration-300 shadow-lg"
                                            >
                                                {t.copyCode}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-6 text-center md:text-right md:items-end">
                                        <div className="bg-[#222] border border-white/10 p-6 rounded-lg w-full md:w-auto">
                                            <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-1">{t.totalReferred}</p>
                                            <h4 className="text-4xl font-black text-white">{referredCount}</h4>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const url = typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${user?.id}` : `https://gvcapital.com/register?ref=${user?.id}`;
                                                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(t.referSubtitle + " " + url)}`);
                                            }}
                                            className="flex items-center gap-3 bg-[#25D366] text-white px-8 py-4 rounded-lg font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all duration-300 shadow-xl"
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
                                        className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-xs py-3 px-6 rounded-lg uppercase tracking-widest transition-all duration-300 flex items-center gap-2 w-full sm:w-auto justify-center"
                                    >
                                        <svg className="h-4 w-4 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
                                        {t.downloadStatement}
                                    </button>
                                </div>
                                <div className="border border-white/10 rounded-[30px] md:rounded-lg overflow-hidden bg-[#1a1a1a]/30 glass-card metallic-shine shadow-2xl">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left min-w-[600px] md:min-w-0">
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
                                                    <td className="px-8 py-6 text-right"><span className={`px-4 py-2 rounded-lg text-[9px] uppercase font-black tracking-widest ${tx.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : tx.status === 'Rejected' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>{tx.status}</span></td>
                                                </tr>
                                            ))}
                                            {transactions.length === 0 && (
                                                <tr><td colSpan={5} className="px-8 py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">No transaction history found</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            </section>
                        </>
                    )}
                </>
            ) : activeTab === "statements" ? (
                        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="bg-[#1a1a1a] border border-white/5 p-12 rounded-lg shadow-2xl overflow-hidden relative group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/5 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-300 duration-1000"></div>
                                <div className="relative z-10 max-w-2xl">
                                    <h2 className="text-3xl font-black uppercase tracking-tighter mb-4 text-white">Statement Center</h2>
                                    <p className="text-zinc-500 font-medium mb-12">Select your desired period to generate and download a professional investment statement.</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
                                        <div className="space-y-4">
                                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Month</label>
                                            <select
                                                value={selectedMonth}
                                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedMonth(parseInt(e.target.value))}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-5 text-lg font-black focus:outline-none focus:border-gv-gold transition-all duration-300 appearance-none cursor-pointer"
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
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-5 text-lg font-black focus:outline-none focus:border-gv-gold transition-all duration-300 appearance-none cursor-pointer"
                                            >
                                                {[2024, 2025, 2026].map(y => (
                                                    <option key={y} value={y} className="bg-[#1a1a1a] text-white">{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => generateStatement()}
                                        className="bg-gv-gold text-black font-black py-6 px-12 rounded-lg uppercase tracking-widest shadow-xl hover:shadow-gv-gold/20 hover:-translate-y-1 transition-all duration-300 active:scale-95 flex items-center gap-4"
                                    >
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
                                        Generate & Download PDF
                                    </button>
                                </div>
                            </div>
                        </section>
                    ) : activeTab === "security" ? (
                        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="bg-[#1a1a1a] border border-white/5 p-12 rounded-lg shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/5 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-300 duration-1000"></div>
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
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-5 text-xl font-bold focus:outline-none focus:border-gv-gold transition-all duration-300"
                                                placeholder="鈥⑩€⑩€⑩€⑩€⑩€⑩€⑩€?
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">{t.newPass}</label>
                                            <input
                                                name="newPassword"
                                                type="password"
                                                required
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-5 text-xl font-bold focus:outline-none focus:border-gv-gold transition-all duration-300"
                                                placeholder="鈥⑩€⑩€⑩€⑩€⑩€⑩€⑩€?
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">{t.confirmPass}</label>
                                            <input
                                                name="confirmPassword"
                                                type="password"
                                                required
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-5 text-xl font-bold focus:outline-none focus:border-gv-gold transition-all duration-300"
                                                placeholder="鈥⑩€⑩€⑩€⑩€⑩€⑩€⑩€?
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full bg-gv-gold text-black font-black py-6 rounded-lg uppercase tracking-widest shadow-xl hover:shadow-gv-gold/20 hover:-translate-y-1 transition-all duration-300 active:scale-95 flex items-center justify-center gap-4 mt-10"
                                        >
                                            {isSubmitting ? <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : t.updateBtn}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </section>
                    ) : activeTab === "profile" ? (
                        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="bg-[#1a1a1a] border border-white/5 p-12 rounded-lg shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/5 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-300 duration-1000"></div>
                                <div className="relative z-10 max-w-2xl mx-auto space-y-10">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 text-white">Profile Management</h2>
                                            <p className="text-zinc-500 font-medium">
                                                {lang === "en" ? "View and update your personal information." : "鏌ョ湅骞舵洿鏂版偍鐨勪釜浜轰俊鎭€?}
                                            </p>
                                        </div>
                                        {user?.is_verified && (
                                            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full">
                                                <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Verified</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Editable Fields */}
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Full Name</label>
                                                <input
                                                    type="text"
                                                    value={profileForm.full_name}
                                                    onChange={(e) => setProfileForm({...profileForm, full_name: e.target.value})}
                                                    disabled={!isEditingProfile}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-5 text-lg font-bold focus:outline-none focus:border-gv-gold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Email</label>
                                                <input
                                                    type="email"
                                                    value={user?.email || ""}
                                                    disabled
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-5 text-lg font-bold opacity-50 cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Phone Number</label>
                                                <input
                                                    type="tel"
                                                    value={profileForm.phone}
                                                    onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                                                    disabled={!isEditingProfile}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-5 text-lg font-bold focus:outline-none focus:border-gv-gold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    placeholder="+60 12345678"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">City</label>
                                                <input
                                                    type="text"
                                                    value={profileForm.city}
                                                    onChange={(e) => setProfileForm({...profileForm, city: e.target.value})}
                                                    disabled={!isEditingProfile}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-5 text-lg font-bold focus:outline-none focus:border-gv-gold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    placeholder="Kuala Lumpur"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Address</label>
                                            <input
                                                type="text"
                                                value={profileForm.address}
                                                onChange={(e) => setProfileForm({...profileForm, address: e.target.value})}
                                                disabled={!isEditingProfile}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-5 text-lg font-bold focus:outline-none focus:border-gv-gold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                placeholder="Street address"
                                            />
                                        </div>
                                    </div>

                                    {/* Bank Details 鈥?Read-Only when KYC verified */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xl font-black uppercase tracking-tighter text-white">Bank Details</h3>
                                            {user?.is_verified && (
                                                <span className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-[9px] font-black text-amber-500 uppercase tracking-widest">
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                    Read-Only
                                                </span>
                                            )}
                                        </div>
                                        {user?.is_verified && (
                                            <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg px-5 py-3">
                                                <p className="text-[10px] font-bold text-amber-500/70 uppercase tracking-widest">
                                                    {lang === "en"
                                                        ? "Bank details are locked after KYC verification for security. Contact support to update."
                                                        : "閾惰璇︽儏鍦↘YC楠岃瘉鍚庡凡閿佸畾浠ョ‘淇濆畨鍏ㄣ€傚闇€鏇存柊锛岃鑱旂郴瀹㈡湇銆?}
                                                </p>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Bank Name</label>
                                                <input
                                                    type="text"
                                                    value={user?.bank_name || ""}
                                                    disabled
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-5 text-lg font-bold opacity-50 cursor-not-allowed"
                                                    placeholder="Not set"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Account Number</label>
                                                <input
                                                    type="text"
                                                    value={user?.account_number ? `****${user.account_number.slice(-4)}` : ""}
                                                    disabled
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-5 text-lg font-bold opacity-50 cursor-not-allowed font-mono tracking-widest"
                                                    placeholder="Not set"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-4 pt-6">
                                        {isEditingProfile ? (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setIsEditingProfile(false);
                                                        setProfileForm({
                                                            full_name: user?.fullName || user?.full_name || "",
                                                            phone: user?.phone || "",
                                                            address: user?.address || "",
                                                            city: user?.city || "",
                                                        });
                                                    }}
                                                    className="flex-1 bg-white/5 border border-white/10 text-white font-black py-5 rounded-lg uppercase tracking-widest text-xs hover:bg-white/10 transition-all duration-300"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleProfileSave}
                                                    disabled={profileSaving}
                                                    className="flex-[2] bg-gv-gold text-black font-black py-5 rounded-lg uppercase tracking-widest text-xs shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3"
                                                >
                                                    {profileSaving ? <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : "Save Changes"}
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => setIsEditingProfile(true)}
                                                className="w-full bg-white/5 border border-white/10 text-white font-black py-5 rounded-lg uppercase tracking-widest text-xs hover:bg-gv-gold hover:text-black transition-all duration-300 flex items-center justify-center gap-3"
                                            >
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                Edit Profile
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>
                    ) : null}
                </div>
                <GlobalFooter />
            </main>

            {/* Deposit Modal */}
            {isDepositModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1a1a1a] border border-gv-gold/30 rounded-[30px] md:rounded-lg p-6 md:p-10 max-w-lg w-full space-y-6 md:space-y-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-black text-gv-gold tracking-tighter uppercase">Deposit</h2>
                            <button onClick={() => setIsDepositModalOpen(false)} className="text-zinc-600 hover:text-white transition-colors">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Amount (MYR)</label>
                                <input type="number" value={depositAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepositAmount(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-5 text-2xl font-black focus:outline-none focus:border-gv-gold transition-all duration-300" placeholder="0.00" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Transfer Date</label>
                                <input type="date" value={depositDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepositDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-5 text-xl font-black focus:outline-none focus:border-gv-gold transition-all duration-300 text-white inverted-scheme-date-picker" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Bank Receipt (Image/PDF)</label>
                                <div className="border border-white/10 border-dashed rounded-lg p-8 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-colors cursor-pointer relative group">
                                    <svg className="h-10 w-10 text-zinc-600 mb-4 group-hover:text-gv-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{depositReceipt ? (depositReceipt as File).name : "Select Document"}</span>
                                    <input type="file" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepositReceipt(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,.pdf" />
                                </div>
                            </div>
                            <button onClick={handleDepositSubmit} disabled={isSubmitting || !depositAmount || !depositReceipt} className="w-full bg-gv-gold text-black font-black py-5 rounded-lg flex justify-center items-center gap-3 uppercase tracking-widest shadow-xl disabled:opacity-50 transition-all duration-300 hover:-translate-y-1">
                                {isSubmitting ? <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : "Confirm Deposit"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Withdraw Modal */}
            {isWithdrawModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-10 max-w-lg w-full space-y-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Withdrawal</h2>
                            <button onClick={() => setIsWithdrawModalOpen(false)} className="text-zinc-600 hover:text-white transition-colors">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Amount (MYR)</label>
                                <input type="number" value={withdrawAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWithdrawAmount(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-5 text-2xl font-black focus:outline-none focus:border-gv-gold transition-all duration-300" placeholder="0.00" />
                            </div>
                             <button onClick={() => handleWithdrawInitiate()} disabled={!withdrawAmount} className="w-full bg-white text-black font-black py-5 rounded-lg flex justify-center items-center gap-3 uppercase tracking-widest shadow-xl disabled:opacity-50">
                                Request Withdrawal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* OTP Verification Modal */}
            {isOtpModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
                    <div className="bg-[#111] border border-gv-gold/50 rounded-lg p-12 max-w-md w-full text-center space-y-10 shadow-[0_0_100px_rgba(212,175,55,0.15)] animate-in fade-in zoom-in-90 duration-300">
                        <div className="h-20 w-20 bg-gv-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-gv-gold/20">
                            <svg className="h-10 w-10 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Email Verification</h3>
                            <p className="text-zinc-500 font-medium text-sm px-4">
                                {lang === "en"
                                    ? `A 6-digit verification code has been sent to your registered email (${user?.email}).`
                                    : `6浣嶉獙璇佺爜宸插彂閫佽嚦鎮ㄧ殑娉ㄥ唽閭 (${user?.email})銆俙}
                            </p>
                        </div>
                        <div className="space-y-4">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={otpCode}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-6 text-4xl font-black text-center tracking-[1em] focus:outline-none focus:border-gv-gold transition-all duration-300 text-gv-gold"
                                placeholder="000000"
                                autoFocus
                            />
                            {otpError && (
                                <p className="text-red-500 text-xs font-bold uppercase tracking-widest">{otpError}</p>
                            )}
                        </div>
                        <div className="space-y-4">
                            <button
                                onClick={handleOtpWithdraw}
                                disabled={isSubmitting || otpCode.length !== 6}
                                className="w-full bg-gv-gold text-black font-black py-5 rounded-lg flex justify-center items-center gap-3 uppercase tracking-widest shadow-xl disabled:opacity-50 hover:-translate-y-1 transition-all duration-300"
                            >
                                {isSubmitting ? <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : "Verify & Withdraw"}
                            </button>
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    onClick={() => {
                                        setOtpCode("");
                                        setOtpError("");
                                        handleSendOtp();
                                    }}
                                    disabled={otpSending}
                                    className="text-gv-gold font-bold hover:text-white transition-colors uppercase tracking-widest text-[10px]"
                                >
                                    {otpSending ? "Sending..." : "Resend Code"}
                                </button>
                                <span className="text-zinc-700">|</span>
                                <button
                                    onClick={() => {
                                        setIsOtpModalOpen(false);
                                        setOtpCode("");
                                        setOtpError("");
                                        setOtpSent(false);
                                    }}
                                    className="text-zinc-600 font-bold hover:text-white transition-colors uppercase tracking-widest text-[10px]"
                                >
                                    Cancel
                                </button>
                            </div>
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
                <div className="fixed bottom-6 right-6 z-[600] bg-[#1a1a1a] border border-gv-gold/30 rounded-lg p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-5 max-w-sm shadow-gv-gold/10">
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
                                className="w-full bg-gv-gold text-black font-black py-3 px-6 rounded-lg uppercase tracking-widest text-xs hover:bg-gv-gold/90 transition-all duration-300 shadow-lg active:scale-95"
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
