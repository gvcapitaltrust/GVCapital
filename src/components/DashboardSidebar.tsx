"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { getTierByAmount } from "@/lib/tierUtils";

interface DashboardSidebarProps {
    lang: "en" | "zh";
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onOpenMobileMenu: () => void;
}

export default function DashboardSidebar({ lang, isCollapsed, onToggleCollapse, onOpenMobileMenu }: DashboardSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isVerified, totalAssets, balance, balanceUSD } = useAuth();
    const { forexRate } = useSettings();

    const t = {
        en: {
            overview: "Overview",
            transactions: "Transactions",
            products: "Investments",
            referrals: "Referrals",
            statements: "Statements",
            deposit: "Deposit",
            withdraw: "Withdraw",
            profile: "Profile",
            securityTitle: "Security",
            logout: "Logout",
            nav: "Navigation",
            verifiedRequired: "Verify your account first"
        },
        zh: {
            overview: "总览",
            transactions: "交易记录",
            products: "投资项目",
            referrals: "推荐奖励",
            statements: "账单下载",
            deposit: "存款",
            withdraw: "提款",
            profile: "个人资料",
            securityTitle: "安全设置",
            logout: "退出登录",
            nav: "导航",
            verifiedRequired: "请先完成身份验证"
        }
    }[lang];

    const menuItems = [
        { id: "overview", path: "/dashboard", label: t.overview, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
        { id: "products", path: "/dashboard/products", label: t.products, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>, isRestricted: !isVerified },
        { id: "deposit", path: "/dashboard/deposit", label: t.deposit, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>, isRestricted: !isVerified },
        { id: "withdraw", path: "/dashboard/withdraw", label: t.withdraw, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>, isRestricted: !isVerified },
        { id: "transactions", path: "/dashboard/transactions", label: t.transactions, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, isRestricted: !isVerified },
        { id: "referrals", path: "/dashboard/referrals", label: t.referrals, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, isRestricted: !isVerified },
        { 
            id: "profile", 
            path: "/dashboard/profile", 
            label: t.profile, 
            icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
            isRestricted: !isVerified
        },
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
            <aside className={`fixed inset-y-0 left-0 z-50 bg-[#FAFAF8] border-r border-gray-200 p-6 flex flex-col justify-between transition-all duration-500 ease-in-out hidden md:flex ${isCollapsed ? "w-20" : "w-64"} overflow-y-auto`}>
                <div className="space-y-12">
                    <div className={`flex items-center gap-4 transition-all duration-500 ${isCollapsed ? "justify-center px-0" : "px-4"}`}>
                        {isCollapsed ? (
                            <img src="/logo.png" alt="GV Capital" className="h-8 w-auto object-contain" />
                        ) : (
                            <img src="/logo.png" alt="GV Capital" className="h-[60px] w-auto object-contain" />
                        )}
                    </div>

                    <nav className="space-y-2">
                        <p className={`text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6 px-4 transition-opacity duration-300 ${isCollapsed ? "opacity-0 invisible h-0" : "opacity-100"}`}>
                            {t.nav}
                        </p>
                        {menuItems.map((item: any) => {
                            const isActive = pathname === item.path;
                            const isDisabled = item.isRestricted;
                            
                            if (isDisabled) {
                                return (
                                    <div
                                        key={item.id}
                                    className={`w-full flex items-center justify-between gap-4 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 opacity-50 cursor-not-allowed text-gray-400`}
                                        title={t.verifiedRequired}
                                    >
                                        <div className="flex items-center gap-4 relative">
                                            <span className={`shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
                                                {item.icon}
                                                {isCollapsed && (
                                                    <div className="absolute -top-1 -right-1 bg-[#FAFAF8] rounded-full p-0.5">
                                                        <svg className="h-2 w-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                    </div>
                                                )}
                                            </span>
                                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                                        </div>
                                        {!isCollapsed && (
                                            <svg className="h-3 w-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        )}
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={item.id}
                                    href={`${item.path}?lang=${lang}`}
                                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${isActive ? "bg-gv-gold/10 text-gv-gold border border-gv-gold/20" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}
                                    title={isCollapsed ? item.label : ""}
                                >
                                    <span className={`shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>{item.icon}</span>
                                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="space-y-4">
                    {user && !isCollapsed && (
                        <div className="mx-2 p-4 bg-white rounded-2xl border border-gray-200 animate-in fade-in duration-500">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gv-gold to-[#B8860B] flex items-center justify-center font-black text-white text-sm shrink-0 border border-gv-gold/30 shadow-lg overflow-hidden">
                                    {user?.gender === "Male" ? (
                                        <svg className="h-8 w-8 text-black" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                        </svg>
                                    ) : user?.gender === "Female" ? (
                                        <svg className="h-8 w-8 text-black" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                        </svg>
                                    ) : (
                                        <span className="uppercase">
                                            {(user.full_name?.[0] || user.fullName?.[0] || user.email?.[0] || "U")}
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[9px] font-black text-gray-900 uppercase tracking-tight truncate">
                                        {user.full_name || user.fullName || user.email?.split('@')[0] || "User"}
                                    </p>
                                    <p className="text-[8px] font-bold text-gv-gold uppercase tracking-[0.2em] mt-0.5 whitespace-nowrap">
                                        {getTierByAmount(Number(balanceUSD || 0)).name}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <button 
                            onClick={onToggleCollapse} 
                            className={`w-full text-gray-400 hover:text-gv-gold transition-colors p-2 flex items-center ${isCollapsed ? "justify-center" : "justify-end"}`}
                        >
                            <svg className={`h-5 w-5 transition-transform duration-500 ${isCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                        </button>
                        <button onClick={handleLogout} className={`w-full text-gray-400 hover:text-red-500 transition-colors text-[9px] font-black uppercase tracking-widest flex items-center gap-3 px-4 py-3 rounded-2xl ${isCollapsed ? "justify-center" : "hover:bg-red-50"}`}>
                            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
                            {!isCollapsed && <span>{t.logout}</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Premium Bottom Navigation (Mobile Only) */}
            <nav className="fixed bottom-0 left-0 right-0 z-[50] h-20 bg-[#FAFAF8]/90 backdrop-blur-2xl border-t border-gray-200 flex items-center justify-around px-2 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                {[
                    { id: "overview", path: "/dashboard", label: "HOME", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
                    { id: "products", path: "/dashboard/products", label: "PRODUCT", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>, isRestricted: !isVerified },
                    { id: "deposit", path: "/dashboard/deposit", label: "DEPOSIT", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>, isRestricted: !isVerified },
                    { id: "withdraw", path: "/dashboard/withdraw", label: "WITHDRAW", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>, isRestricted: !isVerified },
                    { id: "transactions", path: "/dashboard/transactions", label: "HISTORY", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, isRestricted: !isVerified },
                ].map((item: any) => {
                    const isActive = pathname === item.path;
                    const isDisabled = item.isRestricted;

                    if (isDisabled) {
                        return (
                            <div
                                key={item.id}
                                className={`group relative flex flex-col items-center justify-center w-16 h-16 opacity-50 cursor-not-allowed`}
                                title={t.verifiedRequired}
                            >
                                <div className="relative">
                                    <span className="text-gray-400">
                                        {item.icon}
                                    </span>
                                    <div className="absolute -top-1.5 -right-1.5 bg-[#FAFAF8] rounded-full p-0.5 border border-gray-100">
                                        <svg className="h-2.5 w-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-widest mt-1 text-gray-400`}>
                                    {item.label}
                                </span>
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={item.id}
                            href={`${item.path}?lang=${lang}`}
                            className={`group relative flex flex-col items-center justify-center w-16 h-16 transition-all duration-300 ${
                                isActive ? "text-gv-gold" : "text-gray-400"
                            }`}
                        >
                            {isActive && (
                                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gv-gold shadow-[0_0_15px_rgba(184,134,11,0.5)] rounded-full"></div>
                            )}
                            <span className={`transition-transform duration-300 ${isActive ? "scale-110 -translate-y-1" : "group-hover:scale-110"}`}>
                                {item.icon}
                            </span>
                            <span className={`text-[8px] font-black uppercase tracking-widest mt-1 transition-all duration-300 ${isActive ? "opacity-100" : "opacity-60"}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
                <button
                    onClick={onOpenMobileMenu}
                    className={`flex flex-col items-center justify-center w-16 h-16 text-gray-400`}
                >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                    <span className="text-[8px] font-black uppercase tracking-widest mt-1 opacity-60">MENU</span>
                </button>
            </nav>
        </>
    );
}
