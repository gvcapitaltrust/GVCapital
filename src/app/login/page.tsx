import type { Metadata } from "next";
import LoginClient from "./LoginClient";
import { Suspense } from "react";

export const metadata: Metadata = {
    title: "Login",
};

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#121212] flex items-center justify-center p-6"><div className="h-12 w-12 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>}>
            <LoginClient />
        </Suspense>
    );
}
