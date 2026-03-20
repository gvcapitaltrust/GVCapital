"use client";

import React, { useState, useEffect } from "react";
import AuthGuard from "@/components/AuthGuard";
import { AdminProvider } from "@/providers/AdminProvider";
import AdminSidebar from "@/components/AdminSidebar";
import { supabase } from "@/lib/supabaseClient";
import { useSearchParams } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const searchParams = useSearchParams();
    const lang = searchParams.get("lang") === "zh" ? "zh" : "en";
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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
                <div className="min-h-screen bg-[#121212] text-white flex font-sans overflow-hidden">
                    <AdminSidebar 
                        lang={lang} 
                        isCollapsed={isSidebarCollapsed} 
                        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        maintenanceMode={maintenanceMode}
                        onToggleMaintenance={toggleMaintenance}
                    />
                    
                    <main className="flex-1 flex flex-col h-screen overflow-hidden ring-1 ring-white/5 shadow-2xl">
                        {/* Header/Navbar */}
                        <header className="h-16 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-md flex items-center justify-between px-8 shrink-0 relative z-20">
                            <div className="flex items-center gap-4">
                                <div className="h-2 w-2 rounded-full bg-gv-gold animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.5)]"></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">GV Management Node</span>
                            </div>
                            
                            <div className="flex items-center gap-6">
                                <div className="hidden md:flex flex-col text-right">
                                    <span className="text-[10px] font-black uppercase text-white tracking-widest leading-none mb-1">Administrative Access</span>
                                    <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">Secure Protocol v3.4</span>
                                </div>
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gv-gold/20 to-zinc-800 border border-white/10 flex items-center justify-center shadow-lg">
                                    <svg className="h-5 w-5 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-1.196-12.301c.71 1.266 1.144 2.709 1.238 4.248m3.296-3.321c.224 1.173.344 2.388.344 3.631 0 1.243-.12 2.458-.344 3.631m-9.761-3.631c0-1.243.12-2.458.344-3.631m7.362-5.464a7.5 7.5 0 11-10.607 10.607 7.5 7.5 0 0110.607-10.607z" /></svg>
                                </div>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
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
