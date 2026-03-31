"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import GlobalFooter from "@/components/GlobalFooter";
import Navigation from "@/components/Navigation";
import { Shield, Target, Award, Users, ChevronRight } from "lucide-react";

function AboutClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialLang = searchParams?.get("lang") === "zh" ? "zh" : "en";
    const [lang, setLang] = useState<"en" | "zh">(initialLang);

    useEffect(() => {
        const currentUrlLang = searchParams?.get("lang");
        if (currentUrlLang !== lang) {
            router.replace(`?lang=${lang}`, { scroll: false });
        }
    }, [lang, router, searchParams]);

    const content = {
        en: {
            hero: {
                title: "Our Heritage",
                subtitle: "Redefining global trust protocols and building resilient generational wealth."
            },
            story: {
                title: "The GV Capital Story",
                desc1: "GV Capital Trust was established by a consortium of elite capital managers, FinTech pioneers, and quantitative analysts. Our thesis was simple: the retail banking sector fails to deliver the high-yield velocity required to outpace structural inflation.",
                desc2: "We built an invite-only trust architecture that bypasses traditional inefficiencies, providing our inner circle of stakeholders direct access to top-tier algorithmic Forex positioning, institutional derivatives, and sovereign escrow strategies.",
                desc3: "Today, GV Capital Trust operates as a leading autonomous asset allocator, securing multi-million dollar capital pools within our heavily guarded, multi-sig verifiable ecosystem."
            },
            values: [
                {
                    icon: <Shield className="h-6 w-6" />,
                    title: "Unyielding Security",
                    desc: "Our structural firewalls and continuous audits ensure absolute insulation from localized financial crises."
                },
                {
                    icon: <Target className="h-6 w-6" />,
                    title: "Precision Execution",
                    desc: "Decades of combined quantitative experience drive our algorithms to seek precision entries and high-probability exits."
                },
                {
                    icon: <Award className="h-6 w-6" />,
                    title: "Tiered Excellence",
                    desc: "An exclusive, performance-driven hierarchy rewarding our most committed partners with aggressive VVIP dividend yields."
                },
                {
                    icon: <Users className="h-6 w-6" />,
                    title: "Selective Network",
                    desc: "Operating purely by invitation protects our liquidity pools and ensures alignment of strategic financial goals."
                }
            ],
            cta: {
                title: "Become a Stakeholder",
                btn: "Register Now"
            }
        },
        zh: {
            hero: {
                title: "我们的传承",
                subtitle: "重新定义全球信任协议并建立极具弹性的跨时代财富。"
            },
            story: {
                title: "GV 资本信托的故事",
                desc1: "GV 资本信托由精英资本管理专家、金融科技先驱和量化分析师联盟组建。我们的理念很简单：零售银行业无法提供超过结构性通胀所需的高收益流转。",
                desc2: "我们建立了一个仅限受邀访问的架构，绕过了传统的低效流程，为我们内部圈子的利益相关者提供直接访问顶级算法外汇头寸、机构衍生品和主权托管策略的途径。",
                desc3: "今天，GV 资本信托作为领先的自主资产配置机构运营，在我们严密保护且可通过多重签名验证的生态系统中确保数百万美元资金池的安全。"
            },
            values: [
                {
                    icon: <Shield className="h-6 w-6" />,
                    title: "坚不可摧的安全性",
                    desc: "我们的结构性防火墙和持续审计确保与局部金融危机绝对隔离。"
                },
                {
                    icon: <Target className="h-6 w-6" />,
                    title: "精确执行",
                    desc: "数十年的综合量化经验推动我们的算法寻求精准的入场和高概率的退出。"
                },
                {
                    icon: <Award className="h-6 w-6" />,
                    title: "卓越评级",
                    desc: "一个专注业绩的专属层级，通过激进的 VVIP 股息收益来回馈我们最忠诚的合作伙伴。"
                },
                {
                    icon: <Users className="h-6 w-6" />,
                    title: "甄选核心网络",
                    desc: "纯粹受邀运作保护了我们的资金流动性，并确保战略财务目标的一致性。"
                }
            ],
            cta: {
                title: "成为利益相关者",
                btn: "立即注册"
            }
        }
    };

    const t = content[lang];

    return (
        <div className="min-h-screen bg-[#FAFAF8] flex flex-col font-sans text-gray-900 selection:bg-gv-gold selection:text-white overflow-x-hidden">
            <Navigation lang={lang} setLang={setLang} />

            <main className="flex-1 w-full pt-32 pb-20">
                {/* Hero */}
                <div className="max-w-4xl mx-auto px-6 sm:px-12 text-center mb-24 relative z-10">
                    <div className="mx-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 mb-8 backdrop-blur-md shadow-sm">
                        <span className="h-2 w-2 rounded-full bg-gv-gold animate-pulse"></span>
                        <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-gray-700">ABOUT US</h2>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900 mb-6">{t.hero.title}</h1>
                    <p className="text-lg md:text-xl text-gray-500 font-medium tracking-wide leading-relaxed max-w-2xl mx-auto">{t.hero.subtitle}</p>
                </div>

                {/* The Story & Values */}
                <div className="max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-16 mb-24 items-center">
                    {/* Story Text */}
                    <div className="space-y-6">
                        <h2 className="text-3xl font-black uppercase tracking-tight text-gray-900 mb-8">{t.story.title}</h2>
                        <p className="text-gray-500 leading-relaxed font-medium md:text-lg">{t.story.desc1}</p>
                        <p className="text-gray-500 leading-relaxed font-medium md:text-lg">{t.story.desc2}</p>
                        <div className="pl-6 border-l-4 border-gv-gold py-2 mt-4">
                            <p className="text-gray-900 font-bold leading-relaxed">{t.story.desc3}</p>
                        </div>
                    </div>

                    {/* Values Grid */}
                    <div className="grid sm:grid-cols-2 gap-6">
                        {t.values.map((val, idx) => (
                            <div key={idx} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-[0_20px_40px_rgba(0,0,0,0.02)] hover:border-gv-gold/30 hover:-translate-y-1 transition-all duration-300">
                                <div className="h-12 w-12 rounded-xl bg-gv-gold/10 text-gv-gold flex items-center justify-center mb-6">
                                    {val.icon}
                                </div>
                                <h3 className="text-lg font-black uppercase tracking-widest text-gray-900 mb-3">{val.title}</h3>
                                <p className="text-sm text-gray-500 leading-relaxed font-medium">{val.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Call to action */}
                <div className="max-w-4xl mx-auto px-6 text-center mt-32 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gv-gold/10 blur-[80px] -z-10 rounded-full"></div>
                    <h2 className="text-3xl font-black mb-8 uppercase tracking-tight">{t.cta.title}</h2>
                    <Link
                        href={`/register?lang=${lang}`}
                        className="inline-flex items-center justify-center rounded-full bg-gv-gold px-10 py-4 text-sm font-black uppercase tracking-widest text-black transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(212,175,55,0.4)]"
                    >
                        {t.cta.btn} <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                </div>
            </main>

            <GlobalFooter />
        </div>
    );
}

export default function AboutPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-gv-gold border-t-transparent rounded-full"></div></div>}>
            <AboutClient />
        </Suspense>
    );
}
