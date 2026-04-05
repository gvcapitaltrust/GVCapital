import React from "react";
import { Metadata } from "next";
import DepositsClient from "./DepositsClient";

export const metadata: Metadata = {
    title: "Deposit Management",
};

export default async function AdminDepositsPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string }>;
}) {
    const { lang: langParam } = await searchParams;
    const lang = langParam === "zh" ? "zh" : "en";

    return <DepositsClient lang={lang} />;
}
