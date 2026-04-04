"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/providers/UserProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { supabase } from "@/lib/supabaseClient";
import { X, ArrowLeft, Upload, CheckCircle2 } from "lucide-react";
import PremiumLoader from "@/components/PremiumLoader";

export default function DepositClient({ lang }: { lang: "en" | "zh" }) {
    const { userProfile: user, refreshData } = useUser();
    const { depositRate } = useSettings();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successRefId, setSuccessRefId] = useState("");
    
    const [depositAmount, setDepositAmount] = useState("");
    const [depositDate, setDepositDate] = useState("");
    const [depositReceipt, setDepositReceipt] = useState<File | null>(null);
    const [remark, setRemark] = useState("");

    const t = {
        en: {
            title: "New Fund Deposit",
            desc: "Add capital to your investment account. All deposits are processed within 24 hours.",
            amount: "Amount (USD)",
            date: "Transfer Date",
            receipt: "Upload Bank Receipt",
            remark: "Remark (Optional)",
            submit: "Submit Deposit",
            back: "Back to Dashboard",
            success: "Submission Successful",
            successDesc: "Your deposit request has been received and is being verified by our finance team.",
            ref: "Reference ID",
            selectFile: "Select Receipt Image",
        },
        zh: {
            title: "资金存款",
            desc: "为您的投资账户添加资金。所有存款将�?24 小时内处理�?,
            amount: "金额 (USD)",
            date: "转账日期",
            receipt: "上传银行收据",
            remark: "备注 (可�?",
            submit: "提交存款",
            back: "返回仪表�?,
            success: "提交成功",
            successDesc: "您的存款请求已收到，财务团队正在核实中�?,
            ref: "参考编�?,
            selectFile: "选择收据图片",
        }
    }[lang];

    const handleSubmit = async () => {
        if (!depositAmount || !depositReceipt || !user) return;
        setIsSubmitting(true);
        const fileName = `${user.id}_${Date.now()}_${depositReceipt.name}`;
        try {
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('agreements')
                .upload(fileName, depositReceipt);
            if (uploadError) throw uploadError;

            const refId = `DEP-${Math.floor(100000 + Math.random() * 900000)}`;
            const amountUSD = parseFloat(depositAmount);
            const amountRM = amountUSD * depositRate;

            const { error: insertError } = await supabase
                .from('transactions')
                .insert([{
                    user_id: user.id,
                    type: 'Deposit',
                    amount: amountUSD, // Records USD as primary source of truth
                    transfer_date: depositDate ? new Date(depositDate).toISOString() : new Date().toISOString(),
                    status: 'Pending',
                    receipt_url: uploadData.path,
                    ref_id: refId,
                    original_currency_amount: amountUSD,
                    original_currency: 'USD',
                    metadata: {
                        remark: remark,
                        forex_rate: depositRate,
                        original_usd_amount: depositAmount
                    }
                }]);
            if (insertError) throw insertError;

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
                    <div className="h-28 w-28 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mb-10 shadow-[0_0_60px_rgba(16,185,129,0.1)] animate-pulse">
                        <CheckCircle2 className="h-14 w-14 text-emerald-600" strokeWidth={3} />
                    </div>
                    <h2 className="text-5xl font-black uppercase text-slate-900 tracking-tighter mb-6 underline decoration-gv-gold decoration-4 underline-offset-8 decoration-emerald-500/30">{t.success}</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mb-10 max-w-sm leading-loose opacity-60">{t.successDesc}</p>
                    <div className="premium-glass bg-slate-50 px-12 py-6 rounded-[32px] border border-slate-200 text-emerald-600 font-black text-2xl mb-14 shadow-2xl relative group overflow-hidden">
                        <div className="absolute inset-0 bg-emerald-500/[0.03] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <span className="relative z-10 tabular-nums uppercase tracking-widest">{t.ref}: {successRefId}</span>
                    </div>
                    <button 
                        onClick={() => router.push(`/dashboard?lang=${lang}`)}
                        className="group/btn relative bg-slate-50 hover:bg-gv-gold text-slate-900 hover:text-black font-black py-6 px-16 rounded-[24px] uppercase tracking-[0.4em] text-xs transition-all border border-slate-200 hover:border-gv-gold shadow-2xl hover:-translate-y-1 active:scale-95 overflow-hidden"
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
                    className="h-14 w-14 rounded-2xl premium-glass bg-white border-slate-200 flex items-center justify-center text-slate-400 hover:text-gv-gold transition-all shadow-2xl hover:-translate-y-1 active:scale-90"
                >
                    <ArrowLeft className="h-7 w-7" />
                </button>
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{t.title}</h1>
                    <p className="text-slate-500 text-[10px] uppercase font-black tracking-[0.25em] opacity-60 leading-relaxed">{t.desc}</p>
                </div>
            </div>

            {!user?.is_verified && (
                <div className="premium-glass border-amber-500/20 rounded-[32px] p-10 flex flex-col md:flex-row items-center gap-8 animate-in slide-in-from-top-4 duration-500">
                    <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
                        <Upload className="h-8 w-8" />
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-2">
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Identity Verification Required</h3>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed">To comply with global financial regulations, you must complete your identity verification (KYC) before initiating a deposit request.</p>
                    </div>
                    <button 
                        onClick={() => router.push(`/dashboard/profile?lang=${lang}`)}
                        className="bg-black text-white font-black px-8 py-4 rounded-2xl uppercase tracking-widest text-xs hover:bg-gv-gold hover:text-black transition-all shadow-xl active:scale-95"
                    >
                        Verify Now
                    </button>
                </div>
            )}

            <div className={`premium-glass bg-white border-slate-200 rounded-[40px] p-10 md:p-14 shadow-2xl space-y-12 transition-all duration-700 ${!user?.is_verified ? 'opacity-40 grayscale pointer-events-none select-none' : ''}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-10">
                        <div className="space-y-4">
                            <label className="text-gv-gold/60 text-[9px] font-black uppercase tracking-[0.3em] px-2">{t.amount}</label>
                            <div className="relative group">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gv-gold/40 transition-colors group-focus-within:text-gv-gold">$</span>
                                <input 
                                    type="number" 
                                    value={depositAmount} 
                                    onChange={(e) => setDepositAmount(e.target.value)} 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-7 pl-14 text-4xl font-black focus:outline-none focus:border-gv-gold/50 focus:bg-white transition-all tabular-nums text-slate-900 shadow-inner" 
                                    placeholder="0.00" 
                                />
                            </div>
                            {depositAmount && (
                                <p className="px-2 text-[11px] font-bold text-gv-gold/80 uppercase tracking-[0.1em] animate-in fade-in slide-in-from-left-2">
                                    Total Value: �?RM {(parseFloat(depositAmount) * depositRate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            )}
                        </div>

                        <div className="space-y-4">
                            <label className="text-gv-gold/60 text-[9px] font-black uppercase tracking-[0.3em] px-2">{t.date}</label>
                            <input 
                                type="date" 
                                value={depositDate} 
                                onChange={(e) => setDepositDate(e.target.value)} 
                                className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-7 text-xl font-bold focus:outline-none focus:border-gv-gold/50 focus:bg-white transition-all text-slate-900 shadow-inner" 
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-gv-gold/60 text-[9px] font-black uppercase tracking-[0.3em] px-2">{t.remark}</label>
                            <textarea 
                                value={remark} 
                                onChange={(e) => setRemark(e.target.value)} 
                                className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-7 text-sm font-semibold focus:outline-none focus:border-gv-gold/50 focus:bg-white transition-all min-h-[160px] text-slate-700 shadow-inner leading-relaxed" 
                                placeholder="Investment purpose or additional notes..."
                            />
                        </div>
                    </div>

                    <div className="space-y-10">
                        <div className="space-y-4 h-full flex flex-col">
                            <label className="text-gv-gold/60 text-[9px] font-black uppercase tracking-[0.3em] px-2">{t.receipt}</label>
                            <div className="relative group border-2 border-slate-200 border-dashed rounded-[32px] overflow-hidden bg-slate-50/50 flex-1 min-h-[400px] flex flex-col items-center justify-center hover:bg-slate-50 transition-all cursor-pointer shadow-inner">
                                {depositReceipt ? (
                                    <div className="absolute inset-0 p-5">
                                        <div className="w-full h-full rounded-[24px] relative overflow-hidden group/img border border-white/10">
                                            <img src={URL.createObjectURL(depositReceipt)} className="w-full h-full object-cover transition-transform group-hover/img:scale-105 duration-1000" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                <div className="bg-gv-gold text-black font-black px-6 py-3 rounded-xl text-[10px] uppercase tracking-[0.3em] shadow-2xl">{t.selectFile}</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center space-y-6 p-10 text-center">
                                        <div className="h-24 w-24 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center group-hover:bg-gv-gold/10 group-hover:border-gv-gold/40 transition-all shadow-2xl relative">
                                            <div className="absolute inset-0 bg-gv-gold/10 blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <Upload className="h-10 w-10 text-slate-300 group-hover:text-gv-gold transition-colors relative z-10" strokeWidth={1.5} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">{t.selectFile}</p>
                                            <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Verified JPG, PNG or PDF (Max 10MB)</p>
                                        </div>
                                    </div>
                                )}
                                <input type="file" onChange={(e) => setDepositReceipt(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,.pdf" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-10 border-t border-slate-100">
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting || !depositAmount || !depositReceipt || !user?.is_verified} 
                        className="w-full bg-gv-gold text-black font-black py-6 rounded-3xl flex justify-center items-center gap-4 text-xl uppercase tracking-widest shadow-[0_20px_40px_rgba(212,175,55,0.25)] hover:shadow-[0_25px_50px_rgba(212,175,55,0.35)] disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-1"
                    >
                        {isSubmitting ? <PremiumLoader size="sm" color="black" /> : t.submit}
                    </button>
                </div>
            </div>
            
            <div className="premium-glass bg-slate-50 border-slate-200 rounded-[32px] p-10 text-center shadow-xl">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.25em] max-w-2xl mx-auto leading-relaxed">
                    Institutional Note: Please ensure all fund transfers are executed from accounts registered under your professional profile. Cross-border capital flows may be subject to additional compliance verification.
                </p>
            </div>
        </div>
    );
}
