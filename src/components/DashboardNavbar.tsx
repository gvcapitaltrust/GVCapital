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
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12 animate-in fade-in slide-in-from-top-5 duration-700">
            <div className="flex items-center gap-4 md:hidden mb-4">
                <button 
                   onClick={onOpenMobileMenu}
                   className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-zinc-500"
                >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <img src="/logo.png" alt="GV Capital" className="h-8 w-auto object-contain mix-blend-screen" />
            </div>

            <div>
                <p className="text-zinc-500 text-[10px] sm:text-sm font-black uppercase tracking-[0.3em] mb-2">{t.nav}</p>
                <h1 className="text-3xl sm:text-4xl font-black flex flex-wrap items-center gap-2 sm:gap-4">
                    <span>{t.welcome}</span>
                    <span className="text-gv-gold tracking-tighter truncate max-w-[200px] sm:max-w-none">{user?.fullName || "Member"}</span>
                    {Number(user?.total_investment || 0) > 0 && (
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur-md hover:bg-white/10 transition-all cursor-default group/tier-badge ml-0 sm:ml-2">
                            <TierMedal 
                                tierId={getTierByAmount(Number(user?.total_investment || 0) / forexRate).id} 
                                size="sm" 
                                className="group-hover/tier-badge:scale-110 transition-transform"
                            />
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-gv-gold/80 group-hover/tier-badge:text-gv-gold transition-colors">
                                {getTierByAmount(Number(user?.total_investment || 0) / forexRate).name}
                            </span>
                        </div>
                    )}
                </h1>
            </div>
            <div className="flex items-center gap-6 hidden sm:flex">
                {user && <NotificationBell userId={user.id} lang={lang} />}
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-gv-gold to-[#B8860B] flex items-center justify-center font-black text-black text-xl border border-gv-gold/30 shadow-lg capitalize">
                    {user?.fullName?.[0] || user?.email?.[0] || "U"}
                </div>
            </div>
        </header>
    );
}
