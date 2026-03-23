import React from "react";
import UsersClient from "./UsersClient";

export default async function AdminUsersPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string }>;
}) {
    const { lang: langParam } = await searchParams;
    const lang = langParam === "zh" ? "zh" : "en";

    return <UsersClient lang={lang} />;
}
