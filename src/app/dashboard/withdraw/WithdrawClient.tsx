"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/providers/UserProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, CheckCircle2, ShieldCheck, AlertTriangle, Eye, EyeOff } from "lucide-react";
import TierMedal from "@/components/TierMedal";
import { getTierByAmount } from "@/lib/tierUtils";

export default function WithdrawClient({ lang }: { lang: "en" | "zh" }) {
    const { userProfile: user, withdrawalMethods, refreshData } = useUser();
    const { withdrawalRate } = useSettings();
    const router = useRouter();
    const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);

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
            estPayout: "Net Payout (RM)",
            estPayoutUSD: "Net Payout (USD)",
            acceptBtn: "I Accept & Continue",
            cancelBtn: "Cancel and Edit",
            continueToPin: "Continue",
            currentTier: "Current Tier",
            member: "Member",
            verificationRequired: "Verification Required",
            verificationDesc: "To ensure the security of your assets and comply with institutional regulations, we require all users to complete identity verification before initiating a withdrawal.",
            verifyNow: "Verify Identity",
            withdrawAll: "Withdraw All"
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
            estPayout: "实收金额 (RM)",
            estPayoutUSD: "实收金额 (USD)",
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
            withdrawAll: "提取全部"
        }
    }[lang];

    const matureCapitalUSD = Number(user?.mature_capital_usd || 0);
    const dividendWithdrawableUSD = Number(user?.dividend_withdrawable_usd || 0);
    const totalCapitalUSD = Number(user?.balance_usd || 0);
    
    // User can always input up to their total capital, but penalty applies if touching locked funds
    const availableAmountUSD = withdrawType === 'Dividends' ? dividendWithdrawableUSD : totalCapitalUSD;

    const handleWithdrawInitiate = () => {
        const amountUSD = parseFloat(withdrawAmount);
        if (!amountUSD || amountUSD <= 0) return;

        if (selectedMethodId === 'KYC_BANK' && (!user.bank_name || !user.account_number)) {
            alert(lang === 'en' ? "Please provide bank details in your profile." : "请在个人资料中提供银行信息。");
            return;
        } else if (!selectedMethodId) {
            alert(lang === 'en' ? "Please select a payout destination." : "请选择提款目标。");
            return;
        }
        
        // 1. Validation based on selection
        if (amountUSD > (availableAmountUSD + 0.01)) {
            alert(lang === 'zh' ? "金额超过总余额。" : `Requested amount exceeds your total ${withdrawType} balance.`);
            return;
        }

        // 2. Penalty Logic
        if (withdrawType === 'Dividends') {
            // Dividends never incur a penalty
            setPenaltyInfo({
                penalty: 0,
                payout: amountUSD * withdrawalRate,
                lockedPortion: 0,
                penalty_usd: 0,
                payout_usd: amountUSD,
                lockedPortion_usd: 0,
                isApplied: false
            });
            setIsPinModalOpen(true);
        } else {
            // Capital withdrawal: Check if pulling from locked funds
            if (amountUSD > (matureCapitalUSD + 0.01)) {
                // RULE: If touching locked funds, MUST withdraw EVERYTHING in capital bucket
                const isTotalCapitalWithdrawal = amountUSD >= (totalCapitalUSD - 0.01);
                if (!isTotalCapitalWithdrawal) {
                    alert(lang === 'zh' ? "提取锁定资本必须提取全部本金金额（不可部分提取）。" : "To withdraw from your locked capital, you must withdraw your entire capital balance. Partial withdrawals are not permitted.");
                    return;
                }

                const lockedPortionUSD = totalCapitalUSD - matureCapitalUSD;
                const penaltyUSD = lockedPortionUSD * 0.4;
                const finalPayoutUSD = totalCapitalUSD - penaltyUSD;
                
                setPenaltyInfo({
                    penalty: penaltyUSD * withdrawalRate,
                    payout: finalPayoutUSD * withdrawalRate,
                    lockedPortion: lockedPortionUSD * withdrawalRate,
                    penalty_usd: penaltyUSD,
                    payout_usd: finalPayoutUSD,
                    lockedPortion_usd: lockedPortionUSD,
                    isApplied: true
                });
                setShowPenaltyConfirm(true);
            } else {
                // Mature capital withdrawal (can be partial)
                setPenaltyInfo({
                    penalty: 0,
                    payout: amountUSD * withdrawalRate,
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

            const amountUSD = parseFloat(withdrawAmount);
            const initialProfitUSD = Number(p.profit || 0); 
            const initialBalanceUSD = Number(p.balance_usd || 0);

            let newProfitUSD = initialProfitUSD;
            let newBalanceUSD = initialBalanceUSD;

            if (withdrawType === 'Dividends') {
                newProfitUSD = Math.max(0, initialProfitUSD - amountUSD);
            } else {
                newBalanceUSD = Math.max(0, initialBalanceUSD - amountUSD);
            }

            const profitDeduction = initialProfitUSD - newProfitUSD;
            const balanceDeduction = initialBalanceUSD - newBalanceUSD;

            const { error: profileUpdateError } = await supabase
                .from('profiles')
                .update({ 
                    balance: 0,
                    profit: newProfitUSD,
                    balance_usd: newBalanceUSD
                })
                .eq('id', user.id);
            
            if (profileUpdateError) throw profileUpdateError;

            const refId = `WDL-${Math.floor(100000 + Math.random() * 900000)}`;
            const { error } = await supabase.from('transactions').insert([{
                user_id: user.id,
                type: 'Withdrawal',
                amount: -Math.abs(amountUSD),
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
                        if (selectedMethodId === 'KYC_BANK') {
                            return `${user.bank_name} (${user.account_number})`;
                        }
                        const method = (withdrawalMethods || []).find((m: any) => m.id === selectedMethodId);
                        if (!method) return "Institutional Account";
                        return method.type === 'BANK' 
                            ? `${method.bank_name} (${method.account_number})`
                            : `USDT TRC20 (${method.usdt_address})`;
                    })(),
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

            <div className="bg-gray-50/80 backdrop-blur-md border border-gray-200 rounded-2xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-700 shadow-sm transition-all hover:bg-white group">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center text-gv-gold shadow-lg">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{lang === 'en' ? 'Total Capital Assets' : '总资产'}</span>
                        <p className="text-lg font-black text-slate-900 tabular-nums">
                            $ {(user?.balance_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${user?.next_maturity_date ? 'bg-amber-100 text-amber-500' : 'bg-emerald-100 text-emerald-500'}`}>
                        {user?.next_maturity_date ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{lang === 'en' ? 'Capital Status' : '资金状态'}</span>
                        {user?.next_maturity_date ? (
                            <p className="text-base font-black text-slate-900 uppercase tracking-tighter">
                                {lang === 'zh' ? `距到期还剩 ${Math.ceil((new Date(user.next_maturity_date).getTime() - new Date().getTime()) / 86400000)} 天` : `${Math.ceil((new Date(user.next_maturity_date).getTime() - new Date().getTime()) / 86400000)} Days Left`}
                            </p>
                        ) : (
                            <p className="text-base font-black text-emerald-500 uppercase tracking-tighter">{lang === 'en' ? 'Fully Matured' : '资金已到期'}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                    <div className="bg-white border border-gray-200 rounded-[32px] p-8 md:p-10 shadow-2xl space-y-10">
                        <div className="space-y-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">{lang === 'en' ? "Withdrawal Source" : "提款来源"}</label>
                                <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-2xl">
                                    {(['Dividends', 'Capital'] as const).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => { setWithdrawType(type); setWithdrawAmount(""); }}
                                            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${withdrawType === type ? 'bg-stone-900 text-gv-gold shadow-lg' : 'text-gray-400'}`}
                                        >
                                            {type === 'Dividends' ? (lang === 'en' ? "Dividends" : "累计分红") : (lang === 'en' ? "Capital" : "本金资本")}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end px-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{t.amount}</label>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 tabular-nums">
                                            $ {availableAmountUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                        <button 
                                            onClick={() => setWithdrawAmount(availableAmountUSD.toFixed(2))}
                                            className="text-[9px] font-black uppercase text-gv-gold border border-gv-gold/20 px-2 py-0.5 rounded hover:bg-gv-gold/10 transition-colors"
                                        >
                                            {t.withdrawAll}
                                        </button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs">$</div>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        className="w-full bg-stone-50 border border-stone-200 rounded-3xl pl-10 pr-6 py-5 text-2xl font-black text-gray-900 focus:outline-none focus:border-gv-gold transition-all"
                                    />
                                </div>
                                {withdrawType === 'Capital' && parseFloat(withdrawAmount) > (matureCapitalUSD + 0.01) && (
                                    <p className="text-[9px] text-red-500 font-bold italic px-2">
                                        ⚠️ {lang === 'en' ? "Locked capital detected. Full withdrawal required with a 40% penalty." : "检测到锁定资本。需提取全部本金并扣除 40% 违约金。"}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">{lang === 'en' ? 'Payout Destination' : '提款目标'}</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {withdrawalMethods?.map((method: any) => (
                                        <button key={method.id} onClick={() => setSelectedMethodId(method.id)} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedMethodId === method.id ? 'bg-gv-gold/5 border-gv-gold ring-1 ring-gv-gold' : 'bg-gray-50 border-gray-100'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${selectedMethodId === method.id ? 'bg-gv-gold text-white' : 'bg-white text-gray-300'}`}>
                                                    {method.type === 'BANK' ? <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 00-3 3z" /></svg> : <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black uppercase text-gray-900">{method.type === 'BANK' ? method.bank_name : 'USDT TRC20'}</p>
                                                    <p className="text-[10px] font-bold text-gray-400">{method.type === 'BANK' ? `**** ${method.account_number.slice(-4)}` : `${method.usdt_address.slice(0, 6)}...`}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                    {user.bank_name && (
                                        <button onClick={() => setSelectedMethodId('KYC_BANK')} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedMethodId === 'KYC_BANK' ? 'bg-gv-gold/5 border-gv-gold ring-1 ring-gv-gold' : 'bg-white border-gray-100'}`}>
                                            <div className="flex items-center gap-4"><div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><ShieldCheck className="h-5 w-5" /></div><div><p className="text-[11px] font-black uppercase">Primary Bank (KYC)</p><p className="text-[10px] font-bold text-gray-400">{user.bank_name}</p></div></div>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <button onClick={handleWithdrawInitiate} disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || isSubmitting} className="w-full bg-black text-white font-black py-5 rounded-2xl text-base uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50">{t.continueToPin}</button>
                        </div>
                    </div>
                </div>
                <div className="space-y-8">
                    <div className="bg-white border border-gray-200 rounded-[32px] p-8 shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-6">{t.currentTier}</span>
                        <div className="flex items-center gap-4">
                            <TierMedal tierId={user?.tier?.toLowerCase() || 'none'} size="lg" />
                            <div className="flex flex-col"><span className="text-lg font-black uppercase">{user?.tier || 'Member'}</span><span className="text-[10px] font-bold text-gv-gold uppercase">{t.member}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {showPenaltyConfirm && penaltyInfo && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-md">
                    <div className="bg-white rounded-[40px] p-10 max-w-lg w-full space-y-8 shadow-2xl animate-in zoom-in-95">
                        <div className="text-center space-y-4">
                            <div className="h-16 w-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto"><AlertTriangle className="h-8 w-8 text-amber-500" /></div>
                            <h3 className="text-2xl font-black uppercase">{t.penaltyTitle}</h3>
                            <p className="text-gray-500 text-sm">{t.penaltyDesc}</p>
                        </div>
                        <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 space-y-5">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400">
                                <span>Total Balance</span>
                                <span>$ {totalCapitalUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400 border-t border-gray-200 pt-3">
                                <span>Locked Portion</span>
                                <span>$ {penaltyInfo.lockedPortion_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black uppercase text-red-500">
                                <span>{t.penaltyAmt}</span>
                                <span>- $ {penaltyInfo.penalty_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center text-emerald-500 border-t border-gray-200 pt-8 pb-2 space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{t.estPayoutUSD}</span>
                                <span className="text-5xl font-black tabular-nums tracking-tighter">$ {penaltyInfo.payout_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <div className="flex items-center gap-2 pt-2">
                                    <span className="text-xs font-bold uppercase tracking-widest opacity-60">{t.estPayout}:</span>
                                    <span className="text-lg font-black tabular-nums">RM {penaltyInfo.payout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            <div className="text-[9px] font-black text-gray-400 text-center uppercase tracking-widest border-t border-gray-200 pt-3">
                                Applied Rate: $1.00 = RM {withdrawalRate.toFixed(2)}
                            </div>
                        </div>
                        <div className="flex flex-col gap-4">
                            <button onClick={() => { setShowPenaltyConfirm(false); setIsPinModalOpen(true); }} className="w-full bg-gv-gold text-black font-black py-5 rounded-2xl uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all">{t.acceptBtn}</button>
                            <button onClick={() => setShowPenaltyConfirm(false)} className="w-full text-gray-400 font-bold hover:text-gray-900 transition-colors uppercase tracking-widest text-[10px]">{t.cancelBtn}</button>
                        </div>
                    </div>
                </div>
            )}

            {isPinModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-xl">
                    <div className="bg-white rounded-[40px] p-12 max-w-md w-full text-center space-y-10 shadow-2xl animate-in zoom-in-90">
                        <div className="space-y-2"><h3 className="text-2xl font-black uppercase">{t.securityPin}</h3><p className="text-gray-400 text-sm">{t.enterPin}</p></div>
                        <div className="relative">
                            <input
                                type={isPinVisible ? "text" : "password"}
                                maxLength={6}
                                value={withdrawPIN}
                                onChange={(e) => setWithdrawPIN(e.target.value.replace(/\D/g, ''))}
                                className="w-full bg-gray-50 border border-gray-200 rounded-3xl p-8 text-5xl font-black text-center tracking-[0.4em] text-gv-gold focus:outline-none"
                                autoFocus
                            />
                            <button onClick={() => setIsPinVisible(!isPinVisible)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400">{isPinVisible ? <EyeOff /> : <Eye />}</button>
                        </div>
                        <div className="flex flex-col gap-4">
                            <button onClick={handleWithdrawConfirm} disabled={isSubmitting || withdrawPIN.length !== 6} className="w-full bg-black text-white font-black py-5 rounded-2xl uppercase tracking-widest hover:bg-gv-gold hover:text-black transition-all">
                                {isSubmitting ? "..." : t.submit}
                            </button>
                            <button onClick={() => setIsPinModalOpen(false)} className="text-gray-400 font-bold uppercase text-[10px]">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
