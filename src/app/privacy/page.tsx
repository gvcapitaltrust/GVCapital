"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import GlobalFooter from "@/components/GlobalFooter";

function PrivacyClient() {
    const searchParams = useSearchParams();
    const lang = searchParams?.get("lang") === "zh" ? "zh" : "en";

    const content = {
        en: {
            title: "Privacy Policy",
            subtitle: "Commitment to Data Security & PDPA Compliance",
            lastUpdated: "Last Updated: January 01, 2026",
            sections: [
                {
                    title: "1. Information Collection",
                    body: "GV Capital Trust strictly collects only essential information required for secure financial operations, including identity verification data (KYC), transaction history, and encrypted authentication tokens. This ensures compliance with global AML and CTF frameworks."
                },
                {
                    title: "2. Personal Data Protection Act (PDPA) 2010",
                    body: "We operate in strict adherence to the PDPA. Your data is never sold, syndicated, or exposed to third-party marketing agencies. Processing is strictly limited to asset management, compliance reporting, and platform security."
                },
                {
                    title: "3. Encryption & Storage",
                    body: "All personal and financial data is encrypted at rest using AES-256 standards and transmitted via secure TLS endpoints. Our databases are isolated within private enterprise networks to prevent unauthorized external access."
                },
                {
                    title: "4. User Rights & Data Retention",
                    body: "The Client retains the right to request access to or deletion of their personal data, subject to legal compliance hold periods required by financial regulators. Inactive or closed accounts will have their data retained securely for 5 years before permanent purging."
                }
            ],
            back: "Return to Home"
        },
        zh: {
            title: "隐私政策",
            subtitle: "致力于数据安全与 PDPA 合规",
            lastUpdated: "最后更新：2026 年 01 月 01 日",
            sections: [
                {
                    title: "1. 信息收集",
                    body: "GV 资本信托仅严格收集安全金融操作所需的必要信息，包括身份验证数据 (KYC)、交易历史记录和加密的认证令牌。这确保了符合全球反洗钱 (AML) 和反恐融资 (CTF) 框架。"
                },
                {
                    title: "2. 2010 年个人数据保护法 (PDPA)",
                    body: "我们严格遵守 PDPA。您的数据绝不会被出售、发布或暴露给第三方营销机构。数据处理严格限于资产管理、合规报告和平台安全。"
                },
                {
                    title: "3. 加密与存储",
                    body: "所有个人和财务数据在静止状态下均使用 AES-256 标准进行加密，并通过安全的 TLS 端点传输。我们的数据库隔离在私有企业网络中，以防止未经授权的外部访问。"
                },
                {
                    title: "4. 用户权利与数据保留",
                    body: "客户保留要求访问或删除其个人数据的权利，但须遵守金融监管机构要求的法定合规保留期。非活跃或已注销账户的数据将安全保留 5 年，然后永久清除。"
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

export default function PrivacyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-gv-gold border-t-transparent rounded-full"></div></div>}>
            <PrivacyClient />
        </Suspense>
    );
}
