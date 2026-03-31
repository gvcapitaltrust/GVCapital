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

        const lockedCapital = user?.locked_capital || 0;
        const profit = Number(user?.profit || 0);
        const maturedCapital = Math.max(0, Number(user?.balance || 0) - lockedCapital);
        const userWithdrawable = profit + maturedCapital;
        
        let lockedPortion = 0;
        if (amountRM > userWithdrawable) {
            // Check for total withdrawal using USD to avoid -0.4 rate issues
            const isTotalWithdrawal = amountUSD >= (totalAssetsUSD - 0.01);
            if (!isTotalWithdrawal) {
                alert(lang === 'zh' ? "不允许部分提取锁定资金。要提取锁定资金，您必须提取全部余额。" : "Partial withdrawal of locked capital is not permitted. To withdraw from your locked capital, you must withdraw your entire balance.");
                return;
            }
            lockedPortion = amountRM - userWithdrawable;
        }

        if (lockedPortion > 0) {
            const penalty = lockedPortion * 0.4;
            const finalPayout = amountRM - penalty;
            setPenaltyInfo({
                penalty,
                payout: finalPayout,
                lockedPortion,
                penalty_usd: penalty / withdrawalRate,
                payout_usd: finalPayout / withdrawalRate,
                lockedPortion_usd: lockedPortion / withdrawalRate,
                isApplied: true
            });
            setShowPenaltyConfirm(true);
        } else {
            setPenaltyInfo({
                penalty: 0,
                payout: amountRM,
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
                amount: Math.abs(amountRM),
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
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{t.title}</h1>
                    <p className="text-gray-400 text-sm font-medium">{t.desc}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                    <div className="bg-white border border-gray-200 rounded-[40px] p-8 md:p-12 shadow-2xl space-y-10">
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.amount}</label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300">$</span>
                                    <input 
                                        type="number" 
                                        value={withdrawAmount} 
                                        onChange={(e) => setWithdrawAmount(e.target.value)} 
                                        className="w-full bg-gray-50 border border-gray-200 rounded-3xl p-6 pl-12 text-3xl font-black focus:outline-none focus:border-gv-gold focus:bg-white transition-all tabular-nums" 
                                        placeholder="0.00" 
                                    />
                                </div>
                                {withdrawAmount && (
                                    <p className="px-1 text-[11px] font-black text-gv-gold uppercase tracking-tighter">
                                        ≈ RM {(parseFloat(withdrawAmount) * withdrawalRate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-200">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t.withdrawable}</span>
                                <div className="text-right">
                                    <p className="text-xl font-black text-emerald-500 tabular-nums">$ {(user?.withdrawable_balance_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">≈ RM {user?.withdrawable_balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>

                            <button 
                                onClick={handleWithdrawInitiate} 
                                disabled={!withdrawAmount || isSubmitting} 
                                className="w-full bg-black text-white font-black py-6 rounded-3xl flex justify-center items-center gap-4 text-xl uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50"
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
                                <span className="text-xl font-black text-gray-900 uppercase tracking-tighter">
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
                                <span>$ {(penaltyInfo.lockedPortion_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-red-500">
                                <span>{t.penaltyAmt}</span>
                                <span>- $ {(penaltyInfo.penalty_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="h-px bg-gray-200"></div>
                            <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-emerald-500">
                                <span>{t.estPayout}</span>
                                <span>$ {(penaltyInfo.payout_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                            <button onClick={handleWithdrawConfirm} disabled={isSubmitting || withdrawPIN.length !== 6} className="w-full bg-black text-white font-black py-6 rounded-3xl flex justify-center items-center gap-4 uppercase tracking-widest shadow-xl transition-all hover:bg-gv-gold hover:text-black">
                                {isSubmitting ? <div className="h-6 w-6 border-4 border-white border-t-transparent animate-spin rounded-full"></div> : t.submit}
                            </button>
                            <button onClick={() => setIsPinModalOpen(false)} className="w-full text-gray-400 font-bold hover:text-gray-900 transition-colors uppercase tracking-widest text-[10px]">Cancel Transaction</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
