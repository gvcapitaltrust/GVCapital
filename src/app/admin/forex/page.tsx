import React from "react";
import ForexClient from "./ForexClient";

export default async function AdminForexPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string }>;
}) {
    const { lang: langParam } = await searchParams;
    const lang = langParam === "zh" ? "zh" : "en";

    return <ForexClient lang={lang} />;
}
