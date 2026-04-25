"use client";

import React, { useState, useMemo } from "react";
import { useUser } from "@/providers/UserProvider";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

type Lang = "en" | "zh";

const tx = {
    en: {
        title: "Fund Performance",
        subtitle: "Institutional-grade monitoring of your assigned fund accounts.",
        noAccounts: "No Fund Accounts Assigned",
        noAccountsDesc: "You have not been assigned to any fund account yet. Please contact your account manager.",
        lastUpdated: "Last updated",
        neverUpdated: "No data yet",
        yourAllocation: "Your Allocation",
        totalFundCapital: "Total Fund Capital",
        initialCapital: "Initial Capital",
        since: "Member since",
        dailyReturn: "Latest Daily Return",
        monthlyReturn: "Latest Monthly Return",
        yourDailyGain: "Your Daily Gain",
        yourMonthlyGain: "Your Monthly Gain",
        allTimeReturn: "All-Time Return",
        annualizedReturn: "Annualised Return",
        winRate: "Win Rate",
        maxDrawdown: "Max Drawdown",
        bestPeriod: "Best Period",
        worstPeriod: "Worst Period",
        totalPeriods: "Total Periods",
        yourShare: "Your Share of Fund",
        yourTotalGain: "Your Total Gain",
        performanceHistory: "Performance History",
        navChart: "Capital (NAV)",
        returnChart: "Return (%)",
        filterAll: "All",
        filterDaily: "Daily",
        filterMonthly: "Monthly",
        date: "Date",
        type: "Type",
        opening: "Opening",
        closing: "Closing",
        gainAmt: "Gain/Loss",
        gainPct: "%",
        notes: "Notes",
        daily: "Daily",
        monthly: "Monthly",
        noSnapshots: "No performance data recorded yet.",
        positive: "Gain",
        negative: "Loss",
        chartModeReturn: "Return %",
        chartModeNAV: "NAV Chart",
    },
    zh: {
        title: "基金表现",
        subtitle: "您基金账户的专业级监控。",
        noAccounts: "暂无分配的基金账户",
        noAccountsDesc: "您尚未被分配到任何基金账户，请联系您的客户经理。",
        lastUpdated: "最后更新",
        neverUpdated: "暂无数据",
        yourAllocation: "您的分配额",
        totalFundCapital: "基金总资本",
        initialCapital: "初始资本",
        since: "加入时间",
        dailyReturn: "最新日收益",
        monthlyReturn: "最新月收益",
        yourDailyGain: "您的日收益",
        yourMonthlyGain: "您的月收益",
        allTimeReturn: "总体回报",
        annualizedReturn: "年化收益率",
        winRate: "胜率",
        maxDrawdown: "最大回撤",
        bestPeriod: "最佳区间",
        worstPeriod: "最差区间",
        totalPeriods: "总期数",
        yourShare: "您在基金中的份额",
        yourTotalGain: "您的总收益",
        performanceHistory: "业绩历史",
        navChart: "资本 (净值)",
        returnChart: "收益率 (%)",
        filterAll: "全部",
        filterDaily: "日报",
        filterMonthly: "月报",
        date: "日期",
        type: "类型",
        opening: "开盘",
        closing: "收盘",
        gainAmt: "盈亏",
        gainPct: "%",
        notes: "备注",
        daily: "日报",
        monthly: "月报",
        noSnapshots: "暂无业绩数据。",
        positive: "盈",
        negative: "亏",
        chartModeReturn: "收益率%",
        chartModeNAV: "净值图",
    }
};

const USD = (n: number) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const PCT = (n: number) => `${Number(n || 0) >= 0 ? "+" : ""}${Number(n || 0).toFixed(2)}%`;
const PCT_ABS = (n: number) => `${Number(n || 0).toFixed(2)}%`;

