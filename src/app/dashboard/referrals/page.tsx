import React from "react";
import ReferralsClient from "./ReferralsClient";

export default async function ReferralsPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string }>;
}) {
    const { lang: langParam } = await searchParams;
    const lang = langParam === "zh" ? "zh" : "en";

    return (
        <div className="max-w-7xl mx-auto space-y-12">
            <header className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="h-1 w-12 bg-gv-gold rounded-full"></div>
                    <span className="text-gv-gold text-sm font-semibold tracking-wider">Community & Rewards</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-gray-900">
                    {lang === "en" ? "Referrals" : "推荐好友"}
                </h1>
            </header>
            
            <ReferralsClient lang={lang} />
        </div>
    );
}
