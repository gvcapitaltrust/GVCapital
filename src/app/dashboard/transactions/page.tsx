import React from "react";
import TransactionsClient from "./TransactionsClient";

export default function TransactionsPage({
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
                    <span className="text-gv-gold text-xs font-black uppercase tracking-[0.4em]">Audit & History</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
                    {lang === "en" ? "Transactions" : "交易历史"}
                </h1>
            </header>
            
            <TransactionsClient lang={lang} />
        </div>
    );
}
