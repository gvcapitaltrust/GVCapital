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
        <div className="max-w-7xl mx-auto space-y-8">
            <header className="space-y-3 mb-4">
                <div className="flex items-center gap-3">
                    <div className="h-1 w-8 bg-gv-gold rounded-full"></div>
                    <span className="text-gv-gold text-[10px] font-black uppercase tracking-[0.3em]">Investment Tiers</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-none text-white">
                    {lang === "en" ? "Products & Portfolios" : "理财产品与组合"}
                </h1>
                <p className="text-zinc-500 text-sm max-w-xl">
                    {lang === "en" ? "Explore our specialized fund management tiers, offering fixed dividends and priority capital processing." : "探索我们专业的基金管理等级，享受固定分红和优先资金处理。"}
                </p>
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
