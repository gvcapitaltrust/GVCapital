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
                services: "服务",
                about: "关于我们",
                contact: "联系我们",
                login: "客户登录",
            },
            hero: {
                title: "GV 资本信托",
                slogan: "信任 · 诚信 · 自由",
                description: "您在财富管理和财务自由方面的合作伙伴。我们致力于以诚信和卓越提供定制的信托服务。",
            },
            cta: "立即开始",
        },
    };

    const t = content[lang];

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-gv-gold selection:text-black flex flex-col">
            {/* Navigation */}
            <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 h-20 md:h-24">
                    <div className="flex-1 flex justify-start">
                        <Link href={`/?lang=${lang}`} className="flex items-center shrink-0">
                            <img
                                src="/logo.png"
                                alt="GV Capital Trust Logo"
                                className="h-[50px] md:h-[60px] w-auto object-contain mix-blend-screen drop-shadow-[0_0_15px_rgba(238,206,128,0.3)]"
                            />
                        </Link>
                    </div>

                    <div className="hidden md:flex flex-[2] justify-center items-center gap-8 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                        <Link href="#" className="hover:text-gv-gold transition-colors whitespace-nowrap">{t.nav.services}</Link>
                        <Link href="#" className="hover:text-gv-gold transition-colors whitespace-nowrap">{t.nav.about}</Link>
                        <Link href="#" className="hover:text-gv-gold transition-colors whitespace-nowrap">{t.nav.contact}</Link>
                    </div>

                    <div className="flex-1 flex justify-end items-center gap-4">
                        <button
                            onClick={() => setLang(lang === "en" ? "zh" : "en")}
                            className="hidden lg:block rounded-full border border-white/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-zinc-500 whitespace-nowrap"
                        >
                            {lang === "en" ? "中文" : "EN"}
                        </button>

                        <Link
                            href={`/login?lang=${lang}`}
                            className="bg-gv-gold-gradient metallic-shine px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-black shadow-lg hover:-translate-y-1 transition-all active:scale-95 whitespace-nowrap"
                        >
                            {t.nav.login}
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative flex flex-col items-center justify-center pt-32 pb-20 px-6 text-center flex-1 max-w-[1440px] mx-auto w-full">
                {/* Decorative background element */}
                <div className="absolute top-1/2 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gv-gold/10 blur-[120px]"></div>

                <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-gv-gold">
                        {t.hero.slogan}
                    </h2>
                    <h1 className="mb-8 text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-8xl">
                        <span className="block text-white">{t.hero.title}</span>
                    </h1>
                    <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
                        {t.hero.description}
                    </p>

                    <div className="flex flex-col gap-6 sm:flex-row sm:justify-center">
                        <Link
                            href={`/register?lang=${lang}`}
                            className="bg-gv-gold-gradient metallic-shine inline-flex items-center justify-center rounded-full px-12 py-5 text-sm font-black uppercase tracking-[0.2em] text-black shadow-2xl hover:-translate-y-1 transition-all group"
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
                        <button className="rounded-full border border-white/10 px-12 py-5 text-sm font-black uppercase tracking-[0.2em] text-white hover:bg-white/5 transition-all">
                            {t.nav.about}
                        </button>
                    </div>
                </div>

                {/* Feature Grid placeholder */}
                <div className="mt-32 grid grid-cols-1 gap-8 sm:grid-cols-3 max-w-6xl w-full">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="group rounded-2xl border border-white/5 bg-white/5 p-8 transition-all hover:border-gv-gold/30 hover:bg-white/10">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gv-gold/20 text-gv-gold">
                                <div className="h-6 w-6 border-2 border-gv-gold rounded-full"></div>
                            </div>
                            <h3 className="mb-2 text-xl font-bold">{lang === "en" ? `Premium Service ${i}` : `卓越服务 ${i}`}</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed">
                                {lang === "en"
                                    ? "Global asset allocation and wealth protection strategies tailored to your specific financial goals."
                                    : "针对您的特定财务目标量身定制的全球资产配置和财富保护策略。"}
                            </p>
                        </div>
                    ))}
                </div>
            </main>

            <GlobalFooter />
        </div>
    );
}
