import React from "react";
import TransactionsClient from "./TransactionsClient";

export default async function TransactionsPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string }>;
}) {
    const { lang: langParam } = await searchParams;
    const lang = langParam === "zh" ? "zh" : "en";

    return (
        <div className="max-w-7xl mx-auto space-y-12">
            <header>
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-gray-900">
                    {lang === "en" ? "Transaction History" : "交易历史"}
                </h1>
            </header>
            
            <TransactionsClient lang={lang} />
        </div>
    );
}
