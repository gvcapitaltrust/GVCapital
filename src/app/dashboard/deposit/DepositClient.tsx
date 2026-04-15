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
    const [step, setStep] = useState(1);
    const [depositAmount, setDepositAmount] = useState("");
    const [depositReceipt, setDepositReceipt] = useState<File | null>(null);
    const [remark, setRemark] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"bank" | "usdt">("usdt");
    const [cryptoNetwork, setCryptoNetwork] = useState<"tron" | "bep20" | "erc20" | "sol">("tron");

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
            method: "Deposit Method",
            bank: "FPX Online Banking",
            usdt: "USDT",
            usdtTron: "TRON (TRC20)",
            usdtBep20: "BEP20 (BSC)",
            usdtErc20: "ERC20 (ETH)",
            usdtSol: "SOLANA",
            network: "Network",
            address: "Deposit Address",
            copy: "Copy",
            copied: "Copied to clipboard!",
            usdtNote: "Please send only USDT to this address via the specified network.",
            next: "Next Step",
            backStep: "Back",
            uploadLabel: "Upload Transfer Receipt",
            remarkLabel: "Remark (Optional)",
            remarkPlaceholder: "Enter any additional information...",
            step1: "Select Amount",
            step2: "Payment Details"
        },
        zh: {
            title: "资金存款",
            desc: "为您的投资账户添加资金。所有存款将在 24 小时内处理。",
            amount: "金额 (USD)",
            receipt: "上传银行收据",
            remark: "备注 (可选)",
            submit: "确认存款",
            back: "返回仪表板",
            success: "提交成功",
            successDesc: "您的存款请求已收到，财务团队正在核实中。",
            ref: "参考编号",
            selectFile: "选择收据图片",
            method: "存款方式",
            bank: "FPX 在线转账",
            usdt: "USDT",
            usdtTron: "TRON (TRC20)",
            usdtBep20: "BEP20 (BSC)",
            usdtErc20: "ERC20 (ETH)",
            usdtSol: "SOLANA",
            network: "网络",
            address: "存款地址",
            copy: "复制",
            copied: "已复制！",
            usdtNote: "请确保仅通过指定的网络向此地址发送 USDT。",
            next: "下一步",
            backStep: "返回",
            uploadLabel: "上传转账收据",
            remarkLabel: "备注 (可选)",
            remarkPlaceholder: "输入任何附加信息...",
            step1: "选择金额",
            step2: "支付详情"
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

            const { error: insertError } = await supabase
                .from('transactions')
                .insert([{
                    user_id: user.id,
                    type: 'Deposit',
                    amount: amountUSD,
                    transfer_date: new Date().toISOString(),
                    status: 'Pending',
                    receipt_url: uploadData.path,
                    ref_id: refId,
                    original_currency_amount: amountUSD,
                    original_currency: 'USD',
                    metadata: {
                        remark: remark,
                        forex_rate: depositRate,
                        original_usd_amount: depositAmount,
                        payment_method: paymentMethod === 'bank' ? 'bank' : `usdt_${cryptoNetwork}`
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

            <div className="bg-white border border-gray-200 rounded-[32px] p-8 md:p-10 shadow-2xl transition-all duration-500 overflow-hidden relative">
                {/* Step Indicators */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 1 ? "bg-gv-gold text-black scale-110 shadow-lg" : "bg-gray-100 text-gray-400"}`}>1</div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${step === 1 ? "text-gray-900" : "text-gray-400"}`}>{t.step1}</span>
                    </div>
                    <div className="h-[1px] w-8 bg-gray-100"></div>
                    <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 2 ? "bg-gv-gold text-black scale-110 shadow-lg" : "bg-gray-100 text-gray-400"}`}>2</div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${step === 2 ? "text-gray-900" : "text-gray-400"}`}>{t.step2}</span>
                    </div>
                </div>

                {step === 1 ? (
                    <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
                        <div className="space-y-4">
                            <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.amount}</label>
                            <div className="relative group/input">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 font-black text-xl transition-colors group-focus-within/input:text-gv-gold">$</div>
                                <input 
                                    type="number" 
                                    placeholder="0.00"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-gv-gold focus:bg-white rounded-[24px] py-6 pl-12 pr-6 text-2xl font-black outline-none transition-all placeholder:text-gray-200 tabular-nums"
                                />
                                {depositAmount && (
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-60">
                                        <span className="text-[10px] font-black text-gv-gold uppercase tracking-widest">≈ RM</span>
                                        <span className="text-sm font-black text-slate-900 tabular-nums">{(Number(depositAmount) * depositRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.method}</label>
                            <div className="flex p-1 bg-gray-100 rounded-2xl w-fit">
                                <button 
                                    onClick={() => setPaymentMethod("usdt")}
                                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${paymentMethod === "usdt" ? "bg-white text-black shadow-md" : "text-gray-400 hover:text-gray-600"}`}
                                >
                                    {t.usdt}
                                </button>
                                <button 
                                    disabled
                                    className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-gray-300 cursor-not-allowed opacity-50"
                                >
                                    {t.bank}
                                </button>
                            </div>
                        </div>

                        <button 
                            disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                            onClick={() => setStep(2)}
                            className="w-full py-6 bg-gv-gold text-black rounded-[24px] font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-gv-gold/20 hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                        >
                            {t.next}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                        <div className="space-y-6">
                            <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.network}</label>
                            <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-2xl w-fit shrink-0">
                                <button 
                                    onClick={() => setCryptoNetwork("tron")}
                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${cryptoNetwork === "tron" ? "bg-slate-900 text-white shadow-md" : "text-gray-400 hover:text-gray-600"}`}
                                >
                                    {t.usdtTron}
                                </button>
                                <button 
                                    onClick={() => setCryptoNetwork("bep20")}
                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${cryptoNetwork === "bep20" ? "bg-slate-900 text-white shadow-md" : "text-gray-400 hover:text-gray-600"}`}
                                >
                                    {t.usdtBep20}
                                </button>
                                <button 
                                    onClick={() => setCryptoNetwork("erc20")}
                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${cryptoNetwork === "erc20" ? "bg-slate-900 text-white shadow-md" : "text-gray-400 hover:text-gray-600"}`}
                                >
                                    {t.usdtErc20}
                                </button>
                                <button 
                                    onClick={() => setCryptoNetwork("sol")}
                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${cryptoNetwork === "sol" ? "bg-slate-900 text-white shadow-md" : "text-gray-400 hover:text-gray-600"}`}
                                >
                                    {t.usdtSol}
                                </button>
                            </div>

                            <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden group/usdt">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
                                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center text-center md:text-left">
                                    <div className="h-40 w-40 bg-white p-3 rounded-2xl shadow-2xl shrink-0">
                                        <img 
                                            src={cryptoNetwork === "tron" ? "/usdt-qr.png" : cryptoNetwork === "bep20" ? "/usdt-bep20-qr.png" : cryptoNetwork === "erc20" ? "/usdt-erc20-qr.png" : "/usdt-sol-qr.png"} 
                                            alt="USDT QR" 
                                            className="w-full h-full object-contain" 
                                        />
                                    </div>
                                    <div className="flex-1 space-y-4 w-full">
                                        <div>
                                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">{t.network}</p>
                                            <p className="text-lg font-black tracking-tight">
                                                {cryptoNetwork === "tron" ? "TRON (TRC20)" : cryptoNetwork === "bep20" ? "BEP20 (Binance Smart Chain)" : cryptoNetwork === "erc20" ? "ERC20 (Ethereum Network)" : "SOLANA Network"}
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">{t.address}</p>
                                            <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl group-hover/usdt:border-emerald-500/30 transition-colors">
                                                <p className="text-sm font-mono font-bold break-all flex-1 text-emerald-50">
                                                    {cryptoNetwork === "sol" ? "5x786gH4cTUzhoSpa8AD5XiWubNu2bfpR5PjHkYjP9i9" : cryptoNetwork === "tron" ? "TErRkQXxTaLBB6VCafeaBjzx9Ji5eUZGgE" : "0x9b891193b672fd4293a775a0c58f402d256ebd79"}
                                                </p>
                                                <button 
                                                    onClick={() => {
                                                        const addr = cryptoNetwork === "sol" ? "5x786gH4cTUzhoSpa8AD5XiWubNu2bfpR5PjHkYjP9i9" : cryptoNetwork === "tron" ? "TErRkQXxTaLBB6VCafeaBjzx9Ji5eUZGgE" : "0x9b891193b672fd4293a775a0c58f402d256ebd79";
                                                        navigator.clipboard.writeText(addr);
                                                        alert(t.copied);
                                                    }}
                                                    className="shrink-0 h-10 w-10 bg-emerald-500 text-black rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                                                >
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[9px] text-white/40 font-medium italic">{t.usdtNote}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.uploadLabel}</label>
                                <div className="relative group border-2 border-gray-100 border-dashed rounded-[32px] overflow-hidden bg-gray-50 h-full min-h-[160px] flex flex-col items-center justify-center hover:bg-white transition-all cursor-pointer">
                                    {depositReceipt ? (
                                        <div className="absolute inset-0 p-4">
                                            <div className="w-full h-full rounded-2xl relative overflow-hidden group">
                                                <img src={URL.createObjectURL(depositReceipt)} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="text-white text-[10px] font-black uppercase tracking-[0.3em]">{t.receipt}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center space-y-3 p-6 text-center">
                                            <div className="h-12 w-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center group-hover:bg-gv-gold transition-all">
                                                <Upload className="h-6 w-6 text-gray-300 group-hover:text-black transition-colors" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-1">{t.uploadLabel}</p>
                                                <p className="text-[9px] text-gray-400 font-bold">JPG, PNG, PDF Max 10MB</p>
                                            </div>
                                        </div>
                                    )}
                                    <input type="file" onChange={(e) => setDepositReceipt(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer z-20" accept="image/*,.pdf" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.remarkLabel}</label>
                                <textarea 
                                    placeholder={t.remarkPlaceholder}
                                    value={remark}
                                    onChange={(e) => setRemark(e.target.value)}
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-gv-gold focus:bg-white rounded-[24px] p-6 text-sm font-bold min-h-[160px] outline-none transition-all placeholder:text-gray-200 resize-none shadow-inner"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button 
                                onClick={() => setStep(1)}
                                className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-[22px] font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all"
                            >
                                {t.backStep}
                            </button>
                            <button 
                                disabled={isSubmitting || !depositReceipt}
                                onClick={handleSubmit}
                                className="flex-[2] py-5 bg-gv-gold text-black rounded-[22px] font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-gv-gold/20 hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none relative overflow-hidden"
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>{t.submit}...</span>
                                    </div>
                                ) : t.submit}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="bg-gray-100 border border-gray-200 rounded-[32px] p-8 text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] max-w-xl mx-auto leading-relaxed">
                    Important: Please ensure all fund transfers are made from your registered bank account. Institutional transfers may require additional verification.
                </p>
            </div>
        </div>
    );
}
