"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/providers/UserProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, CheckCircle2, ShieldCheck, AlertTriangle, Eye, EyeOff } from "lucide-react";
import TierMedal from "@/components/TierMedal";
import VerificationBlocker from "@/components/VerificationBlocker";
import { getTierByAmount } from "@/lib/tierUtils";

export default function WithdrawClient({ lang }: { lang: "en" | "zh" }) {
    const { userProfile: user, withdrawalMethods, refreshData } = useUser();
    const { withdrawalRate } = useSettings();
    const router = useRouter();
    const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
    const [isOneTime, setIsOneTime] = useState(false);
    const [oneTimeMethod, setOneTimeMethod] = useState({
        type: 'BANK' as 'BANK' | 'USDT',
        bank_name: '',
        account_number: '',
        bank_account_holder: '',
        usdt_address: '',
        usdt_network: 'TRC20'
    });

    const malaysianBanks = [
        "Maybank", "CIMB Bank", "Public Bank", "RHB Bank", "Hong Leong Bank", 
        "AmBank", "UOB Malaysia", "OCBC Bank Malaysia", "HSBC Bank Malaysia", 
        "Bank Islam Malaysia", "Affin Bank", "Alliance Bank", "Standard Chartered Malaysia", 
        "MBSB Bank", "Bank Rakyat", "Bank Muamalat", "Other"
    ];

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successRefId, setSuccessRefId] = useState("");
    
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawType, setWithdrawType] = useState<"Dividends" | "Capital">("Dividends");
    const [withdrawPIN, setWithdrawPIN] = useState("");
    const [isPinVisible, setIsPinVisible] = useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    
    const [showPenaltyConfirm, setShowPenaltyConfirm] = useState(false);
    const [penaltyInfo, setPenaltyInfo] = useState<{
        penalty: number;
        payout: number;
        lockedPortion: number;
        penalty_usd: number;
        payout_usd: number;
        lockedPortion_usd: number;
        isApplied: boolean;
    } | null>(null);

    React.useEffect(() => {
        if (withdrawalMethods && withdrawalMethods.length > 0 && !selectedMethodId) {
            const defaultMethod = withdrawalMethods.find((m: any) => m.is_default) || withdrawalMethods[0];
            setSelectedMethodId(defaultMethod.id);
        }
    }, [withdrawalMethods, selectedMethodId]);

    const t = {
        en: {
            title: "Request Withdrawal",
            desc: "Withdraw capital or dividends from your account. Processed within 3 working days.",
            amount: "Amount (USD)",
            withdrawable: "Withdrawable",
            securityPin: "Security PIN",
            enterPin: "Enter your 6-digit security PIN to authorize this withdrawal.",
            submit: "Authorize Withdrawal",
            back: "Back to Dashboard",
            success: "Submission Successful",
            successDesc: "Your withdrawal request will be reviewed and processed within 3 working days.",
            ref: "Reference ID",
            penaltyTitle: "Penalty Confirmation",
            penaltyDesc: "Your withdrawal includes capital protected by our lock-in period.",
            lockedPortion: "Locked Portion",
            penaltyAmt: "Early Withdrawal Penalty (40%)",
            estPayout: "Estimated Payout",
            acceptBtn: "I Accept & Continue",
            cancelBtn: "Cancel and Edit",
            continueToPin: "Continue",
            currentTier: "Current Tier",
            member: "Member",
            verificationRequired: "Verification Required",
            verificationDesc: "To ensure the security of your assets and comply with institutional regulations, we require all users to complete identity verification before initiating a withdrawal.",
            verifyNow: "Verify Identity",
        },
        zh: {
            title: "申请提款",
            desc: "从您的账户中提取本金或分红。处理时间为 3 个工作日。",
            amount: "金额 (USD)",
            withdrawable: "可提款余额",
            securityPin: "安全密码",
            enterPin: "请输入您的 6 位安全密码以授权此项提款。",
            submit: "授权提款",
            back: "返回仪表板",
            success: "提交成功",
            successDesc: "您的提款请求将在 3 个工作日内审核并处理。",
            ref: "参考编号",
            penaltyTitle: "违约金确认",
            penaltyDesc: "您的提款包含受锁定期保护的资金。",
            lockedPortion: "锁定部分",
            penaltyAmt: "提前取款违约金 (40%)",
            estPayout: "预计到账金额",
            acceptBtn: "我接受并继续",
            cancelBtn: "取消并编辑",
            continueToPin: "继续",
            currentTier: "当前等级",
            member: "会员",
            verificationRequired: "需要身份验证",
            verificationDesc: "为了确保您的资产安全并遵守机构监管要求，我们要求所有用户在发起提款前完成身份验证。",
            verifyNow: "立即验证",
            withdrawSource: "选择提款来源",
            sourceDividends: "累计分红",
            sourceCapital: "本金资本",
            availableBalance: "可提款余额",
            noLockedWarning: "锁定本金将产生 40% 的罚金。",
        }
    }[lang];

    const matureCapitalUSD = Number(user?.mature_capital_usd || 0);
    const dividendWithdrawableUSD = Number(user?.dividend_withdrawable_usd || 0);
    const totalCapitalUSD = Number(user?.balance_usd || 0);
    
    // Total assets is the sum of both pools
    const totalAssetsUSD = Number(user?.total_assets_usd || 0);

    // Available amount depends on current selection
    const availableAmountUSD = withdrawType === 'Dividends' ? dividendWithdrawableUSD : totalCapitalUSD;

    const handleWithdrawInitiate = () => {
        const amountUSD = parseFloat(withdrawAmount);
        if (!amountUSD || amountUSD <= 0) return;

        if (isOneTime) {
            if (oneTimeMethod.type === 'BANK' && (!oneTimeMethod.bank_name || !oneTimeMethod.account_number)) {
                alert(lang === 'en' ? "Please provide bank details for the one-time payout." : "请提供一次性提款的银行信息。");
                return;
            }
            if (oneTimeMethod.type === 'USDT' && !oneTimeMethod.usdt_address) {
                alert(lang === 'en' ? "Please provide a USDT address for the one-time payout." : "请提供一次性提款的 USDT 地址。");
                return;
            }
        } else if (!selectedMethodId) {
            alert(lang === 'en' ? "Please select a payout destination." : "请选择提款目标。");
            return;
        }
        
        // 1. Validation based on selection
        if (amountUSD > (availableAmountUSD + 0.01)) {
            alert(lang === 'zh' ? "金额超过可提款余额。" : `Requested amount exceeds available ${withdrawType} balance.`);
            return;
        }

        // 2. Penalty Logic
        if (withdrawType === 'Dividends') {
            // Dividends never incur a penalty
            setPenaltyInfo({
                penalty: 0,
                payout: amountUSD * (withdrawalRate - 0.4),
                lockedPortion: 0,
                penalty_usd: 0,
                payout_usd: amountUSD,
                lockedPortion_usd: 0,
                isApplied: false
            });
            setIsPinModalOpen(true);
        } else {
            // Capital withdrawal: Check if pulling from locked funds
            if (amountUSD > matureCapitalUSD) {
                // To pull from locked funds, user must withdraw EVERYTHING in their capital bucket
                // However, the requested rule "if no available capital... show warning" suggests showing the modal
                const isTotalCapitalWithdrawal = amountUSD >= (totalCapitalUSD - 0.01);
                if (!isTotalCapitalWithdrawal) {
                    alert(lang === 'zh' ? "提取锁定资本必须提取全部本金金额。" : "To withdraw from your locked capital, you must withdraw your entire capital balance.");
                    return;
                }

                const lockedPortionUSD = amountUSD - matureCapitalUSD;
                const penaltyUSD = lockedPortionUSD * 0.4;
                const finalPayoutUSD = amountUSD - penaltyUSD;
                
                setPenaltyInfo({
                    penalty: penaltyUSD * (withdrawalRate - 0.4),
                    payout: finalPayoutUSD * (withdrawalRate - 0.4),
                    lockedPortion: lockedPortionUSD * (withdrawalRate - 0.4),
                    penalty_usd: penaltyUSD,
                    payout_usd: finalPayoutUSD,
                    lockedPortion_usd: lockedPortionUSD,
                    isApplied: true
                });
                setShowPenaltyConfirm(true);
            } else {
                // Mature capital withdrawal
                setPenaltyInfo({
                    penalty: 0,
                    payout: amountUSD * (withdrawalRate - 0.4),
                    lockedPortion: 0,
                    penalty_usd: 0,
                    payout_usd: amountUSD,
                    lockedPortion_usd: 0,
                    isApplied: false
                });
                setIsPinModalOpen(true);
            }
        }
    };

    const handleWithdrawConfirm = async () => {
        if (!user || withdrawPIN.trim().length !== 6) {
            alert("Please enter a 6-digit Security PIN.");
            return;
        }
        setIsSubmitting(true);
        try {
            const { data: p, error: pinError } = await supabase
                .from('profiles')
                .select('security_pin, balance_usd, profit')
                .eq('id', user.id)
                .single();
            
            if (pinError) throw pinError;
            if ((p?.security_pin || "").toString().trim() !== withdrawPIN.trim()) {
                throw new Error("Invalid security PIN.");
            }

            // 0. Deduplication Check (Prevent double-submission if clicked twice)
            const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
            const { data: existingTx } = await supabase
                .from('transactions')
                .select('id')
                .eq('user_id', user.id)
                .eq('type', 'Withdrawal')
                .eq('status', 'Pending')
                .gt('created_at', thirtySecondsAgo)
                .maybeSingle();
            
            if (existingTx) {
                throw new Error("A withdrawal request was already submitted. Please wait for it to process.");
            }

            // 1. Chronological Ledger Simulation (Verify true available Profit)
            const { data: txList } = await supabase
                .from('transactions')
                .select('type, amount, status, metadata, original_currency_amount, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            let ledgerProfitUSD = 0;
            (txList || []).forEach(t => {
                const type = (t.type || "").toLowerCase();
                const category = (t.metadata?.adjustment_category || "").toLowerCase();
                const isApproved = ['Approved', 'Completed', 'Pending Release'].includes(t.status);
                const isDivOrBonus = type === 'dividend' || type === 'bonus' || category === 'dividend' || category === 'bonus' || category === 'profit';
                
                if (isDivOrBonus && isApproved) {
                    ledgerProfitUSD += Number(t.original_currency_amount ?? (Number(t.amount || 0) / withdrawalRate));
                }

                if (type === 'withdrawal' && t.status !== 'Rejected') {
                    const amt = Number(t.original_currency_amount ?? (Math.abs(Number(t.amount || 0)) / withdrawalRate));
                    if (t.metadata?.profit_portion !== undefined) {
                        ledgerProfitUSD = Math.max(0, ledgerProfitUSD - Number(t.metadata.profit_portion));
                    } else {
                        // Legacy fallback: Deduct from profit until empty
                        ledgerProfitUSD = Math.max(0, ledgerProfitUSD - Math.min(ledgerProfitUSD, amt));
                    }
                }
            });

            const amountUSD = parseFloat(withdrawAmount);
            const initialProfitUSD = ledgerProfitUSD; 
            const initialBalanceUSD = Number(p.balance_usd || 0);

            // 1. Precise Source-based Deduction
            let newProfitUSD = initialProfitUSD;
            let newBalanceUSD = initialBalanceUSD;
            let remainingUSD = amountUSD;

            if (withdrawType === 'Dividends') {
                newProfitUSD = Math.max(0, initialProfitUSD - amountUSD);
            } else {
                newBalanceUSD = Math.max(0, initialBalanceUSD - amountUSD);
            }

            const profitDeduction = initialProfitUSD - newProfitUSD;
            const balanceDeduction = initialBalanceUSD - newBalanceUSD;

            // 2. Perform Single Submission Deduction
            const { error: profileUpdateError } = await supabase
                .from('profiles')
                .update({ 
                    balance: 0, // Cleanup legacy RM balance
                    profit: newProfitUSD,
                    balance_usd: newBalanceUSD
                })
                .eq('id', user.id);
            
            if (profileUpdateError) throw profileUpdateError;

            // 3. Insert Withdrawal Transaction (NEGATIVE amount)
            const refId = `WDL-${Math.floor(100000 + Math.random() * 900000)}`;
            const { error } = await supabase.from('transactions').insert([{
                user_id: user.id,
                type: 'Withdrawal',
                amount: -Math.abs(amountUSD), // ENSURE NEGATIVE SIGN FOR WITHDRAWAL
                status: 'Pending',
                ref_id: refId,
                original_currency_amount: amountUSD,
                original_currency: 'USD',
                metadata: {
                    description: "Withdrawal",
                    withdrawal_source: withdrawType,
                    profit_portion: profitDeduction,
                    balance_portion: balanceDeduction,
                    original_usd_amount: withdrawAmount,
                    forex_rate: withdrawalRate,
                    expected_payout: penaltyInfo?.payout,
                    original_usd_payout: penaltyInfo?.payout_usd,
                    locked_withdrawal: penaltyInfo?.isApplied,
                    payout_method: (() => {
                        if (isOneTime) {
                            return oneTimeMethod.type === 'BANK' 
                                ? `[ONE-TIME] ${oneTimeMethod.bank_name} (${oneTimeMethod.account_number})`
                                : `[ONE-TIME] USDT TRC20 (${oneTimeMethod.usdt_address})`;
                        }
                        const method = withdrawalMethods.find(m => m.id === selectedMethodId);
                        if (!method) return "Institutional Account";
                        return method.type === 'BANK' 
                            ? `${method.bank_name} (${method.account_number})`
                            : `USDT TRC20 (${method.usdt_address})`;
                    })(),
                    method_details: isOneTime ? oneTimeMethod : withdrawalMethods.find(m => m.id === selectedMethodId),
                    ...(penaltyInfo?.isApplied ? {
                        penalty_applied: true,
                        penalty_amount: penaltyInfo.penalty,
                        original_usd_penalty: penaltyInfo.penalty_usd,
                        locked_portion: penaltyInfo.lockedPortion,
                        penalty_rate: "40%"
                    } : {})
                }
            }]);
            
            if (error) throw error;

            setIsPinModalOpen(false);
            setSuccessRefId(refId);
            setShowSuccess(true);
            refreshData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (showSuccess) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="h-24 w-24 bg-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 className="h-12 w-12 text-white" strokeWidth={3} />
                </div>
                <h2 className="text-4xl font-black uppercase text-gray-900 tracking-tighter mb-4">{t.success}</h2>
                <p className="text-gray-500 font-medium mb-8 text-center max-w-sm">{t.successDesc}</p>
                <div className="bg-white px-8 py-4 rounded-3xl border border-emerald-500/20 text-emerald-500 font-black text-xl mb-12">
                    {t.ref}: {successRefId}
                </div>
                <button 
                    onClick={() => router.push(`/dashboard?lang=${lang}`)}
                    className="bg-gv-gold text-black font-black py-5 px-12 rounded-2xl uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all"
                >
                    {t.back}
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-20">
            <div className="flex items-center gap-6">
                <button 
                    onClick={() => router.push(`/dashboard?lang=${lang}`)}
                    className="h-12 w-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gv-gold transition-all shadow-sm hover:shadow-md"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">{t.title}</h1>
                    <p className="text-gray-400 text-sm font-medium">{t.desc}</p>
                </div>
            </div>

            {/* Capital Status & Lock-in Countdown - Compact Text Bar */}
            <div className="bg-gray-50/80 backdrop-blur-md border border-gray-200 rounded-2xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-700 shadow-sm transition-all hover:bg-white group">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center text-gv-gold shadow-lg rotate-12 group-hover:rotate-0 transition-all">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{lang === 'en' ? 'Total Capital Assets' : '总资产'}</span>
                        <p className="text-lg font-black text-slate-900 tabular-nums leading-none tracking-tighter">
                            $ {(user?.balance_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                <div className="h-px w-full md:h-8 md:w-px bg-gray-200 hidden md:block"></div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${user?.next_maturity_date ? 'bg-amber-100 text-amber-500' : 'bg-emerald-100 text-emerald-500'}`}>
                        {user?.next_maturity_date 
                            ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
                        }
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{lang === 'en' ? 'Capital Status' : '资金状态'}</span>
                        {user?.next_maturity_date ? (
                            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                                <p className="text-base font-black text-slate-900 uppercase tracking-tighter flex items-baseline gap-1">
                                    {(() => {
                                        const now = new Date();
                                        const maturityDate = new Date(user.next_maturity_date);
                                        const diffMs = maturityDate.getTime() - now.getTime();
                                        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                                        if (lang === 'zh') return `距到期还剩 ${diffDays} 天`;
                                        return (
                                            <>
                                                {diffDays} Days <span className="text-[10px] opacity-60 font-medium lowercase">left</span>
                                            </>
                                        );
                                    })()}
                                </p>
                                <span className="text-[10px] font-bold text-gv-gold bg-gv-gold/10 px-2 py-0.5 rounded-md uppercase tracking-tight">
                                    {new Date(user.next_maturity_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                </span>
                            </div>
                        ) : (
                            <p className="text-base font-black text-emerald-500 uppercase tracking-tighter">
                                {lang === 'en' ? 'Fully Matured' : '资金已到期'}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                    <div className="bg-white border border-gray-200 rounded-[32px] p-8 md:p-10 shadow-2xl space-y-10">
                        <div className="space-y-10">
                            {/* Withdrawal Source Selector */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">
                                    {lang === 'en' ? "Withdrawal Source" : "提款来源"}
                                </label>
                                <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-2xl border border-stone-200/50">
                                    {(['Dividends', 'Capital'] as const).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => {
                                                setWithdrawType(type);
                                                setWithdrawAmount("");
                                            }}
                                            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                withdrawType === type 
                                                    ? 'bg-stone-900 text-gv-gold shadow-lg shadow-black/20' 
                                                    : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                        >
                                            {type === 'Dividends' ? (lang === 'en' ? "Dividends" : "提累计分红") : (lang === 'en' ? "Capital" : "提本金资本")}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end px-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{t.amount}</label>
                                    <div className="text-right">
                                        <span className={`text-[9px] font-bold uppercase tracking-widest ${withdrawType === 'Dividends' ? 'text-emerald-500' : 'text-gv-gold'}`}>
                                            {lang === 'en' ? `Available ${withdrawType}` : `可用${withdrawType === 'Dividends' ? '分红' : '本金'}`}: 
                                        </span>
                                        <span className="ml-2 text-xs font-black text-gray-900 tabular-nums">
                                            $ {availableAmountUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs">$</div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        className={`w-full bg-stone-50 border border-stone-200 rounded-3xl pl-10 pr-6 py-5 text-2xl font-black text-gray-900 focus:outline-none focus:border-gv-gold transition-all placeholder:text-stone-300 ${withdrawType === 'Capital' && parseFloat(withdrawAmount) > matureCapitalUSD ? 'border-red-200 bg-red-50/10' : ''}`}
                                    />
                                </div>

                                {withdrawType === 'Capital' && parseFloat(withdrawAmount) > 0 && (
                                    <div className="flex flex-col gap-2 px-2">
                                        <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
                                            <span className="text-gray-400">Locked Capital Threshold</span>
                                            <span className="text-gray-900 font-black">$ {matureCapitalUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        {parseFloat(withdrawAmount) > matureCapitalUSD && (
                                            <p className="text-[9px] text-red-500 font-bold italic leading-relaxed animate-in slide-in-from-top-1 duration-300">
                                                ⚠️ {lang === 'en' 
                                                    ? "Request exceeds mature capital. A 40% early withdrawal penalty will be applied to the locked portion." 
                                                    : "请求金额超过到期本金。将对锁定部分扣除 40% 的提前结清违约金。"}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Payout Destination Selection */}
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">{lang === 'en' ? 'Payout Destination' : '提款目标'}</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {withdrawalMethods && withdrawalMethods.length > 0 && !isOneTime ? (
                                        withdrawalMethods.map((method: any) => (
                                            <button 
                                                key={method.id}
                                                onClick={() => setSelectedMethodId(method.id)}
                                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left group ${selectedMethodId === method.id ? 'bg-gv-gold/5 border-gv-gold ring-1 ring-gv-gold' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${selectedMethodId === method.id ? 'bg-gv-gold text-white' : 'bg-white text-gray-300 group-hover:text-gray-400'}`}>
                                                        {method.type === 'BANK' ? (
                                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 00-3 3z" /></svg>
                                                        ) : (
                                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className={`text-[11px] font-black uppercase tracking-tight ${selectedMethodId === method.id ? 'text-gray-900' : 'text-gray-500'}`}>
                                                            {method.type === 'BANK' ? method.bank_name : 'USDT TRC20'}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">
                                                            {method.type === 'BANK' ? `**** ${method.account_number.slice(-4)}` : `${method.usdt_address.slice(0, 6)}...${method.usdt_address.slice(-4)}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                {selectedMethodId === method.id && (
                                                    <div className="h-5 w-5 bg-gv-gold rounded-full flex items-center justify-center text-white">
                                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>
                                                    </div>
                                                )}
                                            </button>
                                        ))
                                    ) : !isOneTime ? (
                                        <div className="bg-amber-50 border border-amber-100 p-6 rounded-[24px] text-center space-y-4">
                                            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-tight">
                                                {lang === 'en' ? 'No payout methods added yet.' : '尚未设置提款方式。'}
                                            </p>
                                            <button 
                                                onClick={() => router.push(`/dashboard/profile?lang=${lang}`)}
                                                className="bg-white text-slate-900 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-200 hover:bg-amber-100 transition-all"
                                            >
                                                {lang === 'en' ? 'Manage Payouts' : '管理提款方式'}
                                            </button>
                                        </div>
                                    ) : null}

                                    {/* One-time Option Toggle */}
                                    <button 
                                        onClick={() => setIsOneTime(!isOneTime)}
                                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${isOneTime ? 'bg-slate-900 border-slate-900 shadow-xl' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${isOneTime ? 'bg-gv-gold text-slate-900' : 'bg-gray-100 text-gray-400'}`}>
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </div>
                                            <div>
                                                <p className={`text-[11px] font-black uppercase tracking-tight ${isOneTime ? 'text-white' : 'text-gray-900'}`}>{lang === 'en' ? 'One-time Account' : '一次性提款账户'}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">{lang === 'en' ? 'Use detailed payout details for this transaction only' : '仅为此项交易提供详细提款信息'}</p>
                                            </div>
                                        </div>
                                        <div className={`h-6 w-10 rounded-full relative transition-colors ${isOneTime ? 'bg-gv-gold' : 'bg-gray-200'}`}>
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isOneTime ? 'left-5' : 'left-1'}`}></div>
                                        </div>
                                    </button>

                                    {/* One-time Inputs */}
                                    {isOneTime && (
                                        <div className="space-y-4 p-6 bg-gray-50 rounded-2xl border border-gray-200 animate-in slide-in-from-top-2 duration-300">
                                            <div className="flex bg-white p-1 rounded-xl gap-1">
                                                <button 
                                                    onClick={() => setOneTimeMethod({...oneTimeMethod, type: 'BANK'})}
                                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${oneTimeMethod.type === 'BANK' ? 'bg-slate-900 text-gv-gold' : 'text-gray-400'}`}
                                                >
                                                    Bank Account
                                                </button>
                                                <button 
                                                    onClick={() => setOneTimeMethod({...oneTimeMethod, type: 'USDT'})}
                                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${oneTimeMethod.type === 'USDT' ? 'bg-slate-900 text-gv-gold' : 'text-gray-400'}`}
                                                >
                                                    USDT TRC20
                                                </button>
                                            </div>

                                            {oneTimeMethod.type === 'BANK' ? (
                                                <div className="grid grid-cols-1 gap-3">
                                                    <select 
                                                        value={oneTimeMethod.bank_name}
                                                        onChange={(e) => setOneTimeMethod({...oneTimeMethod, bank_name: e.target.value})}
                                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-gv-gold"
                                                    >
                                                        <option value="">Select Bank...</option>
                                                        {malaysianBanks.map(b => <option key={b} value={b}>{b}</option>)}
                                                    </select>
                                                    <input 
                                                        type="text"
                                                        value={oneTimeMethod.account_number}
                                                        onChange={(e) => setOneTimeMethod({...oneTimeMethod, account_number: e.target.value})}
                                                        placeholder="Account Number"
                                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-gv-gold"
                                                    />
                                                    <input 
                                                        type="text"
                                                        value={oneTimeMethod.bank_account_holder}
                                                        onChange={(e) => setOneTimeMethod({...oneTimeMethod, bank_account_holder: e.target.value})}
                                                        placeholder="Account Holder Name"
                                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-gv-gold"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <input 
                                                        type="text"
                                                        value={oneTimeMethod.usdt_address}
                                                        onChange={(e) => setOneTimeMethod({...oneTimeMethod, usdt_address: e.target.value})}
                                                        placeholder="USDT Wallet Address (TRC20)"
                                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-gv-gold font-mono"
                                                    />
                                                    <p className="text-[10px] text-amber-600 font-bold uppercase leading-tight px-1">Ensure network is Tron (TRC20)</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button 
                                onClick={handleWithdrawInitiate} 
                                disabled={
                                    !withdrawAmount || 
                                    parseFloat(withdrawAmount) <= 0 || 
                                    parseFloat(withdrawAmount) > (availableAmountUSD + 0.01) ||
                                    (!selectedMethodId && !isOneTime) || 
                                    (withdrawType === 'Capital' && parseFloat(withdrawAmount) > matureCapitalUSD && parseFloat(withdrawAmount) < (totalCapitalUSD - 0.01)) ||
                                    isSubmitting
                                } 
                                className="w-full bg-black text-white font-black py-5 rounded-2xl flex justify-center items-center gap-4 text-lg uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            >
                                {t.continueToPin}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-white border border-gray-200 rounded-[32px] p-8 shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-6">{t.currentTier}</span>
                        <div className="flex items-center gap-4">
                            <TierMedal 
                                tierId={(user?.tier && user?.tier !== "Standard") ? user.tier.toLowerCase() : getTierByAmount(Number(user?.total_investment_usd || 0)).id} 
                                size="lg" 
                            />
                            <div className="flex flex-col">
                                <span className="text-lg font-black text-gray-900 uppercase tracking-tighter">
                                    {(user?.tier && user?.tier !== "Standard") ? user.tier : getTierByAmount(Number(user?.total_investment_usd || 0)).name}
                                </span>
                                <span className="text-[10px] font-bold text-gv-gold uppercase tracking-widest">{t.member}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gv-gold/5 border border-gv-gold/20 rounded-[32px] p-8 space-y-4">
                        <div className="h-10 w-10 bg-gv-gold/20 rounded-xl flex items-center justify-center text-gv-gold">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 leading-tight">Secured Request</h4>
                        <p className="text-[10px] font-medium text-gray-500 leading-relaxed uppercase">
                            Your transaction is protected by 256-bit encryption and requires manual authorization by our dedicated treasury team.
                        </p>
                    </div>
                </div>
            </div>

            {/* Penalty Confirm Modal */}
            {showPenaltyConfirm && penaltyInfo && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-md">
                    <div className="bg-white border border-gray-200 rounded-[40px] p-10 max-w-lg w-full space-y-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                        <div className="h-20 w-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                            <AlertTriangle className="h-10 w-10 text-amber-500" strokeWidth={3} />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">{t.penaltyTitle}</h3>
                            <p className="text-gray-500 font-medium text-sm leading-relaxed">{t.penaltyDesc}</p>
                        </div>
                        <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <span>{t.lockedPortion}</span>
                                <div className="text-right">
                                    <span className="block">$ {(penaltyInfo.lockedPortion_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-red-500">
                                <span>{t.penaltyAmt}</span>
                                <div className="text-right">
                                    <span className="block">- $ {(penaltyInfo.penalty_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            <div className="h-px bg-gray-200"></div>
                            <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-emerald-500">
                                <span>{t.estPayout}</span>
                                <div className="text-right">
                                    <span className="block">$ {(penaltyInfo.payout_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    <span className="block text-[10px] opacity-80 font-black">≈ RM {(penaltyInfo.payout || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-4">
                            <button 
                                onClick={() => { setShowPenaltyConfirm(false); setIsPinModalOpen(true); }}
                                className="w-full bg-gv-gold text-black font-black py-5 rounded-2xl uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all"
                            >
                                {t.acceptBtn}
                            </button>
                            <button onClick={() => setShowPenaltyConfirm(false)} className="w-full text-gray-400 font-bold hover:text-gray-900 transition-colors uppercase tracking-widest text-[10px]">{t.cancelBtn}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PIN Modal */}
            {isPinModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-xl">
                    <div className="bg-white border border-gray-200 rounded-[40px] p-12 max-w-md w-full text-center space-y-10 shadow-2xl animate-in fade-in zoom-in-90 duration-300">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">{t.securityPin}</h3>
                            <p className="text-gray-400 font-medium text-sm px-4">{t.enterPin}</p>
                        </div>
                        <div className="relative flex justify-center items-center group">
                            <input
                                type={isPinVisible ? "text" : "password"}
                                maxLength={6}
                                value={withdrawPIN}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWithdrawPIN(e.target.value.replace(/\D/g, ''))}
                                className="w-full bg-gray-50 border border-gray-200 rounded-3xl p-8 text-5xl font-black text-center tracking-[0.4em] focus:outline-none focus:border-gv-gold transition-all text-gv-gold placeholder:opacity-20 flex-1"
                                autoFocus
                                placeholder="000000"
                            />
                            <button 
                                type="button"
                                onClick={() => setIsPinVisible(!isPinVisible)}
                                className="absolute right-6 p-2 text-gray-400 hover:text-gv-gold transition-colors"
                            >
                                {isPinVisible ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                            </button>
                        </div>
                        <div className="space-y-4">
                            <button onClick={handleWithdrawConfirm} disabled={isSubmitting || withdrawPIN.length !== 6} className="w-full bg-black text-white font-black py-5 rounded-2xl flex justify-center items-center gap-4 uppercase tracking-widest shadow-xl transition-all hover:bg-gv-gold hover:text-black text-lg">
                                {isSubmitting ? <div className="h-5 w-5 border-4 border-white border-t-transparent animate-spin rounded-full"></div> : t.submit}
                            </button>
                            <button onClick={() => setIsPinModalOpen(false)} className="w-full text-gray-400 font-bold hover:text-gray-900 transition-colors uppercase tracking-widest text-[10px]">Cancel Transaction</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
