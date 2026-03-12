"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import GlobalFooter from "@/components/GlobalFooter";
import Navigation from "@/components/Navigation";
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
        <div className="min-h-screen bg-[#121212] text-white selection:bg-gv-gold selection:text-black flex flex-col overflow-x-hidden">
            {/* Navigation */}
            <Navigation lang={lang} setLang={setLang} user={null} />

            {/* Hero Section */}
            <main className="relative flex flex-col items-center justify-center pt-40 pb-20 px-6 text-center flex-1">
                {/* Decorative background element */}
                <div className="absolute top-1/2 left-1/2 -z-10 h-[300px] w-[300px] sm:h-[500px] sm:w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gv-gold/10 blur-[80px] sm:blur-[120px]"></div>

                <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-4xl mx-auto">
                    <h2 className="mb-4 text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-gv-gold">
                        {t.hero.slogan}
                    </h2>
                    <h1 className="mb-6 sm:mb-8 text-4xl font-black tracking-tight sm:text-7xl lg:text-9xl leading-[1.1]">
                        <span className="block text-white uppercase">{t.hero.title}</span>
                    </h1>
                    <p className="mx-auto mb-10 max-w-2xl text-base sm:text-lg leading-relaxed text-zinc-400 font-medium">
                        {t.hero.description}
                    </p>

                    <div className="flex flex-col gap-4 sm:flex-row sm:justify-center px-4">
                        <Link
                            href={`/register?lang=${lang}`}
                            className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gv-gold px-8 sm:px-12 py-4 text-sm sm:text-lg font-black text-black transition-all hover:pr-14 active:scale-95 shadow-[0_20px_40px_rgba(212,175,55,0.2)]"
                        >
                            <span className="relative z-10 uppercase tracking-widest">{t.cta}</span>
                            <svg
                                className="absolute right-5 h-5 w-5 -translate-x-4 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </Link>
                        <button className="rounded-full border border-white/10 bg-white/5 px-8 sm:px-12 py-4 text-sm sm:text-lg font-black text-white hover:bg-white/10 transition-all active:scale-95 uppercase tracking-widest">
                            {t.nav.about}
                        </button>
                    </div>
                </div>

                {/* Feature Grid */}
                <div className="mt-24 sm:mt-32 grid grid-cols-1 gap-6 sm:gap-8 sm:grid-cols-3 max-w-6xl w-full">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="group rounded-[32px] border border-white/5 bg-[#1a1a1a] p-8 sm:p-10 transition-all hover:border-gv-gold/30 hover:-translate-y-2 duration-500 shadow-xl">
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
