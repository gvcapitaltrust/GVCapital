"use client";

import React, { useState, useMemo } from "react";
import { useAccounting } from "@/providers/AccountingProvider";
import { Users, Search, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import { getTierByAmount } from "@/lib/tierUtils";
import TierMedal from "@/components/TierMedal";

export default function UsersAccountingClient() {
    const { users, getJournalEntriesForUser, loading } = useAccounting();
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
    const [tierFilter, setTierFilter] = useState("All");

    const filtered = useMemo(() => {
        return users.filter(u => {
            const q = searchQuery.toLowerCase();
            const matchQ = !q || (u.full_name || "").toLowerCase().includes(q) || (u.username || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
            const tier = getTierByAmount(u.balance_usd || 0);
            const matchTier = tierFilter === "All" || tier.name === tierFilter;
            return matchQ && matchTier;
        });
    }, [users, searchQuery, tierFilter]);

    const expandedEntries = useMemo(() => {
        if (!expandedUserId) return [];
        return getJournalEntriesForUser(expandedUserId);
    }, [expandedUserId, getJournalEntriesForUser]);

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent animate-spin rounded-full" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-20">
            <div className="space-y-1">
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none flex items-center gap-3">
                    <Users className="h-6 w-6 text-indigo-500" />
                    User Accounts
                </h1>
                <p className="text-slate-400 text-sm font-medium">{filtered.length} users tracked. Click to expand individual ledger.</p>
            </div>

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row gap-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <input
                        type="text"
                        placeholder="Search by name, username, or email..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-3 text-xs font-bold focus:outline-none focus:border-indigo-300 focus:bg-white transition-all placeholder:text-slate-300"
                    />
                </div>
                <select
                    value={tierFilter}
                    onChange={e => setTierFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:outline-none focus:border-indigo-300 min-w-[150px]"
                >
                    <option value="All">All Tiers</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                    <option value="VVIP">VVIP</option>
                    <option value="No Tier">No Tier</option>
                </select>
            </div>

            {/* Users Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                    {/* Desktop */}
                    <table className="w-full text-left hidden md:table">
                        <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-5 py-3 w-8"></th>
                                <th className="px-5 py-3">User</th>
                                <th className="px-5 py-3">Fund</th>
                                <th className="px-5 py-3 text-right">Capital (USD)</th>
                                <th className="px-5 py-3 text-right">Dividends</th>
                                <th className="px-5 py-3 text-right">Withdrawals</th>
                                <th className="px-5 py-3 text-right">Entries</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map(u => {
                                const isExpanded = expandedUserId === u.id;
                                const tier = getTierByAmount(u.balance_usd || 0);
                                return (
                                    <React.Fragment key={u.id}>
                                        <tr
                                            className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                                            onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                                        >
                                            <td className="px-5 py-3 text-slate-300">{isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <TierMedal tierId={tier.id} size="xs" />
                                                    <div>
                                                        <p className="text-[11px] font-black uppercase tracking-tight text-slate-900">{u.full_name || u.username || "—"}</p>
                                                        <p className="text-[9px] font-bold text-slate-400">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${u.portfolio_platform_name ? "text-indigo-500" : "text-slate-300"}`}>
                                                    {u.portfolio_platform_name || "Unallocated"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right text-[11px] font-black tabular-nums text-slate-900">$ {(u.balance_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="px-5 py-3 text-right text-[11px] font-black tabular-nums text-emerald-600">$ {(u.accounting.totalDividends || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="px-5 py-3 text-right text-[11px] font-black tabular-nums text-red-500">$ {(u.accounting.totalWithdrawals || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="px-5 py-3 text-right">
                                                <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{u.accounting.entryCount}</span>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={7} className="bg-indigo-50/30 px-5 py-0">
                                                    <div className="py-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <BookOpen className="h-4 w-4 text-indigo-500" />
                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Individual Ledger — {u.full_name || u.username}</h4>
                                                        </div>
                                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-h-[300px] overflow-y-auto">
                                                            <table className="w-full text-left">
                                                                <thead className="bg-slate-50 text-[8px] font-black uppercase tracking-widest text-slate-400 sticky top-0">
                                                                    <tr>
                                                                        <th className="px-4 py-2">Date</th>
                                                                        <th className="px-4 py-2">Type</th>
                                                                        <th className="px-4 py-2">Description</th>
                                                                        <th className="px-4 py-2 text-right">Debit</th>
                                                                        <th className="px-4 py-2 text-right">Credit</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-50">
                                                                    {expandedEntries.map((e, i) => (
                                                                        <tr key={i} className="hover:bg-slate-50/50">
                                                                            <td className="px-4 py-2 text-[9px] font-mono font-bold text-slate-400 whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                                                                            <td className="px-4 py-2">
                                                                                <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                                                                    e.type.includes("Deposit") ? "bg-emerald-50 text-emerald-600" :
                                                                                    e.type.includes("Withdrawal") ? "bg-red-50 text-red-500" :
                                                                                    e.type.includes("Dividend") ? "bg-blue-50 text-blue-500" :
                                                                                    "bg-slate-50 text-slate-500"
                                                                                }`}>{e.type}</span>
                                                                            </td>
                                                                            <td className="px-4 py-2 text-[9px] font-bold text-slate-700 max-w-[200px] truncate">{e.description}</td>
                                                                            <td className="px-4 py-2 text-[9px] font-black tabular-nums text-right">$ {e.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                            <td className="px-4 py-2 text-[9px] font-black tabular-nums text-right">$ {e.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                            {expandedEntries.length === 0 && <div className="p-6 text-center text-slate-400 text-[10px] font-bold">No entries found.</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {filtered.slice(0, 50).map(u => {
                            const tier = getTierByAmount(u.balance_usd || 0);
                            const isExpanded = expandedUserId === u.id;
                            return (
                                <div key={u.id} className="p-4 space-y-2" onClick={() => setExpandedUserId(isExpanded ? null : u.id)}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <TierMedal tierId={tier.id} size="xs" />
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-tight text-slate-900">{u.full_name || u.username}</p>
                                                <p className="text-[8px] font-bold text-slate-400">{u.email}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black tabular-nums text-slate-900">$ {(u.balance_usd || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex gap-3 text-[8px] font-black uppercase tracking-widest">
                                        <span className="text-emerald-500">DIV: ${(u.accounting.totalDividends || 0).toLocaleString()}</span>
                                        <span className="text-red-500">WD: ${(u.accounting.totalWithdrawals || 0).toLocaleString()}</span>
                                        <span className="text-indigo-500">{u.portfolio_platform_name || "Unallocated"}</span>
                                    </div>
                                    {isExpanded && expandedEntries.length > 0 && (
                                        <div className="bg-indigo-50/50 rounded-lg p-3 space-y-1.5 mt-2 animate-in fade-in duration-200">
                                            {expandedEntries.slice(0, 10).map((e, i) => (
                                                <div key={i} className="flex justify-between text-[8px]">
                                                    <span className="font-bold text-slate-600 truncate max-w-[200px]">{e.type}: {e.description.substring(0, 30)}</span>
                                                    <span className="font-black tabular-nums">$ {e.totalDebit.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {filtered.length === 0 && <div className="p-16 text-center text-slate-400 font-black uppercase tracking-widest text-xs">No users found.</div>}
                </div>
            </div>
        </div>
    );
}
