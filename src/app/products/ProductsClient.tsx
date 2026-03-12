"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import GlobalFooter from "@/components/GlobalFooter";

/* ──────────────────────────────────────────────
   Tier definitions
   ────────────────────────────────────────────── */
interface Tier {
    id: string;
    name: string;
    minUSD: number;
    maxUSD: number;
    dividendMin: number;
    dividendMax: number;
    icon: React.ReactNode;
    accent: string;       // ring / glow colour when *inactive*
    glowColor: string;    // tailwind shadow colour token when *active*
    features: string[];
}

const TIERS: Tier[] = [
    {
        id: "basic",
        name: "Basic",
        minUSD: 1,
        maxUSD: 999,
        dividendMin: 1,
        dividendMax: 3,
        accent: "border-zinc-700",
        glowColor: "rgba(212,175,55,0.35)",
        icon: (
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        features: ["Entry-level portfolio", "Monthly reports", "Email support"],
    },
    {
        id: "silver",
        name: "Silver",
        minUSD: 1000,
        maxUSD: 2999,
        dividendMin: 3,
        dividendMax: 5,
        accent: "border-zinc-600",
        glowColor: "rgba(212,175,55,0.45)",
        icon: (
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
        ),
        features: ["Diversified allocation", "Bi-weekly reports", "Priority email support"],
    },
    {
        id: "gold",
        name: "Gold",
        minUSD: 3000,
        maxUSD: 4999,
        dividendMin: 5,
        dividendMax: 8,
        accent: "border-zinc-600",
        glowColor: "rgba(212,175,55,0.55)",
        icon: (
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
        ),
        features: ["Premium asset mix", "Weekly reports", "Dedicated advisor", "Early access to new funds"],
    },
    {
        id: "platinum",
        name: "Platinum",
        minUSD: 5000,
        maxUSD: 10000,
        dividendMin: 8,
        dividendMax: 10,
        accent: "border-zinc-600",
        glowColor: "rgba(212,175,55,0.7)",
        icon: (
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
        ),
        features: ["Bespoke strategy", "Real-time dashboard", "VIP concierge", "Exclusive events", "Tax advisory"],
    },
];

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */
function getTierForAmount(amount: number): string | null {
    if (amount <= 0) return null;
    for (const tier of TIERS) {
        if (amount >= tier.minUSD && amount <= tier.maxUSD) return tier.id;
    }
    return null;
}

function formatCurrency(value: number): string {
    return value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */
export default function ProductsClient() {
    const searchParams = useSearchParams();
    const [lang, setLang] = useState<"en" | "zh">("en");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [rawInput, setRawInput] = useState("");
    const [amount, setAmount] = useState(0);

    useEffect(() => {
        const l = searchParams?.get("lang");
        if (l === "zh") setLang("zh");
        else if (l === "en") setLang("en");
    }, [searchParams]);

    /* Parse input to number */
    useEffect(() => {
        const parsed = parseFloat(rawInput.replace(/[^0-9.]/g, ""));
        setAmount(isNaN(parsed) ? 0 : parsed);
    }, [rawInput]);

    const activeTierId = useMemo(() => getTierForAmount(amount), [amount]);

    /* Estimated monthly dividend */
    const estimate = useMemo(() => {
        if (!activeTierId || amount <= 0) return null;
        const tier = TIERS.find(t => t.id === activeTierId);
        if (!tier) return null;
        const low = (amount * tier.dividendMin) / 100;
        const high = (amount * tier.dividendMax) / 100;
        return { low, high, tier };
    }, [activeTierId, amount]);

    const t = {
        en: {
            nav: { services: "Services", about: "About Us", contact: "Contact", login: "Client Login" },
            hero: "Investment Packages",
            heroSub: "Choose the tier that matches your goals. Enter an amount below to see your estimated monthly returns.",
            inputLabel: "Enter Investment Amount (USD)",
            inputPlaceholder: "e.g. 3500",
            estLabel: "Estimated Monthly Dividend",
            perMonth: "/ month",
            range: "Range",
            features: "What's included",
            cta: "Get Started",
        },
        zh: {
            nav: { services: "服务", about: "关于我们", contact: "联系我们", login: "客户登录" },
            hero: "投资方案",
            heroSub: "选择符合您目标的等级。在下方输入金额以查看预计月回报。",
            inputLabel: "输入投资金额 (USD)",
            inputPlaceholder: "例如 3500",
            estLabel: "预计每月分红",
            perMonth: "/ 月",
            range: "范围",
            features: "包含内容",
            cta: "立即开始",
        }
    }[lang];

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-gv-gold selection:text-black flex flex-col">
            {/* ─── NAVIGATION ─── */}
            <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 h-20">
                    <div className="flex items-center">
                        <Link href={`/?lang=${lang}`} className="flex items-center shrink-0">
                            <img src="/logo.png" alt="GV Capital Trust Logo" className="max-h-[50px] w-auto object-contain mix-blend-screen drop-shadow-[0_0_15px_rgba(238,206,128,0.3)]" />
                        </Link>
                    </div>

                    <div className="hidden md:flex flex-1 justify-center items-center gap-10 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                        <Link href={`/products?lang=${lang}`} className="text-gv-gold transition-colors">{t.nav.services}</Link>
                        <Link href="#" className="hover:text-gv-gold transition-colors">{t.nav.about}</Link>
                        <Link href="#" className="hover:text-gv-gold transition-colors">{t.nav.contact}</Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-4">
                            <button onClick={() => setLang(lang === "en" ? "zh" : "en")} className="hidden lg:block rounded-full border border-white/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-zinc-500">
                                {lang === "en" ? "中文" : "EN"}
                            </button>
                            <Link href={`/login?lang=${lang}`} className="bg-gv-gold-gradient metallic-shine px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-black shadow-lg hover:-translate-y-1 transition-all active:scale-95">
                                {t.nav.login}
                            </Link>
                        </div>

                        <button className="md:hidden p-2 text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                {isMenuOpen && (
                    <div className="md:hidden absolute top-20 left-0 w-full bg-[#0a0a0a] border-b border-white/5 animate-in slide-in-from-top duration-300">
                        <div className="flex flex-col p-6 gap-6 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                            <Link href={`/products?lang=${lang}`} onClick={() => setIsMenuOpen(false)} className="text-gv-gold transition-colors">{t.nav.services}</Link>
                            <Link href="#" onClick={() => setIsMenuOpen(false)} className="hover:text-gv-gold transition-colors">{t.nav.about}</Link>
                            <Link href="#" onClick={() => setIsMenuOpen(false)} className="hover:text-gv-gold transition-colors">{t.nav.contact}</Link>
                            <div className="h-px bg-white/5 w-full my-2"></div>
                            <div className="flex flex-col gap-4">
                                <button onClick={() => { setLang(lang === "en" ? "zh" : "en"); setIsMenuOpen(false); }} className="w-full text-left py-2 hover:text-gv-gold transition-colors">
                                    {lang === "en" ? "切换至中文" : "SWITCH TO ENGLISH"}
                                </button>
                                <Link href={`/login?lang=${lang}`} onClick={() => setIsMenuOpen(false)} className="bg-gv-gold-gradient metallic-shine px-6 py-3 rounded-full text-center text-[10px] font-black uppercase tracking-widest text-black shadow-lg">
                                    {t.nav.login}
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* ─── HERO ─── */}
            <main className="relative flex-1 pt-32 pb-20 px-6 max-w-[1440px] mx-auto w-full">
                {/* Decorative glow */}
                <div className="absolute top-40 left-1/2 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-gv-gold/5 blur-[140px]"></div>

                <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-gv-gold">GV Capital Trust</h2>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">{t.hero}</h1>
                    <p className="mx-auto max-w-2xl text-zinc-400 text-lg leading-relaxed">{t.heroSub}</p>
                </div>

                {/* ─── CALCULATOR INPUT ─── */}
                <div className="max-w-xl mx-auto mb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                    <label className="block text-center text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-4">
                        {t.inputLabel}
                    </label>
                    <div className="relative group">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gv-gold/60 pointer-events-none">$</span>
                        <input
                            id="investment-amount"
                            type="text"
                            inputMode="decimal"
                            value={rawInput}
                            onChange={e => setRawInput(e.target.value)}
                            placeholder={t.inputPlaceholder}
                            className="w-full bg-white/[0.03] border-2 border-white/10 rounded-2xl pl-14 pr-6 py-6 text-3xl font-black text-white text-center focus:outline-none focus:border-gv-gold/50 focus:shadow-[0_0_40px_rgba(212,175,55,0.15)] transition-all placeholder:text-zinc-700 placeholder:text-xl"
                        />
                    </div>

                    {/* Live estimate display */}
                    {estimate && (
                        <div className="mt-6 text-center animate-in fade-in zoom-in-95 duration-500">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-2">{t.estLabel}</p>
                            <div className="inline-flex items-baseline gap-2 bg-white/5 border border-gv-gold/20 rounded-2xl px-8 py-4">
                                <span className="text-3xl font-black text-gv-gold">{formatCurrency(estimate.low)}</span>
                                <span className="text-zinc-500 text-sm font-bold">—</span>
                                <span className="text-3xl font-black text-gv-gold">{formatCurrency(estimate.high)}</span>
                                <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest ml-1">{t.perMonth}</span>
                            </div>
                            <p className="mt-3 text-zinc-600 text-xs font-bold uppercase tracking-widest">
                                {estimate.tier.name} Tier &middot; {estimate.tier.dividendMin}% — {estimate.tier.dividendMax}% {t.range}
                            </p>
                        </div>
                    )}
                </div>

                {/* ─── TIER CARDS ─── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
                    {TIERS.map((tier, index) => {
                        const isActive = activeTierId === tier.id;

                        return (
                            <div
                                key={tier.id}
                                className="relative rounded-3xl p-[1px] transition-all duration-700 ease-out"
                                style={{
                                    background: isActive
                                        ? "linear-gradient(135deg, #EECE80, #B8860B, #EECE80)"
                                        : "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                                    animationDelay: `${index * 100}ms`,
                                }}
                            >
                                {/* Glow effect behind card */}
                                <div
                                    className="absolute inset-0 rounded-3xl transition-all duration-700 ease-out -z-10"
                                    style={{
                                        boxShadow: isActive
                                            ? `0 0 60px ${tier.glowColor}, 0 0 120px ${tier.glowColor}`
                                            : "none",
                                    }}
                                ></div>

                                <div
                                    className={`relative h-full rounded-3xl p-8 lg:p-10 transition-all duration-500 ${
                                        isActive
                                            ? "bg-[#111111]"
                                            : "bg-[#0d0d0d] hover:bg-[#111111]"
                                    }`}
                                >
                                    {/* Tier badge */}
                                    <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6 transition-all duration-500 ${
                                        isActive
                                            ? "bg-gv-gold/20 text-gv-gold"
                                            : "bg-white/5 text-zinc-500"
                                    }`}>
                                        {tier.icon}
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{tier.name}</span>
                                    </div>

                                    {/* Price range */}
                                    <div className="mb-6">
                                        <p className={`text-3xl font-black tracking-tight transition-colors duration-500 ${
                                            isActive ? "text-white" : "text-zinc-300"
                                        }`}>
                                            {formatCurrency(tier.minUSD)}
                                            <span className="text-zinc-600 mx-2 text-lg">—</span>
                                            {formatCurrency(tier.maxUSD)}
                                        </p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mt-1">Investment Range</p>
                                    </div>

                                    {/* Dividend rate */}
                                    <div className={`rounded-2xl p-5 mb-8 transition-all duration-500 ${
                                        isActive
                                            ? "bg-gv-gold/10 border border-gv-gold/20"
                                            : "bg-white/[0.02] border border-white/5"
                                    }`}>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Monthly Dividend</p>
                                        <p className={`text-2xl font-black transition-colors duration-500 ${
                                            isActive ? "text-gv-gold" : "text-zinc-400"
                                        }`}>
                                            {tier.dividendMin}% — {tier.dividendMax}%
                                        </p>

                                        {/* Show live calculation when active */}
                                        {isActive && amount > 0 && (
                                            <div className="mt-3 pt-3 border-t border-gv-gold/10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gv-gold/60 mb-1">Your Estimate</p>
                                                <p className="text-lg font-black text-gv-gold">
                                                    {formatCurrency((amount * tier.dividendMin) / 100)} — {formatCurrency((amount * tier.dividendMax) / 100)}
                                                    <span className="text-xs text-gv-gold/50 ml-1">/mo</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Features */}
                                    <div className="space-y-3 mb-8">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">{t.features}</p>
                                        {tier.features.map((feature, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${
                                                    isActive ? "bg-gv-gold" : "bg-zinc-700"
                                                }`}></div>
                                                <span className={`text-sm font-medium transition-colors duration-500 ${
                                                    isActive ? "text-zinc-300" : "text-zinc-600"
                                                }`}>{feature}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* CTA */}
                                    <Link
                                        href={`/register?lang=${lang}`}
                                        className={`block w-full text-center py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${
                                            isActive
                                                ? "bg-gv-gold-gradient metallic-shine text-black shadow-lg hover:-translate-y-1"
                                                : "border border-white/10 text-zinc-500 hover:border-gv-gold/30 hover:text-gv-gold"
                                        }`}
                                    >
                                        {t.cta}
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Disclaimer */}
                <p className="text-center text-[9px] text-zinc-700 font-bold uppercase tracking-widest mt-16 max-w-2xl mx-auto leading-relaxed">
                    {lang === "en"
                        ? "Dividend estimates are projections based on historical performance and are not guaranteed. Past performance does not guarantee future results. Investing involves risk."
                        : "分红估算基于历史表现的预测，不作任何保证。过往表现不代表未来回报。投资涉及风险。"}
                </p>
            </main>

            <GlobalFooter />
        </div>
    );
}
