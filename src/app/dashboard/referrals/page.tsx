import React from "react";
import { Metadata } from "next";
import ReferralsClient from "./ReferralsClient";

export const metadata: Metadata = {
    title: "Network Referrals",
};

export default async function ReferralsPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string }>;
}) {
    const { lang: langParam } = await searchParams;
    const lang = langParam === "zh" ? "zh" : "en";

    return (
        <div className="max-w-7xl mx-auto space-y-12">
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-gray-900 border-b border-gray-100 pb-6 mb-8">
                {lang === "en" ? "Referrals" : "推荐好友"}
            </h1>
            
            <ReferralsClient lang={lang} />
        </div>
    );
}
