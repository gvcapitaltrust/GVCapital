"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import GlobalFooter from "@/components/GlobalFooter";
import Navigation from "@/components/Navigation";
import { Briefcase, BarChart3, Lock, Globe, ShieldCheck, Activity, ChevronRight } from "lucide-react";

function ServicesClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialLang = searchParams?.get("lang") === "zh" ? "zh" : "en";
    const [lang, setLang] = useState<"en" | "zh">(initialLang);

    // Sync URL when lang changes
    useEffect(() => {
        const currentUrlLang = searchParams?.get("lang");
        if (currentUrlLang !== lang) {
            router.replace(`?lang=${lang}`, { scroll: false });
        }
    }, [lang, router, searchParams]);

    const content = {
        en: {
            hero: {
                title: "Premium Strategies",
                subtitle: "Exclusive Wealth Management Solutions designed to preserve capital and engineer exceptional, steady growth across global volatile markets."
            },
            services: [
                {
                    icon: <Briefcase className="h-8 w-8" />,
                    title: "Capital Management",
                    desc: "Our expert consortium actively allocates discretionary funds into highly vetted institutional instruments, circumventing retail volatility while capturing robust structural market gains. We focus on long-term systemic stability.",
                    features: ["Algorithmic Fund Allocation", "Quarterly Rebalancing", "Macro-Trend Positioning"]
                },
                {
                    icon: <BarChart3 className="h-8 w-8" />,
                    title: "Automated Monthly Dividends",
                    desc: "Access financial freedom through our automated liquidity protocol. We distribute validated monthly dividend yields ranging from 5% to 15% directly to your secure portal based on your strict Tier allocation.",
                    features: ["Tier-Based Yields", "Direct Fiat/Crypto Output", "Transparent Profit Logging"]
                },
                {
                    icon: <Globe className="h-8 w-8" />,
                    title: "Global Discretionary Trading",
                    desc: "Capitalize on high-velocity forex and global derivatives. Our proprietary trading algorithms hedge against geopolitical turbulence, securing daily incremental wins that compound into massive annual growth.",
                    features: ["24/5 FX Desk Access", "Derivative Hedging", "AI Structural Trading"]
                },
                {
                    icon: <ShieldCheck className="h-8 w-8" />,
                    title: "Secure Trust & Escrow",
                    desc: "Security is non-negotiable. Every user's capital is structurally firewalled. Your initial principal remains rigidly siloed in multi-sig cold storage and secure bank escrow until maturity lock-in completion.",
                    features: ["Multi-Sig Frameworks", "Capital Lock Insurance", "100% Reserve Backed"]
                }
            ],
            cta: {
                title: "Ready to Accelerate Your Wealth?",
                desc: "Join an exclusive network of high-net-worth individuals building generational capital.",
                btn: "Begin Your Journey"
            }
        },
        zh: {
            hero: {
                title: "高级策略",
                subtitle: "专属财富管理解决方案，旨在保全资本并在全球动荡市场中实现卓越、稳定的增长。"
            },
            services: [
                {
                    icon: <Briefcase className="h-8 w-8" />,
                    title: "资本管理",
                    desc: "我们的专家联盟积极将可支配资金配置到经过严格审查的机构工具中，规避零售市场波动，同时捕捉强大的结构性市场收益。我们专注于长期的系统稳定性。",
                    features: ["算法资金配置", "季度重组分配", "宏观趋势定位"]
                },
                {
                    icon: <BarChart3 className="h-8 w-8" />,
                    title: "自动化月度派息",
                    desc: "通过我们的自动化流动性协议实现财务自由。我们根据您严格的层级配置，直接向您的安全门户分配经过验证的月度股息收益（通常介于 5% 至 15% 之间）。",
                    features: ["基于层级的收益", "直接法币/加密货币输出", "透明利润记录"]
                },
                {
                    icon: <Globe className="h-8 w-8" />,
                    title: "全球全权委托交易",
                    desc: "利用高速外汇和全球衍生品获利。我们专有的交易算法可对冲地缘政治动荡，确保实现每日增量获利，从而复合产生巨大的年度增长。",
                    features: ["24/5 外汇桌面访问", "衍生品对冲", "AI 结构性交易"]
                },
                {
                    icon: <ShieldCheck className="h-8 w-8" />,
                    title: "安全信托与托管",
                    desc: "安全问题不容妥协。每个用户的资金都在结构上设立了防火墙。直到锁定期限完成之前，您的初始本金始终严格地独立存放在多重签名冷存储和安全的银行托管账户中。",
                    features: ["多重签名框架", "资本锁定保险", "100% 储备支持"]
                }
            ],
            cta: {
                title: "准备好加速您的财富了吗？",
                desc: "加入专属的高净值个人网络，共同打造世代财富。",
                btn: "开启您的旅程"
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
                        <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-gray-700">GV CAPITAL TRUST</h2>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900 mb-6">{t.hero.title}</h1>
                    <p className="text-lg md:text-xl text-gray-500 font-medium tracking-wide leading-relaxed max-w-3xl mx-auto">{t.hero.subtitle}</p>
                </div>

                {/* Services Grid */}
                <div className="max-w-7xl mx-auto px-6 lg:px-12 grid md:grid-cols-2 gap-8 mb-32 relative z-10">
                    {/* Decor Blur */}
                    <div className="absolute top-1/2 left-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gv-gold/5 blur-[120px]"></div>

                    {t.services.map((svc, idx) => (
                        <div key={idx} className="bg-white border border-gray-100 p-8 md:p-12 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_80px_rgba(212,175,55,0.1)] transition-all duration-500 group flex flex-col h-full">
                            <div className="h-16 w-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gv-gold mb-8 group-hover:scale-110 group-hover:bg-gv-gold/10 transition-all">
                                {svc.icon}
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight text-gray-900 mb-4">{svc.title}</h3>
                            <p className="text-gray-500 leading-relaxed font-medium mb-8 flex-grow">{svc.desc}</p>
                            <ul className="space-y-3 pt-6 border-t border-gray-100">
                                {svc.features.map((feat, fIdx) => (
                                    <li key={fIdx} className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-gray-900">
                                        <div className="h-4 w-4 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        {feat}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom CTA */}
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-black mb-4 uppercase tracking-tight">{t.cta.title}</h2>
                    <p className="text-gray-500 mb-8 max-w-xl mx-auto">{t.cta.desc}</p>
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

export default function ServicesPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-gv-gold border-t-transparent rounded-full"></div></div>}>
            <ServicesClient />
        </Suspense>
    );
}
