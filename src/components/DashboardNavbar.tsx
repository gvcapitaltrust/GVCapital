"use client";

import React from "react";
import { useAuth } from "@/providers/AuthProvider";
import NotificationBell from "./NotificationBell";
import TierMedal from "./TierMedal";
import { getTierByAmount } from "@/lib/tierUtils";
import { useSettings } from "@/providers/SettingsProvider";

interface DashboardNavbarProps {
    lang: "en" | "zh";
    onOpenMobileMenu: () => void;
}

export default function DashboardNavbar({ lang, onOpenMobileMenu }: DashboardNavbarProps) {
    const { user, totalAssets, balance, balanceUSD, loading: isCheckingAuth } = useAuth();
    const { forexRate } = useSettings();

    const t = {
        en: {
            nav: "Navigation",
            welcome: "Welcome back!",
            currentTier: "Current Tier",
        },
        zh: {
            nav: "导航",
            welcome: "欢迎回来!",
            currentTier: "当前等级",
        }
    }[lang];

    return (
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 animate-in fade-in slide-in-from-top-5 duration-700">
            <div className="flex items-center gap-4 md:hidden mb-2">
                <button 
                   onClick={onOpenMobileMenu}
                   className="h-10 w-10 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 transition-all shadow-sm backdrop-blur-md"
                >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <img src="/logo2.png" alt="GV Capital" className="h-8 w-auto object-contain " />
            </div>

        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-1">{t.welcome}</p>
                <h1 className="text-2xl sm:text-3xl font-black flex flex-wrap items-center gap-4">
                    <span className="text-slate-900 tracking-tighter">
                        {(user && (user.fullName || user.full_name)) ? (user.fullName || user.full_name) : (isCheckingAuth ? "..." : "Guest")}
                    </span>
                    {Number(user?.total_investment || 0) > 0 && (
                        <div className="flex items-center gap-3 bg-gv-gold/10 border border-gv-gold/20 rounded-2xl px-4 py-1.5 backdrop-blur-xl shadow-[0_0_20px_rgba(212,175,55,0.1)] transition-all cursor-default group/tier-badge hover:border-gv-gold/40">
                            <TierMedal 
                                tierId={(user.tier && user.tier !== "Standard") ? user.tier.toLowerCase() : getTierByAmount(Number(balanceUSD || 0)).id} 
                                size="sm" 
                                className="group-hover/tier-badge:scale-110 drop-shadow-[0_0_5px_rgba(212,175,55,0.5)] transition-transform"
                            />
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-gv-gold group-hover/tier-badge:text-white transition-colors">
                                {(user.tier && user.tier !== "Standard") ? user.tier : getTierByAmount(Number(balanceUSD || 0)).name}
                            </span>
                        </div>
                    )}
                </h1>
            </div>
          </div>
        </div>
            <div className="flex items-center gap-6 hidden sm:flex">
                {user && <NotificationBell userId={user.id} lang={lang} />}
                <div className="flex items-center gap-4 bg-white/70 border border-slate-200 rounded-[24px] p-2 backdrop-blur-2xl shadow-sm relative group/profile-nav overflow-hidden">
                    <div className="absolute inset-0 bg-gv-gold/[0.02] opacity-0 group-hover/profile-nav:opacity-100 transition-opacity"></div>
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gv-gold to-[#B8860B] flex items-center justify-center font-black text-black text-xs border border-gv-gold/40 shadow-[0_10px_20px_rgba(212,175,55,0.25)] overflow-hidden relative z-10 transition-transform group-hover/profile-nav:scale-105">
                        {user?.gender === "Male" ? (
                            <svg className="h-7 w-7 text-black" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                        ) : user?.gender === "Female" ? (
                            <svg className="h-7 w-7 text-black" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                        ) : (
                            <span className="uppercase text-sm">
                                {user ? (user.fullName?.[0] || user.full_name?.[0] || user.email?.[0] || "U") : (
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                )}
                            </span>
                        )}
                    </div>
                    <button 
                        onClick={async () => {
                            const { supabase } = await import("@/lib/supabaseClient");
                            await supabase.auth.signOut();
                            window.location.href = "/login";
                        }}
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20 group relative z-10"
                        title={lang === 'en' ? 'Logout' : '退出登录'}
                    >
                        <svg className="h-5 w-5 group-hover:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" />
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    );
}
