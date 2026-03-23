import React from "react";
import AdminDashboardClient from "./DashboardClient";

export default async function AdminPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string }>;
}) {
    const { lang: langParam } = await searchParams;
    const lang = langParam === "zh" ? "zh" : "en";

    return <AdminDashboardClient lang={lang} />;
}
