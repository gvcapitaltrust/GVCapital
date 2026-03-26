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
    const { user, loading: isCheckingAuth } = useAuth();
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
                   className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-zinc-500"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <img src="/logo.png" alt="GV Capital" className="h-6 w-auto object-contain mix-blend-screen" />
            </div>

            <div>
                <h1 className="text-lg sm:text-xl font-bold flex flex-wrap items-center gap-2">
                    <span className="text-zinc-300">{t.welcome}</span>
                    <span className="text-gv-gold font-black tracking-tight truncate max-w-[200px] sm:max-w-none">
                        {(user && (user.fullName || user.full_name)) ? (user.fullName || user.full_name) : (isCheckingAuth ? "..." : "Guest")}
                    </span>
                    {Number(user?.total_investment || 0) > 0 && (
                        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 backdrop-blur-md hover:bg-white/10 transition-all cursor-default group/tier-badge">
                            <TierMedal 
                                tierId={getTierByAmount(Number(user?.total_investment || 0) / forexRate).id} 
                                size="sm" 
                                className="group-hover/tier-badge:scale-110 transition-transform"
                            />
                            <span className="text-[9px] font-black uppercase tracking-widest text-gv-gold/80 group-hover/tier-badge:text-gv-gold transition-colors">
                                {getTierByAmount(Number(user?.total_investment || 0) / forexRate).name}
                            </span>
                        </div>
                    )}
                </h1>
            </div>
            <div className="flex items-center gap-4 hidden sm:flex">
                {user && <NotificationBell userId={user.id} lang={lang} />}
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gv-gold to-[#B8860B] flex items-center justify-center font-black text-black text-sm border border-gv-gold/30 shadow-lg capitalize">
                    {user ? (user.fullName?.[0] || user.email?.[0] || "U") : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    )}
                </div>
            </div>
        </header>
    );
}
