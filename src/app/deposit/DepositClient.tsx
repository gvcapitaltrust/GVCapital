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

    // Form States
    const [amount, setAmount] = useState("");
    const [receipt, setReceipt] = useState<File | null>(null);

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
            const currentAmountRm = parseFloat(amount);
            const depositUSD = currentAmountRm / forexRate;
            const currentCapitalUSD = Number(user.balance || 0) / forexRate;

            if (currentCapitalUSD + depositUSD > 10000) {
                alert(lang === "en" 
                    ? "Maximum allowed investment capital is $10,000 USD. Your deposit exceeds this limit." 
                    : "最高允许的投资本金为 $10,000 USD。您的存款已超过此限制。");
                setIsSubmitting(false);
                return;
            }
            
            const { error: insertError } = await supabase
                .from('transactions')
                .insert([{
                    user_id: user.id,
                    type: 'Deposit',
                    amount: currentAmountRm,
                    metadata: { original_rm_amount: amount },
                    original_currency_amount: currentAmountRm,
                    original_currency: 'RM',
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
            amount: "Amount (RM)",
            receipt: "Upload Bank Receipt (Image/PDF)",
            button: "Confirm Deposit",
            back: "Back to Dashboard",
            note: "Your deposit is being verified by the GV Capital admin team. This usually takes 1-2 hours.",
            successTitle: "Deposit Submitted",
            successDesc: "Redirecting you to dashboard...",
            estimatedCredit: "Estimated Credit",
            maxLimit: "Maximum investment allowed: $10,000 USD. Only input amounts within your limit.",
        },
        zh: {
            title: "资金充值",
            subtitle: "充值您的 GV 资本投资账户",
            amount: "金额 (RM)",
            receipt: "上传银行收据 (图片/PDF)",
            button: "确认存款",
            back: "返回控制台",
            note: "您的存款正在由 GV 资本管理员团队验证。 这通常需要 1-2 小时。",
            successTitle: "存款已提交",
            successDesc: "正在为您跳转到控制台...",
            estimatedCredit: "预计信用额度",
            maxLimit: "最高允许投资: $10,000 USD。请仅输入限制内的金额。",
        }
    };

    const t = content[lang];

    if (!user) {
        return <div className="min-h-screen bg-[#121212] flex items-center justify-center p-6"><div className="h-12 w-12 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;
    }

    return (
        <div className="min-h-screen bg-[#121212] text-white flex flex-col selection:bg-gv-gold selection:text-black">
            <header className="border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href={`/dashboard?lang=${lang}`} className="flex items-center gap-2">
                        <img src="/logo.png" alt="GV Capital" className="h-12 w-auto object-contain mix-blend-screen" />
                    </Link>
                    <Link href={`/dashboard?lang=${lang}`} className="text-zinc-500 hover:text-white transition-colors text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M15 19l-7-7 7-7" /></svg>
                        {t.back}
                    </Link>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">{t.title}</h1>
                        <p className="text-zinc-500 font-medium">{t.subtitle}</p>
                    </div>

                    <div className="bg-[#1a1a1a] border border-white/5 p-10 rounded-[40px] shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gv-gold/5 blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-700"></div>

                        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                            <div className="space-y-2">
                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">{t.amount}</label>
                                <input
                                    type="number"
                                    required
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-2xl font-black focus:outline-none focus:border-gv-gold transition-all"
                                    placeholder="0.00"
                                />
                                {amount && (
                                    <div className="mt-3 flex items-center gap-2 px-1 animate-in fade-in slide-in-from-left-2 duration-300">
                                        <div className="h-2 w-2 rounded-full bg-gv-gold animate-pulse"></div>
                                        <p className="text-gv-gold font-black text-sm uppercase tracking-tighter">
                                            {t.estimatedCredit}: ≈ ${(parseFloat(amount) / forexRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                        </p>
                                    </div>
                                )}
                                <p className="mt-2 text-xs text-zinc-500 italic px-1">{t.maxLimit}</p>
                            </div>



                            <div className="space-y-2">
                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">{t.receipt}</label>
                                <div className="relative group/upload border border-white/10 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-all cursor-pointer">
                                    <svg className="h-12 w-12 text-zinc-600 mb-4 group-hover/upload:text-gv-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest text-center px-4">
                                        {receipt ? receipt.name : t.receipt}
                                    </span>
                                    <input
                                        type="file"
                                        required
                                        onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        accept="image/*,.pdf"
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <p className="text-zinc-500 text-[10px] font-bold text-center mb-6 leading-relaxed italic border-l-2 border-gv-gold/30 pl-4 py-2 bg-white/5 rounded-r-lg">
                                    {t.note}
                                </p>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-gv-gold text-black font-black py-6 rounded-2xl flex justify-center items-center gap-3 uppercase tracking-widest shadow-xl hover:shadow-gv-gold/20 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmitting ? <div className="h-6 w-6 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : t.button}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>

            {showSuccess && (
                <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
                    <div className="h-32 w-32 bg-emerald-500 rounded-full flex items-center justify-center mb-10 shadow-[0_0_60px_rgba(16,185,129,0.4)]">
                        <svg className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-5xl font-black mb-4 uppercase tracking-tighter">{t.successTitle}</h2>
                    <p className="text-zinc-400 font-medium text-lg px-8 mb-4">{t.successDesc}</p>
                    {successRefId && (
                        <div className="bg-white/10 px-6 py-3 rounded-full border border-emerald-500/30 text-emerald-400 font-black tracking-widest uppercase text-sm animate-in zoom-in-95 delay-150 duration-500">
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
