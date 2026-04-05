import React from "react";
import { Metadata } from "next";
import TransactionsClient from "./TransactionsClient";

export const metadata: Metadata = {
    title: "Transaction History",
};

export default async function TransactionsPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string }>;
}) {
    const { lang: langParam } = await searchParams;
    const lang = langParam === "zh" ? "zh" : "en";

    return <TransactionsClient lang={lang} />;
}
