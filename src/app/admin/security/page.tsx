import React from "react";
import SecurityClient from "./SecurityClient";

export default async function AdminSecurityPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string }>;
}) {
    const { lang: langParam } = await searchParams;
    const lang = langParam === "zh" ? "zh" : "en";

    return <SecurityClient lang={lang} />;
}
