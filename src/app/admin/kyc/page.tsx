import React from "react";
import KycClient from "./KycClient";

export default function AdminKycPage({
    searchParams,
}: {
    searchParams: { lang?: string };
}) {
    const lang = searchParams.lang === "zh" ? "zh" : "en";

    return <KycClient lang={lang} />;
}
