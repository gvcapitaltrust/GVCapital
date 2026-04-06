"use client";

import React, { useState, useMemo } from "react";
import { useAccounting } from "@/providers/AccountingProvider";
import { Users, Search, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import { getTierByAmount } from "@/lib/tierUtils";
import TierMedal from "@/components/TierMedal";

export default function UsersAccountingClient() {
    const { users, getJournalEntriesForUser, loading, updateUserFund } = useAccounting();
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
    const [tierFilter, setTierFilter] = useState("All");
    const [updatingId, setUpdatingId] = useState<string | null>(null);

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

    const handleFundChange = async (userId: string, fund: string) => {
        setUpdatingId(userId);
        await updateUserFund(userId, fund === "unallocated" ? null : fund);
        setUpdatingId(null);
    };

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-8 w-8 border-3 border-indigo-500 border-t-transparent animate-spin rounded-full" /></div>;

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-20">
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h1 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-500" />
                    User Accounts
                </h1>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-[10px] font-bold focus:outline-none focus:border-indigo-400 placeholder:text-slate-300 w-48 transition-all"
                        />
                    </div>
                    <select
                        value={tierFilter}
                        onChange={e => setTierFilter(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-500 focus:outline-none focus:border-indigo-400"
                    >
                        <option value="All">All Tiers</option>
                        <option value="Silver">Silver</option>
                        <option value="Gold">Gold</option>
                        <option value="Platinum">Platinum</option>
                        <option value="VVIP">VVIP</option>
                    </select>
                </div>
            </div>

            {/* Main Users Table */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[8px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-2 w-8"></th>
                            <th className="px-4 py-2">Investor</th>
                            <th className="px-4 py-2">Account Fund</th>
                            <th className="px-4 py-2 text-right">Capital (USD)</th>
                            <th className="px-4 py-2 text-right">Dividends</th>
                            <th className="px-4 py-2 text-right">Withdrawals</th>
                            <th className="px-4 py-2 text-right">Activity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map(u => {
                            const isExpanded = expandedUserId === u.id;
                            const tier = getTierByAmount(u.balance_usd || 0);
                            return (
                                <React.Fragment key={u.id}>
                                    <tr className={`group transition-colors ${isExpanded ? "bg-indigo-50/30" : "hover:bg-slate-50"}`}>
                                        <td className="px-4 py-2 text-center" onClick={() => setExpandedUserId(isExpanded ? null : u.id)}>
                                            {isExpanded ? <ChevronDown className="h-3 w-3 text-indigo-500 cursor-pointer" /> : <ChevronRight className="h-3 w-3 text-slate-300 group-hover:text-slate-500 cursor-pointer" />}
                                        </td>
                                        <td className="px-4 py-2" onClick={() => setExpandedUserId(isExpanded ? null : u.id)}>
                                            <div className="flex items-center gap-2 cursor-pointer">
                                                <TierMedal tierId={tier.id} size="xs" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase tracking-tight text-slate-900">{u.full_name || u.username || "—"}</span>
                                                    <span className="text-[8px] font-bold text-slate-400">{u.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <select 
                                                value={u.portfolio_platform_name || "unallocated"}
                                                disabled={updatingId === u.id}
                                                onChange={(e) => handleFundChange(u.id, e.target.value)}
                                                className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border focus:outline-none transition-all ${
                                                    u.portfolio_platform_name ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                                } ${updatingId === u.id ? "opacity-50" : "opacity-100"}`}
                                            >
                                                <option value="unallocated">Unallocated</option>
                                                <option value="Forex Trading">Forex Trading</option>
                                                <option value="Stock Trading">Stock Trading</option>
                                                <option value="Other Investments">Other Investments</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-2 text-right text-[10px] font-black tabular-nums text-slate-900">$ {(u.balance_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-2 text-right text-[10px] font-black tabular-nums text-emerald-600">$ {(u.accounting.totalDividends || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-2 text-right text-[10px] font-black tabular-nums text-red-500">$ {(u.accounting.totalWithdrawals || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-2 text-right">
                                            <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">{u.accounting.entryCount} txns</span>
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={7} className="bg-slate-50/50 p-0 border-b border-slate-100">
                                                <div className="py-2 px-10 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <BookOpen className="h-3 w-3 text-indigo-500" />
                                                        <h4 className="text-[8px] font-black uppercase tracking-widest text-slate-400">Individual User Ledger</h4>
                                                    </div>
                                                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden max-h-[250px] overflow-y-auto mb-4">
                                                        <table className="w-full text-left">
                                                            <thead className="bg-slate-50 text-[7px] font-black uppercase tracking-[0.2em] text-slate-400 sticky top-0">
                                                                <tr>
                                                                    <th className="px-3 py-1.5">Date</th>
                                                                    <th className="px-3 py-1.5">Type</th>
                                                                    <th className="px-3 py-1.5">Description</th>
                                                                    <th className="px-3 py-1.5 text-right">Debit</th>
                                                                    <th className="px-3 py-1.5 text-right">Credit</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-50 text-[9px]">
                                                                {expandedEntries.map((e, i) => (
                                                                    <tr key={i} className="hover:bg-slate-50/50">
                                                                        <td className="px-3 py-1.5 font-mono font-bold text-slate-400 whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                                                                        <td className="px-3 py-1.5">
                                                                            <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                                                                e.type.includes("Deposit") ? "bg-emerald-50 text-emerald-600" :
                                                                                e.type.includes("Withdrawal") ? "bg-red-50 text-red-500" :
                                                                                e.type.includes("Dividend") ? "bg-blue-50 text-blue-500" :
                                                                                "bg-slate-50 text-slate-500"
                                                                            }`}>{e.type}</span>
                                                                        </td>
                                                                        <td className="px-3 py-1.5 font-bold text-slate-700 max-w-[200px] truncate">{e.description}</td>
                                                                        <td className="px-3 py-1.5 text-right font-black tabular-nums">$ {e.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                        <td className="px-3 py-1.5 text-right font-black tabular-nums">$ {e.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                    </tr>
                                                                ))}
                                                                {expandedEntries.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-[10px] font-bold">No ledger entries for this user.</td></tr>}
                                                            </tbody>
                                                        </table>
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
                {filtered.length === 0 && <div className="p-12 text-center text-slate-400 font-black uppercase tracking-widest text-[9px]">No matching accounts found.</div>}
            </div>
        </div>
    );
}
