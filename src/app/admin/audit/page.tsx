import React from "react";
import AuditClient from "./AuditClient";

export default async function AdminAuditPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string }>;
}) {
    const { lang: langParam } = await searchParams;
    const lang = langParam === "zh" ? "zh" : "en";

    return <AuditClient lang={lang} />;
}
