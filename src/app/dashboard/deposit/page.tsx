import DepositClient from "./DepositClient";

export default function DepositPage({ searchParams }: { searchParams: { lang?: string } }) {
    const lang = (searchParams.lang === "zh" ? "zh" : "en") as "en" | "zh";
    return <DepositClient lang={lang} />;
}
