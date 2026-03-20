import React from "react";
import ForexClient from "./ForexClient";

export default function AdminForexPage({
    searchParams,
}: {
    searchParams: { lang?: string };
}) {
    const lang = searchParams.lang === "zh" ? "zh" : "en";

    return <ForexClient lang={lang} />;
}