// ── Institutional Metric Calculations ────────────────────────────────────────
function calcMetrics(performance: any[]) {
    const snaps = [...performance].sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime());
    const monthly = snaps.filter(p => p.snapshot_type === "monthly");
    const all = snaps;

    if (all.length === 0) return null;

    // All-time return (compound: from first opening to last closing)
    const firstSnap = all[0];
    const lastSnap = all[all.length - 1];
    const allTimeReturnAmt = lastSnap.closing_capital - firstSnap.opening_capital;
    const allTimeReturnPct = firstSnap.opening_capital > 0 ? (allTimeReturnAmt / firstSnap.opening_capital) * 100 : 0;

    // Annualised return (based on number of months of data)
    const monthCount = monthly.length;
    const years = monthCount / 12;
    const annualised = years > 0 && allTimeReturnPct > -100
        ? (Math.pow(1 + allTimeReturnPct / 100, 1 / years) - 1) * 100
        : 0;

    // Win rate (across all snapshots)
    const wins = all.filter(p => Number(p.gain_loss_amount) > 0).length;
    const winRate = all.length > 0 ? (wins / all.length) * 100 : 0;

    // Max drawdown (peak-to-trough on closing capital)
    let peak = 0, maxDrawdown = 0;
    for (const snap of all) {
        const c = Number(snap.closing_capital);
        if (c > peak) peak = c;
        const dd = peak > 0 ? ((peak - c) / peak) * 100 : 0;
        if (dd > maxDrawdown) maxDrawdown = dd;
    }

    // Best and worst period
    const best = all.reduce((b, p) => Number(p.gain_loss_percent) > Number(b?.gain_loss_percent ?? -Infinity) ? p : b, null as any);
    const worst = all.reduce((w, p) => Number(p.gain_loss_percent) < Number(w?.gain_loss_percent ?? Infinity) ? p : w, null as any);

    // NAV chart data (cumulative, oldest first)
    const navData = all.map(p => ({ date: p.snapshot_date, nav: Number(p.closing_capital), pct: Number(p.gain_loss_percent) }));

    return { allTimeReturnAmt, allTimeReturnPct, annualised, winRate, maxDrawdown, best, worst, totalPeriods: all.length, navData, firstSnap, lastSnap };
}

const CustomTooltip = ({ active, payload, label, mode }: any) => {
    if (!active || !payload?.length) return null;
    const val = payload[0]?.value;
    return (
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-2xl text-left">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
            {mode === "nav"
                ? <p className="text-sm font-black text-slate-900 tabular-nums">{USD(val)}</p>
                : <p className={`text-sm font-black tabular-nums ${val >= 0 ? "text-emerald-600" : "text-red-500"}`}>{val >= 0 ? "+" : ""}{val?.toFixed(2)}%</p>
            }
        </div>
    );
};

const StatCard = ({ label, value, sub, accent, small }: { label: string; value: string; sub?: string; accent?: "gold" | "green" | "red" | "gray"; small?: boolean }) => {
    const colors = { gold: "text-gv-gold", green: "text-emerald-500", red: "text-red-500", gray: "text-slate-900" };
    return (
        <div className="bg-white border border-gray-200 rounded-[2rem] p-5 shadow-sm space-y-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className={`${small ? "text-xl" : "text-2xl"} font-black tabular-nums leading-none ${colors[accent || "gray"]}`}>{value}</p>
            {sub && <p className="text-[9px] font-medium text-slate-400">{sub}</p>}
        </div>
    );
};

