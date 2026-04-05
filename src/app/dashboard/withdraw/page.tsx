import { Metadata } from "next";
import WithdrawClient from "./WithdrawClient";

export const metadata: Metadata = {
    title: "Asset Withdrawal",
};

export default function WithdrawPage({ searchParams }: { searchParams: { lang?: string } }) {
    const lang = (searchParams.lang === "zh" ? "zh" : "en") as "en" | "zh";
    return <WithdrawClient lang={lang} />;
}
