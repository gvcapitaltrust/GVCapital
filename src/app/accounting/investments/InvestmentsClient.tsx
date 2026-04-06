"use client";

import React, { useState } from "react";
import { useAccounting, FundTransaction } from "@/providers/AccountingProvider";
import { TrendingUp, TrendingDown, ArrowRightLeft, Plus, Check, X, AlertTriangle, Users } from "lucide-react";

type FundType = "forex" | "stock" | "other";
type TxType = "allocation" | "return" | "loss" | "reallocation" | "withdrawal" | "distribution";

const FUND_LABELS: Record<FundType, string> = { forex: "Forex Trading", stock: "Stock Trading", other: "Other Investments" };
const TX_LABELS: Record<TxType, string> = { 
    allocation: "Allocate Capital", 
    return: "Record Return", 
    loss: "Record Loss", 
    reallocation: "Reallocate", 
    withdrawal: "Withdraw to Cash",
    distribution: "Distribute Profits (To Users)"
};

export default function InvestmentsClient() {
    const { investmentSummary, fundTransactions, recordFundTransaction, distributeFundProfits, loading } = useAccounting();
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [fundType, setFundType] = useState<FundType>("forex");
    const [txType, setTxType] = useState<TxType>("allocation");
    const [amount, setAmount] = useState("");
    const [targetFund, setTargetFund] = useState<FundType>("stock");
    const [description, setDescription] = useState("");

    const fmt = (n: number) => `$ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const totalAllocated = investmentSummary.reduce((s, a) => s + a.totalAllocated, 0);
    const totalBalance = investmentSummary.reduce((s, a) => s + a.currentBalance, 0);
    const totalReturns = investmentSummary.reduce((s, a) => s + a.totalReturns, 0);
    const totalLosses = investmentSummary.reduce((s, a) => s + a.totalLosses, 0);
    const netROI = totalAllocated > 0 ? ((totalReturns - totalLosses) / totalAllocated * 100).toFixed(2) : "0.00";

    const handleSubmit = async () => {
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) { setError("Enter a valid amount."); return; }
        setSubmitting(true);
        setError(null);

        let ok = false;
        if (txType === "distribution") {
            ok = await distributeFundProfits(fundType, amt);
        } else {
            const tx: Omit<FundTransaction, "id" | "created_at"> = {
                fund_type: fundType,
                transaction_type: txType as any,
                amount_usd: amt,
                description: description || undefined,
                target_fund_type: txType === "reallocation" ? targetFund : undefined,
            };
            ok = await recordFundTransaction(tx);
        }

        setSubmitting(false);
        if (ok) {
            setSuccess(`${TX_LABELS[txType]} — ${fmt(amt)} recorded.`);
            setAmount("");
            setDescription("");
            setShowForm(false);
            setTimeout(() => setSuccess(null), 4000);
        } else {
            setError(txType === "distribution" 
                ? "Distribution failed. Ensure users are assigned to this fund and have balances." 
                : "Failed to record activity.");
        }
    };

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-8 w-8 border-3 border-indigo-500 border-t-transparent animate-spin rounded-full" /></div>;

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h1 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-500" />
                    Investment Accounts
                </h1>
                <button onClick={() => { setShowForm(!showForm); setError(null); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${showForm ? "bg-slate-200 text-slate-700" : "bg-indigo-500 text-white hover:bg-indigo-600"}`}>
                    {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                    {showForm ? "Cancel" : "Record Activity"}
                </button>
            </div>

            {/* Success Toast */}
            {success && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-[10px] font-black text-emerald-700 animate-in fade-in duration-300">
                    <Check className="h-3.5 w-3.5" /> {success}
                </div>
            )}

            {/* Record Form */}
            {showForm && (
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Record Investment Activity</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Fund Account</label>
                            <select value={fundType} onChange={e => setFundType(e.target.value as FundType)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-indigo-400">
                                <option value="forex">Forex Trading (1300)</option>
                                <option value="stock">Stock Trading (1310)</option>
                                <option value="other">Other Investments (1320)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Activity Type</label>
                            <select value={txType} onChange={e => setTxType(e.target.value as TxType)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-indigo-400">
                                <option value="allocation">Allocate Capital (Cash → Fund)</option>
                                <option value="return">Record Return (Gain)</option>
                                <option value="loss">Record Loss</option>
                                <option value="withdrawal">Withdraw to Cash (Fund → Cash)</option>
                                <option value="reallocation">Reallocate (Fund → Fund)</option>
                                <option value="distribution">Distribute Profits (Fund → Investors)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1 block">{txType === "distribution" ? "Total Profit to Payout" : "Amount (USD)"}</label>
                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0.01" step="0.01"
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700 tabular-nums focus:outline-none focus:border-indigo-400" />
                        </div>
                        {txType === "reallocation" && (
                            <div>
                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Target Account</label>
                                <select value={targetFund} onChange={e => setTargetFund(e.target.value as FundType)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-indigo-400">
                                    {(["forex", "stock", "other"] as FundType[]).filter(f => f !== fundType).map(f => (
                                        <option key={f} value={f}>{FUND_LABELS[f]}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {txType === "distribution" && (
                            <div className="flex items-center gap-2 pt-5">
                                <div className="bg-amber-50 border border-amber-100 rounded p-1.5 flex items-center gap-1.5">
                                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                                    <span className="text-[7px] font-black uppercase tracking-tighter text-amber-600">Pro-rata distribution to all fund investors.</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Description (Optional)</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. March forex trading profit"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-indigo-400" />
                    </div>

                    {/* Preview double-entry */}
                    {parseFloat(amount) > 0 && (
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Double-Entry Preview</p>
                            <table className="w-full text-[10px]">
                                <thead className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                    <tr><th className="text-left py-0.5">Account</th><th className="text-right py-0.5">Debit</th><th className="text-right py-0.5">Credit</th></tr>
                                </thead>
                                <tbody className="font-bold tabular-nums text-slate-700">
                                    {txType === "allocation" && (<>
                                        <tr><td className="py-0.5">{FUND_LABELS[fundType]} Account</td><td className="text-right">{fmt(parseFloat(amount))}</td><td></td></tr>
                                        <tr><td className="py-0.5 pl-4 text-slate-400">Cash & Bank (USD)</td><td></td><td className="text-right">{fmt(parseFloat(amount))}</td></tr>
                                    </>)}
                                    {txType === "return" && (<>
                                        <tr><td className="py-0.5">{FUND_LABELS[fundType]} Account</td><td className="text-right text-emerald-600">{fmt(parseFloat(amount))}</td><td></td></tr>
                                        <tr><td className="py-0.5 pl-4 text-slate-400">{FUND_LABELS[fundType]} Gains</td><td></td><td className="text-right text-emerald-600">{fmt(parseFloat(amount))}</td></tr>
                                    </>)}
                                    {txType === "loss" && (<>
                                        <tr><td className="py-0.5">{FUND_LABELS[fundType]} Losses</td><td className="text-right text-red-500">{fmt(parseFloat(amount))}</td><td></td></tr>
                                        <tr><td className="py-0.5 pl-4 text-slate-400">{FUND_LABELS[fundType]} Account</td><td></td><td className="text-right text-red-500">{fmt(parseFloat(amount))}</td></tr>
                                    </>)}
                                    {txType === "withdrawal" && (<>
                                        <tr><td className="py-0.5">Cash & Bank (USD)</td><td className="text-right">{fmt(parseFloat(amount))}</td><td></td></tr>
                                        <tr><td className="py-0.5 pl-4 text-slate-400">{FUND_LABELS[fundType]} Account</td><td></td><td className="text-right">{fmt(parseFloat(amount))}</td></tr>
                                    </>)}
                                    {txType === "reallocation" && (<>
                                        <tr><td className="py-0.5">{FUND_LABELS[targetFund]} Account</td><td className="text-right">{fmt(parseFloat(amount))}</td><td></td></tr>
                                        <tr><td className="py-0.5 pl-4 text-slate-400">{FUND_LABELS[fundType]} Account</td><td></td><td className="text-right">{fmt(parseFloat(amount))}</td></tr>
                                    </>)}
                                    {txType === "distribution" && (<>
                                        <tr className="border-b border-slate-200/50"><td colSpan={3} className="py-1 text-[7px] font-black uppercase text-slate-400 italic">Phase 1: Capital Return from Fund</td></tr>
                                        <tr><td className="py-0.5 text-indigo-600">Cash & Bank (USD)</td><td className="text-right text-indigo-600">{fmt(parseFloat(amount))}</td><td></td></tr>
                                        <tr><td className="py-0.5 pl-4 text-slate-400">{FUND_LABELS[fundType]} Account</td><td></td><td className="text-right text-indigo-600">{fmt(parseFloat(amount))}</td></tr>
                                        <tr className="border-b border-slate-200/50"><td colSpan={3} className="py-1 text-[7px] font-black uppercase text-slate-400 italic pt-2">Phase 2: Dividend Payout to Investors</td></tr>
                                        <tr><td className="py-0.5 text-emerald-600">Dividends Paid (Expense)</td><td className="text-right text-emerald-600">{fmt(parseFloat(amount))}</td><td></td></tr>
                                        <tr><td className="py-0.5 pl-4 text-slate-400">Client Deposits Payable</td><td></td><td className="text-right text-emerald-600">{fmt(parseFloat(amount))}</td></tr>
                                    </>)}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 text-[9px] font-black text-red-500">
                            <AlertTriangle className="h-3 w-3" /> {error}
                        </div>
                    )}
                    <button onClick={handleSubmit} disabled={submitting}
                        className="w-full sm:w-auto px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20">
                        {submitting ? "Distributing..." : txType === "distribution" ? "Confirm & Distribute Profits" : "Confirm & Record"}
                    </button>
                </div>
            )}

            {/* Investment Account Summary Table */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Investment Account Performance</span>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[8px] font-black uppercase tracking-widest text-slate-400">
                        <tr>
                            <th className="px-3 py-1.5">Account</th>
                            <th className="px-3 py-1.5 text-right">Allocated</th>
                            <th className="px-3 py-1.5 text-right">Returns</th>
                            <th className="px-3 py-1.5 text-right">Losses</th>
                            <th className="px-3 py-1.5 text-right">Withdrawn/Dist</th>
                            <th className="px-3 py-1.5 text-right">Balance</th>
                            <th className="px-3 py-1.5 text-right">ROI</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {investmentSummary.map(acc => (
                            <tr key={acc.fundType} className="hover:bg-slate-50/50 text-[10px]">
                                <td className="px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-[9px] font-bold text-slate-400">{acc.accountCode}</span>
                                        <span className="font-black text-slate-900">{acc.label}</span>
                                        <span className="text-[7px] font-bold text-slate-400">({acc.transactions.length} txns)</span>
                                    </div>
                                </td>
                                <td className="px-3 py-2 text-right font-black tabular-nums text-slate-900">{acc.totalAllocated > 0 ? fmt(acc.totalAllocated) : "—"}</td>
                                <td className="px-3 py-2 text-right font-black tabular-nums text-emerald-600">{acc.totalReturns > 0 ? `+${fmt(acc.totalReturns)}` : "—"}</td>
                                <td className="px-3 py-2 text-right font-black tabular-nums text-red-500">{acc.totalLosses > 0 ? `(${fmt(acc.totalLosses)})` : "—"}</td>
                                <td className="px-3 py-2 text-right font-black tabular-nums text-slate-500">{acc.totalWithdrawn > 0 ? fmt(acc.totalWithdrawn) : "—"}</td>
                                <td className={`px-3 py-2 text-right font-black tabular-nums ${acc.currentBalance >= 0 ? "text-slate-900" : "text-red-500"}`}>{fmt(acc.currentBalance)}</td>
                                <td className={`px-3 py-2 text-right font-black tabular-nums ${acc.roi >= 0 ? "text-emerald-600" : "text-red-500"}`}>{acc.roi.toFixed(2)}%</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-50 text-[10px] font-black border-t border-slate-200">
                        <tr>
                            <td className="px-3 py-2 uppercase tracking-widest text-[9px]">Totals</td>
                            <td className="px-3 py-2 text-right tabular-nums">{fmt(totalAllocated)}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-emerald-600">{totalReturns > 0 ? `+${fmt(totalReturns)}` : "—"}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-red-500">{totalLosses > 0 ? `(${fmt(totalLosses)})` : "—"}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmt(investmentSummary.reduce((s, a) => s + a.totalWithdrawn, 0))}</td>
                            <td className={`px-3 py-2 text-right tabular-nums ${totalBalance >= 0 ? "text-slate-900" : "text-red-500"}`}>{fmt(totalBalance)}</td>
                            <td className={`px-3 py-2 text-right tabular-nums ${parseFloat(netROI) >= 0 ? "text-emerald-600" : "text-red-500"}`}>{netROI}%</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Recent Fund Activity Log */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Activity Log ({fundTransactions.length} records)</span>
                </div>
                {fundTransactions.length > 0 ? (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-[8px] font-black uppercase tracking-widest text-slate-400">
                            <tr>
                                <th className="px-3 py-1.5">Date</th>
                                <th className="px-3 py-1.5">Type</th>
                                <th className="px-3 py-1.5">Account</th>
                                <th className="px-3 py-1.5">Description</th>
                                <th className="px-3 py-1.5 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {[...fundTransactions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(ft => (
                                <tr key={ft.id} className="hover:bg-slate-50/50 text-[10px]">
                                    <td className="px-3 py-1.5 font-mono font-bold text-slate-400 whitespace-nowrap">{new Date(ft.created_at).toLocaleDateString()}</td>
                                    <td className="px-3 py-1.5">
                                        <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                            ft.transaction_type === "allocation" ? "bg-blue-50 text-blue-600" :
                                            ft.transaction_type === "return" ? "bg-emerald-50 text-emerald-600" :
                                            ft.transaction_type === "loss" ? "bg-red-50 text-red-500" :
                                            ft.transaction_type === "reallocation" ? "bg-violet-50 text-violet-600" :
                                            ft.transaction_type === "distribution" ? "bg-indigo-50 text-indigo-600" :
                                            "bg-amber-50 text-amber-600"
                                        }`}>
                                            {ft.transaction_type === "reallocation" ? (
                                                <span className="flex items-center gap-0.5"><ArrowRightLeft className="h-2.5 w-2.5" /> Realloc</span>
                                            ) : ft.transaction_type === "return" ? (
                                                <span className="flex items-center gap-0.5"><TrendingUp className="h-2.5 w-2.5" /> Return</span>
                                            ) : ft.transaction_type === "loss" ? (
                                                <span className="flex items-center gap-0.5"><TrendingDown className="h-2.5 w-2.5" /> Loss</span>
                                            ) : ft.transaction_type === "distribution" ? (
                                                <span className="flex items-center gap-0.5"><Users className="h-2.5 w-2.5" /> Distribution</span>
                                            ) : ft.transaction_type}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5 font-bold text-slate-700">
                                        {FUND_LABELS[ft.fund_type as FundType] || ft.fund_type}
                                        {ft.transaction_type === "reallocation" && ft.target_fund_type && (
                                            <span className="text-slate-400"> → {FUND_LABELS[ft.target_fund_type as FundType] || ft.target_fund_type}</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-1.5 font-bold text-slate-500 max-w-[200px] truncate">{ft.description || "—"}</td>
                                    <td className={`px-3 py-1.5 text-right font-black tabular-nums ${
                                        ft.transaction_type === "return" ? "text-emerald-600" :
                                        ft.transaction_type === "loss" ? "text-red-500" : "text-slate-900"
                                    }`}>{fmt(Number(ft.amount_usd))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-8 text-center text-slate-400 text-xs font-bold">
                        No investment activities recorded yet. Click &quot;Record Activity&quot; to start.
                    </div>
                )}
            </div>
        </div>
    );
}