export default function FundAccountsClient({ lang }: { lang: Lang }) {
    const { fundAccounts, loading } = useUser();
    const t = tx[lang];

    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [snapFilter, setSnapFilter] = useState<"all" | "daily" | "monthly">("monthly");
    const [chartMode, setChartMode] = useState<"nav" | "pct">("nav");

    const selectedAccount = useMemo(() => {
        if (!selectedAccountId && fundAccounts.length > 0) return fundAccounts[0];
        return fundAccounts.find(fa => fa.id === selectedAccountId) || fundAccounts[0] || null;
    }, [selectedAccountId, fundAccounts]);

    const metrics = useMemo(() => selectedAccount?.performance?.length > 0 ? calcMetrics(selectedAccount.performance) : null, [selectedAccount]);

    // User's proportional share
    const userShare = useMemo(() => {
        if (!selectedAccount?.current_capital || !selectedAccount?.allocated_amount_usd) return 0;
        return selectedAccount.allocated_amount_usd / selectedAccount.current_capital;
    }, [selectedAccount]);

    // Latest daily & monthly
    const latestDaily = useMemo(() => selectedAccount?.performance?.find((p: any) => p.snapshot_type === "daily") || null, [selectedAccount]);
    const latestMonthly = useMemo(() => selectedAccount?.performance?.find((p: any) => p.snapshot_type === "monthly") || null, [selectedAccount]);

    // User's derived gains
    const userDailyGain = latestDaily ? Number(latestDaily.gain_loss_amount) * userShare : null;
    const userMonthlyGain = latestMonthly ? Number(latestMonthly.gain_loss_amount) * userShare : null;
    const userTotalGain = metrics ? metrics.allTimeReturnAmt * userShare : 0;

    // Last updated timestamp
    const lastUpdatedDate = useMemo(() => {
        if (!selectedAccount?.performance?.length) return null;
        const latest = [...selectedAccount.performance].sort((a: any, b: any) => new Date(b.created_at || b.snapshot_date).getTime() - new Date(a.created_at || a.snapshot_date).getTime())[0];
        return latest?.snapshot_date || null;
    }, [selectedAccount]);

    // Filtered snapshots (sorted newest first for table)
    const filteredSnaps = useMemo(() => {
        if (!selectedAccount) return [];
        const snaps = selectedAccount.performance || [];
        const filtered = snapFilter === "all" ? snaps : snaps.filter((s: any) => s.snapshot_type === snapFilter);
        return [...filtered].sort((a: any, b: any) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime());
    }, [selectedAccount, snapFilter]);

    // Chart data — oldest first, filtered by snapFilter
    const chartData = useMemo(() => {
        if (!selectedAccount || !metrics) return [];
        const snaps = selectedAccount.performance || [];
        const filtered = snapFilter === "all" ? snaps : snaps.filter((s: any) => s.snapshot_type === snapFilter);
        return [...filtered]
            .sort((a: any, b: any) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime())
            .map((s: any) => ({ date: s.snapshot_date, nav: Number(s.closing_capital), pct: Number(s.gain_loss_percent) }));
    }, [filteredSnaps, metrics, snapFilter, selectedAccount]);

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{t.title}</h1>
                    <p className="text-slate-400 text-sm font-medium">{t.subtitle}</p>
                </div>
                {lastUpdatedDate && (
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2 shadow-sm">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.5)]"></div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t.lastUpdated}: <span className="text-slate-900">{lastUpdatedDate}</span></p>
                    </div>
                )}
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
                                <button key={fa.id} onClick={() => setSelectedAccountId(fa.id)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedAccount?.id === fa.id ? "bg-gv-gold text-black shadow-lg shadow-gv-gold/20" : "bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300"}`}>
                                    <span className={`h-2 w-2 rounded-full ${fa.is_active ? "bg-emerald-400" : "bg-gray-300"}`}></span>
                                    {fa.account_code}
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedAccount && (
                        <div className="space-y-6">

                            {/* ── Row 1: Account identity + Your Allocation + Total Capital ── */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Identity card */}
                                <div className="col-span-2 bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm">
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${selectedAccount.is_active ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse" : "bg-gray-300"}`}></span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{selectedAccount.account_code}</span>
                                                {selectedAccount.base_currency && selectedAccount.base_currency !== "USD" && (
                                                    <span className="text-[8px] bg-amber-50 border border-gv-gold/20 text-gv-gold px-1.5 py-0.5 rounded-md font-black">{selectedAccount.base_currency}</span>
                                                )}
                                            </div>
                                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">{selectedAccount.account_name}</h2>
                                            {selectedAccount.platform_name && <p className="text-[11px] font-bold text-gv-gold">{selectedAccount.platform_name}</p>}
                                            {selectedAccount.description && <p className="text-[9px] text-slate-400 italic mt-1">{selectedAccount.description}</p>}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">{t.yourShare}</p>
                                            <p className="text-3xl font-black text-slate-900 tabular-nums leading-none">{PCT_ABS(userShare * 100)}</p>
                                            {selectedAccount.fund_start_date && <p className="text-[9px] text-slate-400 font-medium mt-1">Since {selectedAccount.fund_start_date}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Your Allocation */}
                                <div className="bg-gradient-to-br from-gv-gold/10 to-amber-50 border border-gv-gold/20 rounded-[2rem] p-6 shadow-sm space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gv-gold/70">{t.yourAllocation}</p>
                                    <p className="text-2xl font-black text-gv-gold tabular-nums leading-none">{USD(selectedAccount.allocated_amount_usd)}</p>
                                    {selectedAccount.joined_at && <p className="text-[9px] font-medium text-slate-400">{t.since}: {new Date(selectedAccount.joined_at).toLocaleDateString()}</p>}
                                </div>

                                {/* Total Fund Capital */}
                                <StatCard label={t.totalFundCapital} value={USD(selectedAccount.current_capital)} sub={`${t.initialCapital}: ${USD(selectedAccount.initial_capital)}`} />
                            </div>

                            {/* ── Row 2: Daily / Monthly — Fund + Your returns ── */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Daily */}
                                <div className={`rounded-[2rem] border p-6 shadow-sm space-y-4 ${latestDaily && Number(latestDaily.gain_loss_amount) >= 0 ? "bg-emerald-50 border-emerald-100" : latestDaily ? "bg-red-50 border-red-100" : "bg-white border-gray-200"}`}>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t.dailyReturn}</p>
                                        {latestDaily && <span className="text-[8px] font-bold text-slate-400 font-mono">{latestDaily.snapshot_date}</span>}
                                    </div>
                                    {latestDaily ? (
                                        <>
                                            <div className="flex items-end justify-between">
                                                <div>
                                                    <p className={`text-3xl font-black tabular-nums leading-none ${Number(latestDaily.gain_loss_amount) >= 0 ? "text-emerald-600" : "text-red-500"}`}>{PCT(latestDaily.gain_loss_percent)}</p>
                                                    <p className={`text-sm font-bold tabular-nums mt-1 ${Number(latestDaily.gain_loss_amount) >= 0 ? "text-emerald-500" : "text-red-400"}`}>{Number(latestDaily.gain_loss_amount) >= 0 ? "+" : ""}{USD(latestDaily.gain_loss_amount)} fund</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{t.yourDailyGain}</p>
                                                    <p className={`text-xl font-black tabular-nums ${(userDailyGain ?? 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}>{(userDailyGain ?? 0) >= 0 ? "+" : ""}{USD(userDailyGain ?? 0)}</p>
                                                </div>
                                            </div>
                                        </>
                                    ) : <p className="text-slate-300 text-sm font-black">—</p>}
                                </div>

                                {/* Monthly */}
                                <div className={`rounded-[2rem] border p-6 shadow-sm space-y-4 ${latestMonthly && Number(latestMonthly.gain_loss_amount) >= 0 ? "bg-emerald-50 border-emerald-100" : latestMonthly ? "bg-red-50 border-red-100" : "bg-white border-gray-200"}`}>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t.monthlyReturn}</p>
                                        {latestMonthly && <span className="text-[8px] font-bold text-slate-400 font-mono">{latestMonthly.snapshot_date}</span>}
                                    </div>
                                    {latestMonthly ? (
                                        <>
                                            <div className="flex items-end justify-between">
                                                <div>
                                                    <p className={`text-3xl font-black tabular-nums leading-none ${Number(latestMonthly.gain_loss_amount) >= 0 ? "text-emerald-600" : "text-red-500"}`}>{PCT(latestMonthly.gain_loss_percent)}</p>
                                                    <p className={`text-sm font-bold tabular-nums mt-1 ${Number(latestMonthly.gain_loss_amount) >= 0 ? "text-emerald-500" : "text-red-400"}`}>{Number(latestMonthly.gain_loss_amount) >= 0 ? "+" : ""}{USD(latestMonthly.gain_loss_amount)} fund</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{t.yourMonthlyGain}</p>
                                                    <p className={`text-xl font-black tabular-nums ${(userMonthlyGain ?? 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}>{(userMonthlyGain ?? 0) >= 0 ? "+" : ""}{USD(userMonthlyGain ?? 0)}</p>
                                                </div>
                                            </div>
                                        </>
                                    ) : <p className="text-slate-300 text-sm font-black">—</p>}
                                </div>
                            </div>

                            {/* ── Row 3: Institutional Metrics ── */}
                            {metrics && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="col-span-2 grid grid-cols-2 gap-4">
                                        <StatCard label={t.allTimeReturn} value={PCT(metrics.allTimeReturnPct)} sub={`${metrics.allTimeReturnAmt >= 0 ? "+" : ""}${USD(metrics.allTimeReturnAmt)} fund`} accent={metrics.allTimeReturnPct >= 0 ? "green" : "red"} />
                                        <StatCard label={t.yourTotalGain} value={`${userTotalGain >= 0 ? "+" : ""}${USD(userTotalGain)}`} sub={`On ${USD(selectedAccount.allocated_amount_usd)}`} accent={userTotalGain >= 0 ? "gold" : "red"} />
                                    </div>
                                    <StatCard label={t.annualizedReturn} value={metrics.annualised !== 0 ? PCT(metrics.annualised) : "—"} sub={`${metrics.totalPeriods} ${t.totalPeriods}`} accent={metrics.annualised >= 0 ? "green" : "red"} small />
                                    <StatCard label={t.winRate} value={`${metrics.winRate.toFixed(0)}%`} sub={`${Math.round(metrics.winRate / 100 * metrics.totalPeriods)}/${metrics.totalPeriods} ${lang === "en" ? "profitable" : "盈利"}`} accent="gray" small />
                                    <StatCard label={t.maxDrawdown} value={`-${metrics.maxDrawdown.toFixed(2)}%`} sub={lang === "en" ? "Peak-to-trough" : "峰谷回撤"} accent={metrics.maxDrawdown > 20 ? "red" : "gray"} small />
                                    <StatCard label={t.bestPeriod} value={metrics.best ? PCT(metrics.best.gain_loss_percent) : "—"} sub={metrics.best?.snapshot_date} accent="green" small />
                                    <StatCard label={t.worstPeriod} value={metrics.worst ? PCT(metrics.worst.gain_loss_percent) : "—"} sub={metrics.worst?.snapshot_date} accent="red" small />
                                    <StatCard label={t.totalPeriods} value={String(metrics.totalPeriods)} sub={`${lang === "en" ? "Periods tracked" : "已追踪区间"}`} small />
                                </div>
                            )}

                            {/* ── Row 4: Chart + Table ── */}
                            <div className="bg-white border border-gray-200 rounded-[2.5rem] p-6 md:p-8 shadow-sm space-y-6">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex gap-2">
                                        {(["all", "daily", "monthly"] as const).map(f => (
                                            <button key={f} onClick={() => setSnapFilter(f)} className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${snapFilter === f ? "bg-gv-gold text-black" : "bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-900"}`}>
                                                {f === "all" ? t.filterAll : f === "daily" ? t.filterDaily : t.filterMonthly}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setChartMode("nav")} className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${chartMode === "nav" ? "bg-slate-900 text-white" : "bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-900"}`}>{t.chartModeNAV}</button>
                                        <button onClick={() => setChartMode("pct")} className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${chartMode === "pct" ? "bg-slate-900 text-white" : "bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-900"}`}>{t.chartModeReturn}</button>
                                    </div>
                                </div>

                                {/* Chart */}
                                {chartData.length > 0 ? (
                                    <div className="h-60">
                                        <ResponsiveContainer width="100%" height="100%">
                                            {chartMode === "nav" ? (
                                                <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                                                    <defs>
                                                        <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.18} />
                                                            <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                                                    <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 800, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                                    <YAxis tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} tick={{ fontSize: 9, fontWeight: 800, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={55} />
                                                    <Tooltip content={<CustomTooltip mode="nav" />} cursor={{ stroke: "#D4AF37", strokeWidth: 1, strokeDasharray: "4 4" }} />
                                                    <Area type="monotone" dataKey="nav" stroke="#D4AF37" strokeWidth={2.5} fill="url(#navGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "#D4AF37", fill: "#fff" }} />
                                                </AreaChart>
                                            ) : (
                                                <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }} barCategoryGap="35%">
                                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                                                    <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 800, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                                    <YAxis tickFormatter={v => `${v.toFixed(1)}%`} tick={{ fontSize: 9, fontWeight: 800, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={48} />
                                                    <Tooltip content={<CustomTooltip mode="pct" />} cursor={{ fill: "rgba(212,175,55,0.05)" }} />
                                                    <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={1} />
                                                    <Bar dataKey="pct" radius={[5, 5, 0, 0]} fill="#10b981"
                                                        shape={(props: any) => {
                                                            const { x, y, width, height, value } = props;
                                                            const fill = value >= 0 ? "#10b981" : "#ef4444";
                                                            const aY = value < 0 ? y + height : y;
                                                            return <rect x={x} y={aY} width={width} height={Math.abs(height)} fill={fill} rx={5} ry={5} />;
                                                        }}
                                                    />
                                                </BarChart>
                                            )}
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
                                                    <th className="px-4 py-3">{t.opening}</th>
                                                    <th className="px-4 py-3">{t.closing}</th>
                                                    <th className="px-4 py-3">{t.gainAmt} (Fund)</th>
                                                    <th className="px-4 py-3">{t.gainAmt} (You)</th>
                                                    <th className="px-4 py-3">{t.gainPct}</th>
                                                    <th className="px-4 py-3">{t.notes}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {filteredSnaps.map((snap: any) => {
                                                    const yourGain = Number(snap.gain_loss_amount) * userShare;
                                                    const isPos = Number(snap.gain_loss_amount) >= 0;
                                                    return (
                                                        <tr key={snap.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-4 py-3 text-xs font-bold text-slate-600 tabular-nums whitespace-nowrap font-mono">{snap.snapshot_date}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${snap.snapshot_type === "daily" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                                                                    {snap.snapshot_type === "daily" ? t.daily : t.monthly}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-xs font-bold text-slate-500 tabular-nums">{USD(snap.opening_capital)}</td>
                                                            <td className="px-4 py-3 text-xs font-bold text-slate-800 tabular-nums">{USD(snap.closing_capital)}</td>
                                                            <td className={`px-4 py-3 text-xs font-black tabular-nums ${isPos ? "text-emerald-600" : "text-red-500"}`}>
                                                                {isPos ? "+" : ""}{USD(snap.gain_loss_amount)}
                                                            </td>
                                                            <td className={`px-4 py-3 text-xs font-black tabular-nums ${yourGain >= 0 ? "text-gv-gold" : "text-red-500"}`}>
                                                                {yourGain >= 0 ? "+" : ""}{USD(yourGain)}
                                                            </td>
                                                            <td className={`px-4 py-3 text-xs font-black tabular-nums ${isPos ? "text-emerald-600" : "text-red-500"}`}>
                                                                {PCT(snap.gain_loss_percent)}
                                                            </td>
                                                            <td className="px-4 py-3 text-[10px] text-slate-400 max-w-[140px] truncate italic">{snap.notes || "—"}</td>
                                                        </tr>
                                                    );
                                                })}
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
