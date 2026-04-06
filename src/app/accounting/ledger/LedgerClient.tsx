"use client";

import React, { useState, useMemo } from "react";
import { useAccounting, CHART_OF_ACCOUNTS } from "@/providers/AccountingProvider";
import { Database } from "lucide-react";

export default function LedgerClient() {
    const { trialBalance, getJournalEntriesForAccount, loading } = useAccounting();
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

    const accountEntries = useMemo(() => {
        if (!selectedAccount) return [];
        const entries = getJournalEntriesForAccount(selectedAccount);
        // Sort chronologically for running balance
        return [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [selectedAccount, getJournalEntriesForAccount]);

    // Calculate running balance
    const ledgerRows = useMemo(() => {
        if (!selectedAccount) return [];
        const account = CHART_OF_ACCOUNTS.find(a => a.code === selectedAccount);
        if (!account) return [];

        let runningBalance = 0;
        return accountEntries.map(entry => {
            const line = entry.lines.find(l => l.accountCode === selectedAccount);
            if (!line) return null;
            if (account.normalBalance === "Debit") {
                runningBalance += line.debit - line.credit;
            } else {
                runningBalance += line.credit - line.debit;
            }
            return { ...entry, lineDebit: line.debit, lineCredit: line.credit, runningBalance };
        }).filter(Boolean);
    }, [accountEntries, selectedAccount]);

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent animate-spin rounded-full" /></div>;

    const accountGroups = [
        { label: "Assets", type: "Asset" },
        { label: "Liabilities", type: "Liability" },
        { label: "Equity", type: "Equity" },
        { label: "Revenue", type: "Revenue" },
        { label: "Expenses", type: "Expense" },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-20">
            <div className="space-y-1">
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none flex items-center gap-3">
                    <Database className="h-6 w-6 text-indigo-500" />
                    General Ledger
                </h1>
                <p className="text-slate-400 text-sm font-medium">Select an account to view its T-account ledger.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Chart of Accounts Sidebar */}
                <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-5 py-3 border-b border-slate-100">
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Chart of Accounts</h3>
                    </div>
                    <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-50">
                        {accountGroups.map(group => (
                            <div key={group.type}>
                                <div className="px-5 py-2 bg-slate-50">
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-500">{group.label}</span>
                                </div>
                                {CHART_OF_ACCOUNTS.filter(a => a.type === group.type).map(account => {
                                    const tb = trialBalance.find(ab => ab.account.code === account.code);
                                    const hasActivity = tb && (tb.totalDebit > 0 || tb.totalCredit > 0);
                                    return (
                                        <button
                                            key={account.code}
                                            onClick={() => setSelectedAccount(account.code)}
                                            className={`w-full text-left px-5 py-2.5 flex items-center justify-between transition-all ${
                                                selectedAccount === account.code
                                                    ? "bg-indigo-50 border-l-2 border-indigo-500"
                                                    : "hover:bg-slate-50 border-l-2 border-transparent"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-mono font-bold text-slate-400">{account.code}</span>
                                                <span className="text-[10px] font-bold text-slate-700">{account.name}</span>
                                            </div>
                                            {hasActivity && (
                                                <span className="text-[9px] font-black tabular-nums text-slate-500">
                                                    {tb!.balance >= 0 ? "" : "-"}${Math.abs(tb!.balance).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ledger Detail */}
                <div className="lg:col-span-3">
                    {!selectedAccount ? (
                        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
                            <Database className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Select an account to view its ledger</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Account Header */}
                            {(() => {
                                const account = CHART_OF_ACCOUNTS.find(a => a.code === selectedAccount);
                                const tb = trialBalance.find(ab => ab.account.code === selectedAccount);
                                return (
                                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <span className="text-[9px] font-mono font-bold text-indigo-500">{account?.code}</span>
                                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{account?.name}</h2>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{account?.type} • Normal {account?.normalBalance}</span>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Debit</p>
                                                <p className="text-sm font-black tabular-nums text-slate-900">$ {(tb?.totalDebit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Credit</p>
                                                <p className="text-sm font-black tabular-nums text-slate-900">$ {(tb?.totalCredit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                            </div>
                                            <div className="text-right border-l border-slate-200 pl-6">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Balance</p>
                                                <p className={`text-lg font-black tabular-nums ${(tb?.balance || 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                    $ {(tb?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Ledger Entries Table */}
                            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto max-h-[55vh] overflow-y-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 sticky top-0">
                                            <tr>
                                                <th className="px-5 py-3">Date</th>
                                                <th className="px-5 py-3">Ref</th>
                                                <th className="px-5 py-3">Description</th>
                                                <th className="px-5 py-3 text-right">Debit</th>
                                                <th className="px-5 py-3 text-right">Credit</th>
                                                <th className="px-5 py-3 text-right">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {ledgerRows.map((row: any, i: number) => (
                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-5 py-3 text-[10px] font-mono font-bold text-slate-400 whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</td>
                                                    <td className="px-5 py-3 text-[10px] font-mono font-black text-indigo-500">{row.refId}</td>
                                                    <td className="px-5 py-3 text-[10px] font-bold text-slate-700 max-w-[250px] truncate">{row.description}</td>
                                                    <td className="px-5 py-3 text-[10px] font-black tabular-nums text-right text-slate-900">{row.lineDebit > 0 ? `$ ${row.lineDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ""}</td>
                                                    <td className="px-5 py-3 text-[10px] font-black tabular-nums text-right text-slate-900">{row.lineCredit > 0 ? `$ ${row.lineCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ""}</td>
                                                    <td className={`px-5 py-3 text-[10px] font-black tabular-nums text-right ${row.runningBalance >= 0 ? "text-emerald-600" : "text-red-500"}`}>$ {row.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {ledgerRows.length === 0 && <div className="p-12 text-center text-slate-400 font-black uppercase tracking-widest text-xs">No entries for this account.</div>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
