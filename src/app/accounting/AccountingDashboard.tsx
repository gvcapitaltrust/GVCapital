"use client";

import React from "react";
import { useAccounting } from "@/providers/AccountingProvider";
import { Scale } from "lucide-react";
import Link from "next/link";

export default function AccountingDashboard() {
    const { trialBalance, profitAndLoss, balanceSheet, cashFlowStatement, journalEntries, users, fundAccounts, loading, period, setPeriod } = useAccounting();

    const totalDebits = trialBalance.reduce((s, ab) => s + ab.totalDebit, 0);
    const totalCredits = trialBalance.reduce((s, ab) => s + ab.totalCredit, 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
    const fmt = (n: number) => `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const periods = [
        { label: "All Time", start: null, end: null },
        { label: "This Month", start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: new Date() },
        { label: "This Quarter", start: new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1), end: new Date() },
        { label: "This Year", start: new Date(new Date().getFullYear(), 0, 1), end: new Date() },
    ];

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-8 w-8 border-3 border-indigo-500 border-t-transparent animate-spin rounded-full" /></div>;

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-20">
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h1 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none">Accounting Dashboard</h1>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                    {periods.map(p => (
                        <button key={p.label} onClick={() => setPeriod({ startDate: p.start, endDate: p.end, label: p.label })}
                            className={`px-2.5 py-1.5 rounded text-[8px] font-black uppercase tracking-widest transition-all ${period.label === p.label ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-700"}`}>{p.label}</button>
                    ))}
                </div>
            </div>

            {/* Compact Summary Strip */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[8px] font-black uppercase tracking-widest text-slate-400">
                        <tr>
                            <th className="px-4 py-2">Total Assets</th>
                            <th className="px-4 py-2">Total L + E</th>
                            <th className="px-4 py-2">Net Income</th>
                            <th className="px-4 py-2">Net Cash Flow</th>
                            <th className="px-4 py-2">Trial Balance</th>
                            <th className="px-4 py-2 text-right">Entries</th>
                            <th className="px-4 py-2 text-right">Users</th>
                            <th className="px-4 py-2 text-right">Funds</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="text-[11px] font-black tabular-nums">
                            <td className="px-4 py-2.5 text-slate-900">$ {fmt(balanceSheet.totalAssets)}</td>
                            <td className="px-4 py-2.5 text-slate-900">$ {fmt(balanceSheet.totalLiabilitiesEquity)}</td>
                            <td className={`px-4 py-2.5 ${profitAndLoss.netIncome >= 0 ? "text-emerald-600" : "text-red-500"}`}>{profitAndLoss.netIncome >= 0 ? "+" : "-"} $ {fmt(Math.abs(profitAndLoss.netIncome))}</td>
                            <td className={`px-4 py-2.5 ${cashFlowStatement.netCashFlow >= 0 ? "text-emerald-600" : "text-red-500"}`}>$ {fmt(cashFlowStatement.netCashFlow)}</td>
                            <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${isBalanced ? "text-emerald-600" : "text-red-500"}`}>
                                    <Scale className="h-3 w-3" /> {isBalanced ? "OK" : "ERR"}
                                </span>
                            </td>
                            <td className="px-4 py-2.5 text-right text-slate-900">{journalEntries.length}</td>
                            <td className="px-4 py-2.5 text-right text-slate-900">{users.length}</td>
                            <td className="px-4 py-2.5 text-right text-slate-900">{fundAccounts.length}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Two Column: Trial Balance + P&L Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Trial Balance */}
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Trial Balance</span>
                        <Link href="/accounting/ledger" className="text-[8px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700">View Ledger →</Link>
                    </div>
                    <div className="max-h-[280px] overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-[8px] font-black uppercase tracking-widest text-slate-400 sticky top-0">
                                <tr>
                                    <th className="px-3 py-1.5">Code</th>
                                    <th className="px-3 py-1.5">Account</th>
                                    <th className="px-3 py-1.5 text-right">Debit</th>
                                    <th className="px-3 py-1.5 text-right">Credit</th>
                                    <th className="px-3 py-1.5 text-right">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {trialBalance.map(ab => (
                                    <tr key={ab.account.code} className="hover:bg-slate-50/50 text-[10px]">
                                        <td className="px-3 py-1.5 font-mono font-bold text-slate-400">{ab.account.code}</td>
                                        <td className="px-3 py-1.5 font-bold text-slate-700 truncate max-w-[140px]">{ab.account.name}</td>
                                        <td className="px-3 py-1.5 font-black tabular-nums text-right text-slate-900">{ab.totalDebit > 0 ? fmt(ab.totalDebit) : ""}</td>
                                        <td className="px-3 py-1.5 font-black tabular-nums text-right text-slate-900">{ab.totalCredit > 0 ? fmt(ab.totalCredit) : ""}</td>
                                        <td className={`px-3 py-1.5 font-black tabular-nums text-right ${ab.balance >= 0 ? "text-slate-900" : "text-red-500"}`}>{fmt(ab.balance)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 text-[10px] font-black border-t border-slate-200">
                                <tr>
                                    <td className="px-3 py-2" colSpan={2}>TOTALS</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{fmt(totalDebits)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{fmt(totalCredits)}</td>
                                    <td className={`px-3 py-2 text-right tabular-nums ${isBalanced ? "text-emerald-600" : "text-red-500"}`}>{isBalanced ? "✓" : `Δ ${fmt(Math.abs(totalDebits - totalCredits))}`}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Quick P&L */}
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Income Summary</span>
                        <Link href="/accounting/statements" className="text-[8px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700">Full Statements →</Link>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {profitAndLoss.revenue.length > 0 && (
                            <div className="px-4 py-2">
                                <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500 mb-1">Revenue</p>
                                {profitAndLoss.revenue.map(ab => (
                                    <div key={ab.account.code} className="flex justify-between text-[10px] py-0.5">
                                        <span className="font-bold text-slate-600">{ab.account.name}</span>
                                        <span className="font-black tabular-nums text-emerald-600">{fmt(ab.balance)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {profitAndLoss.expenses.length > 0 && (
                            <div className="px-4 py-2">
                                <p className="text-[8px] font-black uppercase tracking-widest text-red-400 mb-1">Expenses</p>
                                {profitAndLoss.expenses.map(ab => (
                                    <div key={ab.account.code} className="flex justify-between text-[10px] py-0.5">
                                        <span className="font-bold text-slate-600">{ab.account.name}</span>
                                        <span className="font-black tabular-nums text-red-500">({fmt(ab.balance)})</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className={`px-4 py-2.5 ${profitAndLoss.netIncome >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                            <div className="flex justify-between text-[11px]">
                                <span className="font-black uppercase tracking-widest text-slate-700">Net Income</span>
                                <span className={`font-black tabular-nums ${profitAndLoss.netIncome >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                    {profitAndLoss.netIncome >= 0 ? "" : "("}$ {fmt(Math.abs(profitAndLoss.netIncome))}{profitAndLoss.netIncome < 0 ? ")" : ""}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Journal Entries */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Recent Journal Entries</span>
                    <Link href="/accounting/journal" className="text-[8px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700">View All →</Link>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[8px] font-black uppercase tracking-widest text-slate-400">
                        <tr>
                            <th className="px-3 py-1.5">Date</th>
                            <th className="px-3 py-1.5">Ref</th>
                            <th className="px-3 py-1.5">Type</th>
                            <th className="px-3 py-1.5">Description</th>
                            <th className="px-3 py-1.5 text-right">Amount (USD)</th>
                            <th className="px-3 py-1.5 text-right">Activity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {journalEntries.slice(0, 15).map((entry, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 text-[10px]">
                                <td className="px-3 py-1.5 font-mono font-bold text-slate-400 whitespace-nowrap">{new Date(entry.date).toLocaleDateString()}</td>
                                <td className="px-3 py-1.5 font-mono font-black text-indigo-500">{entry.refId}</td>
                                <td className="px-3 py-1.5">
                                    <span className={`text-[7px] font-black uppercase tracking-widest px-1 py-0.5 rounded ${
                                        entry.type.includes("Deposit") ? "bg-emerald-50 text-emerald-600" :
                                        entry.type.includes("Withdrawal") ? "bg-red-50 text-red-500" :
                                        entry.type.includes("Dividend") ? "bg-blue-50 text-blue-600" :
                                        "bg-slate-50 text-slate-500"
                                    }`}>{entry.type}</span>
                                </td>
                                <td className="px-3 py-1.5 font-bold text-slate-700 max-w-[250px] truncate">{entry.description}</td>
                                <td className="px-3 py-1.5 font-black tabular-nums text-right text-slate-900">$ {fmt(entry.principalAmount)}</td>
                                <td className="px-3 py-1.5 text-right">
                                    <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">
                                        {entry.totalDebit > entry.principalAmount ? `+ $${fmt(entry.totalDebit - entry.principalAmount)} revenue` : "Standard"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {journalEntries.length === 0 && <div className="p-8 text-center text-slate-400 font-bold text-xs">No journal entries found.</div>}
            </div>
        </div>
    );
}
