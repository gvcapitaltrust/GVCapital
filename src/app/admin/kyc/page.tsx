import React from "react";
import { Metadata } from "next";
import KycClient from "./KycClient";

export const metadata: Metadata = {
    title: "Institutional Audit",
};

export default async function AdminKycPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string }>;
}) {
    const { lang: langParam } = await searchParams;
    const lang = langParam === "zh" ? "zh" : "en";

    return <KycClient lang={lang} />;
}
