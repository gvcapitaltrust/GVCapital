"use client";

import React, { useState } from "react";
import ProductSelection from "@/components/ProductSelection";
import { useRouter } from "next/navigation";
import { useUser } from "@/providers/UserProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { ArrowLeft } from "lucide-react";
import ComparisonTable from "@/components/ComparisonTable";

export default function ProductsPageContent({ lang }: { lang: "en" | "zh" }) {
    const router = useRouter();
    const { userProfile: user } = useUser();
    const { forexRate } = useSettings();
    const [isComparisonOpen, setIsComparisonOpen] = useState(false);


    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-6 mb-4">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => router.push(`/dashboard?lang=${lang}`)}
                        className="h-12 w-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gv-gold transition-all shadow-sm hover:shadow-md"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">
                            {lang === "en" ? "Capital Strategies" : "资管策略中心"}
                        </h1>
                        <p className="text-gray-400 text-sm font-medium">
                            {lang === "en" ? "Institutional fund management tiers." : "专业机构级基金管理等级。"}
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => router.push(`/dashboard/deposit?lang=${lang}`)}
                    className="hidden md:inline-flex shrink-0 items-center justify-center bg-gv-gold text-black font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl hover:-translate-y-1 transition-all shadow-xl hover:shadow-gv-gold/20"
                >
                    {lang === 'en' ? 'Deposit Now' : '立即存款'}
                </button>
            </div>

            <ProductSelection
                currentInvestment={Number(user?.total_investment || 0) / (forexRate || 4.0)}
                lang={lang}
                onOpenComparison={() => setIsComparisonOpen(true)}
                forexRate={forexRate}
            />

            {isComparisonOpen && (
                <ComparisonTable lang={lang} onClose={() => setIsComparisonOpen(false)} />
            )}
        </div>
    );
}
