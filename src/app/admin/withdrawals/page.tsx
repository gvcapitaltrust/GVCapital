import React from "react";
import WithdrawalsClient from "./WithdrawalsClient";

export default async function AdminWithdrawalsPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string }>;
}) {
    const { lang: langParam } = await searchParams;
    const lang = langParam === "zh" ? "zh" : "en";

    return <WithdrawalsClient lang={lang} />;
}
