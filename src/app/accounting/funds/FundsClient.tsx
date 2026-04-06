"use client";

import React, { useState } from "react";
import { useAccounting } from "@/providers/AccountingProvider";
import { Briefcase, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
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
        <div className="space-y-4 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h1 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-indigo-500" />
                    Fund Accounts
                </h1>
            </div>

            {/* Compact Summary Strip */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[8px] font-black uppercase tracking-widest text-slate-400">
                        <tr>
                            <th className="px-4 py-2">Total AUM (USD)</th>
                            <th className="px-4 py-2">Funds</th>
                            <th className="px-4 py-2">Investors</th>
                            <th className={`px-4 py-2 ${unallocatedUsers.length > 0 ? "text-amber-500" : "text-emerald-500"}`}>Unallocated</th>
                        </tr>
                    </thead>
                    <tbody className="divide-x divide-slate-100 font-bold tabular-nums text-[10px]">
                        <tr>
                            <td className="px-4 py-2.5 text-slate-900">$ {totalAUM.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-2.5 text-slate-700">{fundAccounts.length}</td>
                            <td className="px-4 py-2.5 text-slate-700">{totalUsers}</td>
                            <td className="px-4 py-2.5">
                                <span className={unallocatedUsers.length > 0 ? "text-amber-600" : "text-emerald-600"}>
                                    {unallocatedUsers.length} Users ($ {unallocAUM.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Fund List Table */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[8px) font-black uppercase tracking-widest text-slate-400">
                        <tr>
                            <th className="px-4 py-2 w-10"></th>
                            <th className="px-4 py-2">Fund Name</th>
                            <th className="px-4 py-2 text-right">AUM (USD)</th>
                            <th className="px-4 py-2 text-right">Market Share</th>
                            <th className="px-4 py-2 text-right">Investors</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {fundAccounts.map(fund => {
                            const isExpanded = expandedFund === fund.name;
                            const percentage = totalAUM > 0 ? ((fund.totalAUM / totalAUM) * 100).toFixed(1) : "0.0";
                            return (
                                <React.Fragment key={fund.name}>
                                    <tr 
                                        className={`group cursor-pointer transition-colors ${isExpanded ? "bg-indigo-50/30" : "hover:bg-slate-50"}`}
                                        onClick={() => setExpandedFund(isExpanded ? null : fund.name)}
                                    >
                                        <td className="px-4 py-2 text-center">
                                            {isExpanded ? <ChevronDown className="h-3 w-3 text-indigo-500" /> : <ChevronRight className="h-3 w-3 text-slate-300 group-hover:text-slate-500" />}
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-md bg-indigo-500 flex items-center justify-center text-white text-[8px] font-black">
                                                    {fund.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-tight text-slate-900">{fund.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-right text-[10px] font-black tabular-nums text-slate-900">
                                            $ {fund.totalAUM.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-2 text-right text-[10px] font-black tabular-nums text-slate-500">
                                            {percentage}%
                                        </td>
                                        <td className="px-4 py-2 text-right text-[10px] font-black text-slate-700">
                                            {fund.userCount}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={5} className="bg-slate-50/50 p-0">
                                                <div className="border-y border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <table className="w-full text-left">
                                                        <thead className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400 bg-white/50">
                                                            <tr>
                                                                <th className="px-10 py-1.5">Investor Name</th>
                                                                <th className="px-4 py-1.5">Tier</th>
                                                                <th className="px-4 py-1.5">Account ID</th>
                                                                <th className="px-4 py-1.5 text-right">Capital (USD)</th>
                                                                <th className="px-4 py-1.5 text-right">% Fund</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {fund.users.sort((a, b) => (b.balance_usd || 0) - (a.balance_usd || 0)).map(u => {
                                                                const tier = getTierByAmount(u.balance_usd || 0);
                                                                const pct = fund.totalAUM > 0 ? (((u.balance_usd || 0) / fund.totalAUM) * 100).toFixed(2) : "0.0";
                                                                return (
                                                                    <tr key={u.id} className="hover:bg-white transition-colors">
                                                                        <td className="px-10 py-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <TierMedal tierId={tier.id} size="xs" />
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-[9px] font-bold text-slate-700">{u.full_name || u.username}</span>
                                                                                    <span className="text-[7px] font-medium text-slate-400">{u.email}</span>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-2 text-[8px] font-black uppercase tracking-widest text-slate-500">{tier.name}</td>
                                                                        <td className="px-4 py-2 text-[8px] font-mono font-bold text-indigo-500">{u.portfolio_account_id || "—"}</td>
                                                                        <td className="px-4 py-2 text-right text-[9px] font-black tabular-nums text-slate-900">$ {(u.balance_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                        <td className="px-4 py-2 text-right text-[9px] font-black tabular-nums text-slate-400">{pct}%</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {fundAccounts.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-12 text-center">
                                    <Briefcase className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">No fund accounts configured.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Unallocated Users Strip */}
            {unallocatedUsers.length > 0 && (
                <div className="bg-white border border-amber-200 rounded-lg overflow-hidden">
                    <button
                        onClick={() => setShowUnallocated(!showUnallocated)}
                        className="w-full px-4 py-2.5 flex items-center justify-between bg-amber-50 hover:bg-amber-100 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            {showUnallocated ? <ChevronDown className="h-3 w-3 text-amber-500" /> : <ChevronRight className="h-3 w-3 text-amber-500" />}
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-700">Unallocated Investors ({unallocatedUsers.length})</span>
                        </div>
                        <span className="text-[10px] font-black tabular-nums text-amber-700">$ {unallocAUM.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </button>
                    {showUnallocated && (
                        <div className="border-t border-amber-100 flex flex-wrap gap-2 p-3 bg-amber-50/30 animate-in fade-in duration-200">
                            {unallocatedUsers.sort((a, b) => (b.balance_usd || 0) - (a.balance_usd || 0)).map(u => {
                                const tier = getTierByAmount(u.balance_usd || 0);
                                return (
                                    <div key={u.id} className="bg-white border border-amber-100 px-3 py-1.5 rounded-md flex items-center gap-2 shadow-sm">
                                        <TierMedal tierId={tier.id} size="xs" />
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-700">{u.full_name || u.username}</span>
                                            <span className="text-[8px] font-black tabular-nums text-amber-600">$ {(u.balance_usd || 0).toLocaleString()}</span>
                                        </div>
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
