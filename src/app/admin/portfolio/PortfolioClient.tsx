"use client";

import React, { useMemo } from "react";
import { useAdmin } from "@/providers/AdminProvider";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import Link from "next/link";
import { getTierByAmount } from "@/lib/tierUtils";
import TierMedal from "@/components/TierMedal";

export default function PortfolioClient({ lang }: { lang: "en" | "zh" }) {
    const { users, loading } = useAdmin();

    const t = {
        en: {
            title: "Global Portfolio Management",
            subtitle: "Institutional-grade capital allocation and external mapping overview.",
            totalCaptial: "Total Managed Capital",
            allocated: "Allocated to Funds",
            unallocated: "Unallocated Balance",
            fundDistribution: "Fund Distribution",
            userMapping: "User Mapping Status",
            mapped: "Mapped",
            unmapped: "Unmapped",
            manage: "Manage",
            user: "User",
            platform: "Current Platform",
            amount: "Amount (USD)",
            action: "Action"
        },
        zh: {
            title: "全局资产管理",
            subtitle: "机构级资金分配与外部投资组合映射概览。",
            totalCaptial: "管理资金总额",
            allocated: "已分配资金",
            unallocated: "未分配余额",
            fundDistribution: "基金分布",
            userMapping: "用户映射状态",
            mapped: "已映射",
            unmapped: "未映射",
            manage: "管理分配",
            user: "用户",
            platform: "当前平台",
            amount: "金额 (USD)",
            action: "操作"
        }
    }[lang];

    const stats = useMemo(() => {
        const total = users.reduce((acc, u) => acc + (u.balance_usd || 0), 0);
        const mapped = users.filter(u => u.portfolio_platform_name).reduce((acc, u) => acc + (u.balance_usd || 0), 0);
        
        const distributionMap: Record<string, number> = {};
        users.forEach(u => {
            if (u.portfolio_platform_name) {
                distributionMap[u.portfolio_platform_name] = (distributionMap[u.portfolio_platform_name] || 0) + (u.balance_usd || 0);
            }
        });

        const distributionData = Object.entries(distributionMap).map(([name, value]) => ({ name, value }));
        
        return {
            total,
            allocated: mapped,
            unallocated: total - mapped,
            distributionData,
            unmappedCount: users.filter(u => !u.portfolio_platform_name && (u.balance_usd || 0) > 0).length
        };
    }, [users]);

    const COLORS = ["#D4AF37", "#1E293B", "#64748B", "#94A3B8"];

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-gray-900">{t.title}</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t.subtitle}</p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: t.totalCaptial, value: stats.total, color: "text-gray-900" },
                    { label: t.allocated, value: stats.allocated, color: "text-emerald-600" },
                    { label: t.unallocated, value: stats.unallocated, color: "text-gv-gold" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{stat.label}</p>
                        <p className={`text-3xl font-black tabular-nums ${stat.color}`}>$ {stat.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Distribution Chart */}
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8">{t.fundDistribution}</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.distributionData.length > 0 ? stats.distributionData : [{ name: "No Allocation", value: 1 }]}
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.distributionData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                    {stats.distributionData.length === 0 && <Cell fill="#F1F5F9" />}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}
                                    formatter={(value: number) => [`$ ${value.toLocaleString()}`, 'Allocated']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Unmapped Users Alert / List */}
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">{t.userMapping}</h3>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${stats.unmappedCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {stats.unmappedCount} {t.unmapped}
                        </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {users.filter(u => (u.balance_usd || 0) > 0).map((u, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 group hover:bg-white hover:border-gv-gold/30 transition-all duration-300">
                                <div className="flex items-center gap-4">
                                    <TierMedal tierId={getTierByAmount(u.balance_usd || 0).name} size="xs" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-tight text-gray-900">{u.full_name || u.username}</p>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                                            {u.portfolio_platform_name || "PENDING ALLOCATION"}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-6">
                                    <span className="text-xs font-black tabular-nums text-gray-900">$ {(u.balance_usd || 0).toLocaleString()}</span>
                                    <Link 
                                        href={`/admin/users/${u.id}/portfolio?lang=${lang}`}
                                        className="bg-white border border-gray-200 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl group-hover:bg-gv-gold group-hover:border-gv-gold group-hover:text-black transition-all"
                                    >
                                        {t.manage}
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
