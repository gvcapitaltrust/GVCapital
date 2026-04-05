import React from "react";
import { Metadata } from "next";
import WithdrawalsClient from "./WithdrawalsClient";

export const metadata: Metadata = {
    title: "Withdrawal Management",
};

export default async function AdminWithdrawalsPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string }>;
}) {
    const { lang: langParam } = await searchParams;
    const lang = langParam === "zh" ? "zh" : "en";

    return <WithdrawalsClient lang={lang} />;
}
