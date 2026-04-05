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
    const { forexRate, withdrawalRate } = useSettings();
    const router = useRouter();

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 animate-in fade-in duration-700">
                <div className="h-12 w-12 border-4 border-gv-gold border-t-transparent animate-spin rounded-full shadow-lg shadow-gv-gold/20"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Synchronizing Vault Assets...</p>
            </div>
        );
    }
    const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successRefId, setSuccessRefId] = useState("");
    
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawType, setWithdrawType] = useState<"Dividends" | "Capital">("Dividends");
    const [withdrawPIN, setWithdrawPIN] = useState("");
    const [isPinVisible, setIsPinVisible] = useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    
    const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
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
            confirmTitle: "Withdrawal Confirmation",
            penaltyTitle: "Limited Release Notice",
            confirmDesc: "Please review the details of your withdrawal request.",
            penaltyDesc: "Your withdrawal includes capital protected by our lock-in period.",
            lockedPortion: "Locked Fraction",
            penaltyAmt: "Early Closing Penalty (40%)",
            estPayoutUSD: "Net Payout",
            acceptBtn: "Review & Authorize",
            cancelBtn: "Cancel and Edit",
            continueToPin: "Continue",
            currentTier: "Current Tier",
            member: "Member",
            verificationRequired: "Verification Required",
            verificationDesc: "To ensure the security of your assets and comply with institutional regulations, we require all users to complete identity verification before initiating a withdrawal.",
            verifyNow: "Verify Identity",
            withdrawAll: "Withdraw All",
            totalWithdrawal: "Total Withdrawal",
            daysLeft: "Days Remaining"
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
            confirmTitle: "提款确认",
            penaltyTitle: "违约金确认",
            confirmDesc: "请核对您的提款申请。确认无误后将进行授权。",
            penaltyDesc: "您的提款包含受锁定期保护的资金。",
            lockedPortion: "锁定部分",
            penaltyAmt: "提前结清违约金 (40%)",
            estPayoutUSD: "实收金额",
            acceptBtn: "核实并授权",
            cancelBtn: "取消并重试",
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
            withdrawAll: "提取全部",
            totalWithdrawal: "提款总额",
            daysLeft: "天剩余"
        }
    }[lang];

    const matureCapitalUSD = Number(user?.mature_capital_usd || 0);
    const dividendWithdrawableUSD = Number(user?.dividend_withdrawable_usd || 0);
    const totalCapitalUSD = Number(user?.balance_usd || 0);
    const availableAmountUSD = withdrawType === 'Dividends' ? dividendWithdrawableUSD : totalCapitalUSD;

    // Fix Tier detection: If database has a specific tier, use it, otherwise detect via capital
    const userTierId = (user?.tier && user?.tier !== "Standard" && user?.tier !== "No Tier") 
        ? user.tier.toLowerCase() 
        : getTierByAmount(totalCapitalUSD).id;

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
        
        if (amountUSD > (availableAmountUSD + 0.01)) {
            alert(lang === 'zh' ? "金额超过总余额。" : `Requested amount exceeds your total ${withdrawType} balance.`);
            return;
        }

        if (withdrawType === 'Dividends') {
            setPenaltyInfo({
                penalty: 0, payout: amountUSD * withdrawalRate, lockedPortion: 0, 
                penalty_usd: 0, payout_usd: amountUSD, lockedPortion_usd: 0, isApplied: false
            });
            setShowWithdrawConfirm(true);
        } else {
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
                
                const netRate = withdrawalRate - 0.4;
                setPenaltyInfo({
                    penalty: penaltyUSD * netRate, payout: finalPayoutUSD * netRate,
                    lockedPortion: lockedPortionUSD * netRate, penalty_usd: penaltyUSD,
                    payout_usd: finalPayoutUSD, lockedPortion_usd: lockedPortionUSD, isApplied: true
                });
                setShowWithdrawConfirm(true);
            } else {
                setPenaltyInfo({
                    penalty: 0, payout: amountUSD * withdrawalRate, lockedPortion: 0,
                    penalty_usd: 0, payout_usd: amountUSD, lockedPortion_usd: 0, isApplied: false
                });
                setShowWithdrawConfirm(true);
            }
        }
    };

    const handleWithdrawConfirm = async () => {
        if (!user || withdrawPIN.trim().length !== 6) {
            alert("Please enter a 6-digit Security PIN."); return;
        }
        setIsSubmitting(true);
        try {
            const { data: p, error: pinError } = await supabase.from('profiles').select('security_pin, balance_usd, profit').eq('id', user.id).single();
            if (pinError) throw pinError;
            if ((p?.security_pin || "").toString().trim() !== withdrawPIN.trim()) throw new Error("Invalid security PIN.");

            const amountUSD = parseFloat(withdrawAmount);
            let newProfitUSD = Number(p.profit || 0); 
            let newBalanceUSD = Number(p.balance_usd || 0);

            if (withdrawType === 'Dividends') newProfitUSD = Math.max(0, newProfitUSD - amountUSD);
            else newBalanceUSD = Math.max(0, newBalanceUSD - amountUSD);

            const { error: profileUpdateError } = await supabase.from('profiles').update({ balance: 0, profit: newProfitUSD, balance_usd: newBalanceUSD }).eq('id', user.id);
            if (profileUpdateError) throw profileUpdateError;

            const refId = `WDL-${Math.floor(100000 + Math.random() * 900000)}`;
            const { error } = await supabase.from('transactions').insert([{
                user_id: user.id, type: 'Withdrawal', amount: -Math.abs(amountUSD), status: 'Pending', ref_id: refId,
                original_currency_amount: amountUSD, original_currency: 'USD',
                metadata: {
                    withdrawal_source: withdrawType, expected_payout: penaltyInfo?.payout, original_usd_payout: penaltyInfo?.payout_usd,
                    forex_rate: withdrawalRate, locked_withdrawal: penaltyInfo?.isApplied,
                    payout_method: (() => {
                        const method = (withdrawalMethods || []).find((m: any) => m.id === selectedMethodId);
                        if (selectedMethodId === 'KYC_BANK') return `${user.bank_name} (${user.account_number})`;
                        if (!method) return "Institutional Account";
                        return method.type === 'BANK' ? `${method.bank_name} (${method.account_number})` : `USDT TRC20 (${method.usdt_address})`;
                    })(),
                    ...(penaltyInfo?.isApplied ? { penalty_applied: true, penalty_amount: penaltyInfo.penalty, original_usd_penalty: penaltyInfo.penalty_usd, locked_portion: penaltyInfo.lockedPortion, penalty_rate: "40%" } : {})
                }
            }]);
            
            if (error) throw error;
            setIsPinModalOpen(false); setSuccessRefId(refId); setShowSuccess(true); refreshData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (showSuccess) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 animate-in zoom-in-95 duration-500 text-center">
                <div className="h-24 w-24 bg-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/20"><CheckCircle2 className="h-12 w-12 text-white" strokeWidth={3} /></div>
                <h2 className="text-4xl font-black uppercase text-gray-900 tracking-tighter mb-4">{t.success}</h2>
                <p className="text-gray-500 font-medium mb-8 max-w-sm">{t.successDesc}</p>
                <div className="bg-white px-8 py-4 rounded-3xl border border-emerald-500/20 text-emerald-500 font-black text-xl mb-12">{t.ref}: {successRefId}</div>
                <button onClick={() => router.push(`/dashboard?lang=${lang}`)} className="bg-gv-gold text-black font-black py-5 px-12 rounded-2xl uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all">{t.back}</button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-10">
            <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 md:p-10 flex items-center justify-between gap-8 shadow-sm animate-in fade-in duration-500">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.push(`/dashboard?lang=${lang}`)} className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-gv-gold transition-all shadow-sm group">
                        <ArrowLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div className="space-y-3">
                        <div className="hidden md:flex items-center gap-3">
                            <div className="h-0.5 w-10 bg-gv-gold rounded-full"></div>
                            <span className="text-gv-gold text-[10px] font-black uppercase tracking-[0.4em] mb-0.5">Asset Liquidation</span>
                        </div>
                        <div className="space-y-0.5">
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">{t.title}</h1>
                            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-1">{t.desc}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Compact Quick Stats Row */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-24 animate-in fade-in duration-1000 py-2">
                <div className="flex flex-col items-center md:items-start gap-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{lang === 'en' ? 'Total Capital Assets' : '总资产'}</span>
                    <div className="flex items-center gap-2">
                        <p className="text-xl font-black text-slate-900 tabular-nums tracking-tighter">$ {(totalCapitalUSD).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <TierMedal tierId={userTierId} size="xs" className="shrink-0" />
                    </div>
                </div>

                <div className="h-8 w-px bg-gray-200 hidden md:block opacity-50"></div>

                <div className="flex flex-col items-center md:items-start gap-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{lang === 'en' ? 'Capital Status' : '资金状态'}</span>
                    <div className="flex items-center gap-2.5">
                        {user?.next_maturity_date ? (
                            <div className="flex items-baseline gap-1.5 leading-none">
                                <span className="text-xl font-black text-slate-900 tabular-nums tracking-tighter">
                                    {Math.ceil((new Date(user.next_maturity_date).getTime() - new Date().getTime()) / 86400000)}
                                </span>
                                <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400">
                                    {t.daysLeft}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <div className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <p className="text-sm font-black uppercase tracking-tighter text-emerald-500">{lang === 'en' ? 'Fully Matured' : '资金已到期'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-center w-full">
                <div className="w-full max-w-2xl space-y-8 animate-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-white border border-gray-100 rounded-[40px] p-8 md:p-10 shadow-2xl shadow-gray-200/40 space-y-8">
                        <div className="space-y-8">
                            {/* Source Selection - More Compact */}
                            <div className="space-y-3">
                                <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest px-1">{lang === 'en' ? "Withdrawal Source" : "提款来源"}</label>
                                <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-2xl border border-stone-200/30">
                                    {(['Dividends', 'Capital'] as const).map((type) => (
                                        <button key={type} onClick={() => { setWithdrawType(type); setWithdrawAmount(""); }} className={`py-3 rounded-[14px] text-[9px] font-black uppercase tracking-widest transition-all ${withdrawType === type ? 'bg-slate-900 text-gv-gold shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>
                                            {type === 'Dividends' ? (lang === 'en' ? "Dividends" : "累计分红") : (lang === 'en' ? "Capital" : "本金资本")}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Amount Input - More Compact */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-end px-2">
                                    <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{t.amount}</label>
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[8px] font-bold uppercase tracking-widest text-gray-300">Available:</span>
                                            <span className="text-[11px] font-black text-slate-900 tabular-nums leading-none">$ {availableAmountUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <button onClick={() => setWithdrawAmount(availableAmountUSD.toFixed(2))} className="bg-gv-gold/10 text-gv-gold hover:bg-gv-gold hover:text-black transition-all px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest">{t.withdrawAll}</button>
                                    </div>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-300 font-black text-lg">$</div>
                                    <input type="number" placeholder="0.00" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl pl-12 pr-7 py-5 text-2xl font-black text-slate-900 focus:outline-none focus:border-gv-gold transition-all tabular-nums" />
                                </div>
                                {withdrawType === 'Capital' && parseFloat(withdrawAmount) > (matureCapitalUSD + 0.01) && (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-500 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-1">
                                        <AlertTriangle className="h-3 w-3" /><span className="text-[9px] font-black uppercase italic">{lang === 'en' ? "Full withdrawal required for locked capital." : "提取锁定资本需提取全部余额。"}</span>
                                    </div>
                                )}
                            </div>

                            {/* Payout Destination - More Compact */}
                            <div className="space-y-3 pt-4 border-t border-gray-100">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block px-1">{lang === 'en' ? 'Payout Destination' : '提款目标'}</label>
                                <div className="grid grid-cols-1 gap-2.5">
                                    {(withdrawalMethods || []).map((method: any) => (
                                        <button key={method.id} onClick={() => setSelectedMethodId(method.id)} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedMethodId === method.id ? 'bg-gv-gold/5 border-gv-gold ring-1 ring-gv-gold' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${selectedMethodId === method.id ? 'bg-gv-gold text-white' : 'bg-white text-gray-400'}`}>{method.type === 'BANK' ? <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 00-3 3z" /></svg> : <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}</div>
                                                <div className="space-y-0.5"><p className={`text-[11px] font-black uppercase tracking-tight ${selectedMethodId === method.id ? 'text-slate-900' : 'text-slate-600'}`}>{method.type === 'BANK' ? method.bank_name : 'USDT TRC20'}</p><p className="text-[9px] font-bold text-gray-400 tracking-wider font-mono">{method.type === 'BANK' ? `**** ${method.account_number.slice(-4)}` : `${method.usdt_address.slice(0, 8)}...`}</p></div>
                                            </div>
                                            {selectedMethodId === method.id && <div className="h-5 w-5 bg-gv-gold rounded-full flex items-center justify-center text-white scale-110 shadow-lg shadow-gv-gold/30"><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg></div>}
                                        </button>
                                    ))}
                                    {user?.bank_name && (
                                        <button onClick={() => setSelectedMethodId('KYC_BANK')} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedMethodId === 'KYC_BANK' ? 'bg-gv-gold/5 border-gv-gold ring-1 ring-gv-gold' : 'bg-slate-50/50 border-slate-100 hover:border-slate-200'}`}>
                                            <div className="flex items-center gap-4"><div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${selectedMethodId === 'KYC_BANK' ? 'bg-gv-gold text-white' : 'bg-slate-100 text-slate-400'}`}><ShieldCheck className="h-5 w-5" /></div><div className="space-y-0.5"><p className="text-[11px] font-black uppercase tracking-tight">Primary Bank (KYC)</p><p className="text-[9px] font-bold text-gray-400 tracking-wider">{user?.bank_name}</p></div></div>
                                            {selectedMethodId === 'KYC_BANK' && <div className="h-5 w-5 bg-gv-gold rounded-full flex items-center justify-center text-white"><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg></div>}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <button onClick={handleWithdrawInitiate} disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || !selectedMethodId || isSubmitting} className="w-full bg-slate-900 border-2 border-slate-900 text-gv-gold font-black py-5 rounded-2xl text-base uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 disabled:hover:translate-y-0">{t.continueToPin}</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showWithdrawConfirm && penaltyInfo && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-md">
                    <div className="bg-white rounded-[40px] p-8 max-w-md w-full max-h-[85vh] overflow-y-auto space-y-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="text-center space-y-3">
                            <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto transition-colors ${penaltyInfo.isApplied ? 'bg-amber-100 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>{penaltyInfo.isApplied ? <AlertTriangle className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}</div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter">{penaltyInfo.isApplied ? t.penaltyTitle : t.confirmTitle}</h3>
                            <p className="text-gray-500 text-xs font-medium leading-relaxed px-4">{penaltyInfo.isApplied ? t.penaltyDesc : t.confirmDesc}</p>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 space-y-5">
                            {penaltyInfo.isApplied ? (
                                <div className="space-y-3 pb-5 border-b border-dashed border-slate-200">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400 tracking-wider"><span>Total Balance</span><span className="tabular-nums font-bold">$ {totalCapitalUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400 tracking-wider"><span>{t.lockedPortion}</span><span className="tabular-nums font-bold">$ {penaltyInfo.lockedPortion_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-red-500 tracking-wider"><span>{t.penaltyAmt}</span><span className="tabular-nums font-bold">- $ {penaltyInfo.penalty_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center pb-5 border-b border-dashed border-slate-200 text-[10px] font-black uppercase text-gray-400 tracking-widest font-mono"><span>{t.totalWithdrawal}</span><span className="text-slate-900 font-bold">$ {penaltyInfo.payout_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                            )}

                            <div className="flex flex-col items-center justify-center text-emerald-500 space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{t.estPayoutUSD}</span>
                                <span className="text-5xl font-black tabular-nums tracking-tighter leading-tight">$ {penaltyInfo.payout_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <div className="pt-2 text-center"><span className="text-lg font-black tabular-nums tracking-tight opacity-90">RM {penaltyInfo.payout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                            </div>
                            
                            <div className="text-[9px] font-black text-gray-400 text-center uppercase tracking-[0.3em] font-mono border-t border-slate-200 pt-4">Rate: $1.0 = RM {(forexRate - 0.4).toFixed(2)}</div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button onClick={() => { setShowWithdrawConfirm(false); setIsPinModalOpen(true); }} className={`w-full font-black py-5 rounded-2xl uppercase tracking-[0.2em] shadow-xl hover:-translate-y-1 active:scale-95 transition-all text-base ${penaltyInfo.isApplied ? 'bg-amber-500 text-white' : 'bg-gv-gold text-black'}`}>{t.acceptBtn}</button>
                            <button onClick={() => setShowWithdrawConfirm(false)} className="w-full text-slate-400 font-black hover:text-slate-900 transition-colors uppercase tracking-[0.1em] text-[10px] py-2">{t.cancelBtn}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PIN Modal */}
            {isPinModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-xl">
                    <div className="bg-white rounded-[40px] p-10 md:p-12 max-w-md w-full text-center space-y-10 shadow-2xl animate-in zoom-in-90 duration-300">
                        <div className="space-y-3"><h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{t.securityPin}</h3><p className="text-gray-400 font-medium text-sm leading-relaxed px-6">{t.enterPin}</p></div>
                        <div className="relative group">
                            <input type={isPinVisible ? "text" : "password"} maxLength={6} value={withdrawPIN} onChange={(e) => setWithdrawPIN(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-8 text-5xl font-black text-center tracking-[0.3em] text-gv-gold focus:outline-none focus:border-gv-gold transition-all" autoFocus placeholder="000000" />
                            <button onClick={() => setIsPinVisible(!isPinVisible)} className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gv-gold transition-colors">{isPinVisible ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}</button>
                        </div>
                        <div className="flex flex-col gap-4">
                            <button onClick={handleWithdrawConfirm} disabled={isSubmitting || withdrawPIN.length !== 6} className="w-full bg-slate-900 text-white font-black py-6 rounded-[28px] uppercase tracking-[0.2em] shadow-xl hover:bg-gv-gold hover:text-black transition-all text-lg">{isSubmitting ? <div className="h-6 w-6 border-4 border-white/30 border-t-white animate-spin rounded-full mx-auto" /> : t.submit}</button>
                            <button onClick={() => setIsPinModalOpen(false)} className="text-slate-400 font-bold uppercase text-[10px] py-1 tracking-widest">{t.cancelBtn}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
