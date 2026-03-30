"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface AdminSidebarProps {
    lang: "en" | "zh";
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    maintenanceMode: boolean;
    onToggleMaintenance: () => void;
}

export default function AdminSidebar({ 
    lang, 
    isCollapsed, 
    onToggleCollapse, 
    maintenanceMode, 
    onToggleMaintenance 
}: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const t = {
        en: {
            adminPortal: "Admin Portal",
            tabs: {
                dashboard: "Dashboard",
                kyc: "KYC",
                deposits: "Deposits",
                withdrawals: "Withdrawals",
                users: "Users",
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
                sales: "销售数据",
                forex: "全局汇率",
                audit: "审计日志",
                security: "账户安全"
            },
            maintenance: "维护模式"
        }
    }[lang];

    const menuItems = [
        { id: "dashboard", path: "/admin", label: t.tabs.dashboard, icon: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
        { id: "deposits", path: "/admin/deposits", label: t.tabs.deposits, icon: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg> },
        { id: "kyc", path: "/admin/kyc", label: t.tabs.kyc, icon: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> },
        { id: "withdrawals", path: "/admin/withdrawals", label: t.tabs.withdrawals, icon: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M8 7l4-4m0 0l4 4m-4-4v18"/></svg> },
        { id: "users", path: "/admin/users", label: t.tabs.users, icon: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg> },
        { id: "sales", path: "/admin/sales", label: t.tabs.sales, icon: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg> },
        { id: "forex", path: "/admin/forex", label: t.tabs.forex, icon: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 7v5l3 3"/></svg> },
        { id: "audit", path: "/admin/audit", label: t.tabs.audit, icon: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg> },
        { id: "security", path: "/admin/security", label: t.tabs.security, icon: <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg> },
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <aside className={`border-r border-gray-200 flex flex-col justify-between hidden lg:flex bg-[#FAFAF8] transition-all duration-500 ease-in-out relative group/sidebar ${isCollapsed ? "w-[84px] p-4" : "w-64 p-6"}`}>
            <button 
                onClick={onToggleCollapse}
                className="absolute -right-3 top-24 z-10 h-6 w-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:bg-gv-gold hover:text-white transition-all shadow-lg opacity-0 group-hover/sidebar:opacity-100"
            >
                <svg className={`h-3 w-3 transition-transform duration-500 ${isCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M15 19l-7-7 7-7" /></svg>
            </button>

            <div className="space-y-12">
                <div className={`flex items-center transition-all duration-500 ${isCollapsed ? "justify-center" : "gap-2"}`}>
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
                                {item.icon}
                                {!isCollapsed && (
                                    <span className="text-[10px] font-black uppercase tracking-widest truncate">{item.label}</span>
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
            
            <div className="space-y-4 pt-4 border-t border-gray-200 overflow-hidden">
                <div className={`flex items-center px-4 pb-2 transition-all duration-500 ${isCollapsed ? "justify-center" : "justify-between"}`}>
                    {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t.maintenance}</span>}
                    <button onClick={onToggleMaintenance} className={`h-5 rounded-full relative transition-all ${isCollapsed ? "w-8" : "w-10"} ${maintenanceMode ? "bg-red-500" : "bg-gray-200"}`}>
                        <div className={`h-3.5 w-3.5 bg-white rounded-full absolute top-[3px] transition-all shadow-sm ${maintenanceMode ? (isCollapsed ? "right-0.5" : "right-1") : (isCollapsed ? "left-0.5" : "left-1")}`}></div>
                    </button>
                </div>
                <button onClick={handleLogout} className={`w-full text-gray-400 hover:text-red-500 transition-colors flex items-center ${isCollapsed ? "justify-center p-3" : "gap-4 px-4 py-2.5"} rounded-2xl hover:bg-red-50`}>
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
                    {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest truncate">Logout</span>}
                </button>
            </div>
        </aside>
    );
}
