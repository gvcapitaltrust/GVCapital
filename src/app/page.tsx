export const dynamic = 'force-dynamic';
import HomeClient from "./HomeClient";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#121212] flex items-center justify-center p-6"><div className="h-12 w-12 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>}>
      <HomeClient />
    </Suspense>
  );
}
