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
import TierMedal from "@/components/TierMedal";
import MobileSideMenu from "@/components/MobileSideMenu";
import { MASTER_ADMIN_EMAIL } from "@/lib/supabaseClient";

export default function DashboardClient() {
    const { user: authUser, role: authRole, isVerified: authVerified, refresh: refreshAuth, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [lang, setLang] = useState<"en" | "zh">("en");
    const [user, setUser] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const { forexRate, monthlyRate, yearlyRate } = useSettings();
    const [dividendHistory, setDividendHistory] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"overview" | "products" | "statements" | "profile" | "security" | "transactions" | "referrals">("overview");
    const [isComparisonOpen, setIsComparisonOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [referredCount, setReferredCount] = useState(0);
    const [referredUsers, setReferredUsers] = useState<any[]>([]);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // UI States
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successRefId, setSuccessRefId] = useState("");
    const [actionToast, setActionToast] = useState<{message: string, actionUrl?: string, actionText?: string} | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [viewDocumentUrl, setViewDocumentUrl] = useState<string | null>(null);

    // Form States
    const [depositAmount, setDepositAmount] = useState("");
    const [depositDate, setDepositDate] = useState("");
    const [depositReceipt, setDepositReceipt] = useState<File | null>(null);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawPIN, setWithdrawPIN] = useState("");
    const [penaltyInfo, setPenaltyInfo] = useState<{
        penalty: number;
        payout: number;
        lockedPortion: number;
        isApplied: boolean;
    } | null>(null);
    const [isPinVisible, setIsPinVisible] = useState(false);
    const [showPenaltyConfirm, setShowPenaltyConfirm] = useState(false);

    // Derived Withdrawal Metrics
    const withdrawalMetrics = React.useMemo(() => {
        if (!isMounted || !user) return { lockedCapital: 0, withdrawable: 0 };
        const approvedDeposits = transactions.filter(tx => tx.type === 'Deposit' && tx.status === 'Approved');
        const now = new Date();
        const currentTier = getTierByAmount(Number(user.total_investment_usd || 0));
        const lockPeriodDays = currentTier.lockInDays || 180;
        
        const lockedCapital = approvedDeposits.reduce((acc, tx) => {
            const txDate = new Date(tx.created_at || tx.transfer_date);
            const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
            return diffDays < lockPeriodDays ? acc + Number(tx.amount) : acc;
        }, 0);
        const withdrawable = Number(user.profit || 0) + Math.max(0, Number(user.balance || 0) - lockedCapital);
        return { lockedCapital, withdrawable };
    }, [isMounted, user, transactions, authLoading]);

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
        setIsMounted(true);
        setLang("en"); // Force English for now
        
        if (authLoading) return;

        if (!authUser && !authLoading) {
            console.log("No authUser found, redirecting to login");
            setIsCheckingAuth(false);
            router.push("/login");
            return;
        }



        const fetchUserData = async () => {
            console.log("FETCHING DASHBOARD DATA for:", authUser.email);
            
            try {
                console.log('Effective Forex Rate (Global):', forexRate);

                // 1. Fetch Profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', authUser.id)
                    .maybeSingle();

                if (profile) {
                    let dbIsVerified = profile.role === 'admin' || profile.is_verified === true || profile.is_verified === 'Approved' || profile.is_verified === 'true';
                    let kycApproved = dbIsVerified || profile.kyc_status === 'Approved' || profile.kyc_status === 'Verified' || profile.kyc_completed === true;

                    if (authUser.email === MASTER_ADMIN_EMAIL) {
                        dbIsVerified = true;
                        kycApproved = true;
                        profile.role = "admin";
                    }

                    // Standardizing USD-Base for Capital
                    const totalAssetsRM = Number(profile.balance || 0) + Number(profile.profit || 0);
                    const balUSD = profile.balance_usd ?? (Number(profile.balance || 0) / forexRate);
                    
                    // 2. Fetch Transactions
                    let txQuery = supabase.from('transactions').select('*');
                    if (authUser.email !== MASTER_ADMIN_EMAIL) {
                        txQuery = txQuery.eq('user_id', authUser.id);
                    }
                    const { data: txs } = await txQuery.order('created_at', { ascending: false });
                    
                    let lockedCapital = 0;
                    if (txs) {
                        const approvedDeposits = txs.filter((tx: any) => tx.type === 'Deposit' && tx.status === 'Approved');
                        const now = new Date();
                        lockedCapital = approvedDeposits.reduce((acc, tx) => {
                            const txDate = new Date(tx.created_at || tx.transfer_date);
                            const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
                            return diffDays < 180 ? acc + Number(tx.amount) : acc;
                        }, 0);
                        setTransactions(txs);
                        setDividendHistory(txs.filter((t: any) => 
                            (t.metadata?.adjustment_category === 'Dividend' || t.metadata?.adjustment_category === 'Bonus' || t.type?.toLowerCase().includes('dividend') || t.type?.toLowerCase().includes('bonus')) &&
                            t.status === 'Approved'
                        ).slice(0, 6).reverse());
                    }

                    const withdrawableBalance = Math.max(0, (Number(profile.balance || 0) - lockedCapital) + Number(profile.profit || 0));

                    setUser({
                        ...authUser,
                        ...profile,
                        is_verified: dbIsVerified,
                        kyc_completed: kycApproved,
                        fullName: profile.full_name || authUser.user_metadata?.full_name,
                        total_assets: totalAssetsRM,
                        withdrawable_balance: withdrawableBalance,
                        locked_capital: lockedCapital,
                        total_deposited: txs ? txs.filter((t: any) => (t.type === 'Deposit' && t.metadata?.adjustment_category !== 'Dividend') && t.status === 'Approved').reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0) : 0,
                        total_withdrawn: txs ? txs.filter((t: any) => (t.type === 'Withdrawal' && t.metadata?.adjustment_category !== 'Dividend') && t.status === 'Approved').reduce((acc: number, t: any) => acc + Math.abs(Number(t.amount || 0)), 0) : 0,
                        total_investment: (txs ? txs.filter((t: any) => (t.type === 'Deposit' && t.metadata?.adjustment_category !== 'Dividend') && t.status === 'Approved').reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0) : 0) - (txs ? txs.filter((t: any) => (t.type === 'Withdrawal' && t.metadata?.adjustment_category !== 'Dividend') && t.status === 'Approved').reduce((acc: number, t: any) => acc + Math.abs(Number(t.amount || 0)), 0) : 0),
                        totalEquity: totalAssetsRM,  
                        balanceUSD: balUSD           
                    });
                } else {
                    console.warn("No profile found for ID:", authUser.id);
                }

                const { data: refs, count } = await supabase.from('profiles').select('id, full_name, username, balance, is_verified, created_at', { count: 'exact' }).eq('referred_by', authUser.id);
                setReferredCount(count || 0);
                if (refs) setReferredUsers(refs);

                fetchedRef.current = authUser.id;
            } catch (err) {
                console.error("Dashboard Fetch Error:", err);
            } finally {
                setIsCheckingAuth(false);
            }
        };

        fetchUserData();

        // Real-time listener: Profile updates
        const profileChannel = supabase
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

        // Real-time listener: Transaction updates
        const txChannel = supabase
            .channel(`tx-updates-${authUser.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${authUser.id}` }, 
            async (payload: any) => {
                console.log("[REALTIME] Transaction Change Detected:", payload.eventType);
                
                // Refetch transactions to ensure order and state consistency
                let refetchTxQuery = supabase.from('transactions').select('*').eq('user_id', authUser.id);
                const { data: txs } = await refetchTxQuery.order('created_at', { ascending: false });
                if (txs) {
                    setTransactions(txs);
                    setDividendHistory(txs.filter((t: any) => 
                        (t.metadata?.adjustment_category === 'Dividend' || t.metadata?.adjustment_category === 'Bonus' || t.type?.toLowerCase().includes('dividend') || t.type?.toLowerCase().includes('bonus')) &&
                        t.status === 'Approved'
                    ).slice(0, 6).reverse());

                    // Update total_deposited and total_investment in user state
                    const deposits = txs.filter((t: any) => (t.type === 'Deposit' && t.metadata?.adjustment_category !== 'Dividend') && t.status === 'Approved').reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);
                    const withdrawals = txs.filter((t: any) => (t.type === 'Withdrawal' && t.metadata?.adjustment_category !== 'Dividend') && t.status === 'Approved').reduce((acc: number, t: any) => acc + Math.abs(Number(t.amount || 0)), 0);
                    setUser((prev: any) => ({ ...prev, total_deposited: deposits, total_withdrawn: withdrawals, total_investment: deposits - withdrawals }));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(profileChannel);
            supabase.removeChannel(txChannel);
        };
    }, [authUser]);

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
            // Note: real-time subscription in useEffect already handles transaction list refresh

        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleWithdrawInitiate = () => {
        console.log("WITHDRAW INITIATED", { withdrawAmount, user: !!user });
        if (!withdrawAmount || !user) return;
        const amount = parseFloat(withdrawAmount);
        
        const approvedDeposits = transactions.filter(tx => tx.type === 'Deposit' && tx.status === 'Approved');
        if (approvedDeposits.length === 0) {
            alert("You must have at least one successful deposit before requesting a withdrawal.");
            return;
        }

        const currentTier = getTierByAmount(Number(user.total_investment_usd || 0));
        const lockPeriodDays = currentTier.lockInDays || 180;
        const now = new Date();
        const lockedCapital = approvedDeposits.reduce((acc, tx) => {
            const txDate = new Date(tx.created_at || tx.transfer_date);
            const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
            return diffDays < lockPeriodDays ? acc + Number(tx.amount) : acc;
        }, 0);

        const withdrawableProfit = Number(user.profit || 0);
        const withdrawableCapital = Math.max(0, Number(user.balance || 0) - lockedCapital);
        const totalWithdrawable = withdrawableProfit + withdrawableCapital;

        if (amount > Number(user.total_assets)) {
            alert(`Insufficient balance. Your total assets are RM ${Number(user.total_assets).toLocaleString(undefined, { minimumFractionDigits: 2 })}.`);
            return;
        }

        // Calculate Penalty if amount > withdrawable
        if (amount > totalWithdrawable) {
            // New Rule: If touching locked capital, must withdraw everything
            if (amount < Number(user.total_assets)) {
                alert(lang === 'zh' ? "不允许部分提取锁定资金。要提取锁定资金，您必须提取全部余额。" : "Partial withdrawal of locked capital is not permitted. To withdraw from your locked capital, you must withdraw your entire balance.");
                return;
            }
            const lockedPortion = amount - totalWithdrawable;
            const penalty = lockedPortion * 0.4;
            const payout = amount - penalty;

            setPenaltyInfo({
                penalty,
                payout,
                lockedPortion,
                isApplied: true
            });
            setShowPenaltyConfirm(true);
            return;
        } else {
            setPenaltyInfo({
                penalty: 0,
                payout: amount,
                lockedPortion: 0,
                isApplied: false
            });
        }

        setIsPinModalOpen(true);
    };

    const handleWithdrawConfirm = async () => {
        if (withdrawPIN.length !== 6) {
            alert("Please enter a 6-digit Security PIN.");
            return;
        }
        setIsSubmitting(true);

        try {
            // 1. Verify Security PIN
            const storedPin = (user.security_pin || "").toString().trim();
            const enteredPin = withdrawPIN.trim();
            
            if (storedPin !== enteredPin) {
                throw new Error("Invalid security PIN. Please try again or contact support if you forgot it.");
            }

            // 2. Insert Transaction
            const { error } = await supabase
                .from('transactions')
                .insert([{
                    user_id: user.id,
                    type: 'Withdrawal',
                    amount: Math.abs(parseFloat(withdrawAmount)),
                    status: 'Pending',
                    ref_id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
                    metadata: penaltyInfo?.isApplied ? {
                        penalty_applied: true,
                        penalty_amount: penaltyInfo.penalty,
                        expected_payout: penaltyInfo.payout,
                        locked_portion: penaltyInfo.lockedPortion,
                        penalty_rate: "40%"
                    } : null
                }]);

            if (error) throw error;

            setIsPinModalOpen(false);
            setIsWithdrawModalOpen(false);
            setWithdrawAmount("");
            setWithdrawPIN("");
            
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
            // Note: real-time subscription in useEffect already handles transaction list refresh

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
            const txDate = new Date(tx.transfer_date || tx.created_at || tx.date);
            return txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear;
        });
        const periodProfit = periodTxs.filter((t: any) => 
            (t.metadata?.adjustment_category === 'Dividend' || t.metadata?.adjustment_category === 'Bonus' || t.type?.toLowerCase().includes('dividend') || t.type?.toLowerCase().includes('bonus')) && 
            t.status === 'Approved'
        ).reduce((acc: number, t: any) => acc + Number(t.amount), 0);

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

        const totalDeposits = periodTxs.filter((t: any) => (t.type === 'Deposit' && t.metadata?.adjustment_category !== 'Dividend') && t.status === 'Approved').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
        const totalWithdrawals = periodTxs.filter((t: any) => (t.type === 'Withdrawal' && t.metadata?.adjustment_category !== 'Dividend') && t.status === 'Approved').reduce((acc: number, t: any) => acc + Math.abs(Number(t.amount)), 0);
        const closingBalance = (user?.total_investment || 0) + (Number(user?.profit || 0));
        const openingBalance = closingBalance - totalDeposits + totalWithdrawals - periodProfit;

        autoTable(doc, {
            startY: 70,
            head: [['Description', 'Amount (RM)']],
            body: [
                ['Opening Balance', formatCurrency(openingBalance).replace("RM ", "")],
                ['Total Deposits', formatCurrency(totalDeposits).replace("RM ", "")],
                ['Total Withdrawable Amount', formatCurrency(periodProfit).replace("RM ", "")],
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
            products: "Products",
            statements: "Statements",
            logout: "Log Out",
            activeInvestment: "Total Investment",
            totalProfit: "Total Withdrawable Amount",
            totalEquity: "Total Investment",
            dividendNote: "(Withdrawable)",
            investmentNote: "(Secure Capital)",
            currentPackage: "Current Tier",
            deposit: "Deposit",
            withdraw: "Withdraw",
            comparisonTable: {
                title: "Compare Packages",
                feature: "Feature",
                dividend: "Monthly Dividend",
                range: "Deposit Range",
                priority: "Priority Support",
                accountManager: "Account Manager",
                insurance: "Insurance Coverage",
                fees: "Withdrawal Fees",
                standard: "Standard",
                reduced: "Reduced",
                zero: "Zero",
                footnote: "* All dividends are calculated monthly based on your investment capital. Higher tiers enjoy lower withdrawal fees and priority liquidation."
            },
            history: "Transaction History",
            unverifiedBanner: "⚠️ Account Unverified. Access to Deposits, Withdrawals, and Fund Management is restricted.",
            verifyNow: "Verify Now",
            securityPin: "Withdrawal Security PIN",
            enterPin: "Enter your 6-digit security PIN to authorize this request.",
            confirmWithdraw: "Authorize Withdrawal",
            successTitle: "Submission Successful",
            successDesc: "Our team will review your request within 24 hours.",
            whatsapp: "Contact Support via WhatsApp",
            expectedMonthly: "Expected Monthly Dividend",
            projectedYearly: "Expected Yearly Dividend",
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
            accHolder: "Account Holder Name",
            bankStatement: "Bank Statement",
            viewStatement: "View Bank Statement",
            pendingVerification: "Account Pending Verification. Please contact your Agent or Admin to activate your account.",
            verificationInProgress: "Account Verification in Progress",
            verificationInProgressDesc: "Thank you for choosing GV Capital. Our Compliance Team is currently reviewing your documents. Manual verification typically takes 1 to 3 business days. Once approved, you will have full access to our investment and deposit features.",
            verificationUnsuccessful: "Verification Unsuccessful",
            verificationUnsuccessfulDesc: "Our team was unable to verify your documents for the following reason:",
            rejectionReasonLabel: "Invalid Document Clarity / Mismatch Information",
            reuploadPrompt: "Please re-upload a clear copy of your ID to proceed.",
            reuploadBtn: "Re-upload Documents",
            completeProfile: "Complete Your Profile",
            completeProfileDesc: "Please complete our 3-step verification process to unlock investment features and secure your account.",
            resumeVerification: "Resume Verification",
            startVerification: "Start Verification",
            activeStatus: "Active Status",
            noTier: "No Tier",
            noDividendData: "No Dividend Data Yet",
            noDepositsFound: "No Deposits Found",
            statementCenter: "Statement Center",
            statementCenterDesc: "Select your desired period to generate and download a professional investment statement.",
            selectMonth: "Month",
            selectYear: "Year",
            generateDownload: "Generate & Download PDF",
            months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
            depositTitle: "Deposit",
            withdrawTitle: "Withdrawal",
            amountMYR: "Amount (MYR)",
            transferDate: "Transfer Date",
            bankReceipt: "Bank Receipt (Image/PDF)",
            selectDocument: "Select Document",
            confirmDeposit: "Confirm Deposit",
            requestWithdraw: "Continue to PIN",
            cancelTx: "Cancel Transaction",
            docSubmitted: "Documents Submitted",
            docSubmittedDesc: "Our compliance team will review your account within 24 hours. Your portfolio will activate automatically upon approval.",
            debugMode: "Debug Mode",
            role: "Role",
            verified: "Verified",
            date: "Date",
            refId: "Ref ID",
            type: "Type",
            amount: "Amount",
            status: "Status",
            noTxFound: "No transaction history found",
            basedOn: "Based on",
            returns: "returns",
            dividendRateDesc: "based on current tier dividend rate",
            yearlyForecast: "Yearly Forecast",
            yourCode: "Your Code",
            transactions: "Transactions",
            referrals: "Referrals",
            accountStatus: "Account Status",
            investmentTier: "Investment Tier",
            registrationDate: "Registration Date",
            referredUsersList: "Referred Users List"
        },
        zh: {
            welcome: "欢迎, ",
            nav: "控制台",
            products: "投资产品",
            statements: "账单中心",
            logout: "退出登录",
            activeInvestment: "总投资额",
            totalProfit: "总可提现金额",
            totalEquity: "总投资额",
            dividendNote: "(可提取)",
            investmentNote: "(安全资本)",
            currentPackage: "当前等级",
            deposit: "入金",
            withdraw: "提款",
            comparisonTable: {
                title: "比较计划",
                feature: "功能",
                dividend: "每月利润",
                range: "投资范围",
                priority: "优先支持",
                accountManager: "客户经理",
                insurance: "保险保障",
                fees: "提款费用",
                standard: "标准",
                reduced: "降低",
                zero: "零",
                footnote: "* 所有分红均根据您的投资本金按月计算。更高级别享受更低的提款费和优先清算权。"
            },
            history: "交易历史",
            unverifiedBanner: "⚠️ 账户未核实。存款、取款和基金管理功能受限。",
            verifyNow: "立即核实",
            securityPin: "提款安全码",
            enterPin: "请输入您的 6 位安全代码以授权此申请。",
            confirmWithdraw: "授权提款",
            successTitle: "提交成功",
            successDesc: "我们的团队将在 24 小时内审核您的申请。",
            whatsapp: "通过 WhatsApp 联系支持",
            expectedMonthly: "预计月度股息",
            projectedYearly: "预计年度股息",
            dividendRateDesc: "基于目前档位分红率",
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
            accHolder: "账户持有人姓名",
            bankStatement: "银行账单",
            viewStatement: "查看银行账单",
            pendingVerification: "账户待审核。请联系您的代理或管理员以激活您的账户。",
            verificationInProgress: "账户核实中",
            verificationInProgressDesc: "感谢您选择 GV 资本。我们的合规团队正在审核您的文件。人工核实通常需要 1 到 3 个工作日。一旦批准，您将可以完全访问我们的投资和存款功能。",
            verificationUnsuccessful: "核实未成功",
            verificationUnsuccessfulDesc: "我们的团队由于以下原因无法核实您的文件：",
            rejectionReasonLabel: "文件不清晰 / 信息不匹配",
            reuploadPrompt: "请重新上传一份清晰的证件副本以继续。",
            reuploadBtn: "重新上传文件",
            completeProfile: "完成您的资料",
            completeProfileDesc: "请完成我们的 3 步核实流程，以解锁投资功能并保护您的账户。",
            resumeVerification: "恢复待续核实",
            startVerification: "开始核实",
            activeStatus: "活跃状态",
            noDividendData: "尚无股息数据",
            noDepositsFound: "未发现存款",
            statementCenter: "账单中心",
            statementCenterDesc: "选择您想要的期限以生成并下载专业的投资账单。",
            selectMonth: "月份",
            selectYear: "年份",
            generateDownload: "生成并下载 PDF",
            months: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
            depositTitle: "入金",
            withdrawTitle: "提款",
            amountMYR: "金额 (马币)",
            transferDate: "转账日期",
            bankReceipt: "银行收据 (图像/PDF)",
            selectDocument: "选择文件",
            confirmDeposit: "确认入金",
            requestWithdraw: "继续验证 PIN 码",
            cancelTx: "取消交易",
            docSubmitted: "文件已提交",
            docSubmittedDesc: "我们的合规团队将在 24 小时内审核您的账户。批准后您的投资组合将自动激活。",
            debugMode: "调试模式",
            role: "角色",
            verified: "已核实",
            date: "日期",
            refId: "参考 ID",
            type: "类型",
            amount: "金额",
            status: "状态",
            noTxFound: "未发现交易历史",
            basedOn: "基于",
            returns: "回报",
            yearlyForecast: "年度预测",
            yourCode: "您的代码",
            transactions: "交易记录",
            referrals: "推荐记录",
            accountStatus: "账户状态",
            investmentTier: "投资等级",
            registrationDate: "注册日期",
            referredUsersList: "推荐用户列表"
        },
    };

    const t = (content as any)[lang];

    if (!isMounted || isCheckingAuth) {
        return <div className="min-h-screen bg-white flex items-center justify-center p-6"><div className="h-12 w-12 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;
    }

    // Strict verification check
    const isUserVerified = user?.is_verified === true;

    // We no longer block access to the dashboard entirely. 
    // Instead, we will conditionally render the content inside the main area.

    return (
        <div className="min-h-screen bg-white text-gray-900 flex font-sans overflow-hidden">
            <title>{`Dashboard | GV Capital Trust`}</title>

            <aside className={`border-r border-gray-200 flex flex-col justify-between hidden md:flex bg-white transition-all duration-500 ease-in-out relative group/sidebar ${isSidebarCollapsed ? "w-[84px] p-4" : "w-64 p-6"}`}>
                {/* Collapse Toggle */}
                <button 
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="absolute -right-3 top-24 z-10 h-6 w-6 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center text-gray-900 hover:bg-gv-gold hover:text-black transition-all shadow-xl opacity-0 group-hover/sidebar:opacity-100"
                >
                    <svg className={`h-3 w-3 transition-transform duration-500 ${isSidebarCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M15 19l-7-7 7-7" /></svg>
                </button>

                <div className="space-y-12">
                    <div className={`flex items-center gap-2 transition-all duration-500 ${isSidebarCollapsed ? "justify-center" : ""}`}>
                        <img src="/logo.png" alt="GV Capital" className={`object-contain  transition-all duration-500 ${isSidebarCollapsed ? "h-[30px]" : "h-[60px]"}`} />
                    </div>

                    <nav className="space-y-2">
                        {[
                            { id: "overview", label: t.nav, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
                            { id: "products", label: t.products, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
                            { id: "transactions", label: t.transactions, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                            { id: "referrals", label: t.referrals, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
                            { id: "statements", label: t.statements, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
                            { id: "profile", label: t.profile, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
                            { id: "security", label: t.securityTitle, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id as any)}
                                className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === item.id ? "bg-gv-gold text-black shadow-lg" : "text-gray-400 hover:text-gray-900"}`}
                                title={isSidebarCollapsed ? item.label : ""}
                            >
                                <span className={`shrink-0 ${isSidebarCollapsed ? "mx-auto" : ""}`}>{item.icon}</span>
                                {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className={`space-y-4 pt-4 border-t border-gray-200 transition-all duration-500 ${isSidebarCollapsed ? "items-center" : ""}`}>
                    <button onClick={handleLogout} className={`w-full text-gray-400 hover:text-red-400 transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-3 px-4 py-2 ${isSidebarCollapsed ? "justify-center" : ""}`}>
                        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
                        {!isSidebarCollapsed && <span>{t.logout}</span>}
                    </button>
                </div>
            </aside>

            <MobileSideMenu 
                lang={lang}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                currentTab={activeTab}
            />

            {/* Premium Bottom Navigation (Mobile Only) */}
            <nav className="fixed bottom-0 left-0 right-0 z-[50] h-20 bg-white/90 backdrop-blur-2xl border-t border-gray-200 flex items-center justify-around px-2 md:hidden">
                {[
                    { id: "overview", label: "Home", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
                    { id: "products", label: "Trade", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> },
                    { id: "transactions", label: "Activity", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
                    { id: "profile", label: "Account", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`group relative flex flex-col items-center justify-center w-16 h-16 transition-all duration-300 ${
                            activeTab === item.id ? "text-gv-gold" : "text-gray-400"
                        }`}
                    >
                        {activeTab === item.id && (
                            <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gv-gold shadow-[0_0_15px_rgba(201,168,76,0.8)] rounded-full"></div>
                        )}
                        <span className={`transition-transform duration-300 ${activeTab === item.id ? "scale-110 -translate-y-1" : "group-hover:scale-110"}`}>
                            {item.icon}
                        </span>
                        <span className={`text-[8px] font-black uppercase tracking-widest mt-1 transition-all duration-300 ${activeTab === item.id ? "opacity-100" : "opacity-0"}`}>
                            {item.label}
                        </span>
                    </button>
                ))}
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className={`flex flex-col items-center justify-center w-16 h-16 text-gray-400`}
                >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                    <span className="text-[8px] font-black uppercase tracking-widest mt-1">Menu</span>
                </button>
            </nav>

            <main className="flex-1 overflow-y-auto bg-white relative flex flex-col">
                <div className="flex items-center justify-between px-6 py-6 border-b border-gray-200 md:hidden bg-white">
                    <img src="/logo.png" alt="GV Capital" className="h-8 w-auto " />
                    <div className="flex items-center gap-4">
                        {user && <NotificationBell userId={user.id} lang={lang} />}
                        <div className="h-10 w-10 rounded-xl bg-gv-gold flex items-center justify-center font-black text-black shadow-lg">
                            {user ? (user.fullName?.[0] || "U") : (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            )}
                        </div>
                    </div>
                </div>

                <CurrencyExchangeTicker />
                <div className="max-w-7xl mx-auto w-full space-y-12 flex-1 pb-32 p-4 sm:p-6 md:p-12">
                    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                        <div>
                            <p className="text-gray-400 text-[10px] sm:text-sm font-black uppercase tracking-[0.3em] mb-2">{t.nav}</p>
                            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-gray-900 flex flex-wrap items-center gap-2 sm:gap-4">
                                <span>{t.welcome}</span>
                                <span className="text-gv-gold tracking-tighter truncate max-w-[200px] sm:max-w-none">
                                    {(user && (user.fullName || user.full_name)) ? (user.fullName || user.full_name) : (authLoading ? "..." : "Guest")}
                                </span>
                                {Number(user?.total_investment || 0) > 0 && (
                                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur-md hover:bg-gray-100 transition-all cursor-default group/tier-badge ml-0 sm:ml-2">
                                        <TierMedal 
                                            tierId={(user?.tier && user?.tier !== "Standard") ? user.tier.toLowerCase() : getTierByAmount(Number(user?.total_investment_usd || 0)).id} 
                                            size="sm" 
                                            className="group-hover/tier-badge:scale-110 transition-transform"
                                        />
                                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-gv-gold/80 group-hover/tier-badge:text-gv-gold transition-colors">
                                            {(user?.tier && user?.tier !== "Standard") ? user.tier : getTierByAmount(Number(user?.total_investment_usd || 0)).name}
                                        </span>
                                    </div>
                                )}
                            </h1>
                        </div>
                        <div className="flex items-center gap-6 hidden sm:flex">
                            {user && <NotificationBell userId={user.id} lang={lang} />}
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-gv-gold to-[#B8860B] flex items-center justify-center font-black text-black text-xl border border-gv-gold/30 shadow-lg capitalize">
                                {user ? (user.fullName?.[0] || user.email?.[0] || "U") : (
                                    <svg className="h-8 w-8 text-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                )}
                            </div>
                        </div>
                    </header>

                    {activeTab === "overview" ? (
                            (!user?.is_verified && user?.email !== "thenja96@gmail.com") ? (
                                (user?.kyc_status === 'Pending' || user?.kyc_status === 'pending') ? (
                                    <div className="bg-amber-400 p-8 rounded-[32px] text-center space-y-6 py-12 animate-in fade-in zoom-in-95 duration-700 max-w-2xl mx-auto shadow-xl border border-amber-500/20">
                                        <div className="h-20 w-20 bg-amber-950/10 rounded-full flex items-center justify-center mx-auto border-2 border-amber-950/5">
                                            <svg className="h-10 w-10 text-amber-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div className="space-y-4 text-amber-950">
                                            <h2 className="text-2xl font-black uppercase tracking-tighter">{t.verificationInProgress}</h2>
                                            <p className="text-amber-900 font-bold text-base leading-relaxed max-w-lg mx-auto">
                                                {t.verificationInProgressDesc}
                                            </p>
                                        </div>
                                    </div>
                                ) : (user?.kyc_status === 'Rejected' || user?.kyc_status === 'rejected') && !isReuploading ? (
                                    <div className="bg-red-500 p-12 rounded-[40px] text-center space-y-8 py-24 animate-in fade-in zoom-in-95 duration-700 max-w-3xl mx-auto shadow-[0_30px_60px_rgba(239,68,68,0.3)] border border-red-600/20">
                                        <div className="h-28 w-28 bg-gray-200 rounded-full flex items-center justify-center mx-auto border-4 border-gray-200">
                                            <svg className="h-16 w-16 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                        <div className="space-y-6 text-gray-900">
                                            <h2 className="text-4xl font-black uppercase tracking-tighter">{t.verificationUnsuccessful}</h2>
                                            <div className="bg-gray-100 p-6 rounded-3xl border border-white/20 max-w-2xl mx-auto">
                                                <p className="text-gray-900 font-bold text-xl leading-relaxed">
                                                    {t.verificationUnsuccessfulDesc}<br/>
                                                    <span className="text-black bg-white/90 px-3 py-1 mt-3 inline-block rounded-xl font-black uppercase tracking-tight">
                                                        {user?.rejection_reason || t.rejectionReasonLabel}
                                                    </span>
                                                </p>
                                            </div>
                                            <p className="text-gray-900/80 font-medium">{t.reuploadPrompt}</p>
                                            <button 
                                                onClick={() => router.push(`/verify?lang=${lang}`)}
                                                className="bg-white text-red-600 font-black px-10 py-5 rounded-2xl uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
                                            >
                                                {t.reuploadBtn}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 p-12 rounded-[40px] border border-gray-200 shadow-xl space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700 text-center py-20">
                                        <div className="h-24 w-24 bg-gv-gold/10 rounded-full flex items-center justify-center mx-auto text-gv-gold shadow-[0_0_50px_rgba(212,175,55,0.1)]">
                                            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                        </div>
                                        <div className="space-y-4">
                                            <h2 className="text-3xl font-black uppercase tracking-tighter">
                                                {user?.kyc_status === 'Draft' ? t.verificationInProgress : t.completeProfile}
                                            </h2>
                                            <p className="text-gray-400 font-medium leading-relaxed max-w-lg mx-auto">
                                                {t.completeProfileDesc}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{t.totalEquity}</p>
                                            <div className="flex flex-col items-center">
                                                <h3 className="text-4xl font-black text-[#e0c872] tracking-tighter tabular-nums">
                                                    $ {(user?.total_assets / forexRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </h3>
                                                <p className="text-[10px] font-bold text-gray-400 mt-2">
                                                    RM {user?.total_assets?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                            <p className="text-gray-500 text-[10px] font-bold mt-1 lowercase opacity-50">{t.investmentNote}</p>
                                            {user?.locked_capital > 0 && (
                                                <div className="mt-4 flex flex-col items-center gap-1">
                                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                                                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">$ {(user.locked_capital / forexRate).toLocaleString()} USD Locked</span>
                                                    </div>
                                                    <p className="text-[8px] text-gray-500 font-bold uppercase">(RM {user.locked_capital.toLocaleString()} RM)</p>
                                                </div>
                                            )}
                                        </div>
                                        <Link 
                                            href={`/verify?lang=${lang}`}
                                            className="inline-block bg-gv-gold text-black font-black text-xl px-12 py-5 rounded-[28px] hover:bg-gv-gold/90 transition-all shadow-[0_20px_40px_rgba(212,175,55,0.2)] uppercase tracking-widest"
                                        >
                                            {user?.kyc_status === 'Draft' || (user?.kyc_step && user.kyc_step > 1) ? t.resumeVerification : t.startVerification}
                                        </Link>
                                    </div>
                                )
                            ) : (
                                <>
                                    <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Card 1: Total Withdrawable Amount */}
                                        <div className="bg-gray-50 border border-gray-200 p-10 rounded-[40px] shadow-xl hover:border-gv-gold/20 transition-all group relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                                                <svg className="h-32 w-32 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <div className="relative z-10">
                                                <div>
                                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-4 group-hover:text-gray-500 transition-colors">{t.totalProfit}</p>
                                                    <div className="flex flex-col gap-2">
                                                        <h2 className="text-4xl font-black tracking-tighter text-emerald-500 tabular-nums whitespace-nowrap">
                                                            {isCheckingAuth ? "..." : `$ ${(Number(user?.profit || 0) / forexRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                                        </h2>
                                                        {!isCheckingAuth && (
                                                            <div className="flex flex-col gap-1">
                                                                <p className="text-[10px] font-bold text-gray-400">
                                                                    ≈ RM {Number(user?.profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </p>
                                                                <span className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">{t.dividendNote}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 2: Total Investment & Current Package */}
                                        <div className="bg-gray-50 border border-gray-200 p-10 rounded-[40px] shadow-xl hover:border-gv-gold/20 transition-all group relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                                                <svg className="h-32 w-32 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                            </div>
                                            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-6 sm:gap-8 relative z-10">
                                                <div>
                                                    <p className="text-gv-gold text-[10px] font-black uppercase tracking-widest transition-colors">{t.totalEquity}</p>
                                                    <div className="flex flex-col gap-2">
                                                        <h2 className="text-4xl font-black tracking-tighter text-gv-gold tabular-nums whitespace-nowrap">
                                                            {isCheckingAuth ? "..." : `$ ${(Number(user?.total_investment || 0) / forexRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                                        </h2>
                                                        {!isCheckingAuth && (
                                                            <div className="flex flex-col gap-1">
                                                                <p className="text-[10px] font-bold text-gray-400">
                                                                    ≈ RM {Number(user?.total_investment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </p>
                                                                <span className="text-[10px] font-black text-gv-gold/60 uppercase tracking-widest">{t.investmentNote}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="sm:border-l border-t sm:border-t-0 border-gray-200 pt-6 sm:pt-0 sm:pl-8 flex flex-col justify-center">
                                                    <p className="text-gv-gold text-[10px] font-black uppercase tracking-widest mb-4">{t.currentPackage}</p>
                                                    <div className="flex items-center gap-6 group/tier">
                                                        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                                                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter truncate leading-none">
                                                                {Number(user?.total_investment_usd || 0) > 0 
                                                                    ? ((user?.tier && user?.tier !== "Standard") ? user.tier : getTierByAmount(Number(user?.total_investment_usd || 0)).name)
                                                                    : t.noInvestment}
                                                            </h2>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <div className={`h-1.5 w-1.5 rounded-full ${Number(user?.total_investment || 0) > 0 ? 'bg-gv-gold shadow-[0_0_8px_rgba(212,175,55,0.6)] animate-pulse' : 'bg-red-500'}`}></div>
                                                                <span className="text-[9px] font-black text-gv-gold/60 uppercase tracking-widest whitespace-nowrap">
                                                                    {Number(user?.total_investment || 0) > 0 ? "" : t.noTier}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0 md:scale-90 origin-right pr-2">
                                                            <TierMedal 
                                                                tierId={Number(user?.total_investment_usd || 0) > 0 
                                                                    ? ((user?.tier && user?.tier !== "Standard") ? user.tier.toLowerCase() : getTierByAmount(Number(user?.total_investment_usd || 0)).id)
                                                                    : "none"} 
                                                                size="sm" 
                                                                className="group-hover/tier:scale-105 transition-transform duration-500" 
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {(Number(user?.total_investment || 0) > 0 || Number(user?.profit || 0) > 0) && (
                                        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="bg-gray-50 border border-gray-200 p-10 rounded-[40px] relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-all">
                                                    <svg className="h-20 w-20 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </div>
                                                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-4">{t.expectedMonthly}</p>
                                                {(() => {
                                                    const currentTier = (user?.tier && user?.tier !== "Standard") 
                                                        ? TIERS.find(t => t.name === user.tier) || getTierByAmount(Number(user?.total_investment_usd || 0))
                                                        : getTierByAmount(Number(user?.total_investment_usd || 0));
                                                    const monthlyMaxUSD = Number(user?.total_investment_usd || 0) * currentTier.maxDividend;
                                                    return (
                                                        <>
                                                            <h3 className="text-3xl font-black text-gray-900 tabular-nums whitespace-nowrap">
                                                                <span className="text-sm font-normal normal-case opacity-60 mr-1">up to</span>
                                                                $ {monthlyMaxUSD.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                            </h3>
                                                            <p className="text-[10px] text-gray-400 font-bold mt-1">≈ RM {(monthlyMaxUSD * forexRate).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase mt-4 tracking-tighter">
                                                                {t.dividendRateDesc} ({t.basedOn} {currentTier.name})
                                                            </p>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            <div className="bg-gray-50 border border-gray-200 p-10 rounded-[40px] relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-all">
                                                    <svg className="h-20 w-20 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                                </div>
                                                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-4">{t.projectedYearly}</p>
                                                {(() => {
                                                    const currentTier = (user?.tier && user?.tier !== "Standard") 
                                                        ? TIERS.find(t => t.name === user.tier) || getTierByAmount(Number(user?.total_investment_usd || 0))
                                                        : getTierByAmount(Number(user?.total_investment_usd || 0));
                                                    const yearlyMaxUSD = Number(user?.total_investment_usd || 0) * currentTier.maxDividend * 12;
                                                    return (
                                                        <>
                                                            <h3 className="text-3xl font-black text-emerald-500 tabular-nums whitespace-nowrap">
                                                                <span className="text-sm font-normal normal-case opacity-60 mr-1">up to</span>
                                                                $ {yearlyMaxUSD.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                            </h3>
                                                            <p className="text-[10px] text-gray-400 font-bold mt-1">≈ RM {(yearlyMaxUSD * forexRate).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase mt-4 tracking-tighter">{t.dividendRateDesc} ({t.basedOn} {currentTier.name})</p>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </section>
                                    )}

                                    {/* Temporary hide Dividend Trends
                                    <section className="grid grid-cols-1 gap-8">
                                        <div className="bg-gray-50 border border-gray-200 p-10 rounded-[40px] space-y-8 overflow-hidden">
                                            <h3 className="text-lg font-black uppercase tracking-tight">{t.dividendTrends}</h3>
                                            <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 px-2 sm:px-4">
                                                {dividendHistory.length > 0 ? dividendHistory.slice(-12).map((div: any, i: number) => (
                                                    <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                                                        <div
                                                            className="w-full bg-gv-gold rounded-t-xl transition-all duration-500 group-hover:brightness-125"
                                                            style={{ height: `${Math.max(10, (div.amount / (Math.max(...dividendHistory.map((d: any) => d.amount)) || 1)) * 100)}%` }}
                                                        ></div>
                                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-tighter">{new Date(div.created_at).toLocaleDateString('en-US', { month: 'short' })}</span>
                                                    </div>
                                                )) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-black uppercase tracking-widest text-xs">{t.noDividendData}</div>
                                                )}
                                            </div>
                                        </div>
                                    </section>
                                    */}

                            <section className="flex flex-col sm:flex-row gap-6">
                                <Link
                                    href={`/deposit?lang=${lang}`}
                                    className={`flex-1 font-black text-xl py-6 rounded-[28px] transition-all flex items-center justify-center gap-3 ${user?.is_verified ? "bg-gv-gold text-black hover:bg-gv-gold/90 hover:-translate-y-1 shadow-[0_15px_30px_rgba(212,175,55,0.2)]" : "bg-white text-gray-500 cursor-not-allowed grayscale"}`}
                                    onClick={(e) => handleProtectedAction(e, () => router.push(`/deposit?lang=${lang}`))}
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>
                                    {t.deposit}
                                </Link>
                                <button
                                    onClick={(e) => handleProtectedAction(e, () => setIsWithdrawModalOpen(true))}
                                    className={`flex-1 font-black text-xl py-6 rounded-[28px] transition-all flex items-center justify-center gap-3 ${user?.is_verified ? "bg-[#222] text-gray-900 hover:bg-[#333] hover:-translate-y-1 border border-gray-200" : "bg-white text-gray-500 cursor-not-allowed grayscale"}`}
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                    {t.withdraw}
                                </button>
                            </section>
                        </>
                    )) : activeTab === "transactions" ? (
                        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                <h3 className="text-xl font-black uppercase tracking-tight">{t.history}</h3>
                                <button
                                    onClick={() => generateStatement()}
                                    className="bg-white border border-gray-200 hover:bg-gray-100 text-gray-900 font-black text-xs py-3 px-6 rounded-xl uppercase tracking-widest transition-all flex items-center gap-2"
                                >
                                    <svg className="h-4 w-4 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
                                    {t.downloadStatement}
                                </button>
                            </div>
                            <div className="border border-gray-200 rounded-[40px] overflow-x-auto bg-white backdrop-blur-md shadow-2xl">
                                <table className="w-full text-left min-w-[800px]">
                                    <thead className="bg-white border-b border-gray-200 text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
                                        <tr><th className="px-8 py-6">{t.date}</th><th className="px-8 py-6">{t.refId}</th><th className="px-8 py-6">{t.type}</th><th className="px-8 py-6">{t.amount}</th><th className="px-8 py-6 text-right">{t.status}</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {transactions.map((tx: any, idx: number) => (
                                            <tr key={idx} className="text-sm font-bold group hover:bg-gray-50 transition-colors">
                                                <td className="px-8 py-6 text-gray-400">
                                                    {new Date(tx.transfer_date || tx.created_at || tx.date).toISOString().split('T')[0]}
                                                </td>
                                                <td className="px-8 py-6 font-mono text-xs text-gray-900/40">{tx.ref_id || tx.ref}</td>
                                                 <td className="px-8 py-6 uppercase tracking-widest text-[10px]">
                                                     <div className="flex flex-col">
                                                         <span>{tx.metadata?.description || tx.type}</span>
                                                         {tx.metadata?.processed_by_name && (
                                                             <span className="text-[8px] text-gray-500 font-bold lowercase tracking-tight mt-1">
                                                                 Allocated by {tx.metadata.processed_by_name}
                                                             </span>
                                                         )}
                                                     </div>
                                                 </td>
                                                <td className={`px-8 py-6 text-lg tracking-tighter ${Number(tx.amount) >= 0 ? "text-emerald-400" : "text-red-500"}`}>
                                                    <div className="flex flex-col">
                                                        <span>RM {Number(tx.amount || 0).toFixed(2)}</span>
                                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">(${(Number(tx.amount || 0) / (forexRate || 4.0)).toFixed(2)})</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right"><span className={`px-4 py-2 rounded-xl text-[9px] uppercase font-black tracking-widest ${tx.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : tx.status === 'Rejected' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>{tx.status}</span></td>
                                            </tr>
                                        ))}
                                        {transactions.length === 0 && (
                                            <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-500 font-bold uppercase tracking-widest">{t.noTxFound}</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    ) : activeTab === "referrals" ? (
                        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-12">
                            {/* Refer-a-Friend Header */}
                            <div className="bg-gray-50 border border-gray-200 p-12 rounded-[40px] shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/5 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-1000"></div>
                                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                                    <div className="space-y-6">
                                        <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900">{t.referTitle}</h2>
                                        <p className="text-gray-400 font-medium text-base leading-relaxed">{t.referSubtitle}</p>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <div className="bg-white border border-gray-200 rounded-2xl p-5 flex-1 flex items-center justify-between">
                                                <span className="text-gv-gold font-black tracking-widest uppercase">{user?.username}</span>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(user?.username || "");
                                                        setActionToast({ message: t.copied });
                                                    }}
                                                    className="text-gray-900 hover:text-gv-gold transition-colors text-xs font-black uppercase tracking-widest pl-4 border-l border-gray-200"
                                                >
                                                    {t.copyCode}
                                                </button>
                                            </div>
                                            <button 
                                                onClick={() => window.open(`https://wa.me/601139396338?text=Join%20GV%20Capital%20using%20my%20code:%20${user?.username}`, '_blank')}
                                                className="bg-emerald-500 hover:bg-emerald-600 text-gray-900 font-black px-8 py-5 rounded-2xl flex items-center justify-center gap-3 transition-all"
                                            >
                                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                                {t.shareWA}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center bg-white border border-gray-200 rounded-[40px] p-12 text-center group-hover:bg-gray-100 transition-all">
                                        <p className="text-gray-400 font-black uppercase tracking-widest mb-2 text-[10px]">{t.totalReferred}</p>
                                        <h3 className="text-5xl font-black text-gv-gold tabular-nums">{referredCount}</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Referred Users List */}
                            <div className="space-y-6">
                                <h3 className="text-xl font-black uppercase tracking-tight">{t.referredUsersList}</h3>
                                <div className="border border-gray-200 rounded-[40px] overflow-x-auto bg-white backdrop-blur-md shadow-2xl">
                                    <table className="w-full text-left min-w-[800px]">
                                        <thead className="bg-white border-b border-gray-200 text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
                                            <tr>
                                                <th className="px-8 py-6">{t.username}</th>
                                                <th className="px-8 py-6">{t.registrationDate}</th>
                                                <th className="px-8 py-6">{t.investmentTier}</th>
                                                <th className="px-8 py-6 text-right">{t.accountStatus}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {referredUsers.map((ref: any, idx: number) => (
                                                <tr key={idx} className="text-sm font-bold group hover:bg-gray-50 transition-colors">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-xs font-black text-gv-gold">
                                                                {ref.full_name?.[0] || 'U'}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-gray-900">{ref.full_name}</span>
                                                                <span className="text-[10px] text-gray-500">@{ref.username}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-gray-400 font-mono text-xs">
                                                        {new Date(ref.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="text-gv-gold uppercase text-[10px] tracking-widest font-black">
                                                            {ref.balance > 0 ? getTierByAmount(ref.balance / forexRate).name : 'No Investment'}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <span className={`px-4 py-2 rounded-xl text-[9px] uppercase font-black tracking-widest ${ref.is_verified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500'}`}>
                                                            {ref.is_verified ? 'Verified' : 'Unverified'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {referredUsers.length === 0 && (
                                                <tr><td colSpan={4} className="px-8 py-20 text-center text-gray-500 font-bold uppercase tracking-widest">No referrals yet</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    ) : activeTab === "products" ? (
                        <ProductSelection
                            currentInvestment={Number(user?.total_investment || 0) / (forexRate || 4.0)}
                            lang={lang}
                            onOpenComparison={() => setIsComparisonOpen(true)}
                            forexRate={forexRate}
                        />
                    ) : activeTab === "statements" ? (
                        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="bg-gray-50 border border-gray-200 p-12 rounded-[40px] shadow-2xl overflow-hidden relative group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/5 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-1000"></div>
                                <div className="relative z-10 max-w-2xl">
                                    <h2 className="text-2xl font-black uppercase tracking-tight mb-3 text-gray-900">{t.statementCenter}</h2>
                                    <p className="text-gray-400 font-medium text-sm">{t.statementCenterDesc}</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
                                        <div className="space-y-4">
                                            <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.selectMonth}</label>
                                            <select
                                                value={selectedMonth}
                                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedMonth(parseInt(e.target.value))}
                                                className="w-full bg-white border border-gray-200 rounded-2xl p-5 text-lg font-black focus:outline-none focus:border-gv-gold transition-all appearance-none cursor-pointer"
                                            >
                                                {t.months.map((m: string, i: number) => (
                                                    <option key={i} value={i} className="bg-gray-50 text-gray-900">{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.selectYear}</label>
                                            <select
                                                value={selectedYear}
                                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedYear(parseInt(e.target.value))}
                                                className="w-full bg-white border border-gray-200 rounded-2xl p-5 text-lg font-black focus:outline-none focus:border-gv-gold transition-all appearance-none cursor-pointer"
                                            >
                                                {[2024, 2025, 2026].map(y => (
                                                    <option key={y} value={y} className="bg-gray-50 text-gray-900">{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => generateStatement()}
                                        className="bg-gv-gold text-black font-black py-6 px-12 rounded-2xl uppercase tracking-widest shadow-xl hover:shadow-gv-gold/20 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-4"
                                    >
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
                                        {t.generateDownload}
                                    </button>
                                </div>
                            </div>
                        </section>
                    ) : activeTab === "profile" ? (
                        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Personal Information */}
                                <div className="bg-gray-50 border border-gray-200 p-10 rounded-[40px] shadow-2xl space-y-8 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gv-gold/5 blur-[50px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-1000"></div>
                                    <div className="relative z-10">
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-gv-gold mb-8 flex items-center gap-3">
                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            {t.personalInfo}
                                        </h3>
                                        <div className="grid gap-6">
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.fullName}</p>
                                                <p className="text-lg font-bold text-gray-900 tracking-tight">{user?.fullName || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.username}</p>
                                                <p className="text-lg font-bold text-gray-900 tracking-tight">@{user?.username || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.email}</p>
                                                <p className="text-lg font-bold text-gray-900 tracking-tight">{user?.email || "-"}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.phone}</p>
                                                    <p className="text-lg font-bold text-gray-900 tracking-tight">{user?.phone || "-"}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.country}</p>
                                                    <p className="text-lg font-bold text-gray-900 tracking-tight">{user?.country || "-"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Compliance & Industry */}
                                <div className="bg-gray-50 border border-gray-200 p-10 rounded-[40px] shadow-2xl space-y-8 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gv-gold/5 blur-[50px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-1000"></div>
                                    <div className="relative z-10">
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-gv-gold mb-8 flex items-center gap-3">
                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                            {t.compliance}
                                        </h3>
                                        <div className="grid gap-6">
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.occupation}</p>
                                                <p className="text-lg font-bold text-gray-900 tracking-tight">{user?.occupation || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.industry}</p>
                                                <p className="text-lg font-bold text-gray-900 tracking-tight">{user?.industry || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.wealthSource}</p>
                                                <p className="text-lg font-bold text-gray-900 tracking-tight">{user?.source_of_wealth || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.riskProfile}</p>
                                                <p className="text-lg font-bold text-emerald-400 tracking-tight">{user?.risk_profile === "Moderate" ? "40%" : (user?.risk_profile || "-")}</p>
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
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.bankName}</p>
                                            <p className="text-2xl font-black text-gray-900 tracking-widest uppercase">{user?.bank_name || "-"}</p>
                                        </div>
                                        <div className="space-y-1 flex-1">
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.accNumber}</p>
                                            <p className="text-2xl font-black text-gray-900 tracking-[0.2em] font-mono">{user?.account_number ? `**** **** ${user.account_number.slice(-4)}` : "-"}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-12 mt-8 pt-8 border-t border-gray-200">
                                        <div className="space-y-1 flex-1">
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.accHolder}</p>
                                            <p className="text-2xl font-black text-gray-900 tracking-widest uppercase">{user?.bank_account_holder || "-"}</p>
                                        </div>
                                        <div className="space-y-1 flex-1">
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.bankStatement}</p>
                                            {user?.bank_statement_url ? (
                                                <button 
                                                    onClick={async () => {
                                                        const { data, error } = await supabase.storage.from('agreements').createSignedUrl(user.bank_statement_url, 3600);
                                                        if (data?.signedUrl) setViewDocumentUrl(data.signedUrl);
                                                        else alert("Could not generate secure link for your statement.");
                                                    }}
                                                    className="inline-flex items-center gap-2 bg-white hover:bg-gv-gold hover:text-black border border-gray-200 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all mt-2"
                                                >
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    {t.viewStatement}
                                                </button>
                                            ) : (
                                                <p className="text-gray-500 font-bold uppercase text-[10px] mt-2 italic">Not Provided</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="bg-gray-50 border border-gray-200 p-12 rounded-[40px] shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/5 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-1000"></div>
                                <div className="relative z-10 max-w-xl text-left space-y-10">
                                    <div className="mb-10 p-6 bg-gv-gold/10 border border-gv-gold/20 rounded-3xl">
                                        <h4 className="text-gv-gold font-black uppercase text-xs tracking-widest mb-2 flex items-center gap-2">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A3.323 3.323 0 0010.605 7.88a3.323 3.323 0 01-4.651 4.651 3.323 3.323 0 00-4.651 4.651 3.323 3.323 0 01-4.651 4.651 3.323 3.323 0 00-4.651 4.651 3.323 3.323 0 01-4.651 4.651" /></svg>
                                            Active Protection
                                        </h4>
                                        <p className="text-gray-500 text-xs font-medium leading-relaxed">
                                            {lang === 'en' 
                                                ? "Withdrawals are secured by your unique 6-digit Security PIN established during account registration."
                                                : "提款由您在开户时设置的唯一 6 位安全密码保护。"}
                                        </p>
                                    </div>

                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-tight mb-2 text-gray-900">{t.securityTitle}</h2>
                                        <p className="text-gray-400 font-medium">{t.securitySubtitle}</p>
                                    </div>

                                    <form onSubmit={handlePasswordUpdate} className="space-y-6 text-left">
                                        <div className="space-y-2">
                                            <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.currentPass}</label>
                                            <input
                                                name="currentPassword"
                                                type="password"
                                                required
                                                className="w-full bg-white border border-gray-200 rounded-2xl p-5 text-xl font-bold focus:outline-none focus:border-gv-gold transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.newPass}</label>
                                            <input
                                                name="newPassword"
                                                type="password"
                                                required
                                                className="w-full bg-white border border-gray-200 rounded-2xl p-5 text-xl font-bold focus:outline-none focus:border-gv-gold transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.confirmPass}</label>
                                            <input
                                                name="confirmPassword"
                                                type="password"
                                                required
                                                className="w-full bg-white border border-gray-200 rounded-2xl p-5 text-xl font-bold focus:outline-none focus:border-gv-gold transition-all"
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

            {/* Document Viewer Modal */}
            {viewDocumentUrl && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 md:p-12 animate-in fade-in duration-300">
                    <button 
                        onClick={() => setViewDocumentUrl(null)}
                        className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full z-[110]"
                    >
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="w-full h-full max-w-6xl relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0A0A0A] shadow-2xl flex flex-col text-left">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
                            <h3 className="text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-gv-gold animate-pulse"></div>
                                Document Preview
                            </h3>
                            <a 
                                href={viewDocumentUrl || undefined} 
                                download 
                                className="text-[10px] font-black uppercase tracking-widest text-gv-gold hover:text-white transition-colors"
                            >
                                Download Original
                            </a>
                        </div>
                        <div className="flex-1 overflow-hidden relative group">
                            <iframe 
                                src={viewDocumentUrl || undefined} 
                                className="w-full h-full border-none bg-white rounded-b-[32px]"
                                title="Document Viewer"
                            />
                        </div>
                    </div>
                </div>
            )}
        </main>

            {/* Deposit Modal */}
            {isDepositModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm">
                    <div className="bg-gray-50 border border-gv-gold/30 rounded-[40px] p-10 max-w-lg w-full space-y-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-black text-gv-gold tracking-tight uppercase">{t.depositTitle}</h2>
                            <button onClick={() => setIsDepositModalOpen(false)} className="text-gray-500 hover:text-gray-900 transition-colors">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.amountMYR}</label>
                                <input type="number" value={depositAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepositAmount(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl p-5 text-2xl font-black focus:outline-none focus:border-gv-gold transition-all" placeholder="0.00" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.transferDate}</label>
                                <input type="date" value={depositDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepositDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl p-5 text-xl font-black focus:outline-none focus:border-gv-gold transition-all text-gray-900 inverted-scheme-date-picker" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.bankReceipt}</label>
                                <div className="border border-gray-200 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center bg-white hover:bg-gray-100 transition-colors cursor-pointer relative group">
                                    <svg className="h-10 w-10 text-gray-500 mb-4 group-hover:text-gv-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{depositReceipt ? (depositReceipt as File).name : t.selectDocument}</span>
                                    <input type="file" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepositReceipt(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,.pdf" />
                                </div>
                            </div>
                            <button onClick={handleDepositSubmit} disabled={isSubmitting || !depositAmount || !depositReceipt} className="w-full bg-gv-gold text-black font-black py-5 rounded-2xl flex justify-center items-center gap-3 uppercase tracking-widest shadow-xl disabled:opacity-50 transition-all hover:-translate-y-1">
                                {isSubmitting ? <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : t.confirmDeposit}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Penalty Confirmation Modal */}
            {showPenaltyConfirm && penaltyInfo && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-gray-900/50 backdrop-blur-md">
                    <div className="bg-gray-50 border border-red-500/50 rounded-[40px] p-10 max-w-lg w-full text-center space-y-8 shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-in fade-in zoom-in-95 duration-300">
                        <div className="h-20 w-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                            <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">
                                {lang === 'en' ? "Penalty Warning" : "违约处罚提示"}
                            </h3>
                            <div className="space-y-4 text-left bg-white p-6 rounded-2xl border border-gray-200">
                                <p className="text-gray-500 text-sm font-medium leading-relaxed">
                                    {lang === 'en' 
                                        ? `Part of your withdrawal (RM ${penaltyInfo.lockedPortion.toLocaleString(undefined, { minimumFractionDigits: 2 })}) is still within the 6-month capital lock-in period. An early withdrawal penalty of 40% applies to this portion.`
                                        : `您的提款中有一部分 (RM ${penaltyInfo.lockedPortion.toLocaleString(undefined, { minimumFractionDigits: 2 })}) 仍处于 6 个月的资金锁定期内。根据协议，该部分将收取 40% 的提前提款违约金。`}
                                </p>
                                <div className="pt-4 border-t border-gray-200 space-y-2">
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                                        <span className="text-gray-400">{lang === 'en' ? "Penalty Amount" : "处罚金额"}</span>
                                        <span className="text-red-500">- RM {penaltyInfo.penalty.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-black uppercase tracking-tight">
                                        <span className="text-gray-700">{lang === 'en' ? "Estimated Payout" : "预计到账金额"}</span>
                                        <span className="text-gv-gold">RM {penaltyInfo.payout.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <button 
                                onClick={() => {
                                    setShowPenaltyConfirm(false);
                                    setIsPinModalOpen(true);
                                }} 
                                className="w-full bg-red-500 text-gray-900 font-black py-5 rounded-2xl flex justify-center items-center gap-3 uppercase tracking-widest shadow-xl hover:bg-red-600 transition-all hover:-translate-y-1"
                            >
                                {lang === 'en' ? "I Accept Penalty" : "我接受并继续"}
                            </button>
                            <button 
                                onClick={() => {
                                    setShowPenaltyConfirm(false);
                                    setPenaltyInfo(null);
                                }} 
                                className="w-full text-gray-400 font-bold hover:text-gray-900 transition-colors uppercase tracking-widest text-[10px]"
                            >
                                {lang === 'en' ? "Cancel & Re-adjust Amount" : "取消并重新调整金额"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Withdraw Modal */}
            {isWithdrawModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm">
                    <div className="bg-gray-50 border border-gray-200 rounded-[40px] p-10 max-w-lg w-full space-y-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                         <div className="flex justify-between items-center">
                            <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">{t.withdrawTitle}</h2>
                            <button onClick={() => setIsWithdrawModalOpen(false)} className="text-gray-500 hover:text-gray-900 transition-colors">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.amountMYR}</label>
                                    <input type="number" value={withdrawAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWithdrawAmount(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl p-5 text-2xl font-black focus:outline-none focus:border-gv-gold transition-all" placeholder="0.00" />
                                </div>
                                
                                <div className="px-1 space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-gray-400">Withdrawable Balance</span>
                                            <span className="text-emerald-500">RM {withdrawalMetrics.withdrawable.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        {withdrawalMetrics.lockedCapital > 0 && (
                                            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-tighter">
                                                <span className="text-gray-500">Locked (6-month term)</span>
                                                <span className="text-amber-500/70">RM {withdrawalMetrics.lockedCapital.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                    </div>

                                    {(() => {
                                        const amountValue = parseFloat(withdrawAmount) || 0;
                                        const isPenaltyRequired = amountValue > withdrawalMetrics.withdrawable;
                                        if (isPenaltyRequired && amountValue > 0) {
                                            return (
                                                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 space-y-3">
                                                    <div className="flex items-center gap-2 text-red-500 font-black uppercase text-[10px] tracking-widest">
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                        <span>{lang === 'en' ? "Penalty Notice" : "扣除提示"}</span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                                        {lang === 'en' 
                                                            ? "A 40% penalty will be applied to the portion of your withdrawal taken from locked capital."
                                                            : "提款金额超出可自由提取部分，超出部分将涉及 40% 的提前提取费用。"}
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>
                            <button 
                                onClick={handleWithdrawInitiate} 
                                disabled={!withdrawAmount || Number(withdrawAmount) <= 0} 
                                className="w-full bg-gv-gold text-black font-black py-5 rounded-2xl flex justify-center items-center gap-3 uppercase tracking-widest shadow-xl disabled:opacity-50 transition-all hover:-translate-y-1"
                            >
                                {t.requestWithdraw}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PIN Modal */}
            {isPinModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-xl">
                    <div className="bg-white border border-gv-gold/50 rounded-[40px] p-12 max-w-md w-full text-center space-y-10 shadow-[0_0_100px_rgba(212,175,55,0.15)] animate-in fade-in zoom-in-90 duration-300">
                        <div className="h-20 w-20 bg-gv-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-gv-gold/20">
                            <svg className="h-10 w-10 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-2">{t.securityPin}</h3>
                            <p className="text-gray-400 font-medium text-sm px-4">{t.enterPin}</p>
                        </div>
                        <div className="relative flex justify-center items-center group">
                            <input
                                type={isPinVisible ? "text" : "password"}
                                maxLength={6}
                                value={withdrawPIN}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWithdrawPIN(e.target.value.replace(/\D/g, ''))}
                                className="w-full bg-white border border-gray-200 rounded-2xl p-6 text-4xl font-black text-center tracking-[0.5em] focus:outline-none focus:border-gv-gold transition-all text-gv-gold placeholder:opacity-20 flex-1"
                                autoFocus
                                placeholder="000000"
                            />
                            <button 
                                type="button"
                                onClick={() => setIsPinVisible(!isPinVisible)}
                                className="absolute right-4 p-2 text-gray-500 hover:text-gv-gold transition-colors"
                            >
                                {isPinVisible ? (
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                ) : (
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057-5.064-7-9.542-7 1.274 4.057 5.064 7 9.542 7-4.477 0-8.268-2.943-9.542-7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057-5.064-7-9.542-7 1.274 4.057 5.064 7 9.542 7-4.477 0-8.268-2.943-9.542-7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" /></svg>
                                )}
                            </button>
                        </div>
                        <div className="space-y-4">
                            <button 
                                onClick={handleWithdrawConfirm} 
                                disabled={isSubmitting || withdrawPIN.length !== 6} 
                                className="w-full bg-gv-gold text-black font-black py-5 rounded-2xl flex justify-center items-center gap-3 uppercase tracking-widest shadow-xl disabled:opacity-50 transition-all hover:-translate-y-1"
                            >
                                {isSubmitting ? <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : t.confirmWithdraw}
                            </button>
                            
                            <button onClick={() => setIsPinModalOpen(false)} className="w-full text-gray-500 font-bold hover:text-gray-900 transition-colors uppercase tracking-widest text-[10px]">
                                {t.cancelTx}
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
                <div className="fixed inset-0 z-[500] bg-gray-900/40 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="bg-gray-50 border border-gv-gold/30 rounded-[40px] p-10 max-w-md w-full text-center space-y-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
                        <div className="h-20 w-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(16,185,129,0.2)] animate-bounce-subtle">
                            <svg className="h-10 w-10 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter text-gray-900">
                                {kycShowSuccess ? t.docSubmitted : t.successTitle}
                            </h2>
                            <p className="text-gray-500 font-medium text-base leading-relaxed">
                                {kycShowSuccess ? t.docSubmittedDesc : t.successDesc}
                            </p>
                        </div>
                        {successRefId && !kycShowSuccess && (
                            <div className="bg-white px-6 py-3 rounded-2xl border border-emerald-500/20 text-emerald-400 font-black tracking-widest uppercase text-sm flex items-center justify-center gap-3">
                               <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Ref: {successRefId}
                            </div>
                        )}
                        <button onClick={() => { setShowSuccess(false); setKycShowSuccess(false); }} className="w-full bg-gv-gold text-black font-black py-4 rounded-2xl uppercase tracking-widest text-sm shadow-xl hover:-translate-y-1 transition-all">
                            Dismiss
                        </button>
                    </div>
                </div>
            )}
            {/* Action Toast */}
            {actionToast && (
                <div className="fixed bottom-6 right-6 z-[600] bg-gray-50 border border-gv-gold/30 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-5 max-w-sm shadow-gv-gold/10">
                    <div className="flex flex-col gap-5">
                        <div className="flex items-start justify-between gap-4">
                            <p className="text-gray-900 font-black text-sm uppercase tracking-widest leading-relaxed">{actionToast.message}</p>
                            <button onClick={() => setActionToast(null)} className="text-gray-400 hover:text-gray-900 transition-colors shrink-0">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        {(() => {
                            const toast = actionToast;
                            if (!toast.actionUrl) return null;
                            return (
                                <button
                                    onClick={() => {
                                        setActionToast(null);
                                        router.push(toast.actionUrl as string);
                                    }}
                                    className="w-full bg-gv-gold text-black font-black py-3 px-6 rounded-xl uppercase tracking-widest text-xs hover:bg-gv-gold/90 transition-all shadow-lg active:scale-95"
                                >
                                    {toast.actionText}
                                </button>
                            );
                        })()}
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

            <MobileSideMenu 
                lang={lang} 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
                currentTab={activeTab}
            />
        </div>
    );
}
