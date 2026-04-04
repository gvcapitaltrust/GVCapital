"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

interface VerificationBlockerProps {
    lang: "en" | "zh";
}

export default function VerificationBlocker({ lang }: VerificationBlockerProps) {
    const router = useRouter();

    const t = {
        en: {
            verificationRequired: "Verification Required",
            verificationDesc: "To ensure the security of your assets and comply with institutional regulations, we require all users to complete identity verification before accessing this feature.",
            verifyNow: "Verify Identity",
            back: "Back to Dashboard",
        },
        zh: {
            verificationRequired: "需要身份验证",
            verificationDesc: "为了确保您的资产安全并遵守机构监管要求，我们要求所有用户在访问此功能前完成身份验证。",
            verifyNow: "立即验证",
            back: "返回仪表板",
        }
    }[lang];

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="h-24 w-24 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 border border-amber-500/20 shadow-[0_0_50px_rgba(245,158,11,0.1)]">
                <ShieldCheck className="h-12 w-12 text-amber-500" strokeWidth={2.5} />
            </div>
            <div className="space-y-4 max-w-md">
                <h2 className="text-3xl font-black uppercase text-gray-900 tracking-tighter">{t.verificationRequired}</h2>
                <p className="text-gray-500 font-medium leading-relaxed">
                    {t.verificationDesc}
                </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                <button 
                    onClick={() => router.push(`/verify?lang=${lang}`)}
                    className="flex-1 bg-black text-white font-black py-5 rounded-2xl uppercase tracking-widest shadow-xl hover:bg-gv-gold hover:text-black transition-all"
                >
                    {t.verifyNow}
                </button>
                <button 
                    onClick={() => router.push(`/dashboard?lang=${lang}`)}
                    className="flex-1 bg-white border border-gray-200 text-gray-400 font-black py-5 rounded-2xl uppercase tracking-widest hover:text-gray-900 transition-all"
                >
                    {t.back}
                </button>
            </div>
        </div>
    );
}
