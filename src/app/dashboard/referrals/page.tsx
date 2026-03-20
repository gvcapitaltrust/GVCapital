import React from "react";
import ReferralsClient from "./ReferralsClient";

export default function ReferralsPage({
    searchParams,
}: {
    searchParams: { lang?: string };
}) {
    const lang = searchParams.lang === "zh" ? "zh" : "en";

    return (
        <div className="max-w-7xl mx-auto space-y-12">
            <header className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="h-1 w-12 bg-gv-gold rounded-full"></div>
                    <span className="text-gv-gold text-xs font-black uppercase tracking-[0.4em]">Community & Rewards</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
                    {lang === "en" ? "Referrals" : "推荐好友"}
                </h1>
            </header>
            
            <ReferralsClient lang={lang} />
        </div>
    );
}
