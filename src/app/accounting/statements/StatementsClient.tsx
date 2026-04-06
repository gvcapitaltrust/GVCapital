"use client";

import React, { useState } from "react";
import { useAccounting } from "@/providers/AccountingProvider";
import { BarChart3, TrendingUp, TrendingDown, Scale, ArrowDownRight, ArrowUpRight, DollarSign } from "lucide-react";

type Tab = "pnl" | "balance" | "cashflow";

export default function StatementsClient() {
    const { profitAndLoss, balanceSheet, cashFlowStatement, journalEntries, period, setPeriod, loading } = useAccounting();
    const [activeTab, setActiveTab] = useState<Tab>("pnl");

    const periods = [
        { label: "All Time", start: null, end: null },
        { label: "This Month", start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: new Date() },
        { label: "This Quarter", start: new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1), end: new Date() },
        { label: "This Year", start: new Date(new Date().getFullYear(), 0, 1), end: new Date() },
    ];

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: "pnl", label: "Profit & Loss", icon: <TrendingUp className="h-4 w-4" /> },
        { id: "balance", label: "Balance Sheet", icon: <Scale className="h-4 w-4" /> },
        { id: "cashflow", label: "Cash Flow", icon: <DollarSign className="h-4 w-4" /> },
    ];

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent animate-spin rounded-full" /></div>;

    const formatUSD = (n: number) => `$ ${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h1 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-indigo-500" />
                    Financial Statements
                    <span className="text-[9px] font-bold text-slate-400 ml-2">({period.label})</span>
                </h1>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                    {periods.map(p => (
                        <button key={p.label} onClick={() => setPeriod({ startDate: p.start, endDate: p.end, label: p.label })}
                            className={`px-2.5 py-1.5 rounded text-[8px] font-black uppercase tracking-widest transition-all ${period.label === p.label ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-700"}`}>{p.label}</button>
                    ))}
                </div>
            </div>

            {/* Tab Selector */}
            <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-700"}`}>
                        {tab.icon}<span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ─── PROFIT & LOSS ─────────────────────────────────────────── */}
            {activeTab === "pnl" && (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden animate-in fade-in duration-200">
                    <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                        <h2 className="text-[9px] font-black uppercase tracking-widest text-slate-500">Profit & Loss Statement — {period.label}</h2>
                    </div>
                    <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500 mb-1">Revenue</p>
                        {profitAndLoss.revenue.length > 0 ? (
                            <div className="space-y-0.5 pl-3">
                                {profitAndLoss.revenue.map(ab => (
                                    <div key={ab.account.code} className="flex justify-between text-[9px] md:text-[10px] py-1 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors px-1">
                                        <span className="font-bold text-slate-600 truncate max-w-[200px] md:max-w-none">
                                            <span className="font-mono text-slate-400 mr-1.5 hidden sm:inline">{ab.account.code}</span>
                                            {ab.account.name}
                                        </span>
                                        <span className="font-black tabular-nums text-emerald-600 whitespace-nowrap ml-2">{formatUSD(ab.balance)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-[10px] pt-1 border-t border-slate-100 mt-1 font-black">
                                    <span className="text-slate-500 uppercase tracking-widest text-[9px]">Total Revenue</span>
                                    <span className="tabular-nums text-emerald-600">{formatUSD(profitAndLoss.revenue.reduce((s, a) => s + a.balance, 0))}</span>
                                </div>
                            </div>
                        ) : <p className="text-[9px] text-slate-400 pl-3 italic">No revenue recorded.</p>}
                    </div>
                    <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-[8px] font-black uppercase tracking-widest text-red-400 mb-1">Expenses</p>
                        {profitAndLoss.expenses.length > 0 ? (
                            <div className="space-y-0.5 pl-3">
                                {profitAndLoss.expenses.map(ab => (
                                    <div key={ab.account.code} className="flex justify-between text-[9px] md:text-[10px] py-1 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors px-1">
                                        <span className="font-bold text-slate-600 truncate max-w-[200px] md:max-w-none">
                                            <span className="font-mono text-slate-400 mr-1.5 hidden sm:inline">{ab.account.code}</span>
                                            {ab.account.name}
                                        </span>
                                        <span className="font-black tabular-nums text-red-500 whitespace-nowrap ml-2">({formatUSD(ab.balance)})</span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-[10px] pt-1 border-t border-slate-100 mt-1 font-black">
                                    <span className="text-slate-500 uppercase tracking-widest text-[9px]">Total Expenses</span>
                                    <span className="tabular-nums text-red-500">({formatUSD(profitAndLoss.expenses.reduce((s, a) => s + a.balance, 0))})</span>
                                </div>
                            </div>
                        ) : <p className="text-[9px] text-slate-400 pl-3 italic">No expenses recorded.</p>}
                    </div>
                    <div className={`px-4 py-2.5 flex justify-between items-center ${profitAndLoss.netIncome >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Net Income / (Loss)</span>
                        <span className={`text-sm font-black tabular-nums ${profitAndLoss.netIncome >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {profitAndLoss.netIncome >= 0 ? "" : "("}{formatUSD(profitAndLoss.netIncome)}{profitAndLoss.netIncome < 0 ? ")" : ""}
                        </span>
                    </div>
                </div>
            )}

            {/* ─── BALANCE SHEET ──────────────────────────────────────────── */}
            {activeTab === "balance" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-1.5 border-b border-slate-100 bg-blue-50">
                            <h3 className="text-[9px] font-black uppercase tracking-widest text-blue-600">Assets</h3>
                        </div>
                        <div className="px-4 py-2 space-y-0.5">
                            {balanceSheet.assets.map(ab => (
                                <div key={ab.account.code} className="flex justify-between text-[9px] md:text-[10px] py-1 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors px-1">
                                    <span className="font-bold text-slate-600 truncate max-w-[200px] md:max-w-none">
                                        <span className="font-mono text-slate-400 mr-1.5 hidden sm:inline">{ab.account.code}</span>
                                        {ab.account.name}
                                    </span>
                                    <span className="font-black tabular-nums text-slate-900 whitespace-nowrap ml-2">{formatUSD(ab.balance)}</span>
                                </div>
                            ))}
                            {balanceSheet.assets.length === 0 && <p className="text-[9px] text-slate-400 italic">No asset accounts.</p>}
                        </div>
                        <div className="px-4 py-1.5 border-t border-slate-100 bg-slate-50 flex justify-between text-[10px] font-black">
                            <span className="text-slate-500 uppercase tracking-widest text-[9px]">Total Assets</span>
                            <span className="tabular-nums text-blue-600">{formatUSD(balanceSheet.totalAssets)}</span>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-1.5 border-b border-slate-100 bg-amber-50">
                            <h3 className="text-[9px] font-black uppercase tracking-widest text-amber-600">Liabilities</h3>
                        </div>
                        <div className="px-4 py-2 space-y-0.5">
                            {balanceSheet.liabilities.map(ab => (
                                <div key={ab.account.code} className="flex justify-between text-[9px] md:text-[10px] py-1 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors px-1">
                                    <span className="font-bold text-slate-600 truncate max-w-[200px] md:max-w-none">
                                        <span className="font-mono text-slate-400 mr-1.5 hidden sm:inline">{ab.account.code}</span>
                                        {ab.account.name}
                                    </span>
                                    <span className="font-black tabular-nums text-slate-900 whitespace-nowrap ml-2">{formatUSD(ab.balance)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-1.5 border-b border-slate-100 bg-violet-50">
                            <h3 className="text-[9px] font-black uppercase tracking-widest text-violet-600">Equity</h3>
                        </div>
                        <div className="px-4 py-2 space-y-0.5">
                            {balanceSheet.equity.map(ab => (
                                <div key={ab.account.code} className="flex justify-between text-[9px] md:text-[10px] py-1 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors px-1">
                                    <span className="font-bold text-slate-600 truncate max-w-[200px] md:max-w-none">
                                        <span className="font-mono text-slate-400 mr-1.5 hidden sm:inline">{ab.account.code}</span>
                                        {ab.account.name}
                                    </span>
                                    <span className="font-black tabular-nums text-slate-900 whitespace-nowrap ml-2">{formatUSD(ab.balance)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between text-[10px] pt-1 border-t border-slate-100 mt-1">
                                <span className="font-bold text-slate-700 italic">Current Period Net Income</span>
                                <span className={`font-black tabular-nums ${profitAndLoss.netIncome >= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatUSD(profitAndLoss.netIncome)}</span>
                            </div>
                        </div>
                    </div>
                    <div className={`border rounded-lg px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[9px] md:text-[10px] ${Math.abs(balanceSheet.totalAssets - balanceSheet.totalLiabilitiesEquity) < 0.01 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 font-bold text-slate-500">
                            <span>A = L + E</span>
                            <span className="hidden md:inline">|</span>
                            <span>Assets: {formatUSD(balanceSheet.totalAssets)}</span>
                            <span className="hidden md:inline">=</span>
                            <span>L+E: {formatUSD(balanceSheet.totalLiabilitiesEquity)}</span>
                        </div>
                        <span className={`font-black uppercase tracking-widest ${Math.abs(balanceSheet.totalAssets - balanceSheet.totalLiabilitiesEquity) < 0.01 ? "text-emerald-600" : "text-red-500"}`}>
                            {Math.abs(balanceSheet.totalAssets - balanceSheet.totalLiabilitiesEquity) < 0.01 ? "✓ OK" : "✗ ERR"}
                        </span>
                    </div>
                </div>
            )}

            {/* ─── CASH FLOW ────────────────────────────────────────────── */}
            {activeTab === "cashflow" && (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden animate-in fade-in duration-200">
                    <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                        <h2 className="text-[9px] font-black uppercase tracking-widest text-slate-500">Statement of Cash Flows — {period.label}</h2>
                    </div>
                    <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-[8px] font-black uppercase tracking-widest text-indigo-500 mb-1">Operating Activities</p>
                        <div className="flex justify-between text-[10px] py-0.5 pl-3">
                            <span className="font-bold text-slate-600">Dividends & Bonuses Paid</span>
                            <span className="font-black tabular-nums text-red-500">({formatUSD(Math.abs(cashFlowStatement.operating))})</span>
                        </div>
                        <div className="flex justify-between text-[10px] pt-1 border-t border-slate-100 mt-1 font-black">
                            <span className="text-slate-500 uppercase tracking-widest text-[9px]">Net Operating</span>
                            <span className={`tabular-nums ${cashFlowStatement.operating >= 0 ? "text-emerald-600" : "text-red-500"}`}>{cashFlowStatement.operating >= 0 ? "" : "("}{formatUSD(cashFlowStatement.operating)}{cashFlowStatement.operating < 0 ? ")" : ""}</span>
                        </div>
                    </div>
                    <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-[8px] font-black uppercase tracking-widest text-indigo-500 mb-1">Financing Activities</p>
                        <div className="space-y-0.5 pl-3">
                            {cashFlowStatement.details.filter(d => d.label !== "Dividends & Bonuses Paid").map((d, i) => (
                                <div key={i} className="flex justify-between text-[10px] py-0.5">
                                    <span className="font-bold text-slate-600">{d.label}</span>
                                    <span className={`font-black tabular-nums ${d.amount >= 0 ? "text-emerald-600" : "text-red-500"}`}>{d.amount < 0 ? "(" : ""}{formatUSD(d.amount)}{d.amount < 0 ? ")" : ""}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-[10px] pt-1 border-t border-slate-100 mt-1 font-black">
                            <span className="text-slate-500 uppercase tracking-widest text-[9px]">Net Financing</span>
                            <span className={`tabular-nums ${cashFlowStatement.financing >= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatUSD(cashFlowStatement.financing)}</span>
                        </div>
                    </div>
                    <div className={`px-4 py-2.5 flex justify-between items-center ${cashFlowStatement.netCashFlow >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Net Change in Cash</span>
                        <span className={`text-sm font-black tabular-nums ${cashFlowStatement.netCashFlow >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {cashFlowStatement.netCashFlow >= 0 ? "+" : "-"} {formatUSD(cashFlowStatement.netCashFlow)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
