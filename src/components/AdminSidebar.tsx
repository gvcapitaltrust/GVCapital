"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAdmin } from "@/providers/AdminProvider";

interface AdminSidebarProps {
    lang: "en" | "zh";
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    maintenanceMode: boolean;
    onToggleMaintenance: () => void;
    isMobileMenuOpen?: boolean;
    onCloseMobileMenu?: () => void;
}

export default function AdminSidebar({ 
    lang, 
    isCollapsed, 
    onToggleCollapse, 
    maintenanceMode, 
    onToggleMaintenance,
    isMobileMenuOpen = false,
    onCloseMobileMenu = () => {}
}: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { kycQueue, deposits, withdrawals } = useAdmin();

    const pendingKYC = kycQueue?.length || 0;
    const pendingDeposits = deposits?.filter((d: any) => d.status === 'Pending').length || 0;
    const pendingWithdrawals = withdrawals?.filter((w: any) => w.status === 'Pending' || w.status === 'Pending Release').length || 0;

    const getPendingCount = (id: string) => {
        if (id === 'kyc') return pendingKYC;
        if (id === 'deposits') return pendingDeposits;
        if (id === 'withdrawals') return pendingWithdrawals;
        return 0;
    };

    const t = {
        en: {
            adminPortal: "Admin Portal",
            tabs: {
                dashboard: "Dashboard",
                kyc: "KYC",
                deposits: "Deposits",
                withdrawals: "Withdrawals",
                users: "Users",
                portfolio: "Portfolio",
                sales: "Sales",
                forex: "Forex Rate",
                audit: "Audit Logs",
                security: "Account"
            },
            maintenance: "Maintenance"
        },
        zh: {
            adminPortal: "管理后台",
            tabs: {
                dashboard: "主页概览",
                kyc: "KYC",
                deposits: "入金管理",
                withdrawals: "提款管理",
                users: "用户列表",
                portfolio: "资产分配",
                sales: "销售数据",
                forex: "全局汇率",
                audit: "审计日志",
                security: "账户安全"
            },
            maintenance: "维护模式"
        }
    }[lang];

    const menuItems = [
        { id: "dashboard", path: "/admin", label: t.tabs.dashboard, icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
        { id: "deposits", path: "/admin/deposits", label: t.tabs.deposits, icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg> },
        { id: "kyc", path: "/admin/kyc", label: t.tabs.kyc, icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> },
        { id: "withdrawals", path: "/admin/withdrawals", label: t.tabs.withdrawals, icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M8 7l4-4m0 0l4 4m-4-4v18"/></svg> },
        { id: "users", path: "/admin/users", label: t.tabs.users, icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg> },
        { id: "portfolio", path: "/admin/portfolio", label: t.tabs.portfolio, icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg> },
        { id: "sales", path: "/admin/sales", label: t.tabs.sales, icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg> },
        { id: "forex", path: "/admin/forex", label: t.tabs.forex, icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 7v5l3 3"/></svg> },
        { id: "audit", path: "/admin/audit", label: t.tabs.audit, icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg> },
        { id: "security", path: "/admin/security", label: t.tabs.security, icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg> },
    ];

    const bottomNavItems = [
        menuItems.find(i => i.id === "dashboard"),
        menuItems.find(i => i.id === "users"),
        menuItems.find(i => i.id === "deposits"),
        menuItems.find(i => i.id === "withdrawals"),
    ].filter(Boolean) as typeof menuItems;

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push(`/login?lang=${lang}`);
    };

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className={`border-r border-gray-200 flex flex-col justify-between hidden lg:flex bg-[#FAFAF8] transition-all duration-500 ease-in-out relative group/sidebar z-50 overflow-y-auto ${isCollapsed ? "w-[84px] p-4" : "w-64 p-6"}`}>
                <button 
                    onClick={onToggleCollapse}
                    className="absolute -right-3 top-24 z-10 h-6 w-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:bg-gv-gold hover:text-white transition-all shadow-lg opacity-0 group-hover/sidebar:opacity-100"
                >
                    <svg className={`h-3 w-3 transition-transform duration-500 ${isCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M15 19l-7-7 7-7" /></svg>
                </button>

                <div className="space-y-12">
                    <div className="flex items-center justify-center w-full transition-all duration-500">
                        <img src="/logo.png" alt="GV Capital" className={`transition-all duration-500 object-contain ${isCollapsed ? "h-8" : "h-[60px]"}`} />
                    </div>

                    <nav className="space-y-2">
                        {menuItems.map(item => {
                            const isActive = pathname === item.path;
                            return (
                                <Link
                                    key={item.id}
                                    href={`${item.path}?lang=${lang}`}
                                    className={`w-full flex items-center transition-all duration-300 relative group/item ${
                                        isCollapsed ? "justify-center p-3 rounded-xl" : "gap-4 px-4 py-2.5 rounded-2xl"
                                    } ${isActive ? "bg-gv-gold/10 text-gv-gold border border-gv-gold/20" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}
                                    title={isCollapsed ? item.label : ""}
                                >
                                    <div className="flex items-center gap-4 relative">
                                        <div className="relative">
                                            {item.icon}
                                            {isCollapsed && getPendingCount(item.id) > 0 && (
                                                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[7px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#FAFAF8]">
                                                    {getPendingCount(item.id)}
                                                </div>
                                            )}
                                        </div>
                                        {!isCollapsed && (
                                            <span className="text-[10px] font-black uppercase tracking-widest truncate">{item.label}</span>
                                        )}
                                    </div>
                                    {!isCollapsed && getPendingCount(item.id) > 0 && (
                                        <span className="ml-auto bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] h-[16px] flex items-center justify-center animate-in zoom-in duration-300">
                                            {getPendingCount(item.id)}
                                        </span>
                                    )}
                                    {isCollapsed && (
                                        <div className="absolute left-full ml-4 px-3 py-1.5 bg-gv-gold text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/item:opacity-100 transition-all z-[100] shadow-2xl whitespace-nowrap">
                                            {item.label}
                                        </div>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                
                <div className="space-y-4 pt-4 border-t border-gray-200 shrink-0">
                    <div className={`flex items-center px-4 pb-2 transition-all duration-500 ${isCollapsed ? "justify-center" : "justify-between"}`}>
                        <div className="flex items-center gap-4">
                            <svg className="h-5 w-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t.maintenance}</span>}
                        </div>
                        <button onClick={onToggleMaintenance} className={`h-5 rounded-full relative transition-all ${isCollapsed ? "w-8" : "w-10"} ${maintenanceMode ? "bg-red-500" : "bg-gray-200"}`}>
                            <div className={`h-3.5 w-3.5 bg-white rounded-full absolute top-[3px] transition-all shadow-sm ${maintenanceMode ? (isCollapsed ? "right-0.5" : "right-1") : (isCollapsed ? "left-0.5" : "left-1")}`}></div>
                        </button>
                    </div>
                    <button onClick={handleLogout} className={`w-full text-gray-400 hover:text-red-500 transition-colors flex items-center ${isCollapsed ? "justify-center p-3" : "gap-4 px-4 py-2.5"} rounded-2xl hover:bg-red-50`}>
                        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
                        {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest truncate">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile Overlay Sidebar */}
            <div
                className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
                    isMobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                onClick={onCloseMobileMenu}
            />
            <aside
                className={`fixed inset-y-0 left-0 z-[60] w-80 bg-[#FAFAF8] border-r border-gray-200 p-8 flex flex-col justify-between transition-transform duration-500 ease-out lg:hidden overflow-y-auto ${
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="space-y-12">
                    <div className="flex items-center justify-between">
                        <img src="/logo.png" alt="GV Capital" className="h-[40px] w-auto object-contain " />
                        <button
                            onClick={onCloseMobileMenu}
                            className="h-10 w-10 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:text-gray-900 transition-colors"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-4 px-2">Menu</p>
                            <nav className="space-y-1">
                                {menuItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => { router.push(`${item.path}?lang=${lang}`); onCloseMobileMenu(); }}
                                        className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            pathname === item.path ? "bg-gv-gold/10 text-gv-gold border border-gv-gold/20" : "text-gray-400 hover:text-gray-900 hover:bg-white"
                                        }`}
                                    >
                                        {item.icon}
                                        {item.label}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="p-6 bg-white rounded-[32px] border border-gray-200 space-y-4">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 pb-2 border-b border-gray-100">
                            <span>{t.maintenance}</span>
                            <button onClick={onToggleMaintenance} className={`h-5 rounded-full relative transition-all w-10 ${maintenanceMode ? "bg-red-500" : "bg-gray-200"}`}>
                                <div className={`h-3.5 w-3.5 bg-white rounded-full absolute top-[3px] transition-all shadow-sm ${maintenanceMode ? "right-1" : "left-1"}`}></div>
                            </button>
                        </div>
                        <button onClick={handleLogout} className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border border-red-200 active:scale-[0.98]">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
                            Logout
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Navigation Menu */}
            <nav className="fixed bottom-0 left-0 right-0 z-[50] h-20 bg-[#FAFAF8]/90 backdrop-blur-2xl border-t border-gray-200 flex items-center justify-around px-2 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-safe">
                {bottomNavItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            key={item.id}
                            href={`${item.path}?lang=${lang}`}
                            className={`group relative flex flex-col items-center justify-center w-16 h-16 transition-all duration-300 ${
                                isActive ? "scale-110" : "hover:bg-gray-50 rounded-2xl"
                            }`}
                        >
                            {isActive && (
                                <div className="absolute inset-0 bg-gv-gold/10 rounded-2xl border border-gv-gold/20 shadow-inner"></div>
                            )}
                            <span className={`relative z-10 transition-colors duration-300 ${isActive ? "text-gv-gold" : "text-gray-400 group-hover:text-gray-900"}`}>
                                {item.icon}
                            </span>
                            <span className={`absolute -bottom-1 text-[8px] font-black uppercase tracking-widest transition-all duration-300 ${isActive ? "text-gv-gold opacity-100 translate-y-3" : "text-gray-400 opacity-0 translate-y-0"}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
