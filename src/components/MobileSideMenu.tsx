"use client";

import React from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { getTierByAmount } from "@/lib/tierUtils";
import { useSettings } from "@/providers/SettingsProvider";

interface MobileSideMenuProps {
    lang: "en" | "zh";
    isOpen: boolean;
    onClose: () => void;
    currentTab: string; // Keep for highlighting or use pathname
}

export default function MobileSideMenu({ lang, isOpen, onClose, currentTab }: MobileSideMenuProps) {
    const { user, totalAssets, balance, balanceUSD, loading: authLoading } = useAuth();
    const { forexRate } = useSettings();
    const router = useRouter();

    // Stricter check to prevent showing dashboard items to stale sessions
    const isReallyLoggedIn = !!(user && user.id && (user.email || user.fullName));

    const t = {
        en: {
            statements: "Statements",
            overview: "Overview",
            products: "Investments",
            activity: "Transaction History",
            referrals: "Referrals",
            profile: "Profile",
            securityTitle: "Security",
            logout: "Logout",
        },
        zh: {
            statements: "账单下载",
            overview: "总览",
            products: "投资项目",
            activity: "交易记录",
            referrals: "推荐奖励",
            profile: "个人资料",
            securityTitle: "安全设置",
            logout: "退出登录",
        }
    }[lang];

    const handleLogout = async () => {
        const { supabase } = await import("@/lib/supabaseClient");
        await supabase.auth.signOut();
        router.push("/login");
    };

    const guestItems = [
        { id: "home", path: "/", label: lang === "en" ? "Home" : "首页", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
        { id: "services", path: "/#services", label: lang === "en" ? "Services" : "服务", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
        { id: "contact", path: "/#contact", label: lang === "en" ? "Contact" : "联系", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
    ];

    const menuItems = isReallyLoggedIn ? [
        { id: "overview", path: "/dashboard", label: t.overview, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
        { id: "products", path: "/dashboard/products", label: t.products, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> },
        { id: "transactions", path: "/dashboard/transactions", label: t.activity, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
        { id: "statements", path: "/dashboard/transactions", label: t.statements, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
        { id: "referrals", path: "/dashboard/referrals", label: t.referrals, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
        { id: "profile", path: "/dashboard/profile", label: t.profile, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
        { id: "security", path: "/dashboard/security", label: t.securityTitle, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> },
    ] : guestItems;

    return (
        <>
            <div
                className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
                    isOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                onClick={onClose}
            />
            <aside
                className={`fixed inset-y-0 left-0 z-[60] w-80 bg-white border-r border-gray-200 p-8 flex flex-col justify-between transition-transform duration-500 ease-out md:hidden ${
                    isOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="space-y-12">
                    <div className="flex items-center justify-between">
                        <img src="/logo2.png" alt="GV Capital" className="h-[40px] w-auto object-contain " />
                        <button
                            onClick={onClose}
                            className="h-10 w-10 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:text-gray-900 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-4 px-2">Settings & Tools</p>
                            <nav className="space-y-1">
                                {menuItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => { router.push(`${item.path}?lang=${lang}`); onClose(); }}
                                        className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                                            currentTab === item.id ? "bg-gv-gold text-black shadow-lg" : "text-gray-400 hover:text-gray-900 hover:bg-white"
                                        }`}
                                    >
                                        {item.icon}
                                        {item.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-4 px-2">Support</p>
                            <button className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 hover:bg-white transition-all">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                Contact Support
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {isReallyLoggedIn ? (
                        <div className="p-6 bg-white rounded-[32px] border border-gray-200 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gv-gold to-[#B8860B] flex items-center justify-center font-black text-black text-lg">
                                    {(user?.fullName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-900 truncate w-32">
                                        {user?.fullName || user?.full_name || user?.email?.split('@')[0] || "User"}
                                    </p>
                                    <p className="text-[9px] font-bold text-gv-gold uppercase tracking-widest">
                                        {(user?.tier && user?.tier !== "Standard") ? user.tier : getTierByAmount(Number(balanceUSD || 0)).name}
                                    </p>
                                </div>
                            </div>
                            <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-gray-900 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-900/20 active:scale-[0.98]">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
                                {t.logout}
                            </button>
                        </div>
                    ) : (
                        <button 
                            disabled={authLoading}
                            onClick={() => { router.push(`/login?lang=${lang}`); onClose(); }}
                            className="w-full bg-gv-gold text-black py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:bg-gv-gold/90 shadow-[0_10px_20px_rgba(212,175,55,0.2)] active:scale-95 disabled:opacity-50"
                        >
                            {authLoading ? "..." : (lang === "en" ? "Client Login" : "客户登录")}
                        </button>
                    )}
                </div>
            </aside>
        </>
    );
}
