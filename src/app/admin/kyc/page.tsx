import React from "react";
import KycClient from "./KycClient";

export default async function AdminKycPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string }>;
}) {
    const { lang: langParam } = await searchParams;
    const lang = langParam === "zh" ? "zh" : "en";

    return <KycClient lang={lang} />;
}
