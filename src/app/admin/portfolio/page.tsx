import PortfolioClient from "./PortfolioClient";

interface PageProps {
    searchParams: Promise<{ lang?: "en" | "zh" }>;
}

export default async function PortfolioPage({ searchParams }: PageProps) {
    const { lang = "en" } = await searchParams;

    return (
        <div className="p-4 md:p-8">
            <PortfolioClient lang={lang} />
        </div>
    );
}
