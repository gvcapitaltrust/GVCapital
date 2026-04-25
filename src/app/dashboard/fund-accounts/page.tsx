import { Suspense } from "react";
import FundAccountsClient from "./FundAccountsClient";

export default function FundAccountsPage({ searchParams }: { searchParams: any }) {
    const lang = searchParams?.lang === "zh" ? "zh" : "en";
    return (
        <Suspense fallback={<div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>}>
            <FundAccountsClient lang={lang} />
        </Suspense>
    );
}
