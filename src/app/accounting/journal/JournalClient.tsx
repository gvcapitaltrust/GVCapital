"use client";

import React, { useState, useMemo } from "react";
import { useAccounting, JournalEntry } from "@/providers/AccountingProvider";
import { BookOpen, Search, Download, ChevronDown, ChevronRight } from "lucide-react";

export default function JournalClient() {
    const { journalEntries, loading } = useAccounting();
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("All");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const types = useMemo(() => {
        const s = new Set<string>();
        journalEntries.forEach(e => s.add(e.type));
        return ["All", ...Array.from(s).sort()];
    }, [journalEntries]);

    const filtered = useMemo(() => {
        return journalEntries.filter(e => {
            const q = searchQuery.toLowerCase();
            const matchQuery = !q || e.description.toLowerCase().includes(q) || e.refId.toLowerCase().includes(q) || (e.userName || "").toLowerCase().includes(q);
            const matchType = typeFilter === "All" || e.type === typeFilter;
            return matchQuery && matchType;
        });
    }, [journalEntries, searchQuery, typeFilter]);

    const exportCSV = () => {
        const rows = [["Date", "Ref ID", "Description", "Account", "Debit", "Credit"]];
        filtered.forEach(e => {
            e.lines.forEach((l, i) => {
                rows.push([
                    i === 0 ? new Date(e.date).toLocaleDateString() : "",
                    i === 0 ? e.refId : "",
                    i === 0 ? e.description : "",
                    `${l.accountCode} - ${l.accountName}`,
                    l.debit > 0 ? l.debit.toFixed(2) : "",
                    l.credit > 0 ? l.credit.toFixed(2) : "",
                ]);
            });
        });
        const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `journal_${new Date().toISOString().substring(0, 10)}.csv`;
        a.click();
    };

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent animate-spin rounded-full" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none flex items-center gap-3">
                        <BookOpen className="h-6 w-6 text-indigo-500" />
                        General Journal
                    </h1>
                    <p className="text-slate-400 text-sm font-medium">{filtered.length.toLocaleString()} entries recorded.</p>
                </div>
                <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-500 hover:border-indigo-200 transition-all shadow-sm">
                    <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row gap-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <input
                        type="text"
                        placeholder="Search by ref ID, user, or description..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-3 text-xs font-bold focus:outline-none focus:border-indigo-300 focus:bg-white transition-all placeholder:text-slate-300"
                    />
                </div>
                <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:outline-none focus:border-indigo-300 min-w-[180px]"
                >
                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            {/* Journal Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                    {/* Desktop Table */}
                    <table className="w-full text-left hidden md:table">
                        <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-5 py-3 w-8"></th>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Ref</th>
                                <th className="px-5 py-3">Type</th>
                                <th className="px-5 py-3">Description</th>
                                <th className="px-5 py-3 text-right">Debit (USD)</th>
                                <th className="px-5 py-3 text-right">Credit (USD)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map(entry => {
                                const isExpanded = expandedId === entry.id;
                                return (
                                    <React.Fragment key={entry.id}>
                                        <tr
                                            className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                                            onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                                        >
                                            <td className="px-5 py-3 text-slate-300">{isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</td>
                                            <td className="px-5 py-3 text-[10px] font-mono font-bold text-slate-400 whitespace-nowrap">{new Date(entry.date).toLocaleDateString()}</td>
                                            <td className="px-5 py-3 text-[10px] font-mono font-black text-indigo-500">{entry.refId}</td>
                                            <td className="px-5 py-3">
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                                                    entry.type.includes("Deposit") ? "bg-emerald-50 text-emerald-600" :
                                                    entry.type.includes("Withdrawal") ? "bg-red-50 text-red-500" :
                                                    entry.type.includes("Dividend") ? "bg-blue-50 text-blue-500" :
                                                    entry.type.includes("Bonus") ? "bg-violet-50 text-violet-500" :
                                                    "bg-slate-50 text-slate-500"
                                                }`}>{entry.type}</span>
                                            </td>
                                            <td className="px-5 py-3 text-[11px] font-bold text-slate-700 max-w-[250px] truncate">{entry.description}</td>
                                            <td className="px-5 py-3 text-[11px] font-black text-slate-900 tabular-nums text-right">$ {entry.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="px-5 py-3 text-[11px] font-black text-slate-900 tabular-nums text-right">$ {entry.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={7} className="bg-indigo-50/30 px-5 py-0">
                                                    <div className="py-3 pl-12 space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        {entry.lines.map((line, i) => (
                                                            <div key={i} className="flex items-center gap-4 text-[10px]">
                                                                <span className="font-mono font-bold text-indigo-400 w-12">{line.accountCode}</span>
                                                                <span className={`font-bold ${line.credit > 0 ? "pl-8" : ""} text-slate-700 flex-1`}>{line.accountName}</span>
                                                                <span className="font-black tabular-nums text-slate-900 w-28 text-right">{line.debit > 0 ? `$ ${line.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ""}</span>
                                                                <span className="font-black tabular-nums text-slate-900 w-28 text-right">{line.credit > 0 ? `$ ${line.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ""}</span>
                                                            </div>
                                                        ))}
                                                        {entry.userName && <p className="text-[9px] font-bold text-slate-400 pt-2 border-t border-indigo-100 mt-2">User: {entry.userName} ({entry.userEmail})</p>}
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
                        {filtered.slice(0, 50).map(entry => (
                            <div key={entry.id} className="p-4 space-y-2" onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                            entry.type.includes("Deposit") ? "bg-emerald-50 text-emerald-600" :
                                            entry.type.includes("Withdrawal") ? "bg-red-50 text-red-500" :
                                            "bg-slate-50 text-slate-500"
                                        }`}>{entry.type}</span>
                                        <p className="text-[10px] font-bold text-slate-700 mt-1 leading-tight">{entry.description}</p>
                                    </div>
                                    <span className="text-[9px] font-mono font-bold text-slate-400">{new Date(entry.date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-black tabular-nums">
                                    <span className="text-slate-500">DR $ {entry.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    <span className="text-slate-500">CR $ {entry.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                {expandedId === entry.id && (
                                    <div className="bg-indigo-50/50 rounded-lg p-3 space-y-1 animate-in fade-in duration-200">
                                        {entry.lines.map((l, i) => (
                                            <div key={i} className="flex justify-between text-[9px]">
                                                <span className={`font-bold text-slate-600 ${l.credit > 0 ? "pl-4" : ""}`}>{l.accountCode} {l.accountName}</span>
                                                <span className="font-black tabular-nums">{l.debit > 0 ? `DR ${l.debit.toFixed(2)}` : `CR ${l.credit.toFixed(2)}`}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {filtered.length === 0 && <div className="p-16 text-center text-slate-400 font-black uppercase tracking-widest text-xs">No entries found.</div>}
                </div>
            </div>
        </div>
    );
}
