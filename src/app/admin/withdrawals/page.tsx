import React from "react";
import WithdrawalsClient from "./WithdrawalsClient";

export default function AdminWithdrawalsPage({
    searchParams,
}: {
    searchParams: { lang?: string };
}) {
    const lang = searchParams.lang === "zh" ? "zh" : "en";

    return <WithdrawalsClient lang={lang} />;
}
