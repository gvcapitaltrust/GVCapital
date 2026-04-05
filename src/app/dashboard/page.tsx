import React from "react";
import { Metadata } from "next";
import OverviewClient from "./OverviewClient";

export const metadata: Metadata = {
    title: "User Dashboard",
};

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string }>;
}) {
    const { lang: langParam } = await searchParams;
    const lang = langParam === "zh" ? "zh" : "en";

    return (
        <div className="max-w-7xl mx-auto">
            <OverviewClient lang={lang} />
        </div>
    );
}
