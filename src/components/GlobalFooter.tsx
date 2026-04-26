"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function GlobalFooter() {
    const searchParams = useSearchParams();
    const lang = searchParams?.get("lang") === "zh" ? "zh" : "en";

    const content = {
        en: {
            copyright: "© 2026 GV Capital Trust. All Rights Reserved.",
            privacy: "Privacy Policy",
            terms: "Terms of Service",
            risk: "Risk Disclosure",
            disclaimer: "GV Capital Trust is not a licensed bank. We operate as a private investment vehicle. Investing involves risk of loss. Please read our Disclosure before participating.",
            location: ""
        },
        zh: {
            copyright: "© 2026 GV Capital Trust. 版权所有。",
            privacy: "隐私政策",
            terms: "服务条款",
            risk: "风险披露",
            disclaimer: "GV 资本信托并非持牌银行。我们作为私人投资机构运营。投资涉及损失风险。参与前请阅读我们的披露声明。",
            location: ""
        }
    };

    const t = content[lang];

    return (
        <footer className="w-full bg-[#FAFAF8]/80 backdrop-blur-sm border-t border-gray-200 py-12 px-6 mt-auto">
            <div className="mx-auto max-w-7xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 grayscale opacity-50">
                            <img
                                src="/logo2.png"
                                alt="GV Capital Trust Logo"
                                className="h-[24px] w-auto object-contain "
                            />
                            <span className="text-sm font-bold tracking-tighter text-gray-900/50">GV CAPITAL TRUST</span>
                        </div>
                        <p className="text-[10px] text-gray-400 max-w-md leading-relaxed font-medium uppercase tracking-wider">
                            {t.disclaimer}
                        </p>
                    </div>

                    <div className="flex flex-col items-start md:items-end gap-4">
                        <div className="flex flex-wrap gap-6 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            <Link href={`/privacy?lang=${lang}`} className="hover:text-gv-gold transition-colors">{t.privacy}</Link>
                            <Link href={`/terms?lang=${lang}`} className="hover:text-gv-gold transition-colors">{t.terms}</Link>
                            <Link href={`/risk?lang=${lang}`} className="hover:text-gv-gold transition-colors">{t.risk}</Link>
                        </div>
                        {t.location && (
                            <div className="flex items-center gap-2 text-gray-500">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t.location}</span>
                            </div>
                        )}
                        <p className="text-[8px] text-gray-400 max-w-xs text-left md:text-right leading-tight font-bold uppercase tracking-widest mt-2 border-t border-gray-200 pt-4">
                            {lang === "en"
                                ? "Personal Data Protection Act 2010 (PDPA) Compliance: By using this site, you consent to the collection and processing of your personal data."
                                : "2010 年个人数据保护法 (PDPA) 合规性：使用本网站即表示您同意收集和处理您的个人数据。"}
                        </p>
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                        {t.copyright}
                    </p>
                    <div className="flex items-center gap-2 text-gray-400 opacity-50">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] font-mono">SSL 256-BIT ENCRYPTED</span>
                    </div>
                </div>
            </div>
            {/* Floating Email Support */}
            <a
                href="mailto:support@gvcapital.asia"
                className="fixed bottom-10 right-10 h-16 w-16 bg-[#C9A84C] rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(201,168,76,0.4)] hover:scale-110 active:scale-95 transition-all z-[90] group"
                aria-label="Contact Support via Email"
            >
                <div className="absolute right-full mr-4 bg-white text-black text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-black/5 whitespace-nowrap mb-2">
                    {lang === "en" ? "Email Support: support@gvcapital.asia" : "发送邮件至 support@gvcapital.asia"}
                </div>
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            </a>
        </footer>
    );
}
