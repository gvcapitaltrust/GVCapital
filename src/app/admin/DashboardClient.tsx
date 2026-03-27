"use client";

import React from "react";
import { useAdmin } from "@/providers/AdminProvider";
import { useSettings } from "@/providers/SettingsProvider";
import Link from "next/link";

export default function AdminDashboardClient({ lang }: { lang: "en" | "zh" }) {
    const { platformStats, users, kycQueue, deposits, withdrawals, loading, forexRate } = useAdmin();
    const { totalAssets, totalBalance, totalProfit, userCount, verifiedCount } = platformStats;

    const t = {
        en: {
            title: "Executive Overview",
            subtitle: "Global platform liquidity, compliance status, and operational throughput.",
            cardTotal: "Total Platform Assets",
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
            cardTotal: "总管理资产 (包含红利)",
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

    const pendingDeposits = deposits.filter(d => d.status === 'Pending').length;
    const pendingWithdrawals = withdrawals.filter(w => w.status === 'Pending').length;
    const pendingKyc = kycQueue.length;

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            <div>
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-gray-900">{t.title}</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border border-gray-200 rounded-[40px] p-8 space-y-4 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t.cardTotal}</div>
                    <div className="text-2xl font-black text-gray-900 tracking-tight tabular-nums">$ {(totalAssets / forexRate).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">≈ RM {totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>

                <Link href="/admin/deposits" className="bg-white border border-gray-200 rounded-[40px] p-8 space-y-4 shadow-sm relative overflow-hidden group transition-all hover:shadow-md hover:-translate-y-1">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t.cardDeposits}</div>
                    <div className={`text-3xl font-black tracking-tight tabular-nums ${pendingDeposits > 0 ? "text-gv-gold" : "text-gray-200"}`}>{pendingDeposits}</div>
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{t.actionRequired}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-gv-gold group-hover:translate-x-1 transition-transform">{t.viewAll} →</span>
                    </div>
                </Link>

                <Link href="/admin/kyc" className="bg-white border border-gray-200 rounded-[40px] p-8 space-y-4 shadow-sm relative overflow-hidden group transition-all hover:shadow-md hover:-translate-y-1">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t.cardKyc}</div>
                    <div className={`text-3xl font-black tracking-tight tabular-nums ${pendingKyc > 0 ? "text-gv-gold" : "text-gray-200"}`}>{pendingKyc}</div>
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{t.actionRequired}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-gv-gold group-hover:translate-x-1 transition-transform">{t.viewAll} →</span>
                    </div>
                </Link>

                <Link href="/admin/withdrawals" className="bg-white border border-gray-200 rounded-[40px] p-8 space-y-4 shadow-sm relative overflow-hidden group transition-all hover:shadow-md hover:-translate-y-1">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t.cardWithdrawals}</div>
                    <div className={`text-3xl font-black tracking-tight tabular-nums ${pendingWithdrawals > 0 ? "text-red-500" : "text-gray-200"}`}>{pendingWithdrawals}</div>
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{t.actionRequired}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-red-500 group-hover:translate-x-1 transition-transform">{t.viewAll} →</span>
                    </div>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-[40px] p-10 space-y-10 shadow-sm">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-gray-900">{t.statsTitle}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{t.activeInvestors}</p>
                            <p className="text-2xl font-black text-gray-900">{userCount}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{t.verifiedRatio}</p>
                            <p className="text-2xl font-black text-emerald-600">{userCount > 0 ? ((verifiedCount / userCount) * 100).toFixed(0) : 0}%</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gv-gold/5 border border-gv-gold/15 rounded-[40px] p-10 space-y-6 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 h-32 w-32 bg-gv-gold/10 rounded-full blur-3xl"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gv-gold">Quick Protocol</h3>
                    <p className="text-gray-500 text-xs font-medium leading-relaxed uppercase tracking-tight">Ensure all KYC documents are strictly verified against global compliance standards before capital allocation.</p>
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
