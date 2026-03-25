"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/providers/UserProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { supabase } from "@/lib/supabaseClient";
import TierMedal from "@/components/TierMedal";
import { getTierByAmount } from "@/lib/tierUtils";
import ComparisonTable from "@/components/ComparisonTable";
import ProductSelection from "@/components/ProductSelection";
import { X } from "lucide-react";

export default function OverviewClient({ lang }: { lang: "en" | "zh" }) {
    const { userProfile: user, transactions, dividendHistory, loading: isCheckingAuth, refreshData } = useUser();
    const { forexRate } = useSettings();
    const router = useRouter();

    const [isComparisonOpen, setIsComparisonOpen] = useState(false);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successRefId, setSuccessRefId] = useState("");
    const [actionToast, setActionToast] = useState<{message: string, actionUrl?: string, actionText?: string} | null>(null);
    const [depositReceipt, setDepositReceipt] = useState<File | null>(null);
    const [depositAmount, setDepositAmount] = useState("");
    const [depositDate, setDepositDate] = useState("");
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawPIN, setWithdrawPIN] = useState("");
    const [isPinVisible, setIsPinVisible] = useState(false);
    const [showPenaltyConfirm, setShowPenaltyConfirm] = useState(false);
    const [penaltyInfo, setPenaltyInfo] = useState<{
        penalty: number;
        payout: number;
        lockedPortion: number;
        isApplied: boolean;
    } | null>(null);

    const t = {
        en: {
            verificationInProgress: "Verification In Progress",
            verificationInProgressDesc: "Our compliance team is currently reviewing your documents. You'll receive a notification once your account is ready for full access.",
            verificationUnsuccessful: "Verification Unsuccessful",
            verificationUnsuccessfulDesc: "We couldn't verify your documents. Please review the reason below and re-submit your details.",
            rejectionReasonLabel: "No reason provided",
            reuploadPrompt: "Please double check your information and provide clear photos of your documents.",
            reuploadBtn: "Re-submit Verification",
            completeProfile: "Complete Your Profile",
            completeProfileDesc: "To start investing and earn monthly dividends, please complete your identification process.",
            totalEquity: "Total Investment",
            totalProfit: "Total Dividends",
            investmentNote: "Net Flow (Deposits - Withdrawals)",
            dividendNote: "Including Bonuses",
            startVerification: "Start Verification",
            resumeVerification: "Resume Verification",
            expectedMonthly: "Expected Monthly Dividend",
            projectedYearly: "Projected Yearly Dividend",
            dividendRateDesc: "based on current tier dividend rate",
            basedOn: "Based on",
            dividendTrends: "Dividend Trends",
            noDividendData: "No dividend data yet",
            latestActivity: "Latest Activity",
            noTxFound: "No transactions found",
            deposit: "Deposit",
            withdraw: "Withdraw",
            noTier: "Standard",
            activeStatus: "Active Member",
            currentPackage: "Current Tier",
            depositTitle: "New Deposit",
            amountMYR: "Amount (RM)",
            transferDate: "Transfer Date",
            bankReceipt: "Bank Receipt / Proof of Transfer",
            selectDocument: "Select Document",
            confirmDeposit: "Submit Deposit",
            withdrawTitle: "Request Withdrawal",
            requestWithdraw: "Continue to PIN",
            securityPin: "Security PIN",
            enterPin: "Please enter your 6-digit security PIN to authorize this withdrawal.",
            confirmWithdraw: "Confirm Withdrawal",
            cancelTx: "Cancel Transaction",
            successTitle: "Submission Successful",
            successDesc: "Your request has been received and is now being processed by our finance team.",
            docSubmitted: "Documents Received",
            docSubmittedDesc: "Your verification request has been updated. Our team will review it within 24-48 hours.",
        },
        zh: {
            verificationInProgress: "审核中",
            verificationInProgressDesc: "我们的合规团队正在审核您的文档。帐户访问就绪后，您将收到通知。",
            verificationUnsuccessful: "审核未通过",
            verificationUnsuccessfulDesc: "我们无法验证您的文档。请查看以下原因并重新提交您的详细信息。",
            rejectionReasonLabel: "未提供原因",
            reuploadPrompt: "请仔细检查您的信息并提供清晰的文档照片。",
            reuploadBtn: "重新提交验证",
            completeProfile: "完善您的资料",
            completeProfileDesc: "要开始投资并赚取每月分红，请完成您的身份识别流程。",
            totalEquity: "总投资额",
            totalProfit: "总分红额",
            investmentNote: "净流量 (存款 - 提款)",
            dividendNote: "包括奖金",
            startVerification: "开始验证",
            resumeVerification: "继续验证",
            expectedMonthly: "预计每月分红",
            projectedYearly: "预计年度分红",
            dividendRateDesc: "基于当前等级分红率",
            basedOn: "基于",
            dividendTrends: "分红趋势",
            noDividendData: "暂无分红数据",
            latestActivity: "近期活动",
            noTxFound: "未找到交易",
            deposit: "存款",
            withdraw: "提款",
            noTier: "标准",
            activeStatus: "活跃会员",
            currentPackage: "当前等级",
            depositTitle: "新存款",
            amountMYR: "金额 (RM)",
            transferDate: "转账日期",
            bankReceipt: "银行收据 / 转账凭证",
            selectDocument: "选择文件",
            confirmDeposit: "提交存款",
            withdrawTitle: "申请提款",
            requestWithdraw: "继续输入密码",
            securityPin: "安全密码",
            enterPin: "请输入您的 6 位安全密码以授权此提款。",
            confirmWithdraw: "确认提款",
            cancelTx: "取消交易",
            successTitle: "提交成功",
            successDesc: "您的请求已收到，财务团队正在处理中。",
            docSubmitted: "文档已接收",
            docSubmittedDesc: "您的验证请求已更新。我们的团队将在 24-48 小时内进行审核。",
        }
    }[lang];

    const handleProtectedAction = (e: React.MouseEvent, onSuccess: () => void) => {
        e.preventDefault();
        if (user?.is_verified) {
            onSuccess();
        } else if (user?.kyc_status === 'Pending') {
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
        if (!depositAmount || !depositReceipt || !user) return;
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
            setDepositReceipt(null);
            setSuccessRefId(refId);
            setShowSuccess(true);
            refreshData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleWithdrawInitiate = () => {
        const amount = parseFloat(withdrawAmount);
        if (!amount || amount <= 0) return;
        
        if (amount > (user?.total_assets || 0)) {
            alert("Requested amount exceeds total assets.");
            return;
        }

        const lockedCapital = user?.locked_capital || 0;
        const profit = Number(user?.profit || 0);
        const maturedCapital = Math.max(0, Number(user?.balance || 0) - lockedCapital);
        const userWithdrawable = profit + maturedCapital;
        
        let lockedPortion = 0;
        if (amount > userWithdrawable) {
            lockedPortion = amount - userWithdrawable;
        }

        if (lockedPortion > 0) {
            const penalty = lockedPortion * 0.4;
            setPenaltyInfo({
                penalty,
                payout: amount - penalty,
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
        if (!user || withdrawPIN.trim().length !== 6) {
            alert("Please enter a 6-digit Security PIN.");
            return;
        }
        setIsSubmitting(true);
        try {
            // 1. Verify Security PIN
            const { data: p, error: pinError } = await supabase
                .from('profiles')
                .select('security_pin')
                .eq('id', user.id)
                .single();
            
            if (pinError) throw pinError;

            const storedPin = (p?.security_pin || "").toString().trim();
            const enteredPin = withdrawPIN.trim();

            if (storedPin !== enteredPin) {
                throw new Error("Invalid security PIN. Please try again or contact support if you forgot it.");
            }

            // 2. Insert Transaction
            const refId = `WDL-${Math.floor(1000 + Math.random() * 9000)}`;
            const { error } = await supabase.from('transactions').insert([{
                user_id: user.id,
                type: 'Withdrawal',
                amount: Math.abs(parseFloat(withdrawAmount)),
                status: 'Pending',
                ref_id: refId,
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
            setSuccessRefId(refId);
            setShowSuccess(true);
            refreshData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isCheckingAuth && !user) {
        return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;
    }

    return (
        <div className="space-y-10">
            {(!user?.is_verified && user?.email !== "thenja96@gmail.com") ? (
                (user?.kyc_status === 'Pending' || user?.kyc_status === 'pending') ? (
                    <div className="bg-amber-400/10 border border-amber-400/20 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-in fade-in duration-700 max-w-4xl mx-auto">
                        <div className="h-12 w-12 bg-amber-400/20 rounded-full flex items-center justify-center shrink-0">
                            <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-amber-500">{t.verificationInProgress}</h2>
                            <p className="text-zinc-400 text-sm leading-relaxed">{t.verificationInProgressDesc}</p>
                        </div>
                    </div>
                ) : (user?.kyc_status === 'Rejected' || user?.kyc_status === 'rejected') ? (
                    <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-6 animate-in fade-in duration-700 justify-between max-w-4xl mx-auto">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="h-12 w-12 bg-red-500/20 rounded-full flex items-center justify-center shrink-0">
                                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-xl font-bold text-red-500">{t.verificationUnsuccessful}</h2>
                                <p className="text-zinc-400 text-sm leading-relaxed">
                                    {t.verificationUnsuccessfulDesc} <span className="text-white font-medium ml-1 bg-red-500/20 px-2 py-0.5 rounded-md">{user?.rejection_reason || t.rejectionReasonLabel}</span>
                                </p>
                            </div>
                        </div>
                        <Link href={`/verify?lang=${lang}`} className="shrink-0 bg-red-500/20 text-red-500 hover:bg-red-500/30 font-bold px-6 py-3 rounded-xl transition-all text-sm">{t.reuploadBtn}</Link>
                    </div>
                ) : (
                    <div className="bg-gv-gold/5 border border-gv-gold/20 p-8 rounded-[32px] flex flex-col md:flex-row items-center gap-8 animate-in fade-in duration-700 justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <svg className="h-32 w-32 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
                            <div className="h-16 w-16 bg-gv-gold/20 rounded-full flex items-center justify-center shrink-0 text-gv-gold">
                                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-gv-gold">{t.completeProfile}</h2>
                                <p className="text-zinc-400 text-sm leading-relaxed max-w-lg">{t.completeProfileDesc}</p>
                            </div>
                        </div>
                        <Link href={`/verify?lang=${lang}`} className="relative z-10 shrink-0 bg-gv-gold text-black hover:bg-gv-gold/90 font-bold px-8 py-4 rounded-2xl transition-all shadow-[0_10px_20px_rgba(212,175,55,0.15)]">{t.startVerification}</Link>
                    </div>
                )
            ) : (
                <>
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-[#1a1a1a] border border-white/5 p-10 rounded-[40px] shadow-xl hover:border-gv-gold/20 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                                <svg className="h-32 w-32 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div className="relative z-10">
                                <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-4">{t.totalProfit}</p>
                                <h2 className="text-4xl font-black tracking-tighter text-emerald-500">RM {Number(user?.profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
                                <p className="text-[10px] font-bold text-zinc-500 mt-2">(${(Number(user?.profit || 0) / forexRate).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD)</p>
                            </div>
                        </div>

                        <div className="bg-[#1a1a1a] border border-white/5 p-10 rounded-[40px] shadow-xl hover:border-gv-gold/20 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                                <svg className="h-32 w-32 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            </div>
                                {Number(user?.total_investment || 0) > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10 w-full">
                                        <div>
                                            <p className="text-gv-gold text-[10px] font-black uppercase tracking-widest">{t.totalEquity}</p>
                                            <h2 className="text-3xl font-black tracking-tighter text-gv-gold">RM {Number(user?.total_investment || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
                                            <p className="text-[10px] font-bold text-zinc-500 mt-2">(${(Number(user?.total_investment || 0) / forexRate).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD)</p>
                                        </div>
                                        <div className="sm:border-l border-white/5 sm:pl-8 flex flex-col justify-center">
                                            <p className="text-gv-gold text-[10px] font-black uppercase tracking-widest mb-4">{t.currentPackage}</p>
                                            <div className="flex justify-between items-center group/tier">
                                                <div className="flex flex-col gap-1">
                                                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                                                        {getTierByAmount(Number(user?.total_investment || 0) / forexRate).name}
                                                    </h2>
                                                    <span className="text-[10px] font-black text-gv-gold uppercase tracking-widest">{t.activeStatus}</span>
                                                </div>
                                                <TierMedal tierId={getTierByAmount(Number(user?.total_investment || 0) / forexRate).id} size="md" className="shrink-0" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative z-10 w-full flex flex-col items-center justify-center text-center py-2">
                                        <div className="h-14 w-14 bg-gv-gold/10 text-gv-gold rounded-full flex items-center justify-center mb-4 ring-1 ring-gv-gold/20">
                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                        </div>
                                        <h2 className="text-2xl font-black tracking-tighter text-white mb-2 uppercase">{lang === 'en' ? 'Start Investing Now' : '立即开始投资'}</h2>
                                        <p className="text-zinc-500 text-xs font-medium mb-6 max-w-[250px]">{lang === 'en' ? 'Choose from our tier packages to start earning daily dividends.' : '探索我们专业的理财产品，开启您的财富增长之旅。'}</p>
                                        <a href="/dashboard/products" className="bg-gv-gold text-black font-black uppercase tracking-widest text-[10px] px-8 py-3.5 rounded-2xl shadow-xl hover:-translate-y-1 hover:shadow-gv-gold/20 transition-all border border-gv-gold/50">{lang === 'en' ? 'View Products' : '查看产品'}</a>
                                    </div>
                                )}
                        </div>
                    </section>

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-[#1a1a1a] border border-white/5 p-10 rounded-[40px] relative overflow-hidden group">
                           <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-4">{t.expectedMonthly}</p>
                           {(() => {
                               const tier = getTierByAmount(Number(user?.total_investment || 0) / forexRate);
                               const max = Number(user?.total_investment || 0) * tier.maxDividend;
                               return (
                                   <>
                                       <h3 className="text-3xl font-black text-white"><span className="text-sm font-normal normal-case opacity-60 mr-1">up to</span>RM {max.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h3>
                                       <p className="text-[10px] text-zinc-600 font-bold uppercase mt-4">{t.dividendRateDesc} ({t.basedOn} {tier.name})</p>
                                   </>
                               );
                           })()}
                        </div>
                        <div className="bg-[#1a1a1a] border border-white/5 p-10 rounded-[40px] relative overflow-hidden group">
                           <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-4">{t.projectedYearly}</p>
                           {(() => {
                               const tier = getTierByAmount(Number(user?.total_investment || 0) / forexRate);
                               const max = Number(user?.total_investment || 0) * tier.maxDividend * 12;
                               return (
                                   <>
                                       <h3 className="text-3xl font-black text-emerald-500"><span className="text-sm font-normal normal-case opacity-60 mr-1">up to</span>RM {max.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h3>
                                       <p className="text-[10px] text-zinc-600 font-bold uppercase mt-4">{t.dividendRateDesc} ({t.basedOn} {tier.name})</p>
                                   </>
                               );
                           })()}
                        </div>
                    </section>

                    <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        <div className="xl:col-span-2 bg-[#1a1a1a] border border-white/5 p-10 rounded-[40px] space-y-8 overflow-hidden">
                            <h3 className="text-xl font-black uppercase tracking-tighter">{t.dividendTrends}</h3>
                            <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 px-2 sm:px-4">
                                {dividendHistory && dividendHistory.length > 0 ? dividendHistory.slice(-6).map((div: any, i: number) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                                        <div
                                            className="w-full bg-gv-gold rounded-t-xl transition-all duration-500 group-hover:brightness-125"
                                            style={{ height: `${Math.max(10, (div.amount / (Math.max(...dividendHistory.map((d: any) => d.amount)) || 1)) * 100)}%` }}
                                        ></div>
                                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">{new Date(div.created_at).toLocaleDateString('en-US', { month: 'short' })}</span>
                                    </div>
                                )) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-700 font-black uppercase tracking-widest text-xs">{t.noDividendData}</div>
                                )}
                            </div>
                        </div>
                        <div className="bg-[#1a1a1a] border border-white/5 p-8 sm:p-10 rounded-[40px] flex flex-col justify-center items-center text-center space-y-6 overflow-hidden">
                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{t.latestActivity || "Latest Activity"}</p>
                            {transactions && transactions.length > 0 ? (
                                <>
                                    <div className={`h-24 w-24 rounded-full flex items-center justify-center border-2 shrink-0 ${
                                        (transactions[0].type?.toLowerCase().includes('bonus') || transactions[0].type?.toLowerCase().includes('dividend')) ? 'border-gv-gold/20 text-gv-gold' :
                                        transactions[0].status === 'Approved' ? 'border-emerald-500/20 text-emerald-500' : 
                                        transactions[0].status === 'Rejected' ? 'border-red-500/20 text-red-500' : 
                                        'border-amber-500/20 text-amber-500'
                                    }`}>
                                        {(transactions[0].type?.toLowerCase().includes('bonus') || transactions[0].type?.toLowerCase().includes('dividend')) ? (
                                            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        ) : (
                                            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        )}
                                    </div>
                                    <div className="w-full truncate">
                                        <h4 className={`text-2xl font-black uppercase tracking-tighter truncate ${
                                            (transactions[0].metadata?.adjustment_category === 'Dividend' || transactions[0].metadata?.adjustment_category === 'Bonus') ? 'text-gv-gold' :
                                            transactions[0].status === 'Approved' ? 'text-emerald-500' : 
                                            transactions[0].status === 'Rejected' ? 'text-red-500' : 
                                            'text-amber-500'
                                        }`}>
                                            {transactions[0].metadata?.adjustment_category || transactions[0].status}
                                        </h4>
                                        <p className="text-zinc-600 text-[10px] font-bold uppercase mt-1 truncate px-2">
                                            {transactions[0].metadata?.description || transactions[0].type}: RM {Number(transactions[0].amount).toFixed(2)}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <p className="text-zinc-700 font-black uppercase tracking-widest text-xs">{t.noTxFound}</p>
                            )}
                        </div>
                    </section>

                    <section className="flex flex-col sm:flex-row gap-6">
                        <Link
                            href={`/deposit?lang=${lang}`}
                            className="flex-1 bg-gv-gold text-black font-black text-xl py-6 rounded-[28px] hover:bg-gv-gold/90 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 shadow-[0_15px_30px_rgba(212,175,55,0.2)]"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>
                            {t.deposit}
                        </Link>
                        <button
                            onClick={(e) => handleProtectedAction(e, () => setIsWithdrawModalOpen(true))}
                            className="flex-1 bg-[#222] text-white font-black text-xl py-6 rounded-[28px] hover:bg-[#333] hover:-translate-y-1 transition-all flex items-center justify-center gap-3 border border-white/10"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                            {t.withdraw}
                        </button>
                    </section>
                </>
            )}

            {/* Deposit Modal */}
            {isDepositModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1a1a1a] border border-gv-gold/30 rounded-[40px] p-10 max-w-lg w-full space-y-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-black text-gv-gold tracking-tighter uppercase">{t.depositTitle}</h2>
                            <button onClick={() => setIsDepositModalOpen(false)} className="text-zinc-600 hover:text-white transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">{t.amountMYR}</label>
                                <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-2xl font-black focus:outline-none focus:border-gv-gold transition-all" placeholder="0.00" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">{t.transferDate}</label>
                                <input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xl font-black focus:outline-none focus:border-gv-gold transition-all text-white" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">{t.bankReceipt}</label>
                                <div className="border border-white/10 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-colors cursor-pointer relative group">
                                    <svg className="h-10 w-10 text-zinc-600 mb-4 group-hover:text-gv-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{depositReceipt ? depositReceipt.name : t.selectDocument}</span>
                                    <input type="file" onChange={(e) => setDepositReceipt(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,.pdf" />
                                </div>
                            </div>
                            <button onClick={handleDepositSubmit} disabled={isSubmitting || !depositAmount || !depositReceipt} className="w-full bg-gv-gold text-black font-black py-5 rounded-2xl flex justify-center items-center gap-3 uppercase tracking-widest shadow-xl disabled:opacity-50 transition-all hover:-translate-y-1">
                                {isSubmitting ? <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : t.confirmDeposit}
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
                            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{t.withdrawTitle}</h2>
                            <button onClick={() => setIsWithdrawModalOpen(false)} className="text-zinc-600 hover:text-white transition-colors"><X className="h-6 w-6" /></button>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">{t.amountMYR}</label>
                                <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-2xl font-black focus:outline-none focus:border-gv-gold transition-all" placeholder="0.00" />
                                <div className="flex justify-between px-1 text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-2">
                                    <span>Withdrawable</span>
                                    <span className="text-emerald-500">RM {user?.withdrawable_balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            <button onClick={handleWithdrawInitiate} disabled={!withdrawAmount} className="w-full bg-white text-black font-black py-5 rounded-2xl flex justify-center items-center gap-3 uppercase tracking-widest shadow-xl disabled:opacity-50 transition-all hover:bg-gv-gold">
                                {t.requestWithdraw}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Penalty Confirmation Modal */}
            {showPenaltyConfirm && penaltyInfo && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#111] border border-gv-gold/30 rounded-[40px] p-10 max-w-lg w-full space-y-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                        <div className="h-20 w-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                            <svg className="h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <div className="text-center space-y-4">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Penalty Confirmation</h3>
                            <p className="text-zinc-500 font-bold text-sm leading-relaxed">
                                Your withdrawal of RM {parseFloat(withdrawAmount).toLocaleString()} includes capital protected by our 6-month lock-in period.
                            </p>
                            <div className="bg-white/5 rounded-3xl p-6 border border-white/5 space-y-4">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                    <span>Locked Portion</span>
                                    <span>RM {penaltyInfo.lockedPortion.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-red-500">
                                    <span>Penalty (40%)</span>
                                    <span>- RM {penaltyInfo.penalty.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="h-px bg-white/5"></div>
                                <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-emerald-500">
                                    <span>Estimated Payout</span>
                                    <span>RM {penaltyInfo.payout.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-4">
                            <button 
                                onClick={() => { setShowPenaltyConfirm(false); setIsPinModalOpen(true); }}
                                className="w-full bg-gv-gold text-black font-black py-5 rounded-2xl uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all"
                            >
                                I Accept & Continue
                            </button>
                            <button onClick={() => setShowPenaltyConfirm(false)} className="w-full text-zinc-600 font-bold hover:text-white transition-colors uppercase tracking-widest text-[10px]">Back to Edit</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PIN Modal */}
            {isPinModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
                    <div className="bg-[#111] border border-gv-gold/50 rounded-[40px] p-12 max-w-md w-full text-center space-y-10 shadow-[0_0_100px_rgba(212,175,55,0.15)] animate-in fade-in zoom-in-90 duration-300">
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">{t.securityPin}</h3>
                            <p className="text-zinc-500 font-medium text-sm px-4">{t.enterPin}</p>
                        </div>
                        <div className="relative flex justify-center items-center group">
                            <input
                                type={isPinVisible ? "text" : "password"}
                                maxLength={6}
                                value={withdrawPIN}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWithdrawPIN(e.target.value.replace(/\D/g, ''))}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-4xl font-black text-center tracking-[0.5em] focus:outline-none focus:border-gv-gold transition-all text-gv-gold placeholder:opacity-20 flex-1"
                                autoFocus
                                placeholder="000000"
                            />
                            <button 
                                type="button"
                                onClick={() => setIsPinVisible(!isPinVisible)}
                                className="absolute right-4 p-2 text-zinc-600 hover:text-gv-gold transition-colors"
                            >
                                {isPinVisible ? (
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                ) : (
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057-5.064-7-9.542-7 1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057-5.064-7-9.542-7 1.274 4.057-5.064 7 9.542 7-4.477 0-8.268-2.943-9.542-7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" /></svg>
                                )}
                            </button>
                        </div>
                        <div className="space-y-4">
                            <button onClick={handleWithdrawConfirm} disabled={isSubmitting || withdrawPIN.length !== 6} className="w-full bg-gv-gold text-black font-black py-5 rounded-2xl flex justify-center items-center gap-3 uppercase tracking-widest shadow-xl disabled:opacity-50 transition-all">
                                {isSubmitting ? <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : t.confirmWithdraw}
                            </button>
                            <button onClick={() => setIsPinModalOpen(false)} className="w-full text-zinc-600 font-bold hover:text-white transition-colors uppercase tracking-widest text-[10px]">{t.cancelTx}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Toast */}
            {actionToast && (
                <div className="fixed bottom-6 right-6 z-[600] bg-[#1a1a1a] border border-gv-gold/30 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-5 max-w-sm">
                    <div className="flex flex-col gap-4">
                        <p className="text-white font-black text-sm uppercase tracking-widest">{actionToast.message}</p>
                        {actionToast.actionUrl && (
                            <button onClick={() => { setActionToast(null); router.push(actionToast.actionUrl!); }} className="bg-gv-gold text-black font-black py-3 rounded-xl uppercase tracking-widest text-xs">{actionToast.actionText}</button>
                        )}
                        <button onClick={() => setActionToast(null)} className="text-zinc-500 hover:text-white text-[10px] font-bold uppercase tracking-widest">Dismiss</button>
                    </div>
                </div>
            )}

            {/* Success Overlay */}
            {showSuccess && (
                <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="bg-[#1a1a1a] border border-gv-gold/30 rounded-[40px] p-10 max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        <div className="h-20 w-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h2 className="text-3xl font-black uppercase text-white tracking-tighter">{t.successTitle}</h2>
                        <p className="text-zinc-400 font-medium">{t.successDesc}</p>
                        {successRefId && <div className="bg-white/5 py-3 rounded-2xl border border-emerald-500/20 text-emerald-400 font-black">Ref: {successRefId}</div>}
                        <button onClick={() => setShowSuccess(false)} className="w-full bg-gv-gold text-black font-black py-4 rounded-2xl uppercase tracking-widest">Dismiss</button>
                    </div>
                </div>
            )}
        </div>
    );
}
