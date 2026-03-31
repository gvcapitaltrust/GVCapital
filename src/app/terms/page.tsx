"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import GlobalFooter from "@/components/GlobalFooter";

function TermsClient() {
    const searchParams = useSearchParams();
    const lang = searchParams?.get("lang") === "zh" ? "zh" : "en";

    const content = {
        en: {
            title: "Terms of Service",
            subtitle: "Global Asset Management Framework",
            lastUpdated: "Last Updated: January 01, 2026",
            sections: [
                {
                    title: "1. Acceptance of Terms",
                    body: "By creating an account with GV Capital Trust, The Client automatically agrees to abide by these Terms of Service. This platform operates as a private, invitation-only wealth management ecosystem."
                },
                {
                    title: "2. Account Usage & Restrictions",
                    body: "Accounts are rigidly individualized and strictly non-transferable. Attempting to bypass the platform's Anti-Money Laundering (AML) checks, exploiting referral mechanisms, or executing unauthorized programmatic access triggers immediate, permanent account suspension."
                },
                {
                    title: "3. Service Availability",
                    body: "GV Capital Trust strives for 99.9% uptime. However, The Trust reserves the autonomous right to throttle, pause, or restrict platform access during high-volatility market events, periodic maintenance, or global security incidents without prior liability."
                },
                {
                    title: "4. Capital Deposits & Withdrawals",
                    body: "All capital deposit operations are subject to standard network clearance times. As per our Master Investment Agreement, capital withdrawals executed prior to the conclusion of the mandatory 6-month or 12-month lock-in periods will face an automatic 40% liquidation penalty."
                }
            ],
            back: "Return to Home"
        },
        zh: {
            title: "服务条款",
            subtitle: "全球资产管理框架",
            lastUpdated: "最后更新：2026 年 01 月 01 日",
            sections: [
                {
                    title: "1. 接受条款",
                    body: "通过在 GV 资本信托创建账户，客户自动同意遵守本服务条款。本平台作为私人、仅限邀请的财富管理生态系统运营。"
                },
                {
                    title: "2. 账户使用与限制",
                    body: "账户严格个体化且严禁转让。试图绕过平台的反洗钱 (AML) 检查、滥用推荐机制或执行未经授权的程序化访问将引发立即的、永久性的账户暂停。"
                },
                {
                    title: "3. 服务可用性",
                    body: "GV 资本信托努力实现 99.9% 的正常运行时间。然而，信托保留在市场高波动事件、定期维护或全球安全事件期间自动限制、暂停或限制平台访问的权利，且无需承担事先责任。"
                },
                {
                    title: "4. 资金存取",
                    body: "所有资金存入操作均受标准网络清算时间约束。根据我们的主投资协议，在强制性的 6 个月或 12 个月锁定期结束前执行的资金提取将面临自动的 40% 清算违约金。"
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

export default function TermsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-gv-gold border-t-transparent rounded-full"></div></div>}>
            <TermsClient />
        </Suspense>
    );
}
