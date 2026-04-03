"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { AdminProvider } from "@/providers/AdminProvider";
import AdminSidebar from "@/components/AdminSidebar";
import { supabase } from "@/lib/supabaseClient";

// ─── Inner component that safely uses useSearchParams ────────────────────────
function AdminLayoutInner({ children }: { children: React.ReactNode }) {
    const searchParams = useSearchParams();
    const lang = searchParams.get("lang") === "zh" ? "zh" : "en";
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [maintenanceMode, setMaintenanceMode] = useState(false);

    useEffect(() => {
        const checkMaintenance = async () => {
            const { data } = await supabase.from('platform_settings').select('value').eq('key', 'maintenance_mode').single();
            if (data) setMaintenanceMode(data.value === 'true');
        };
        checkMaintenance();

        const channel = supabase
            .channel('admin-layout-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings' }, () => checkMaintenance())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const toggleMaintenance = async () => {
        const newVal = !maintenanceMode;
        setMaintenanceMode(newVal);
        try {
            await supabase.from('platform_settings').upsert({ key: 'maintenance_mode', value: String(newVal) }, { onConflict: 'key' });
        } catch (err) {
            console.error(err);
            setMaintenanceMode(!newVal);
        }
    };

    return (
        <AuthGuard requireAdmin={true}>
            <AdminProvider>
                <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans overflow-hidden">
                    <AdminSidebar 
                        lang={lang} 
                        isCollapsed={isSidebarCollapsed} 
                        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        maintenanceMode={maintenanceMode}
                        onToggleMaintenance={toggleMaintenance}
                        isMobileMenuOpen={isMobileMenuOpen}
                        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
                    />
                    
                    <main className="flex-1 flex flex-col h-screen overflow-hidden ring-1 ring-slate-200 shadow-sm">
                        {/* Header/Navbar */}
                        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 shrink-0 relative z-20">
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setIsMobileMenuOpen(true)}
                                    className="lg:hidden h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                                </button>
                                <div className="hidden lg:block h-2 w-2 rounded-full bg-gv-gold animate-pulse shadow-[0_0_10px_rgba(184,134,11,0.3)]"></div>
                                <span className="hidden lg:block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">GV Management Node</span>
                                <img src="/logo2.png" alt="GV Capital" className="h-[20px] lg:hidden w-auto object-contain " />
                            </div>
                            
                            <div className="flex items-center gap-6">
                                <div className="hidden md:flex flex-col text-right">
                                    <span className="text-[10px] font-black uppercase text-slate-700 tracking-widest leading-none mb-1">Administrative Access</span>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Secure Protocol v3.4</span>
                                </div>
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gv-gold/20 to-amber-100 border border-gv-gold/20 flex items-center justify-center shadow-lg">
                                    <svg className="h-5 w-5 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-1.196-12.301c.71 1.266 1.144 2.709 1.238 4.248m3.296-3.321c.224 1.173.344 2.388.344 3.631 0 1.243-.12 2.458-.344 3.631m-9.761-3.631c0-1.243.12-2.458.344-3.631m7.362-5.464a7.5 7.5 0 11-10.607 10.607 7.5 7.5 0 0110.607-10.607z" /></svg>
                                </div>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent bg-slate-50/50 lg:pb-0 pb-24">
                            <div className="p-8 lg:p-12 max-w-[1600px] mx-auto min-h-full">
                                {children}
                            </div>
                        </div>
                    </main>
                </div>
            </AdminProvider>
        </AuthGuard>
    );
}

// ─── Default export wraps inner in Suspense ──────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="h-12 w-12 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div>
            </div>
        }>
            <AdminLayoutInner>{children}</AdminLayoutInner>
        </Suspense>
    );
}

