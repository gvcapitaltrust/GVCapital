"use client";

import React, { useState, useMemo } from "react";
import { useUser } from "@/providers/UserProvider";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

type Lang = "en" | "zh";

const tx = {
    en: {
        title: "Fund Performance",
        subtitle: "Monitor your assigned fund accounts — capital, daily & monthly returns.",
        noAccounts: "No Fund Accounts Assigned",
        noAccountsDesc: "You have not been assigned to any fund account yet. Please contact your account manager.",
        allocated: "Your Allocation",
        currentCapital: "Total Capital",
        initialCapital: "Initial Capital",
        platform: "Platform",
        dailyGain: "Latest Daily",
        monthlyGain: "Latest Monthly",
        allTime: "All-Time Return",
        snapshots: "Performance History",
        date: "Date",
        type: "Type",
        openCap: "Opening",
        closeCap: "Closing",
        gainAmt: "Gain/Loss",
        gainPct: "%",
        notes: "Notes",
        daily: "Daily",
        monthly: "Monthly",
        noSnapshots: "No performance data recorded yet.",
        chartTitle: "Gain/Loss History",
        filterAll: "All",
        filterDaily: "Daily",
        filterMonthly: "Monthly",
        since: "Member since",
    },
    zh: {
        title: "基金表现",
        subtitle: "监控您的基金账户 — 资本、每日和每月回报。",
        noAccounts: "暂无分配的基金账户",
        noAccountsDesc: "您尚未被分配到任何基金账户，请联系您的客户经理。",
        allocated: "您的分配额",
        currentCapital: "总资本",
        initialCapital: "初始资本",
        platform: "平台",
        dailyGain: "最新日报",
        monthlyGain: "最新月报",
        allTime: "总体回报",
        snapshots: "业绩历史",
        date: "日期",
        type: "类型",
        openCap: "开盘",
        closeCap: "收盘",
        gainAmt: "盈亏",
        gainPct: "%",
        notes: "备注",
        daily: "日报",
        monthly: "月报",
        noSnapshots: "暂无业绩数据。",
        chartTitle: "盈亏历史",
        filterAll: "全部",
        filterDaily: "日报",
        filterMonthly: "月报",
        since: "加入时间",
    }
};

const USD = (n: number) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const PCT = (n: number) => `${Number(n || 0) >= 0 ? "+" : ""}${Number(n || 0).toFixed(2)}%`;

const GainBadge = ({ value, pct }: { value: number; pct: number }) => (
    <div className={`flex flex-col items-end ${value >= 0 ? "text-emerald-600" : "text-red-500"}`}>
        <span className="text-base font-black tabular-nums leading-none">{PCT(pct)}</span>
        <span className="text-[10px] font-bold tabular-nums opacity-70">{value >= 0 ? "+" : ""}{USD(value)}</span>
    </div>
);

// Custom tooltip for recharts
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const val = payload[0]?.value;
    return (
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-2xl text-left">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
            <p className={`text-sm font-black tabular-nums ${val >= 0 ? "text-emerald-600" : "text-red-500"}`}>{val >= 0 ? "+" : ""}{USD(val)}</p>
        </div>
    );
};

