"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/providers/UserProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, CheckCircle2, ShieldCheck, AlertTriangle, Eye, EyeOff } from "lucide-react";
import TierMedal from "@/components/TierMedal";
import { getTierByAmount } from "@/lib/tierUtils";
import PremiumLoader from "@/components/PremiumLoader";

export default function WithdrawClient({ lang }: { lang: "en" | "zh" }) {
    const { userProfile: user, refreshData } = useUser();
    const { withdrawalRate } = useSettings();
    const router = useRouter();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successRefId, setSuccessRefId] = useState("");
    
    const [withdrawAmount, setWithdrawAmount] = useState("");
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

    const t = {
        en: {
            title: "Request Withdrawal",
            desc: "Withdraw capital or dividends from your account. Processed within 24-48 business hours.",
            amount: "Amount (USD)",
            withdrawable: "Withdrawable",
            securityPin: "Security PIN",
            enterPin: "Enter your 6-digit security PIN to authorize this withdrawal.",
            submit: "Authorize Withdrawal",
            back: "Back to Dashboard",
            success: "Submission Successful",
            successDesc: "Your withdrawal request has been received and is being processed by our finance team.",
            ref: "Reference ID",
            penaltyTitle: "Penalty Confirmation",
            penaltyDesc: "Your withdrawal includes capital protected by our lock-in period.",
            lockedPortion: "Locked Portion",
            penaltyAmt: "Early Withdrawal Penalty (40%)",
            estPayout: "Estimated Payout",
            acceptBtn: "I Accept & Continue",
            cancelBtn: "Cancel and Edit",
            continueToPin: "Continue to Security PIN",
            currentTier: "Current Tier",
            member: "Member",
        },
        zh: {
            title: "申请提款",
            desc: "从您的账户中提取本金或分红。处理时间为 24-48 个工作小时。",
            amount: "金额 (USD)",
            withdrawable: "可提款余额",
            securityPin: "安全密码",
            enterPin: "请输入您的 6 位安全密码以授权此项提款。",
            submit: "授权提款",
            back: "返回仪表板",
            success: "提交成功",
            successDesc: "您的提款请求已收到，财务团队正在处理中。",
            ref: "参考编号",
            penaltyTitle: "违约金确认",
            penaltyDesc: "您的提款包含受锁定期保护的资金。",
            lockedPortion: "锁定部分",
            penaltyAmt: "提前取款违约金 (40%)",
            estPayout: "预计到账金额",
            acceptBtn: "我接受并继续",
            cancelBtn: "取消并编辑",
            continueToPin: "继续输入安全密码",
            currentTier: "当前等级",
            member: "会员",
        }
    }[lang];

    const handleWithdrawInitiate = () => {
        const amountUSD = parseFloat(withdrawAmount);
        if (!amountUSD || amountUSD <= 0) return;
        
        const amountRM = amountUSD * withdrawalRate;
        const totalAssetsUSD = Number(user?.total_assets_usd || 0);

        if (amountUSD > (totalAssetsUSD + 0.01)) {
            alert(lang === 'zh' ? "金额超过总资产。" : "Requested amount exceeds total assets.");
            return;
        }

        const lockedCapitalUSD = user?.locked_capital_usd || 0;
        const profitUSD = Number(user?.profit_usd || user?.profit || 0); // profit is now USD-primary
        const currentBalanceUSD = Number(user?.balance_usd || 0);
        const maturedCapitalUSD = Math.max(0, currentBalanceUSD - lockedCapitalUSD);
        const userWithdrawableUSD = profitUSD + maturedCapitalUSD;
        
        let lockedPortionUSD = 0;
        if (amountUSD > userWithdrawableUSD) {
            // Check for total withdrawal using USD to avoid rate issues
            const isTotalWithdrawal = amountUSD >= (totalAssetsUSD - 0.01);
            if (!isTotalWithdrawal) {
                alert(lang === 'zh' ? "不允许部分提取锁定资金。要提取锁定资金，您必须提取全部余额。" : "Partial withdrawal of locked capital is not permitted. To withdraw from your locked capital, you must withdraw your entire balance.");
                return;
            }
            lockedPortionUSD = amountUSD - userWithdrawableUSD;
        }

        if (lockedPortionUSD > 0) {
            const penaltyUSD = lockedPortionUSD * 0.4;
            const finalPayoutUSD = amountUSD - penaltyUSD;
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
                .select('security_pin')
                .eq('id', user.id)
                .single();
            
            if (pinError) throw pinError;
            if ((p?.security_pin || "").toString().trim() !== withdrawPIN.trim()) {
                throw new Error("Invalid security PIN.");
            }

            const refId = `WDL-${Math.floor(100000 + Math.random() * 900000)}`;
            const amountUSD = parseFloat(withdrawAmount);
            const amountRM = amountUSD * withdrawalRate;
            
            const { error } = await supabase.from('transactions').insert([{
                user_id: user.id,
                type: 'Withdrawal',
                amount: Math.abs(amountUSD), // Record USD value primary truth
                status: 'Pending',
                ref_id: refId,
                original_currency_amount: amountUSD,
                original_currency: 'USD',
                metadata: {
                    original_usd_amount: withdrawAmount,
                    forex_rate: withdrawalRate,
                    ...(penaltyInfo?.isApplied ? {
                        penalty_applied: true,
                        penalty_amount: penaltyInfo.penalty,
                        original_usd_penalty: penaltyInfo.penalty_usd,
                        expected_payout: penaltyInfo.payout,
                        original_usd_payout: penaltyInfo.payout_usd,
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
            <div className="min-h-[75vh] flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-1000 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/[0.05] via-transparent to-transparent pointer-events-none"></div>
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="h-28 w-28 bg-emerald-500/10 rounded-full flex items-center justify-center mb-10 border border-emerald-500/30 shadow-[0_0_60px_rgba(16,185,129,0.2)] animate-pulse">
                        <CheckCircle2 className="h-14 w-14 text-emerald-400" strokeWidth={3} />
                    </div>
                    <h2 className="text-5xl font-black uppercase text-white tracking-tighter mb-6 underline decoration-gv-gold decoration-4 underline-offset-8 decoration-emerald-500/30">{t.success}</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mb-10 max-w-sm leading-loose opacity-60">{t.successDesc}</p>
                    <div className="premium-glass bg-black/60 px-12 py-6 rounded-[32px] border border-white/10 text-emerald-400 font-black text-2xl mb-14 shadow-2xl relative group overflow-hidden">
                        <div className="absolute inset-0 bg-emerald-500/[0.03] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <span className="relative z-10 tabular-nums uppercase tracking-widest">{t.ref}: {successRefId}</span>
                    </div>
                    <button 
                        onClick={() => router.push(`/dashboard?lang=${lang}`)}
                        className="group/btn relative bg-white/5 hover:bg-gv-gold text-white hover:text-black font-black py-6 px-16 rounded-[24px] uppercase tracking-[0.4em] text-xs transition-all border border-white/10 hover:border-gv-gold shadow-2xl hover:-translate-y-1 active:scale-95 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gv-gold/20 blur-xl opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                        <span className="relative z-10">{t.back}</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-20">
            <div className="flex items-center gap-8">
                <button 
                    onClick={() => router.push(`/dashboard?lang=${lang}`)}
                    className="h-14 w-14 rounded-2xl premium-glass bg-black/40 border-white/10 flex items-center justify-center text-gray-400 hover:text-gv-gold transition-all shadow-2xl hover:-translate-y-1 active:scale-90"
                >
                    <ArrowLeft className="h-7 w-7" />
                </button>
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter">{t.title}</h1>
                    <p className="text-gray-500 text-[10px] uppercase font-black tracking-[0.25em] opacity-60 leading-relaxed">{t.desc}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                    <div className="premium-glass border-gv-gold/10 rounded-[40px] p-8 md:p-12 shadow-2xl space-y-12 transition-all duration-700">
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <label className="text-gv-gold/60 text-[9px] font-black uppercase tracking-[0.3em] px-2">{t.amount}</label>
                                <div className="relative group">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gv-gold/40 group-focus-within:text-gv-gold transition-colors">$</span>
                                    <input 
                                        type="number" 
                                        value={withdrawAmount} 
                                        onChange={(e) => setWithdrawAmount(e.target.value)} 
                                        className="w-full bg-black/40 border border-white/5 rounded-3xl p-7 pl-14 text-4xl font-black focus:outline-none focus:border-gv-gold/50 focus:bg-black/60 transition-all tabular-nums text-white shadow-inner" 
                                        placeholder="0.00" 
                                    />
                                </div>
                                {withdrawAmount && (
                                    <p className="px-2 text-[11px] font-bold text-gv-gold/80 uppercase tracking-[0.1em] animate-in fade-in slide-in-from-left-2">
                                        ≈ RM {(parseFloat(withdrawAmount) * withdrawalRate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center justify-between p-7 bg-gv-gold/[0.03] rounded-3xl border border-gv-gold/10 backdrop-blur-md">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gv-gold/60">{t.withdrawable}</span>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-emerald-400 tabular-nums shadow-[0_0_20px_rgba(52,211,153,0.1)]">$ {(user?.withdrawable_balance_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 opacity-60">≈ RM {user?.withdrawable_balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>

                            <button 
                                onClick={handleWithdrawInitiate} 
                                disabled={!withdrawAmount || isSubmitting} 
                                className="w-full bg-gv-gold text-black font-black py-7 rounded-3xl flex justify-center items-center gap-4 text-xs uppercase tracking-[0.3em] shadow-[0_15px_40px_rgba(212,175,55,0.25)] hover:shadow-[0_20px_50px_rgba(212,175,55,0.35)] hover:-translate-y-1 transition-all disabled:opacity-50"
                            >
                                {t.continueToPin}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="premium-glass bg-black/60 border-white/10 rounded-[40px] p-10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-5 transition-opacity pointer-events-none">
                            <ShieldCheck className="h-32 w-32 text-gv-gold" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 block mb-8">{t.currentTier}</span>
                        <div className="flex items-center gap-6 relative z-10">
                            <TierMedal 
                                tierId={(user?.tier && user?.tier !== "Standard") ? user.tier.toLowerCase() : getTierByAmount(Number(user?.total_investment_usd || 0)).id} 
                                size="lg" 
                                className="drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                            />
                            <div className="flex flex-col">
                                <span className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-1">
                                    {(user?.tier && user?.tier !== "Standard") ? user.tier : getTierByAmount(Number(user?.total_investment_usd || 0)).name}
                                </span>
                                <span className="text-[10px] font-bold text-gv-gold uppercase tracking-[0.2em] opacity-80">{t.member}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gv-gold/5 border border-gv-gold/20 rounded-[40px] p-10 space-y-6 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden group/security">
                        <div className="absolute inset-0 bg-gv-gold/[0.03] animate-pulse"></div>
                        <div className="h-14 w-14 bg-gv-gold/10 rounded-2xl flex items-center justify-center text-gv-gold border border-gv-gold/30 shadow-[0_0_30px_rgba(212,175,55,0.15)] relative z-10 transition-transform group-hover/security:scale-110">
                            <ShieldCheck className="h-8 w-8" strokeWidth={2.5} />
                        </div>
                        <div className="space-y-3 relative z-10">
                            <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-white">Institutional Security</h4>
                            <p className="text-[10px] font-bold text-gray-500 leading-relaxed uppercase tracking-[0.15em] opacity-80">
                                Withdrawal protocols require 256-bit encryption and hierarchical treasury authorization for all capital movements.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Penalty Confirm Modal */}
            {showPenaltyConfirm && penaltyInfo && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
                    <div className="premium-glass bg-black/60 border-gv-gold/20 rounded-[40px] p-10 md:p-12 max-w-lg w-full space-y-10 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
                        <div className="h-24 w-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.15)] ring-4 ring-amber-500/5">
                            <AlertTriangle className="h-12 w-12 text-amber-500" strokeWidth={3} />
                        </div>
                        <div className="text-center space-y-3">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{t.penaltyTitle}</h3>
                            <p className="text-gray-500 font-semibold text-sm leading-relaxed px-4">{t.penaltyDesc}</p>
                        </div>
                        <div className="bg-black/40 rounded-3xl p-8 border border-white/5 space-y-5 shadow-inner">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
                                <span>{t.lockedPortion}</span>
                                <span className="text-gray-300 font-mono">$ {(penaltyInfo.lockedPortion_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.25em] text-red-500/80">
                                <span>{t.penaltyAmt}</span>
                                <span className="font-mono">- $ {(penaltyInfo.penalty_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="h-px bg-white/5"></div>
                            <div className="flex justify-between items-center text-xs font-black uppercase tracking-[0.3em] text-emerald-400">
                                <span>{t.estPayout}</span>
                                <span className="font-mono">$ {(penaltyInfo.payout_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-5">
                            <button 
                                onClick={() => { setShowPenaltyConfirm(false); setIsPinModalOpen(true); }}
                                className="w-full bg-gv-gold text-black font-black py-6 rounded-2xl text-xs uppercase tracking-[0.3em] shadow-[0_15px_40px_rgba(212,175,55,0.25)] hover:-translate-y-1 transition-all"
                            >
                                {t.acceptBtn}
                            </button>
                            <button onClick={() => setShowPenaltyConfirm(false)} className="w-full text-gray-500 font-black hover:text-white transition-colors uppercase tracking-[0.3em] text-[9px]">{t.cancelBtn}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PIN Modal */}
            {isPinModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
                    <div className="premium-glass bg-black/60 border-gv-gold/20 rounded-[40px] p-12 max-w-md w-full text-center space-y-12 shadow-2xl animate-in fade-in zoom-in-90 duration-500">
                        <div className="space-y-3">
                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{t.securityPin}</h3>
                            <p className="text-gray-500 font-semibold text-sm px-4 leading-relaxed">{t.enterPin}</p>
                        </div>
                        <div className="relative flex justify-center items-center group">
                            <input
                                type={isPinVisible ? "text" : "password"}
                                maxLength={6}
                                value={withdrawPIN}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWithdrawPIN(e.target.value.replace(/\D/g, ''))}
                                className="w-full bg-black/40 border border-white/5 rounded-[32px] p-8 text-6xl font-black text-center tracking-[0.4em] focus:outline-none focus:border-gv-gold/50 transition-all text-gv-gold placeholder:text-white/10 flex-1 shadow-inner tabular-nums"
                                autoFocus
                                placeholder="000000"
                            />
                            <button 
                                type="button"
                                onClick={() => setIsPinVisible(!isPinVisible)}
                                className="absolute right-8 p-2 text-white/20 hover:text-gv-gold transition-colors"
                            >
                                {isPinVisible ? <EyeOff className="h-7 w-7" /> : <Eye className="h-7 w-7" />}
                            </button>
                        </div>
                        <div className="space-y-6">
                            <button onClick={handleWithdrawConfirm} disabled={isSubmitting || withdrawPIN.length !== 6} className="w-full bg-gv-gold text-black font-black py-7 rounded-3xl flex justify-center items-center gap-4 uppercase tracking-[0.3em] shadow-[0_15px_40px_rgba(212,175,55,0.25)] transition-all hover:shadow-[0_20px_50px_rgba(212,175,55,0.35)] hover:-translate-y-1 group active:scale-95 disabled:opacity-50">
                                {isSubmitting ? <PremiumLoader size="sm" color="black" /> : t.submit}
                            </button>
                            <button onClick={() => setIsPinModalOpen(false)} className="w-full text-gray-500 font-black hover:text-white transition-colors uppercase tracking-[0.3em] text-[9px]">Cancel Transaction</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
