"use client";

import React from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface MobileSideMenuProps {
    lang: "en" | "zh";
    isOpen: boolean;
    onClose: () => void;
    currentTab: string; // Keep for highlighting or use pathname
}

export default function MobileSideMenu({ lang, isOpen, onClose, currentTab }: MobileSideMenuProps) {
    const { user } = useAuth();
    const router = useRouter();

    const t = {
        en: {
            statements: "Statements",
            referrals: "Referrals",
            securityTitle: "Security",
            logout: "Logout",
        },
        zh: {
            statements: "账单下载",
            referrals: "推荐奖励",
            securityTitle: "安全设置",
            logout: "退出登录",
        }
    }[lang];

    const handleLogout = async () => {
        const { supabase } = await import("@/lib/supabaseClient");
        await supabase.auth.signOut();
        router.push("/login");
    };

    const menuItems = [
        { id: "statements", path: "/dashboard/statements", label: t.statements, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
        { id: "referrals", path: "/dashboard/referrals", label: t.referrals, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
        // { id: "security", path: "/dashboard/security", label: t.securityTitle, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> },
    ];

    return (
        <>
            <div
                className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
                    isOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                onClick={onClose}
            />
            <aside
                className={`fixed inset-y-0 left-0 z-[60] w-80 bg-[#0a0a0a] border-r border-white/5 p-8 flex flex-col justify-between transition-transform duration-500 ease-out md:hidden ${
                    isOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="space-y-12">
                    <div className="flex items-center justify-between">
                        <img src="/logo.png" alt="GV Capital" className="h-[40px] w-auto object-contain mix-blend-screen" />
                        <button
                            onClick={onClose}
                            className="h-10 w-10 flex items-center justify-center rounded-full border border-white/10 text-zinc-500 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-4 px-2">Settings & Tools</p>
                            <nav className="space-y-1">
                                {menuItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => { router.push(`${item.path}?lang=${lang}`); onClose(); }}
                                        className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                                            currentTab === item.id ? "bg-gv-gold text-black shadow-lg" : "text-zinc-500 hover:text-white hover:bg-white/5"
                                        }`}
                                    >
                                        {item.icon}
                                        {item.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-4 px-2">Support</p>
                            <button className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/5 transition-all">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                Contact Support
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="p-6 bg-white/5 rounded-[32px] border border-white/5 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gv-gold to-[#B8860B] flex items-center justify-center font-black text-black text-lg">
                                {user?.fullName?.[0] || user?.email?.[0] || "U"}
                            </div>
                            <div>
                                <p className="text-xs font-black text-white truncate w-32">{user?.fullName || "Member"}</p>
                                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{user?.tier || "Standard"}</p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
                            {t.logout}
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
