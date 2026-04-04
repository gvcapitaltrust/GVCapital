import UserPortfolioClient from "./UserPortfolioClient";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ lang?: "en" | "zh" }>;
}

export default async function UserPortfolioPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const { lang = "en" } = await searchParams;

    return (
        <div className="p-4 md:p-8">
            <UserPortfolioClient lang={lang} />
        </div>
    );
}
