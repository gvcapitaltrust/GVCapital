import React from "react";
import ProductsClient from "./ProductsClient";

export default function ProductsPage({
    searchParams,
}: {
    searchParams: { lang?: string };
}) {
    const lang = searchParams.lang === "zh" ? "zh" : "en";

    return <ProductsClient lang={lang} />;
}
