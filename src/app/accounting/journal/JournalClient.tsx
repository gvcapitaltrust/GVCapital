"use client";

import React, { useState, useMemo } from "react";
import { useAccounting, JournalEntry } from "@/providers/AccountingProvider";
import { BookOpen, Search, Download, ChevronDown, ChevronRight } from "lucide-react";

export default function JournalClient() {
    const { journalEntries, loading } = useAccounting();
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("All");

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
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-[75vh] overflow-y-auto scrollbar-thin">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-[8px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 sticky top-0 z-20">
                            <tr>
                                <th className="px-3 py-1.5 border-r border-slate-100 w-[80px] md:w-[100px]">Info</th>
                                <th className="px-3 py-1.5 border-r border-slate-100 hidden md:table-cell">Type</th>
                                <th className="px-3 py-1.5 border-r border-slate-100">Account</th>
                                <th className="px-3 py-1.5 border-r border-slate-100 hidden lg:table-cell w-[200px]">Description</th>
                                <th className="px-3 py-1.5 border-r border-slate-100 hidden xl:table-cell">User / Audit</th>
                                <th className="px-3 py-1.5 text-right border-r border-slate-100 w-[70px] md:w-[100px]">Debit</th>
                                <th className="px-3 py-1.5 text-right w-[70px] md:w-[100px]">Credit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map((entry, entryIdx) => (
                                <React.Fragment key={entry.id}>
                                    {entry.lines.map((line, lineIdx) => {
                                        const isFirstLine = lineIdx === 0;
                                        return (
                                            <tr key={`${entry.id}-${lineIdx}`} className={`hover:bg-slate-50/50 transition-colors ${isFirstLine ? "border-t-[1.5px] border-slate-100" : ""}`}>
                                                <td className="px-3 py-1 border-r border-slate-50 align-top">
                                                    {isFirstLine && (
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] md:text-[9px] font-mono font-bold text-slate-400 whitespace-nowrap leading-tight">
                                                                {new Date(entry.date).toLocaleDateString()}
                                                            </span>
                                                            <span className="text-[9px] md:text-[10px] font-mono font-black text-indigo-500 leading-tight">
                                                                {entry.refId}
                                                            </span>
                                                            <div className="md:hidden mt-0.5">
                                                                <span className={`text-[6px] font-black uppercase tracking-widest px-1 py-0.5 rounded ${
                                                                    entry.type.includes("Deposit") ? "bg-emerald-50 text-emerald-600" :
                                                                    entry.type.includes("Withdrawal") ? "bg-red-50 text-red-500" :
                                                                    entry.type.includes("Dividend") ? "bg-blue-50 text-blue-500" :
                                                                    "bg-slate-50 text-slate-500"
                                                                }`}>{entry.type}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-1 hidden md:table-cell align-top">
                                                    {isFirstLine && (
                                                        <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                                            entry.type.includes("Deposit") ? "bg-emerald-50 text-emerald-600" :
                                                            entry.type.includes("Withdrawal") ? "bg-red-50 text-red-500" :
                                                            entry.type.includes("Dividend") ? "bg-blue-50 text-blue-500" :
                                                            "bg-slate-50 text-slate-500"
                                                        }`}>{entry.type}</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-1 border-r border-slate-50 align-top min-w-[120px]">
                                                    <div className={`flex flex-col md:flex-row md:items-center gap-1 md:gap-2 ${line.credit > 0 ? "pl-3 md:pl-4 opacity-75" : ""}`}>
                                                        <span className="text-[8px] md:text-[9px] font-mono font-bold text-indigo-400">{line.accountCode}</span>
                                                        <span className="text-[9px] md:text-[10px] font-bold text-slate-700 leading-tight break-words">{line.accountName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1 text-[9px] font-medium text-slate-500 hidden lg:table-cell align-top">
                                                    {isFirstLine ? entry.description : ""}
                                                </td>
                                                <td className="px-3 py-1 hidden xl:table-cell align-top">
                                                    {isFirstLine && entry.userName && (
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter truncate max-w-[120px] block">
                                                            {entry.userName}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-1 text-[9px] md:text-[10px] font-black text-slate-900 tabular-nums text-right border-r border-slate-50 align-top">
                                                    {line.debit > 0 ? `$${line.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ""}
                                                </td>
                                                <td className="px-3 py-1 text-[9px] md:text-[10px] font-black text-slate-900 tabular-nums text-right align-top">
                                                    {line.credit > 0 ? `$${line.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ""}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && <div className="p-16 text-center text-slate-400 font-black uppercase tracking-widest text-xs">No entries found.</div>}
                </div>
            </div>
        </div>
    );
}
