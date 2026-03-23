import React from "react";
import SalesClient from "./SalesClient";

export default async function AdminSalesPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string }>;
}) {
    const { lang: langParam } = await searchParams;
    const lang = langParam === "zh" ? "zh" : "en";

    return <SalesClient lang={lang} />;
}
