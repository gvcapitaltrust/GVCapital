import React from "react";
import UsersClient from "./UsersClient";

export default function AdminUsersPage({
    searchParams,
}: {
    searchParams: { lang?: string };
}) {
    const lang = searchParams.lang === "zh" ? "zh" : "en";

    return <UsersClient lang={lang} />;
}
