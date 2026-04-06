"use client";

import React, { useState } from "react";
import { useAccounting } from "@/providers/AccountingProvider";
import { Briefcase, Users, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { getTierByAmount } from "@/lib/tierUtils";
import TierMedal from "@/components/TierMedal";

export default function FundsClient() {
    const { fundAccounts, unallocatedUsers, loading } = useAccounting();
    const [expandedFund, setExpandedFund] = useState<string | null>(null);
    const [showUnallocated, setShowUnallocated] = useState(false);

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent animate-spin rounded-full" /></div>;

    const totalAUM = fundAccounts.reduce((s, f) => s + f.totalAUM, 0);
    const totalUsers = fundAccounts.reduce((s, f) => s + f.userCount, 0);
    const unallocAUM = unallocatedUsers.reduce((s, u) => s + (u.balance_usd || 0), 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-20">
            <div className="space-y-1">
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none flex items-center gap-3">
                    <Briefcase className="h-6 w-6 text-indigo-500" />
                    Fund Accounts
                </h1>
                <p className="text-slate-400 text-sm font-medium">Manage and review user allocations across fund accounts.</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Total AUM</p>
                    <p className="text-xl font-black text-slate-900 tabular-nums">$ {totalAUM.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Fund Accounts</p>
                    <p className="text-xl font-black text-slate-900">{fundAccounts.length}</p>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Allocated Users</p>
                    <p className="text-xl font-black text-slate-900">{totalUsers}</p>
                </div>
                <div className={`border p-5 rounded-2xl shadow-sm ${unallocatedUsers.length > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Unallocated</p>
                    <p className={`text-xl font-black ${unallocatedUsers.length > 0 ? "text-amber-600" : "text-emerald-600"}`}>{unallocatedUsers.length} users</p>
                    {unallocAUM > 0 && <p className="text-[9px] font-bold text-amber-500 tabular-nums mt-0.5">$ {unallocAUM.toLocaleString(undefined, { minimumFractionDigits: 2 })} unallocated</p>}
                </div>
            </div>

            {/* Fund List */}
            <div className="space-y-3">
                {fundAccounts.map(fund => {
                    const isExpanded = expandedFund === fund.name;
                    const percentage = totalAUM > 0 ? ((fund.totalAUM / totalAUM) * 100).toFixed(1) : "0.0";
                    return (
                        <div key={fund.name} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <button
                                onClick={() => setExpandedFund(isExpanded ? null : fund.name)}
                                className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-black shadow-lg shadow-indigo-500/20">
                                        {fund.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-black uppercase tracking-tight text-slate-900">{fund.name}</p>
                                        <p className="text-[9px] font-bold text-slate-400">{fund.userCount} investors • {percentage}% of total AUM</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black tabular-nums text-slate-900">$ {fund.totalAUM.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                    <div className="w-32 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                                    </div>
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 text-[8px] font-black uppercase tracking-widest text-slate-400">
                                                <tr>
                                                    <th className="px-6 py-2">User</th>
                                                    <th className="px-6 py-2">Tier</th>
                                                    <th className="px-6 py-2">Account ID</th>
                                                    <th className="px-6 py-2 text-right">Capital (USD)</th>
                                                    <th className="px-6 py-2 text-right">% of Fund</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {fund.users.sort((a, b) => (b.balance_usd || 0) - (a.balance_usd || 0)).map(u => {
                                                    const tier = getTierByAmount(u.balance_usd || 0);
                                                    const pct = fund.totalAUM > 0 ? (((u.balance_usd || 0) / fund.totalAUM) * 100).toFixed(1) : "0.0";
                                                    return (
                                                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-6 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <TierMedal tierId={tier.id} size="xs" />
                                                                    <div>
                                                                        <p className="text-[10px] font-black uppercase tracking-tight text-slate-900">{u.full_name || u.username}</p>
                                                                        <p className="text-[8px] font-bold text-slate-400">{u.email}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">{tier.name}</td>
                                                            <td className="px-6 py-3 text-[9px] font-mono font-bold text-indigo-500">{u.portfolio_account_id || "—"}</td>
                                                            <td className="px-6 py-3 text-right text-[10px] font-black tabular-nums text-slate-900">$ {(u.balance_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                            <td className="px-6 py-3 text-right text-[10px] font-black tabular-nums text-slate-400">{pct}%</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {fundAccounts.length === 0 && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                        <Briefcase className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No fund accounts configured.</p>
                    </div>
                )}
            </div>

            {/* Unallocated Users */}
            {unallocatedUsers.length > 0 && (
                <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
                    <button
                        onClick={() => setShowUnallocated(!showUnallocated)}
                        className="w-full px-6 py-4 flex items-center justify-between bg-amber-50 hover:bg-amber-100 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            {showUnallocated ? <ChevronDown className="h-4 w-4 text-amber-500" /> : <ChevronRight className="h-4 w-4 text-amber-500" />}
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Unallocated Users ({unallocatedUsers.length})</span>
                        </div>
                        <span className="text-sm font-black tabular-nums text-amber-700">$ {unallocAUM.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </button>
                    {showUnallocated && (
                        <div className="divide-y divide-slate-50 animate-in fade-in duration-200">
                            {unallocatedUsers.sort((a, b) => (b.balance_usd || 0) - (a.balance_usd || 0)).map(u => {
                                const tier = getTierByAmount(u.balance_usd || 0);
                                return (
                                    <div key={u.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <TierMedal tierId={tier.id} size="xs" />
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-tight text-slate-900">{u.full_name || u.username}</p>
                                                <p className="text-[8px] font-bold text-slate-400">{u.email}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black tabular-nums text-slate-900">$ {(u.balance_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
