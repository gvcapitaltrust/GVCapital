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
        <div className="max-w-7xl mx-auto space-y-12">
            <header className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="h-1 w-12 bg-gv-gold rounded-full"></div>
                    <span className="text-gv-gold text-xs font-black uppercase tracking-[0.4em]">Investment Tiers</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
                    {lang === "en" ? "Products" : "理财产品"}
                </h1>
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
