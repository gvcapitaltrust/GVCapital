"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { UserProvider } from "@/providers/UserProvider";
import AuthGuard from "@/components/AuthGuard";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardNavbar from "@/components/DashboardNavbar";
import MobileSideMenu from "@/components/MobileSideMenu";
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
                <div className="min-h-screen bg-[#0a0a0a] text-white font-body selection:bg-gv-gold selection:text-black">
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

                    <main className={`flex-1 min-h-screen transition-all duration-500 ease-in-out ${isSidebarCollapsed ? "md:ml-20" : "md:ml-80"}`}>
                        <div className="max-w-[1600px] mx-auto p-4 sm:p-10 space-y-10 pb-32 md:pb-10">
                            <DashboardNavbar 
                                lang={lang} 
                                onOpenMobileMenu={() => setIsMobileMenuOpen(true)} 
                            />
                            
                            <Suspense fallback={<div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>}>
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
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="h-12 w-12 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div>
            </div>
        }>
            <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </Suspense>
    );
}
