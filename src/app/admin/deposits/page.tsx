import React from "react";
import DepositsClient from "./DepositsClient";

export default async function AdminDepositsPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string }>;
}) {
    const { lang: langParam } = await searchParams;
    const lang = langParam === "zh" ? "zh" : "en";

    return <DepositsClient lang={lang} />;
}
