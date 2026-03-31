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
            {/* Floating WhatsApp Support */}
            <a
                href="https://wa.me/?text=Hi%20GV%20Capital,%20I%20need%20assistance%20with%20my%20account."
                target="_blank"
                className="fixed bottom-10 right-10 h-16 w-16 bg-[#25D366] rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(37,211,102,0.4)] hover:scale-110 active:scale-95 transition-all z-[90] group"
                aria-label="Contact Support via WhatsApp"
            >
                <div className="absolute right-full mr-4 bg-white text-black text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-black/5 whitespace-nowrap mb-2">
                    {lang === "en" ? "Contact Support via WhatsApp" : "通过 WhatsApp 联系支持"}
                </div>
                <svg className="h-8 w-8 text-gray-900 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            </a>
        </footer>
    );
}
