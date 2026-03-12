import type { Metadata } from "next";
import { Suspense } from "react";
import ProductsClient from "./ProductsClient";

export const metadata: Metadata = {
    title: "Investment Packages",
    description:
        "Explore GV Capital Trust's investment tiers — Basic, Silver, Gold, and Platinum. Use our live calculator to estimate your monthly dividends.",
};

export default function ProductsPage() {
    return (
        <Suspense>
            <ProductsClient />
        </Suspense>
    );
}
