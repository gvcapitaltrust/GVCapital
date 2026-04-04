"use client";

import React, { useState } from "react";
import ProductSelection from "@/components/ProductSelection";
import { useUser } from "@/providers/UserProvider";
import { useSettings } from "@/providers/SettingsProvider";
import ComparisonTable from "@/components/ComparisonTable";

export default function ProductsPageContent({ lang }: { lang: "en" | "zh" }) {
    const { userProfile: user } = useUser();
    const { forexRate } = useSettings();
    const [isComparisonOpen, setIsComparisonOpen] = useState(false);


    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <div className="h-0.5 w-6 bg-gv-gold rounded-full"></div>
                        <span className="text-gv-gold text-[9px] font-black uppercase tracking-[0.25em]">Investment Tiers</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none text-gray-900">
                        {lang === "en" ? "Products & Portfolios" : "理财产品与组合"}
                    </h1>
                    <p className="text-gray-400 text-xs max-w-lg mt-2">
                        {lang === "en" ? "Explore our fund management tiers with fixed dividends and priority capital processing." : "探索我们专业的基金管理等级，享受固定分红和优先资金处理。"}
                    </p>
                </div>
                <a href="/deposit" className="inline-flex shrink-0 items-center justify-center bg-gv-gold text-black font-black uppercase tracking-widest text-xs px-8 py-4 rounded-2xl hover:-translate-y-1 transition-all shadow-xl hover:shadow-gv-gold/20">
                    {lang === 'en' ? 'Deposit Now' : '立即存款'}
                </a>
            </header>

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
