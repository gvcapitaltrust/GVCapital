import React from "react";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string }>;
}) {
    const { lang: langParam } = await searchParams;
    const lang = langParam === "zh" ? "zh" : "en";

    return (
        <div className="max-w-7xl mx-auto space-y-12">
            <header className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="h-1 w-12 bg-gv-gold rounded-full"></div>
                    <span className="text-gv-gold text-sm font-semibold tracking-wider">Account Identity</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                    {lang === "en" ? "Profile" : "个人资料"}
                </h1>
            </header>
            
            <ProfileClient lang={lang} />
        </div>
    );
}
