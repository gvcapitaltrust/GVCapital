import React from "react";
import DepositsClient from "./DepositsClient";

export default function AdminDepositsPage({
    searchParams,
}: {
    searchParams: { lang?: string };
}) {
    const lang = searchParams.lang === "zh" ? "zh" : "en";

    return <DepositsClient lang={lang} />;
}
