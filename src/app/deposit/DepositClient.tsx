"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import GlobalFooter from "@/components/GlobalFooter";
import { supabase } from "@/lib/supabaseClient";
import { useSettings } from "@/providers/SettingsProvider";
import { useAuth } from "@/providers/AuthProvider";

export default function DepositClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { forexRate } = useSettings();
    const { user, loading: authLoading } = useAuth();
    const [lang, setLang] = useState<"en" | "zh">("en");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successRefId, setSuccessRefId] = useState("");
    const [step, setStep] = useState(1);
    const [remark, setRemark] = useState("");

    // Form States
    const [amount, setAmount] = useState("");
    const [receipt, setReceipt] = useState<File | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<"bank" | "usdt">("usdt");
    const [cryptoNetwork, setCryptoNetwork] = useState<"tron" | "bep20" | "erc20" | "sol">("tron");

    useEffect(() => {
        const l = searchParams?.get("lang") || "en";
        setLang(l as "en" | "zh");

        if (!authLoading && !user) {
            router.push(`/login?lang=${l}`);
        }
    }, [searchParams, router, user, authLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !receipt || !user) {
            alert("Please fill in amount and upload a receipt.");
            return;
        }

        setIsSubmitting(true);
        const fileExt = receipt.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;

        try {
            // 1. Upload to agreements bucket
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('agreements')
                .upload(fileName, receipt);

            if (uploadError) throw uploadError;

            // 2. Insert into transactions table
            const refId = `DEP-${Math.floor(100000 + Math.random() * 900000)}`;
            const depositUSD = parseFloat(amount);
            const currentAmountRm = depositUSD * forexRate;
            const currentCapitalUSD = Number(user.balance || 0) / forexRate;

            
            const { error: insertError } = await supabase
                .from('transactions')
                .insert([{
                    user_id: user.id,
                    type: 'Deposit',
                    amount: depositUSD,
                    metadata: { 
                        original_usd_amount: amount, 
                        forex_rate: forexRate,
                        payment_method: paymentMethod === 'bank' ? 'bank' : `usdt_${cryptoNetwork}`,
                        remark: remark
                    },
                    original_currency_amount: depositUSD,
                    original_currency: 'USD',
                    transfer_date: new Date().toISOString(),
                    status: 'Pending',
                    receipt_url: uploadData.path,
                    ref_id: refId
                }]);

            if (insertError) throw insertError;

            setSuccessRefId(refId);
            setShowSuccess(true);
            setTimeout(() => {
                router.push(`/dashboard?lang=${lang}`);
            }, 3000);

        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const content = {
        en: {
            title: "Deposit Funds",
            subtitle: "Top up your GV Capital investment account",
            amount: "Amount (USD)",
            receipt: "Upload Bank Receipt (Image/PDF)",
            button: "Confirm Deposit",
            back: "Back to Dashboard",
            note: "Your deposit is being verified by the GV Capital admin team. This usually takes 1-2 hours.",
            successTitle: "Deposit Submitted",
            successDesc: "Redirecting you to dashboard...",
            estimatedCredit: "Equivalent RM Amount",
            maxLimit: "GV Capital VVIP accounts have no investment limit. Enjoy uncapped growth.",
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
            copied: "Copied!",
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
            title: "资金充值",
            subtitle: "充值您的 GV 资本投资账户",
            amount: "金额 (USD)",
            receipt: "上传收据",
            button: "确认存款",
            back: "返回控制台",
            note: "您的存款正在由 GV 资本管理员团队验证。 这通常需要 1-2 小时。",
            successTitle: "存款已提交",
            successDesc: "正在为您跳转到控制台...",
            estimatedCredit: "等值马币金额",
            maxLimit: "GV 资本 VVIP 账户没有投资限制。享受无上限的增长。",
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
    };

    const t = content[lang];

    if (!user) {
        return <div className="min-h-screen bg-white flex items-center justify-center p-6"><div className="h-12 w-12 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;
    }

    return (
        <div className="min-h-screen bg-white text-gray-900 flex flex-col selection:bg-gv-gold selection:text-black">
            <header className="border-b border-gray-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href={`/dashboard?lang=${lang}`} className="flex items-center gap-2">
                        <img src="/logo.png" alt="GV Capital" className="h-12 w-auto object-contain " />
                    </Link>
                    <Link href={`/dashboard?lang=${lang}`} className="text-gray-400 hover:text-gray-900 transition-colors text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M15 19l-7-7 7-7" /></svg>
                        {t.back}
                    </Link>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2 text-gray-900">{t.title}</h1>
                        <p className="text-gray-400 font-medium">{t.subtitle}</p>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 p-10 rounded-[40px] shadow-2xl transition-all duration-500 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gv-gold/5 blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-700"></div>

                        {/* Step Indicators */}
                        <div className="flex items-center gap-4 mb-8 relative z-10">
                            <div className="flex items-center gap-2">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 1 ? "bg-gray-900 text-white scale-110 shadow-lg" : "bg-white border border-gray-100 text-gray-400"}`}>1</div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${step === 1 ? "text-gray-900" : "text-gray-400"}`}>{t.step1}</span>
                            </div>
                            <div className="h-[1px] w-8 bg-gray-200"></div>
                            <div className="flex items-center gap-2">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 2 ? "bg-gray-900 text-white scale-110 shadow-lg" : "bg-white border border-gray-100 text-gray-400"}`}>2</div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${step === 2 ? "text-gray-900" : "text-gray-400"}`}>{t.step2}</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="relative z-10">
                            {step === 1 ? (
                                <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
                                    <div className="space-y-4">
                                        <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.amount}</label>
                                        <div className="relative group/input">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 font-black text-xl transition-colors group-focus-within/input:text-gray-900">$</div>
                                            <input 
                                                type="number" 
                                                placeholder="0.00"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="w-full bg-white border border-gray-100 focus:border-gray-900 rounded-[24px] py-6 pl-12 pr-6 text-2xl font-black outline-none transition-all placeholder:text-gray-200 tabular-nums"
                                            />
                                            {amount && (
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-60">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">≈ RM</span>
                                                    <span className="text-sm font-black text-gray-900 tabular-nums">{(Number(amount) * forexRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.method}</label>
                                        <div className="flex p-1 bg-white border border-gray-100 rounded-2xl w-fit">
                                            <button 
                                                type="button"
                                                onClick={() => setPaymentMethod("usdt")}
                                                className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${paymentMethod === "usdt" ? "bg-gray-900 text-white shadow-md" : "text-gray-400 hover:text-gray-600"}`}
                                            >
                                                {t.usdt}
                                            </button>
                                            <button 
                                                type="button"
                                                disabled
                                                className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-gray-300 cursor-not-allowed opacity-50"
                                            >
                                                {t.bank}
                                            </button>
                                        </div>
                                    </div>

                                    <button 
                                        type="button"
                                        disabled={!amount || parseFloat(amount) <= 0}
                                        onClick={() => setStep(2)}
                                        className="w-full py-6 bg-gray-900 text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-black/10 hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                                    >
                                        {t.next}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                                    <div className="space-y-6">
                                        <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.network}</label>
                                        <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
                                            <button 
                                                type="button"
                                                onClick={() => setCryptoNetwork("tron")}
                                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${cryptoNetwork === "tron" ? "bg-gray-900 text-white shadow-md" : "text-gray-400 hover:text-gray-600"}`}
                                            >
                                                {t.usdtTron}
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setCryptoNetwork("bep20")}
                                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${cryptoNetwork === "bep20" ? "bg-gray-900 text-white shadow-md" : "text-gray-400 hover:text-gray-600"}`}
                                            >
                                                {t.usdtBep20}
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setCryptoNetwork("erc20")}
                                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${cryptoNetwork === "erc20" ? "bg-gray-900 text-white shadow-md" : "text-gray-400 hover:text-gray-600"}`}
                                            >
                                                {t.usdtErc20}
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setCryptoNetwork("sol")}
                                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${cryptoNetwork === "sol" ? "bg-gray-900 text-white shadow-md" : "text-gray-400 hover:text-gray-600"}`}
                                            >
                                                {t.usdtSol}
                                            </button>
                                        </div>

                                        <div className="bg-white border border-gray-100 rounded-3xl p-8 space-y-6 shadow-sm">
                                            <div className="flex flex-col md:flex-row gap-8 items-center">
                                                <div className="h-40 w-40 bg-white p-3 border border-gray-100 rounded-2xl shrink-0">
                                                    <img 
                                                        src={
                                                            cryptoNetwork === "tron" ? "/usdt-qr.png" : 
                                                            cryptoNetwork === "bep20" ? "/usdt-bep20-qr.png" : 
                                                            cryptoNetwork === "erc20" ? "/usdt-erc20-qr.png" : 
                                                            "/usdt-sol-qr.png"
                                                        } 
                                                        alt="USDT QR" 
                                                        className="w-full h-full object-contain" 
                                                    />
                                                </div>
                                                
                                                <div className="flex-1 space-y-4 w-full text-center md:text-left">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t.network}</p>
                                                        <p className="text-lg font-black tracking-tight text-gray-900">
                                                            {cryptoNetwork === "tron" ? "TRON (TRC20)" : 
                                                             cryptoNetwork === "bep20" ? "BEP20 (Binance Smart Chain)" : 
                                                             cryptoNetwork === "erc20" ? "ERC20 (Ethereum Network)" : 
                                                             "SOLANA Network"}
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">{t.address}</p>
                                                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-4 rounded-2xl">
                                                            <p className="text-sm font-mono font-bold break-all flex-1 text-gray-900">
                                                                {cryptoNetwork === "sol" ? "5x786gH4cTUzhoSpa8AD5XiWubNu2bfpR5PjHkYjP9i9" :
                                                                 cryptoNetwork === "tron" ? "TErRkQXxTaLBB6VCafeaBjzx9Ji5eUZGgE" : 
                                                                 "0x9b891193b672fd4293a775a0c58f402d256ebd79"}
                                                            </p>
                                                            <button 
                                                                type="button"
                                                                onClick={() => {
                                                                    const addr = cryptoNetwork === "sol" ? "5x786gH4cTUzhoSpa8AD5XiWubNu2bfpR5PjHkYjP9i9" :
                                                                                cryptoNetwork === "tron" ? "TErRkQXxTaLBB6VCafeaBjzx9Ji5eUZGgE" : 
                                                                                "0x9b891193b672fd4293a775a0c58f402d256ebd79";
                                                                    navigator.clipboard.writeText(addr);
                                                                    alert(t.copied);
                                                                }}
                                                                className="shrink-0 h-10 w-10 bg-gv-gold text-black rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                                                            >
                                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-[9px] text-gray-400 font-medium italic">{t.usdtNote}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.uploadLabel}</label>
                                            <div className="relative group border-2 border-gray-100 border-dashed rounded-[32px] overflow-hidden bg-white h-full min-h-[160px] flex flex-col items-center justify-center hover:border-gray-900 transition-all cursor-pointer">
                                                {receipt ? (
                                                    <div className="absolute inset-0 p-4">
                                                        <div className="w-full h-full rounded-2xl relative overflow-hidden group">
                                                            <img src={URL.createObjectURL(receipt)} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <span className="text-white text-[10px] font-black uppercase tracking-[0.3em]">{t.receipt}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center space-y-3 p-6 text-center">
                                                        <div className="h-12 w-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-gv-gold transition-all">
                                                            <svg className="h-6 w-6 text-gray-300 group-hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-1">{t.uploadLabel}</p>
                                                            <p className="text-[9px] text-gray-400 font-bold">JPG, PNG, PDF Max 10MB</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <input type="file" onChange={(e) => setReceipt(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer z-20" accept="image/*,.pdf" />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.remarkLabel}</label>
                                            <textarea 
                                                placeholder={t.remarkPlaceholder}
                                                value={remark}
                                                onChange={(e) => setRemark(e.target.value)}
                                                className="w-full bg-white border border-gray-100 focus:border-gray-900 rounded-[24px] p-6 text-sm font-bold min-h-[120px] outline-none transition-all placeholder:text-gray-200 resize-none shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                        <button 
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-[22px] font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all"
                                        >
                                            {t.backStep}
                                        </button>
                                        <button 
                                            type="submit"
                                            disabled={isSubmitting || !receipt}
                                            className="flex-[2] py-5 bg-gray-900 text-white rounded-[22px] font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-black/10 hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none relative overflow-hidden"
                                        >
                                            {isSubmitting ? (
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="h-5 w-5 border-4 border-white border-t-transparent animate-spin rounded-full"></div>
                                                    <span>{t.button}...</span>
                                                </div>
                                            ) : t.button}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </main>

            {showSuccess && (
                <div className="fixed inset-0 z-[500] bg-gray-900/60 backdrop-blur-2xl flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
                    <div className="h-32 w-32 bg-emerald-500 rounded-full flex items-center justify-center mb-10 shadow-[0_0_60px_rgba(16,185,129,0.4)]">
                        <svg className="h-16 w-16 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-5xl font-black mb-4 uppercase tracking-tighter">{t.successTitle}</h2>
                    <p className="text-gray-500 font-medium text-lg px-8 mb-4">{t.successDesc}</p>
                    {successRefId && (
                        <div className="bg-gray-100 px-6 py-3 rounded-full border border-emerald-500/30 text-emerald-400 font-black tracking-widest uppercase text-sm animate-in zoom-in-95 delay-150 duration-500">
                            Ref: {successRefId}
                        </div>
                    )}
                </div>
            )}

            <GlobalFooter />
            <style jsx>{`
                .inverted-scheme-date-picker::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
}
