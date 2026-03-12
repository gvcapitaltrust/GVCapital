"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import GlobalFooter from "@/components/GlobalFooter";
import { supabase } from "@/lib/supabaseClient";

export default function HomeClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [lang, setLang] = useState<"en" | "zh">("en");
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const l = searchParams?.get("lang");
        if (l === "zh") setLang("zh");
        else if (l === "en") setLang("en");

        const checkMaintenance = async () => {
            try {
                const { data } = await supabase.from('settings').select('value').eq('key', 'maintenance_mode').single();
                if (data?.value === 'true') {
                    router.push('/maintenance');
                }
            } catch (err) {
                console.error("Maintenance check failed", err);
            }
        };
        checkMaintenance();
    }, [searchParams, router]);

    const content = {
        en: {
            nav: {
                services: "Services",
                about: "About Us",
                contact: "Contact",
                login: "Client Login",
            },
            hero: {
                title: "GV Capital Trust",
                slogan: "Trusty. Integrity. Freedom.",
                description: "Your partner in wealth management and financial freedom. We provide bespoke trust services with a commitment to integrity and excellence.",
            },
            cta: "Get Started",
        },
        zh: {
            nav: {
                services: "鏈嶅姟",
                about: "鍏充簬鎴戜滑",
                contact: "鑱旂郴鎴戜滑",
                login: "瀹㈡埛鐧诲綍",
            },
            hero: {
                title: "GV 璧勬湰淇℃墭",
                slogan: "淇′换 路 璇氫俊 路 鑷敱",
                description: "鎮ㄥ湪璐㈠瘜绠＄悊鍜岃储鍔¤嚜鐢辨柟闈㈢殑鍚堜綔浼欎即銆傛垜浠嚧鍔涗簬浠ヨ瘹淇″拰鍗撹秺鎻愪緵瀹氬埗鐨勪俊鎵樻湇鍔°€?,
            },
            cta: "绔嬪嵆寮€濮?,
        },
    };

    const t = content[lang];

    return (
        <div className="min-h-screen bg-[#0F0F0F] text-white selection:bg-gv-gold selection:text-black flex flex-col">
            {/* Navigation */}
            <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0F0F0F]/80 backdrop-blur-md">
                <div className="main-container flex items-center justify-between py-4 md:h-20">
                    <div className="flex items-center">
                        <Link href={`/?lang=${lang}`} className="flex items-center shrink-0">
                            <img
                                src="/logo.png"
                                alt="GV Capital Trust Logo"
                                className="h-8 md:h-12 w-auto object-contain mix-blend-screen drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                            />
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex flex-1 justify-center items-center gap-10 text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-500">
                        <Link href={`/products?lang=${lang}`} className="hover:text-gv-gold transition-colors">{t.nav.services}</Link>
                        <Link href="#" className="hover:text-gv-gold transition-colors">{t.nav.about}</Link>
                        <Link href="#" className="hover:text-gv-gold transition-colors">{t.nav.contact}</Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-6">
                            <button
                                onClick={() => setLang(lang === "en" ? "zh" : "en")}
                                className="hidden lg:block rounded-lg border border-white/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all duration-300 duration-300 text-zinc-500"
                            >
                                {lang === "en" ? "涓枃" : "EN"}
                            </button>

                            <Link
                                href={`/login?lang=${lang}`}
                                className="bg-gv-gold-gradient metallic-shine px-6 py-3 rounded-lg text-[12px] font-bold uppercase tracking-[0.1em] text-black shadow-lg hover:-translate-y-1 transition-all duration-300 duration-300 active:scale-95 whitespace-nowrap"
                            >
                                {t.nav.login}
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button 
                            className="md:hidden p-2 text-white"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
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

                {/* Mobile Navigation Drawer */}
                {isMenuOpen && (
                    <div className="md:hidden absolute top-full left-0 w-full bg-[#0F0F0F] border-b border-white/5 animate-in slide-in-from-top duration-300 shadow-2xl">
                        <div className="flex flex-col p-6 gap-6 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                            <Link href={`/products?lang=${lang}`} onClick={() => setIsMenuOpen(false)} className="hover:text-gv-gold transition-colors">{t.nav.services}</Link>
                            <Link href="#" onClick={() => setIsMenuOpen(false)} className="hover:text-gv-gold transition-colors">{t.nav.about}</Link>
                            <Link href="#" onClick={() => setIsMenuOpen(false)} className="hover:text-gv-gold transition-colors">{t.nav.contact}</Link>
                            <div className="h-px bg-white/5 w-full my-2"></div>
                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={() => {
                                        setLang(lang === "en" ? "zh" : "en");
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full text-left py-2 hover:text-gv-gold transition-colors"
                                >
                                    {lang === "en" ? "鍒囨崲鑷充腑鏂? : "SWITCH TO ENGLISH"}
                                </button>
                                <Link
                                    href={`/login?lang=${lang}`}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="bg-gv-gold-gradient metallic-shine px-6 py-3 rounded-lg text-center text-[10px] font-black uppercase tracking-widest text-black shadow-lg hover:shadow-gv-gold/20 transition-all duration-300 duration-300"
                                >
                                    {t.nav.login}
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <main className="main-container relative flex flex-col items-center justify-center pt-[150px] md:pt-[200px] pb-20 text-center flex-1">
                {/* Decorative background element */}
                <div className="absolute top-1/2 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-gv-gold/10 blur-[120px]"></div>

                <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <h2 className="mb-4 text-[12px] font-bold uppercase tracking-[0.1em] text-gv-gold">
                        {t.hero.slogan}
                    </h2>
                    <h1 className="mb-8 text-5xl font-bold tracking-[-0.02em] sm:text-7xl lg:text-8xl">
                        <span className="block text-white">{t.hero.title}</span>
                    </h1>
                    <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
                        {t.hero.description}
                    </p>

                    <div className="flex flex-col gap-6 sm:flex-row sm:justify-center">
                        <Link
                            href={`/register?lang=${lang}`}
                            className="bg-gv-gold-gradient metallic-shine inline-flex items-center justify-center rounded-lg px-12 py-5 text-[14px] font-bold uppercase tracking-[0.1em] text-black shadow-2xl hover:-translate-y-1 transition-all duration-300 duration-300 group"
                        >
                            <span className="relative">{t.cta}</span>
                            <svg
                                className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </Link>
                        <button className="rounded-lg border border-white/10 px-12 py-5 text-sm font-black uppercase tracking-[0.2em] text-white hover:bg-white/5 transition-all duration-300 duration-300">
                            {t.nav.about}
                        </button>
                    </div>
                </div>

                {/* Feature Grid placeholder */}
                <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="group rounded-lg border border-white/5 bg-white/5 p-8 transition-all duration-300 hover:border-gv-gold/30 hover:bg-white/10">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gv-gold/20 text-gv-gold">
                                <div className="h-6 w-6 border-2 border-gv-gold rounded-lg"></div>
                            </div>
                            <h3 className="mb-2 text-xl font-bold">{lang === "en" ? `Premium Service ${i}` : `鍗撹秺鏈嶅姟 ${i}`}</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed">
                                {lang === "en"
                                    ? "Global asset allocation and wealth protection strategies tailored to your specific financial goals."
                                    : "閽堝鎮ㄧ殑鐗瑰畾璐㈠姟鐩爣閲忚韩瀹氬埗鐨勫叏鐞冭祫浜ч厤缃拰璐㈠瘜淇濇姢绛栫暐銆?}
                            </p>
                        </div>
                    ))}
                </div>
            </main>

            <GlobalFooter />
        </div>
    );
}
