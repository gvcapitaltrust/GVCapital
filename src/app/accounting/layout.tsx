"use client";

import React, { useState, Suspense } from "react";
import AuthGuard from "@/components/AuthGuard";
import { AccountingProvider } from "@/providers/AccountingProvider";
import AccountingSidebar from "@/components/AccountingSidebar";

function AccountingLayoutInner({ children }: { children: React.ReactNode }) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <AuthGuard requireAdmin={true}>
            <AccountingProvider>
                <div className="min-h-screen bg-slate-100 text-slate-900 flex font-sans overflow-hidden">
                    <AccountingSidebar
                        isCollapsed={isSidebarCollapsed}
                        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        isMobileMenuOpen={isMobileMenuOpen}
                        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
                        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
                    />

                    <main className="flex-1 flex flex-col h-screen overflow-hidden ring-1 ring-slate-200 shadow-sm">
                        {/* Header */}
                        <header className="h-14 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 shrink-0 relative z-20">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsMobileMenuOpen(true)}
                                    className="lg:hidden h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                                </button>
                                <div className="hidden lg:flex items-center gap-2.5">
                                    <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.4)]" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Accounting System</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="hidden md:flex flex-col text-right">
                                    <span className="text-[10px] font-black uppercase text-slate-700 tracking-widest leading-none mb-1">Financial Controller</span>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Double-Entry Ledger v1.0</span>
                                </div>
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-100 border border-indigo-500/20 flex items-center justify-center shadow-lg">
                                    <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                </div>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent bg-slate-100 lg:pb-0 pb-24">
                            <div className="p-4 md:p-8 lg:p-10 max-w-[1600px] mx-auto min-h-full">
                                {children}
                            </div>
                        </div>
                    </main>
                </div>
            </AccountingProvider>
        </AuthGuard>
    );
}

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent animate-spin rounded-full" />
            </div>
        }>
            <AccountingLayoutInner>{children}</AccountingLayoutInner>
        </Suspense>
    );
}
