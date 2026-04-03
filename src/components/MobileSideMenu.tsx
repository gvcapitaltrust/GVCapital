"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { X, LogOut, Headset } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { getTierByAmount } from "@/lib/tierUtils";

interface MobileSideMenuProps {
    lang: "en" | "zh";
    isOpen: boolean;
    onClose: () => void;
    currentTab: string;
}

export default function MobileSideMenu({ lang, isOpen, onClose }: MobileSideMenuProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isVerified, balanceUSD, loading: authLoading } = useAuth();
    
    const isReallyLoggedIn = !!user;

    const t = {
        en: {
            overview: "Overview",
            transactions: "Transactions",
            products: "Investments",
            referrals: "Referrals",
            deposit: "Deposit",
            withdraw: "Withdraw",
            profile: "Profile",
            securityTitle: "Security",
            logout: "Logout",
            nav: "Navigation",
            support: "Support",
            contact: "Contact Support",
            clientAccess: "Client Access"
        },
        zh: {
            overview: "总览",
            transactions: "交易记录",
            products: "投资项目",
            referrals: "推荐奖励",
            deposit: "存款",
            withdraw: "提款",
            profile: "个人资料",
            securityTitle: "安全设置",
            logout: "退出登录",
            nav: "导航",
            support: "客户支持",
            contact: "联系客服",
            clientAccess: "客户登录"
        }
    }[lang];

    const menuItems = [
        { id: "overview", path: "/dashboard", label: t.overview, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
        { id: "products", path: "/dashboard/products", label: t.products, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> },
        { id: "transactions", path: "/dashboard/transactions", label: t.transactions, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
        { id: "referrals", path: "/dashboard/referrals", label: t.referrals, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
        { id: "deposit", path: "/dashboard/deposit", label: t.deposit, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg> },
        { id: "withdraw", path: "/dashboard/withdraw", label: t.withdraw, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg> },
        { id: "profile", path: "/dashboard/profile", label: t.profile, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>, isRestricted: !isVerified },
        { id: "security", path: "/dashboard/security", label: t.securityTitle, icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> },
    ];

    const handleLogout = async () => {
        const { supabase } = await import("@/lib/supabaseClient");
        await supabase.auth.signOut();
        onClose();
        router.push("/login");
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-500 md:hidden ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                onClick={onClose}
            />

            {/* Side Drawer */}
            <aside
                className={`fixed inset-y-0 left-0 z-[70] w-[85%] max-w-sm premium-glass bg-black/60 p-8 flex flex-col justify-between transition-transform duration-700 ease-in-out md:hidden overflow-y-auto border-r border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div>
                    <div className="flex items-center justify-between mb-12">
                        <img src="/logo2.png" alt="GV Capital" className="h-8 w-auto object-contain" />
                        <button
                            onClick={onClose}
                            className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 text-gray-400 shadow-xl transition-all active:scale-90 hover:text-white"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="space-y-10">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gv-gold/80 mb-6 px-2">{t.nav}</p>
                            <nav className="space-y-3">
                                {menuItems.map((item) => {
                                    const isActive = pathname === item.path;
                                    const isDisabled = item.isRestricted;

                                    if (isDisabled) {
                                        return (
                                            <div
                                                key={item.id}
                                                className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-2xl text-[10px] font-semibold uppercase tracking-[0.2em] opacity-40 cursor-not-allowed text-gray-400 border border-transparent"
                                            >
                                                <div className="flex items-center gap-4">
                                                    {item.icon}
                                                    {item.label}
                                                </div>
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                            </div>
                                        );
                                    }

                                     const isRestricted = (item.id === "deposit" || item.id === "withdraw") && !user?.is_verified;

                                    if (isRestricted) {
                                        return (
                                            <div
                                                key={item.id}
                                                className="w-full flex items-center justify-between gap-5 px-6 py-4.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-gray-500/40 cursor-not-allowed border border-transparent relative group/locked"
                                            >
                                                <div className="flex items-center gap-5">
                                                    <span className={`shrink-0 transition-all duration-500 relative z-10 opacity-30`}>
                                                        {item.icon}
                                                    </span>
                                                    <span className="relative z-10">{item.label}</span>
                                                </div>
                                                <div className="text-gray-600 opacity-40">
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => { router.push(`${item.path}?lang=${lang}`); onClose(); }}
                                            className={`w-full flex items-center gap-5 px-6 py-4.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 relative group overflow-hidden ${
                                                isActive 
                                                    ? "bg-gv-gold/10 text-white border border-gv-gold/30 shadow-[0_10px_30px_rgba(212,175,55,0.15)]" 
                                                    : "text-gray-500 hover:text-white hover:bg-white/5 border border-transparent"
                                            }`}
                                        >
                                            {isActive && (
                                                <>
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gv-gold rounded-r-full shadow-[0_0_15px_rgba(212,175,55,0.5)] z-20"></div>
                                                    <div className="absolute inset-0 bg-gv-gold/5 blur-xl pointer-events-none animate-pulse"></div>
                                                </>
                                            )}
                                            <span className={`shrink-0 transition-all duration-500 relative z-10 ${isActive ? "text-gv-gold scale-125" : "group-hover:text-white group-hover:scale-110"}`}>
                                                {item.icon}
                                            </span>
                                            <span className="relative z-10">{item.label}</span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gray-600 mb-4 px-2">{t.support}</p>
                            <button className="w-full flex items-center gap-5 px-6 py-4.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white hover:bg-white/5 transition-all border border-transparent">
                                <Headset className="h-5 w-5" />
                                {t.contact}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-12">
                    {isReallyLoggedIn ? (
                        <div className="p-6 bg-black/40 backdrop-blur-2xl rounded-[40px] border border-white/5 space-y-6 shadow-2xl relative overflow-hidden group/profile-box">
                             <div className="absolute inset-0 bg-gv-gold/5 blur-[20px] opacity-0 group-hover/profile-box:opacity-100 transition-opacity"></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-gv-gold to-[#B8860B] flex items-center justify-center font-black text-black text-xl border border-gv-gold/40 shadow-[0_10px_20px_rgba(212,175,55,0.2)] overflow-hidden shrink-0 transition-transform group-hover/profile-box:scale-110">
                                     {user?.gender === "Male" ? (
                                        <svg className="h-9 w-9 text-black" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                        </svg>
                                    ) : user?.gender === "Female" ? (
                                        <svg className="h-9 w-9 text-black" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                        </svg>
                                    ) : (
                                        <span className="uppercase text-sm">
                                            {(user?.fullName?.[0] || user?.full_name?.[0] || user?.email?.[0] || "U")}
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-black text-white truncate uppercase tracking-tight group-hover/profile-box:text-gv-gold transition-colors">
                                        {user?.fullName || user?.full_name || user?.email?.split('@')[0] || "User"}
                                    </p>
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] mt-1 opacity-60">
                                        {(user?.tier && user?.tier !== "Standard") ? user.tier : getTierByAmount(Number(balanceUSD || 0)).name}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={handleLogout} 
                                className="w-full bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white py-5 rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 border border-red-500/20 active:scale-[0.98] relative z-10"
                            >
                                <LogOut className="h-5 w-5" />
                                {t.logout}
                            </button>
                        </div>
                    ) : (
                        <button
                            disabled={authLoading}
                            onClick={() => { router.push(`/login?lang=${lang}`); onClose(); }}
                            className="w-full bg-gv-gold text-black py-5 rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-gv-gold/90 shadow-[0_15px_30px_rgba(154,125,46,0.2)] active:scale-95 disabled:opacity-50"
                        >
                            {authLoading ? "..." : t.clientAccess}
                        </button>
                    )}
                </div>
            </aside>
        </>
    );
}
