"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { BookOpen, LayoutDashboard, FileText, Database, BarChart3, Users, Briefcase, LogOut, Calculator, TrendingUp } from "lucide-react";

interface AccountingSidebarProps {
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    isMobileMenuOpen?: boolean;
    onCloseMobileMenu?: () => void;
    onOpenMobileMenu?: () => void;
}

export default function AccountingSidebar({
    isCollapsed,
    onToggleCollapse,
    isMobileMenuOpen = false,
    onCloseMobileMenu = () => {},
    onOpenMobileMenu = () => {},
}: AccountingSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const menuItems = [
        { id: "dashboard", path: "/accounting", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5 shrink-0" /> },
        { id: "journal", path: "/accounting/journal", label: "General Journal", icon: <BookOpen className="h-5 w-5 shrink-0" /> },
        { id: "ledger", path: "/accounting/ledger", label: "General Ledger", icon: <Database className="h-5 w-5 shrink-0" /> },
        { id: "statements", path: "/accounting/statements", label: "Statements", icon: <BarChart3 className="h-5 w-5 shrink-0" /> },
        { id: "investments", path: "/accounting/investments", label: "Investments", icon: <TrendingUp className="h-5 w-5 shrink-0" /> },
        { id: "users", path: "/accounting/users", label: "User Accounts", icon: <Users className="h-5 w-5 shrink-0" /> },
        { id: "funds", path: "/accounting/funds", label: "Fund Accounts", icon: <Briefcase className="h-5 w-5 shrink-0" /> },
    ];

    const bottomNavItems = menuItems.slice(0, 4);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const isActive = (path: string) => {
        if (path === "/accounting") return pathname === "/accounting";
        return pathname.startsWith(path);
    };

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className={`border-r border-slate-200 flex flex-col justify-between hidden lg:flex bg-slate-50 transition-all duration-500 ease-in-out relative group/sidebar z-50 overflow-y-auto ${isCollapsed ? "w-[84px] p-4" : "w-64 p-6"}`}>
                <button
                    onClick={onToggleCollapse}
                    className="absolute -right-3 top-24 z-10 h-6 w-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:bg-indigo-500 hover:text-white transition-all shadow-lg opacity-0 group-hover/sidebar:opacity-100"
                >
                    <svg className={`h-3 w-3 transition-transform duration-500 ${isCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M15 19l-7-7 7-7" /></svg>
                </button>

                <div className="space-y-10">
                    {/* Logo / Title */}
                    <div className={`flex items-center transition-all duration-500 ${isCollapsed ? "justify-center" : "gap-3 px-2"}`}>
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                            <Calculator className="h-5 w-5 text-white" />
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-[11px] font-black uppercase tracking-tight text-slate-900 leading-none">GV Capital</span>
                                <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-indigo-500 leading-none mt-1">Accounting</span>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="space-y-1.5">
                        {menuItems.map(item => {
                            const active = isActive(item.path);
                            return (
                                <Link
                                    key={item.id}
                                    href={item.path}
                                    className={`w-full flex items-center transition-all duration-300 relative group/item ${
                                        isCollapsed ? "justify-center p-3 rounded-xl" : "gap-3.5 px-4 py-2.5 rounded-xl"
                                    } ${active
                                        ? "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
                                        : "text-slate-400 hover:text-slate-900 hover:bg-white"
                                    }`}
                                    title={isCollapsed ? item.label : ""}
                                >
                                    {item.icon}
                                    {!isCollapsed && (
                                        <span className="text-[10px] font-black uppercase tracking-widest truncate">{item.label}</span>
                                    )}
                                    {isCollapsed && (
                                        <div className="absolute left-full ml-4 px-3 py-1.5 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/item:opacity-100 transition-all z-[100] shadow-2xl whitespace-nowrap">
                                            {item.label}
                                        </div>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Footer */}
                <div className="space-y-4 pt-4 border-t border-slate-200 shrink-0">
                    <Link
                        href="/admin"
                        className={`w-full text-slate-400 hover:text-indigo-500 transition-colors flex items-center ${isCollapsed ? "justify-center p-3" : "gap-4 px-4 py-2.5"} rounded-xl hover:bg-indigo-50`}
                    >
                        <FileText className="h-5 w-5 shrink-0" />
                        {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest truncate">Admin Panel</span>}
                    </Link>
                    <button onClick={handleLogout} className={`w-full text-slate-400 hover:text-red-500 transition-colors flex items-center ${isCollapsed ? "justify-center p-3" : "gap-4 px-4 py-2.5"} rounded-xl hover:bg-red-50`}>
                        <LogOut className="h-5 w-5 shrink-0" />
                        {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest truncate">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${isMobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
                onClick={onCloseMobileMenu}
            />
            <aside className={`fixed inset-y-0 left-0 z-[60] w-80 bg-slate-50 border-r border-slate-200 p-8 flex flex-col justify-between transition-transform duration-500 ease-out lg:hidden overflow-y-auto ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="space-y-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Calculator className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black uppercase tracking-tight text-slate-900 leading-none">GV Capital</span>
                                <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-indigo-500 leading-none mt-1">Accounting</span>
                            </div>
                        </div>
                        <button onClick={onCloseMobileMenu} className="h-10 w-10 flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:text-slate-900 transition-colors">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <nav className="space-y-1">
                        {menuItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => { router.push(item.path); onCloseMobileMenu(); }}
                                className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    isActive(item.path)
                                        ? "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
                                        : "text-slate-400 hover:text-slate-900 hover:bg-white"
                                }`}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="space-y-3">
                    <button onClick={handleLogout} className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border border-red-200">
                        <LogOut className="h-5 w-5" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Mobile Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 z-[50] h-20 bg-slate-50/90 backdrop-blur-2xl border-t border-slate-200 flex items-center justify-around px-2 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-safe">
                {bottomNavItems.map(item => {
                    const active = isActive(item.path);
                    return (
                        <Link
                            key={item.id}
                            href={item.path}
                            className={`group relative flex flex-col items-center justify-center w-16 h-16 transition-all duration-300 ${active ? "text-indigo-600" : "text-slate-400"}`}
                        >
                            {active && <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] rounded-full" />}
                            <span className={`transition-transform duration-300 ${active ? "scale-110 -translate-y-1 block" : ""}`}>{item.icon}</span>
                            <span className={`text-[7px] font-black uppercase tracking-widest mt-1 ${active ? "opacity-100" : "opacity-60"}`}>
                                {item.id === "dashboard" ? "HOME" : item.label.split(" ")[0]}
                            </span>
                        </Link>
                    );
                })}
                <button onClick={onOpenMobileMenu} className="flex flex-col items-center justify-center w-16 h-16 text-slate-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                    <span className="text-[7px] font-black uppercase tracking-widest mt-1 opacity-60">MORE</span>
                </button>
            </nav>
        </>
    );
}