export default function FundAccountsClient({ lang }: { lang: Lang }) {
    const { fundAccounts, loading } = useUser();
    const t = tx[lang];

    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [snapFilter, setSnapFilter] = useState<"all" | "daily" | "monthly">("all");

    const selectedAccount = useMemo(() => {
        if (!selectedAccountId && fundAccounts.length > 0) return fundAccounts[0];
        return fundAccounts.find(fa => fa.id === selectedAccountId) || fundAccounts[0] || null;
    }, [selectedAccountId, fundAccounts]);

    const filteredSnaps = useMemo(() => {
        if (!selectedAccount) return [];
        const snaps = selectedAccount.performance || [];
        if (snapFilter === "all") return snaps;
        return snaps.filter((s: any) => s.snapshot_type === snapFilter);
    }, [selectedAccount, snapFilter]);

    // Chart data — reverse so oldest first
    const chartData = useMemo(() => {
        if (!selectedAccount) return [];
        return [...filteredSnaps]
            .sort((a: any, b: any) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime())
            .map((s: any) => ({
                date: s.snapshot_date,
                gainLoss: Number(s.gain_loss_amount),
                pct: Number(s.gain_loss_percent)
            }));
    }, [filteredSnaps]);

    // Summary stats
    const totalGainLoss = useMemo(() => {
        if (!selectedAccount?.performance) return 0;
        const monthly = selectedAccount.performance.filter((p: any) => p.snapshot_type === "monthly");
        return monthly.reduce((acc: number, p: any) => acc + Number(p.gain_loss_amount), 0);
    }, [selectedAccount]);

    const latestDaily = useMemo(() => selectedAccount?.performance?.find((p: any) => p.snapshot_type === "daily") || null, [selectedAccount]);
    const latestMonthly = useMemo(() => selectedAccount?.performance?.find((p: any) => p.snapshot_type === "monthly") || null, [selectedAccount]);

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{t.title}</h1>
                <p className="text-slate-400 text-sm font-medium">{t.subtitle}</p>
            </div>

            {/* Empty State */}
            {fundAccounts.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-[2.5rem] p-20 flex flex-col items-center gap-6 shadow-sm text-center">
                    <div className="h-24 w-24 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <svg className="h-12 w-12 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div className="space-y-2">
                        <p className="text-slate-700 font-black uppercase tracking-[0.2em] text-sm">{t.noAccounts}</p>
                        <p className="text-slate-400 text-xs font-medium max-w-sm">{t.noAccountsDesc}</p>
                    </div>
                </div>
            )}

            {fundAccounts.length > 0 && (
                <>
                    {/* Account Tabs */}
                    {fundAccounts.length > 1 && (
                        <div className="flex flex-wrap gap-3">
                            {fundAccounts.map(fa => (
                                <button
                                    key={fa.id}
                                    onClick={() => setSelectedAccountId(fa.id)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        selectedAccount?.id === fa.id
                                            ? "bg-gv-gold text-black shadow-lg shadow-gv-gold/20"
                                            : "bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300"
                                    }`}
                                >
                                    <span className={`h-2 w-2 rounded-full ${fa.is_active ? "bg-emerald-400" : "bg-gray-300"}`}></span>
                                    {fa.account_code}
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedAccount && (
                        <div className="space-y-6">
                            {/* Top Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Account Identity */}
                                <div className="col-span-2 bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`h-2.5 w-2.5 rounded-full ${selectedAccount.is_active ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse" : "bg-gray-300"}`}></span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{selectedAccount.account_code}</span>
                                            </div>
                                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">{selectedAccount.account_name}</h2>
                                            {selectedAccount.platform_name && (
                                                <p className="text-[11px] font-bold text-gv-gold mt-1">{selectedAccount.platform_name}</p>
                                            )}
                                        </div>
                                        {/* All-time gain badge */}
                                        <div className="text-right">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">{t.allTime}</p>
                                            <p className={`text-2xl font-black tabular-nums leading-none ${totalGainLoss >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                                {totalGainLoss >= 0 ? "+" : ""}{USD(totalGainLoss)}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-400 italic">{selectedAccount.description}</p>
                                </div>

                                {/* Current Capital */}
                                <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t.currentCapital}</p>
                                    <p className="text-2xl font-black text-slate-900 tabular-nums leading-none">{USD(selectedAccount.current_capital)}</p>
                                    <p className="text-[9px] font-medium text-slate-300">{t.initialCapital}: {USD(selectedAccount.initial_capital)}</p>
                                </div>

                                {/* Your Allocation */}
                                <div className="bg-gradient-to-br from-gv-gold/10 to-amber-50 border border-gv-gold/20 rounded-[2rem] p-6 shadow-sm space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gv-gold/70">{t.allocated}</p>
                                    <p className="text-2xl font-black text-gv-gold tabular-nums leading-none">{USD(selectedAccount.allocated_amount_usd)}</p>
                                    <p className="text-[9px] font-medium text-slate-400">{t.since}: {new Date(selectedAccount.joined_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {/* Daily / Monthly Latest Gain Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className={`rounded-[2rem] border p-6 space-y-3 shadow-sm ${latestDaily && Number(latestDaily.gain_loss_amount) >= 0 ? "bg-emerald-50 border-emerald-100" : latestDaily ? "bg-red-50 border-red-100" : "bg-white border-gray-200"}`}>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t.dailyGain}</p>
                                        {latestDaily && <span className="text-[8px] font-bold text-slate-400 font-mono">{latestDaily.snapshot_date}</span>}
                                    </div>
                                    {latestDaily ? (
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className={`text-3xl font-black tabular-nums leading-none ${Number(latestDaily.gain_loss_amount) >= 0 ? "text-emerald-600" : "text-red-500"}`}>{PCT(latestDaily.gain_loss_percent)}</p>
                                                <p className={`text-sm font-bold tabular-nums mt-1 ${Number(latestDaily.gain_loss_amount) >= 0 ? "text-emerald-500" : "text-red-400"}`}>{Number(latestDaily.gain_loss_amount) >= 0 ? "+" : ""}{USD(latestDaily.gain_loss_amount)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{t.closeCap}</p>
                                                <p className="text-lg font-black text-slate-900 tabular-nums">{USD(latestDaily.closing_capital)}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-slate-300 text-sm font-black">—</p>
                                    )}
                                </div>

                                <div className={`rounded-[2rem] border p-6 space-y-3 shadow-sm ${latestMonthly && Number(latestMonthly.gain_loss_amount) >= 0 ? "bg-emerald-50 border-emerald-100" : latestMonthly ? "bg-red-50 border-red-100" : "bg-white border-gray-200"}`}>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t.monthlyGain}</p>
                                        {latestMonthly && <span className="text-[8px] font-bold text-slate-400 font-mono">{latestMonthly.snapshot_date}</span>}
                                    </div>
                                    {latestMonthly ? (
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className={`text-3xl font-black tabular-nums leading-none ${Number(latestMonthly.gain_loss_amount) >= 0 ? "text-emerald-600" : "text-red-500"}`}>{PCT(latestMonthly.gain_loss_percent)}</p>
                                                <p className={`text-sm font-bold tabular-nums mt-1 ${Number(latestMonthly.gain_loss_amount) >= 0 ? "text-emerald-500" : "text-red-400"}`}>{Number(latestMonthly.gain_loss_amount) >= 0 ? "+" : ""}{USD(latestMonthly.gain_loss_amount)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{t.closeCap}</p>
                                                <p className="text-lg font-black text-slate-900 tabular-nums">{USD(latestMonthly.closing_capital)}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-slate-300 text-sm font-black">—</p>
                                    )}
                                </div>
                            </div>

                            {/* Chart + Table */}
                            <div className="bg-white border border-gray-200 rounded-[2.5rem] p-6 md:p-8 shadow-sm space-y-6">
                                {/* Filter Tabs */}
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.chartTitle}</p>
                                    <div className="flex gap-2">
                                        {(["all", "daily", "monthly"] as const).map(f => (
                                            <button key={f} onClick={() => setSnapFilter(f)} className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${snapFilter === f ? "bg-gv-gold text-black" : "bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-900"}`}>
                                                {f === "all" ? t.filterAll : f === "daily" ? t.filterDaily : t.filterMonthly}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Bar Chart */}
                                {chartData.length > 0 ? (
                                    <div className="h-52">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }} barCategoryGap="35%">
                                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 800, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                                <YAxis tickFormatter={(v) => `$${v >= 1000 ? (v/1000).toFixed(1)+"k" : v}`} tick={{ fontSize: 9, fontWeight: 800, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={55} />
                                                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(212,175,55,0.06)" }} />
                                                <Bar dataKey="gainLoss" radius={[6, 6, 0, 0]}
                                                    fill="#10b981"
                                                    label={false}
                                                    // Dynamic color per bar
                                                    shape={(props: any) => {
                                                        const { x, y, width, height, value } = props;
                                                        const fill = value >= 0 ? "#10b981" : "#ef4444";
                                                        const adjustedY = value < 0 ? y + height : y;
                                                        const adjustedH = Math.abs(height);
                                                        return <rect x={x} y={adjustedY} width={width} height={adjustedH} fill={fill} rx={6} ry={6} />;
                                                    }}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : null}

                                {/* Snapshot Table */}
                                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                                    {filteredSnaps.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">{t.noSnapshots}</p>
                                        </div>
                                    ) : (
                                        <table className="w-full text-left min-w-[600px]">
                                            <thead className="bg-slate-50 border-b border-slate-100">
                                                <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                    <th className="px-4 py-3">{t.date}</th>
                                                    <th className="px-4 py-3">{t.type}</th>
                                                    <th className="px-4 py-3">{t.openCap}</th>
                                                    <th className="px-4 py-3">{t.closeCap}</th>
                                                    <th className="px-4 py-3">{t.gainAmt}</th>
                                                    <th className="px-4 py-3">{t.gainPct}</th>
                                                    <th className="px-4 py-3">{t.notes}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {filteredSnaps.map((snap: any) => (
                                                    <tr key={snap.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-4 py-3 text-xs font-bold text-slate-600 tabular-nums whitespace-nowrap font-mono">{snap.snapshot_date}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${snap.snapshot_type === "daily" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                                                                {snap.snapshot_type === "daily" ? t.daily : t.monthly}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-bold text-slate-500 tabular-nums">{USD(snap.opening_capital)}</td>
                                                        <td className="px-4 py-3 text-xs font-bold text-slate-800 tabular-nums">{USD(snap.closing_capital)}</td>
                                                        <td className={`px-4 py-3 text-xs font-black tabular-nums ${Number(snap.gain_loss_amount) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                            {Number(snap.gain_loss_amount) >= 0 ? "+" : ""}{USD(snap.gain_loss_amount)}
                                                        </td>
                                                        <td className={`px-4 py-3 text-xs font-black tabular-nums ${Number(snap.gain_loss_percent) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                            {PCT(snap.gain_loss_percent)}
                                                        </td>
                                                        <td className="px-4 py-3 text-[10px] text-slate-400 max-w-[140px] truncate italic">{snap.notes || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
