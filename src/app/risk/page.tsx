"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import GlobalFooter from "@/components/GlobalFooter";

function RiskClient() {
    const searchParams = useSearchParams();
    const lang = searchParams?.get("lang") === "zh" ? "zh" : "en";

    const content = {
        en: {
            title: "Risk Disclosure",
            subtitle: "Understanding Private Wealth Vulnerabilities",
            lastUpdated: "Last Updated: January 01, 2026",
            sections: [
                {
                    title: "1. Nature of Private Equity & High-Yield Assets",
                    body: "GV Capital Trust engages in aggressive, high-yield global asset management, including forex positioning, derivatives, and private equity syndication. These vehicles are inherently volatile and carry a significant risk of capital loss."
                },
                {
                    title: "2. No Guarantee of Returns",
                    body: "While The Trust establishes target dividend benchmarks (e.g., 5% to 15% monthly yields depending on tier), these are speculative targets based on active trading algorithms and historical performance. Past performance is strictly not indicative of future results."
                },
                {
                    title: "3. Market & Liquidity Risks",
                    body: "Global macroeconomic events, flash crashes, regulatory shifts, or geopolitical instability can severely impact portfolio valuations. The Trust's capital lock-in periods (6 to 12 months) mean that your capital is illiquid during that timeframe, and you cannot access it without incurring the 40% liquidation penalty."
                },
                {
                    title: "4. Acknowledgment of Capacity",
                    body: "By participating in GV Capital Trust's ecosystem, you acknowledge that you are investing discretionary capital that you can afford to lose. You confirm that you possess the financial sophistication necessary to comprehend and absorb these absolute risks."
                }
            ],
            back: "Return to Home"
        },
        zh: {
            title: "风险披露",
            subtitle: "了解私人财富的脆弱性",
            lastUpdated: "最后更新：2026 年 01 月 01 日",
            sections: [
                {
                    title: "1. 私募股权与高收益资产的性质",
                    body: "GV 资本信托从事激进的高收益全球资产管理，包括外汇定位、衍生品和私募股权联合。这些工具本质上具有波动性，并带有重大的资本损失风险。"
                },
                {
                    title: "2. 无收益保证",
                    body: "虽然信托设定了目标股息基准（例如，根据层级，每月收益率为 5% 至 15%），但这些都是基于主动交易算法和历史表现的投机性目标。过去的表现绝对不预示未来的结果。"
                },
                {
                    title: "3. 市场与流动性风险",
                    body: "全球宏观经济事件、闪崩、监管政策转变或地缘政治不稳定均可能严重影响投资组合估值。信托的资本锁定期（6 至 12 个月）意味着您的资金在此期间缺乏流动性，且如果您在未满期前提取，将承担 40% 的清算违约金。"
                },
                {
                    title: "4. 能力确认",
                    body: "通过参与 GV 资本信托的生态系统，您承认您投资的是您可以承受损失的自由支配资本。您确认您具备必要的金融成熟度来理解并承担这些绝对风险。"
                }
            ],
            back: "返回主页"
        }
    };

    const t = content[lang];

    return (
        <div className="min-h-screen bg-[#FAFAF8] flex flex-col font-sans text-gray-900 selection:bg-gv-gold selection:text-white">
            <header className="fixed top-0 left-0 right-0 h-20 bg-[#FAFAF8]/90 backdrop-blur-md border-b border-gray-200 z-50 flex items-center justify-between px-6 lg:px-12">
                <Link href={`/?lang=${lang}`} className="flex items-center gap-3 group">
                    <img src="/logo.png" alt="GV Capital" className="h-[40px] w-auto object-contain group-hover:opacity-80 transition-opacity" />
                </Link>
                <div className="flex gap-4">
                    <Link href={`/?lang=en`} className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${lang === 'en' ? 'border-gv-gold text-gv-gold bg-gv-gold/5' : 'border-transparent text-gray-400 hover:text-gray-900'}`}>ENG</Link>
                    <Link href={`/?lang=zh`} className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${lang === 'zh' ? 'border-gv-gold text-gv-gold bg-gv-gold/5' : 'border-transparent text-gray-400 hover:text-gray-900'}`}>中文</Link>
                </div>
            </header>

            <main className="flex-1 w-full max-w-4xl mx-auto pt-32 pb-20 px-6 sm:px-12">
                <div className="mb-12">
                    <div className="w-12 h-1 bg-gv-gold mb-8"></div>
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-gray-900 mb-4">{t.title}</h1>
                    <p className="text-lg text-gray-500 font-medium tracking-wide mb-2">{t.subtitle}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t.lastUpdated}</p>
                </div>

                <div className="space-y-12 bg-white border border-gray-200 rounded-[32px] p-8 md:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
                    {t.sections.map((sec, idx) => (
                        <div key={idx} className="space-y-4">
                            <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 flex items-center gap-3">
                                <span className="text-gv-gold">|</span> {sec.title}
                            </h2>
                            <p className="text-gray-500 leading-relaxed font-medium md:pl-4">{sec.body}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-12 flex justify-center">
                    <Link href={`/?lang=${lang}`} className="inline-flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl hover:bg-gv-gold hover:text-black hover:shadow-xl transition-all font-black text-[11px] uppercase tracking-widest">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        {t.back}
                    </Link>
                </div>
            </main>

            <GlobalFooter />
        </div>
    );
}

export default function RiskPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-gv-gold border-t-transparent rounded-full"></div></div>}>
            <RiskClient />
        </Suspense>
    );
}
