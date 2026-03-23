import React from "react";
import ProductsClient from "./ProductsClient";

export default async function ProductsPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string }>;
}) {
    const { lang: langParam } = await searchParams;
    const lang = langParam === "zh" ? "zh" : "en";

    return <ProductsClient lang={lang} />;
}
