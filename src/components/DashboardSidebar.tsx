"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useSettings } from "@/providers/SettingsProvider";

interface DashboardSidebarProps {
    lang: "en" | "zh";
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onOpenMobileMenu: () => void;
}

export default function DashboardSidebar({ lang, isCollapsed, onToggleCollapse, onOpenMobileMenu }: DashboardSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();

    const t = {
        en: {
            overview: "Overview",
            transactions: "Transactions",
            products: "Investments",
            referrals: "Referrals",
            statements: "Statements",
            profile: "Profile",
            securityTitle: "Security",
            logout: "Logout",
            nav: "Navigation"
        },
        zh: {
            overview: "总览",
            transactions: "交易记录",
            products: "投资项目",
            referrals: "推荐奖励",
            statements: "账单下载",
            profile: "个人资料",
            securityTitle: "安全设置",
            logout: "退出登录",
            nav: "导航"
        }
    }[lang];

    const menuItems = [
        { id: "overview", path: "/dashboard", label: t.overview, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
        { id: "products", path: "/dashboard/products", label: t.products, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> },
        { id: "transactions", path: "/dashboard/transactions", label: t.transactions, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
        { id: "referrals", path: "/dashboard/referrals", label: t.referrals, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
        { id: "profile", path: "/dashboard/profile", label: t.profile, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
        { id: "security", path: "/dashboard/security", label: t.securityTitle, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> },
    ];

    const handleLogout = async () => {
        const { supabase } = await import("@/lib/supabaseClient");
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 bg-[#0a0a0a] border-r border-white/5 p-6 flex flex-col justify-between transition-all duration-500 ease-in-out hidden md:flex ${isCollapsed ? "w-20" : "w-80"}`}>
                <div className="space-y-12">
                    <div className={`flex items-center gap-4 px-2 transition-all duration-500 ${isCollapsed ? "justify-center" : ""}`}>
                        <div className="h-10 w-10 bg-gv-gold rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                            <span className="text-black font-black text-xl">G</span>
                        </div>
                        {!isCollapsed && <span className="text-white font-black text-2xl tracking-tighter">GV CAPITAL</span>}
                    </div>

                    <nav className="space-y-2">
                        <p className={`text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-6 px-4 transition-opacity duration-300 ${isCollapsed ? "opacity-0 invisible h-0" : "opacity-100"}`}>
                            {t.nav}
                        </p>
                        {menuItems.map((item) => {
                            const isActive = pathname === item.path;
                            return (
                                <Link
                                    key={item.id}
                                    href={`${item.path}?lang=${lang}`}
                                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${isActive ? "bg-gv-gold text-black shadow-lg" : "text-zinc-500 hover:text-white"}`}
                                    title={isCollapsed ? item.label : ""}
                                >
                                    <span className={`shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>{item.icon}</span>
                                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className={`space-y-4 pt-4 border-t border-white/5 transition-all duration-500 ${isCollapsed ? "items-center" : ""}`}>
                    <button 
                        onClick={onToggleCollapse} 
                        className={`w-full text-zinc-600 hover:text-gv-gold transition-colors p-2 flex items-center ${isCollapsed ? "justify-center" : "justify-end"}`}
                    >
                        <svg className={`h-5 w-5 transition-transform duration-500 ${isCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={handleLogout} className={`w-full text-zinc-500 hover:text-red-400 transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-3 px-4 py-2 ${isCollapsed ? "justify-center" : ""}`}>
                        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
                        {!isCollapsed && <span>{t.logout}</span>}
                    </button>
                </div>
            </aside>

            {/* Premium Bottom Navigation (Mobile Only) */}
            <nav className="fixed bottom-0 left-0 right-0 z-[50] h-20 bg-[#0a0a0a]/80 backdrop-blur-2xl border-t border-white/5 flex items-center justify-around px-2 md:hidden">
                {[
                    { id: "overview", path: "/dashboard", label: "Home", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
                    { id: "products", path: "/dashboard/products", label: "Trade", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> },
                    { id: "transactions", path: "/dashboard/transactions", label: "Activity", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
                    { id: "referrals", path: "/dashboard/referrals", label: "Refer", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
                    { id: "profile", path: "/dashboard/profile", label: "Profile", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
                ].map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            key={item.id}
                            href={`${item.path}?lang=${lang}`}
                            className={`group relative flex flex-col items-center justify-center w-16 h-16 transition-all duration-300 ${
                                isActive ? "text-gv-gold" : "text-zinc-500"
                            }`}
                        >
                            {isActive && (
                                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gv-gold shadow-[0_0_15px_rgba(201,168,76,0.8)] rounded-full"></div>
                            )}
                            <span className={`transition-transform duration-300 ${isActive ? "scale-110 -translate-y-1" : "group-hover:scale-110"}`}>
                                {item.icon}
                            </span>
                            <span className={`text-[8px] font-black uppercase tracking-widest mt-1 transition-all duration-300 ${isActive ? "opacity-100" : "opacity-0 h-0 overflow-hidden"}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
                <button
                    onClick={onOpenMobileMenu}
                    className={`flex flex-col items-center justify-center w-16 h-16 text-zinc-500`}
                >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
            </nav>
        </>
    );
}
