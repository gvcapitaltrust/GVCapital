"use client";

import React from "react";
import { useAdmin } from "@/providers/AdminProvider";
import { useSettings } from "@/providers/SettingsProvider";
import Link from "next/link";

export default function AdminDashboardClient({ lang }: { lang: "en" | "zh" }) {
    const { users, deposits, withdrawals, loading } = useAdmin();
    const { forexRate } = useSettings();

    const t = {
        en: {
            title: "Executive Overview",
            subtitle: "Global platform liquidity, compliance status, and operational throughput.",
            cardTotal: "Total Managed Capital",
            cardDeposits: "Pending Deposits",
            cardKyc: "KYC Queue",
            cardWithdrawals: "Withdrawal Requests",
            actionRequired: "Action Required",
            viewAll: "View All",
            statsTitle: "Platform Distribution",
            activeInvestors: "Active Investors",
            verifiedRatio: "Verification Rate"
        },
        zh: {
            title: "执行概览",
            subtitle: "全球平台流动性、合规状态和运营吞吐量。",
            cardTotal: "总管理资本",
            cardDeposits: "待处理存款",
            cardKyc: "KYC 队列",
            cardWithdrawals: "提款请求",
            actionRequired: "需要处理",
            viewAll: "查看全部",
            statsTitle: "平台分布",
            activeInvestors: "活跃投资者",
            verifiedRatio: "验证率"
        }
    }[lang];

    const totalCapital = users.reduce((sum, u) => sum + (Number(u.balance) || 0), 0);
    const pendingDeposits = deposits.filter(d => d.status === 'Pending').length;
    const pendingWithdrawals = withdrawals.filter(w => w.status === 'Pending').length;
    const pendingKyc = users.filter(u => u.kyc_status === 'Pending').length;
    const verifiedUsers = users.filter(u => u.kyc_status === 'Verified').length;

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter text-white">{t.title}</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#1a1a1a]/40 border border-white/5 rounded-[40px] p-8 space-y-4 backdrop-blur-md shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t.cardTotal}</div>
                    <div className="text-4xl font-black text-white tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">RM {totalCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <div className="text-[10px] text-gv-gold/60 font-bold uppercase tracking-[0.2em]">≈ ${(totalCapital / forexRate).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
                </div>

                <Link href="/admin/deposits" className="bg-[#1a1a1a]/40 border border-white/5 rounded-[40px] p-8 space-y-4 backdrop-blur-md shadow-2xl relative overflow-hidden group transition-all hover:bg-white/[0.02] hover:-translate-y-1">
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t.cardDeposits}</div>
                    <div className={`text-5xl font-black tracking-tighter tabular-nums ${pendingDeposits > 0 ? "text-gv-gold" : "text-white/20"}`}>{pendingDeposits}</div>
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{t.actionRequired}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-gv-gold group-hover:translate-x-1 transition-transform">{t.viewAll} →</span>
                    </div>
                </Link>

                <Link href="/admin/kyc" className="bg-[#1a1a1a]/40 border border-white/5 rounded-[40px] p-8 space-y-4 backdrop-blur-md shadow-2xl relative overflow-hidden group transition-all hover:bg-white/[0.02] hover:-translate-y-1">
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t.cardKyc}</div>
                    <div className={`text-5xl font-black tracking-tighter tabular-nums ${pendingKyc > 0 ? "text-gv-gold" : "text-white/20"}`}>{pendingKyc}</div>
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{t.actionRequired}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-gv-gold group-hover:translate-x-1 transition-transform">{t.viewAll} →</span>
                    </div>
                </Link>

                <Link href="/admin/withdrawals" className="bg-[#1a1a1a]/40 border border-white/5 rounded-[40px] p-8 space-y-4 backdrop-blur-md shadow-2xl relative overflow-hidden group transition-all hover:bg-white/[0.02] hover:-translate-y-1">
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t.cardWithdrawals}</div>
                    <div className={`text-5xl font-black tracking-tighter tabular-nums ${pendingWithdrawals > 0 ? "text-red-500" : "text-white/20"}`}>{pendingWithdrawals}</div>
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{t.actionRequired}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-red-500 group-hover:translate-x-1 transition-transform">{t.viewAll} →</span>
                    </div>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-[#1a1a1a]/20 border border-white/[0.03] rounded-[40px] p-10 space-y-10">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-white">{t.statsTitle}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">{t.activeInvestors}</p>
                            <p className="text-3xl font-black text-white">{users.length}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">{t.verifiedRatio}</p>
                            <p className="text-3xl font-black text-emerald-500">{((verifiedUsers / users.length) * 100).toFixed(0)}%</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gv-gold/5 border border-gv-gold/10 rounded-[40px] p-10 space-y-6 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 h-32 w-32 bg-gv-gold/10 rounded-full blur-3xl"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gv-gold">Quick Protocol</h3>
                    <p className="text-zinc-400 text-xs font-medium leading-relaxed uppercase tracking-tight">Ensure all KYC documents are strictly verified against global compliance standards before capital allocation.</p>
                    <div className="flex items-center gap-3">
                        <div className="h-1 w-1 rounded-full bg-gv-gold"></div>
                        <div className="h-1 w-1 rounded-full bg-gv-gold/40"></div>
                        <div className="h-1 w-1 rounded-full bg-gv-gold/20"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
