import React from "react";
import SalesClient from "./SalesClient";

export default function AdminSalesPage({
    searchParams,
}: {
    searchParams: { lang?: string };
}) {
    const lang = searchParams.lang === "zh" ? "zh" : "en";

    return <SalesClient lang={lang} />;
}
