"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/providers/UserProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { supabase } from "@/lib/supabaseClient";
import { X, ArrowLeft, Upload, CheckCircle2 } from "lucide-react";

export default function DepositClient({ lang }: { lang: "en" | "zh" }) {
    const { userProfile: user, refreshData } = useUser();
    const { depositRate } = useSettings();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successRefId, setSuccessRefId] = useState("");
    
    const [depositAmount, setDepositAmount] = useState("");
    const [depositReceipt, setDepositReceipt] = useState<File | null>(null);
    const [remark, setRemark] = useState("");

    const t = {
        en: {
            title: "New Fund Deposit",
            desc: "Add capital to your investment account. All deposits are processed within 24 hours.",
            amount: "Amount (USD)",
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
            desc: "为您的投资账户添加资金。所有存款将在 24 小时内处理。",
            amount: "金额 (USD)",
            receipt: "上传银行收据",
            remark: "备注 (可选)",
            submit: "提交存款",
            back: "返回仪表板",
            success: "提交成功",
            successDesc: "您的存款请求已收到，财务团队正在核实中。",
            ref: "参考编号",
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
                    transfer_date: new Date().toISOString(),
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
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="h-24 w-24 bg-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 className="h-12 w-12 text-white" strokeWidth={3} />
                </div>
                <h2 className="text-3xl font-black uppercase text-gray-900 tracking-tighter mb-4">{t.success}</h2>
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

            <div className="bg-white border border-gray-200 rounded-[32px] p-8 md:p-10 shadow-2xl space-y-8 transition-all duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.amount}</label>
                            <div className="relative group">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300">$</span>
                                <input 
                                    type="number" 
                                    value={depositAmount} 
                                    onChange={(e) => setDepositAmount(e.target.value)} 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-3xl p-5 pl-12 text-2xl font-black focus:outline-none focus:border-gv-gold focus:bg-white transition-all tabular-nums" 
                                    placeholder="0.00" 
                                />
                                {depositAmount && (
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-40 group-focus-within:opacity-100 transition-opacity">
                                        <span className="text-[10px] font-black text-gv-gold uppercase tracking-widest">≈ RM</span>
                                        <span className="text-sm font-black text-slate-900 tabular-nums">{(Number(depositAmount) * depositRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                            </div>
                        </div>


                        <div className="space-y-3">
                            <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.remark}</label>
                            <textarea 
                                value={remark} 
                                onChange={(e) => setRemark(e.target.value)} 
                                className="w-full bg-gray-50 border border-gray-200 rounded-3xl p-6 text-sm font-bold focus:outline-none focus:border-gv-gold focus:bg-white transition-all min-h-[120px]" 
                                placeholder="Enter any additional details..."
                            />
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.receipt}</label>
                            <div className="relative group border-2 border-gray-200 border-dashed rounded-[32px] overflow-hidden bg-gray-50 h-full min-h-[300px] flex flex-col items-center justify-center hover:bg-white transition-all cursor-pointer">
                                {depositReceipt ? (
                                    <div className="absolute inset-0 p-4">
                                        <div className="w-full h-full rounded-2xl relative overflow-hidden group">
                                            <img src={depositReceipt ? URL.createObjectURL(depositReceipt) : ""} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white text-[10px] font-black uppercase tracking-[0.3em]">{t.selectFile}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center space-y-6 p-8">
                                        <div className="h-20 w-20 rounded-full bg-white border border-gray-100 flex items-center justify-center group-hover:bg-gv-gold transition-all shadow-sm">
                                            <Upload className="h-10 w-10 text-gray-300 group-hover:text-black transition-colors" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-1">{t.selectFile}</p>
                                            <p className="text-[9px] text-gray-400 font-bold">PDF, JPG, PNG (Max 5MB)</p>
                                        </div>
                                    </div>
                                )}
                                <input type="file" onChange={(e) => setDepositReceipt(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,.pdf" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-100">
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting || !depositAmount || !depositReceipt} 
                        className="w-full bg-gv-gold text-black font-black py-5 rounded-2xl flex justify-center items-center gap-4 text-lg uppercase tracking-widest shadow-[0_20px_40px_rgba(212,175,55,0.25)] hover:shadow-[0_25px_50px_rgba(212,175,55,0.35)] disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-1"
                    >
                        {isSubmitting ? <div className="h-5 w-5 border-4 border-black border-t-transparent animate-spin rounded-full"></div> : t.submit}
                    </button>
                </div>
            </div>
            
            <div className="bg-gray-100 border border-gray-200 rounded-[32px] p-8 text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] max-w-xl mx-auto leading-relaxed">
                    Important: Please ensure all fund transfers are made from your registered bank account. Institutional transfers may require additional verification.
                </p>
            </div>
        </div>
    );
}
