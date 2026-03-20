import React from "react";
import AuditClient from "./AuditClient";

export default function AdminAuditPage({
    searchParams,
}: {
    searchParams: { lang?: string };
}) {
    const lang = searchParams.lang === "zh" ? "zh" : "en";

    return <AuditClient lang={lang} />;
}
