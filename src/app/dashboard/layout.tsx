"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { UserProvider } from "@/providers/UserProvider";
import AuthGuard from "@/components/AuthGuard";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardNavbar from "@/components/DashboardNavbar";
import MobileSideMenu from "@/components/MobileSideMenu";
import PremiumLoader from "@/components/PremiumLoader";
import GlobalFooter from "@/components/GlobalFooter";

// ─── Inner component that safely uses useSearchParams ────────────────────────
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
    const searchParams = useSearchParams();
    const lang = (searchParams.get("lang") as "en" | "zh") || "en";
    
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <AuthGuard>
            <UserProvider>
                <div className="min-h-screen bg-white text-slate-600 font-body selection:bg-gv-gold selection:text-white overflow-x-hidden relative">
                    {/* Institutional Ambient Clarity */}
                    <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gv-gold/[0.05] via-white to-white pointer-events-none"></div>
                    <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-500/[0.02] blur-[150px] pointer-events-none"></div>
                    <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/[0.02] blur-[200px] pointer-events-none"></div>

                    <DashboardSidebar 
                        lang={lang} 
                        isCollapsed={isSidebarCollapsed} 
                        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
                    />

                    <MobileSideMenu 
                        lang={lang} 
                        isOpen={isMobileMenuOpen} 
                        onClose={() => setIsMobileMenuOpen(false)}
                        currentTab=""
                    />

                    <main className={`flex-1 min-h-screen transition-all duration-500 ease-in-out ${isSidebarCollapsed ? "md:ml-20" : "md:ml-64"}`}>
                        <div className="max-w-[1600px] mx-auto p-4 sm:p-10 space-y-10 pb-32 md:pb-10">
                            <DashboardNavbar 
                                lang={lang} 
                                onOpenMobileMenu={() => setIsMobileMenuOpen(true)} 
                            />
                            
                            <Suspense fallback={<div className="flex items-center justify-center p-20"><PremiumLoader /></div>}>
                                {children}
                            </Suspense>
                        </div>
                        <GlobalFooter />
                    </main>
                </div>
            </UserProvider>
        </AuthGuard>
    );
}

// ─── Default export wraps inner in Suspense ──────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#080809] flex items-center justify-center">
                <PremiumLoader />
            </div>
        }>
            <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </Suspense>
    );
}
