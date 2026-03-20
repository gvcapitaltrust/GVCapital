import React from "react";
import SecurityClient from "./SecurityClient";

export default function AdminSecurityPage({
    searchParams,
}: {
    searchParams: { lang?: string };
}) {
    const lang = searchParams.lang === "zh" ? "zh" : "en";

    return <SecurityClient lang={lang} />;
}
