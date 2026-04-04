"use client";

import React, { useState } from "react";
import { useAdmin } from "@/providers/AdminProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { formatDate } from "@/lib/dateUtils";

export default function WithdrawalsClient({ lang }: { lang: "en" | "zh" }) {
    const { withdrawals, loading, handleApproveWithdrawal, handleCompleteWithdrawal, handleRejectWithdrawal } = useAdmin();
    const { forexRate } = useSettings();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const t = {
        en: {
            title: "Withdrawal Management",
            subtitle: "Oversee and authorize outbound capital distributions to institutional client accounts.",
            searchPlaceholder: "Search by name or email...",
            statusAll: "All Status",
            statusPending: "Pending",
            statusPendingRelease: "Pending Release",
            statusCompleted: "Completed",
            statusApproved: "Approved (Legacy)",
            statusRejected: "Rejected",
            tableUser: "User",
            tableAmount: "Amount",
            tableDate: "Date",
            tableStatus: "Status",
            tableActions: "Actions",
            approve: "Approve",
            reject: "Reject",
            noWithdrawals: "No withdrawal records found."
        },
        zh: {
            title: "提款管理",
            subtitle: "监督并授权向机构客户账户支出的资本分配。",
            searchPlaceholder: "按姓名或邮箱搜索...",
            statusAll: "全部状态",
            statusPending: "待处理",
            statusPendingRelease: "待释放",
            statusCompleted: "已完成",
            statusApproved: "已批准",
            statusRejected: "已拒绝",
            tableUser: "用户",
            tableAmount: "金额",
            tableDate: "日期",
            tableStatus: "状态",
            tableActions: "操作",
            approve: "批准",
            reject: "拒绝",
            noWithdrawals: "未发现提款记录。"
        }
    }[lang];

    const filteredWithdrawals = withdrawals.filter(tx => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (tx.profiles?.full_name || "").toLowerCase().includes(query) || (tx.profiles?.email || "").toLowerCase().includes(query);
        const matchesStatus = statusFilter === "All" || tx.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-gray-900">{t.title}</h2>
                    <p className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t.subtitle}</p>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                    <input
                        type="text"
                        placeholder={t.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs w-full md:w-64 focus:outline-none focus:border-gv-gold transition-all"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-gv-gold transition-all text-gray-900"
                    >
                        <option value="All" className="bg-white">{t.statusAll}</option>
                        <option value="Pending" className="bg-white">{t.statusPending}</option>
                        <option value="Pending Release" className="bg-white">{t.statusPendingRelease}</option>
                        <option value="Completed" className="bg-white">{t.statusCompleted}</option>
                        <option value="Rejected" className="bg-white">{t.statusRejected}</option>
                    </select>
                </div>
            </div>

            <div className="bg-white backdrop-blur-md rounded-3xl border border-gray-200 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gray-300">
                    {/* Desktop View (Table) */}
                    <table className="w-full text-left min-w-[1000px] hidden md:table">
                        <thead className="bg-white border-b border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-400 sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="px-4 py-6">{t.tableUser}</th>
                                <th className="px-4 py-6">Reference</th>
                                <th className="px-4 py-6">{t.tableAmount}</th>
                                <th className="px-4 py-6">Penalty</th>
                                <th className="px-4 py-6">Bank Details</th>
                                <th className="px-4 py-6">Total Payout</th>
                                <th className="px-4 py-6">{t.tableDate}</th>
                                <th className="px-4 py-6">{t.tableStatus}</th>
                                <th className="px-4 py-6 text-right">{t.tableActions}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredWithdrawals.map((tx, idx) => (
                                <tr key={idx} className="text-sm group hover:bg-gray-50 transition-all cursor-pointer">
                                    <td className="px-4 py-6">
                                        <div className="flex flex-col">
                                            <span className="font-black text-gray-900 uppercase tracking-tight">{tx.profiles?.full_name}</span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">@{tx.profiles?.username}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-6">
                                        <span className="font-mono text-[10px] text-gray-400">{tx.ref_id || "-"}</span>
                                    </td>
                                    <td className="px-4 py-6">
                                        <span className="font-black text-red-500 tabular-nums">$ {(Number(tx.original_currency_amount || (tx.original_currency === 'USD' ? Math.abs(Number(tx.amount)) : (Math.abs(Number(tx.amount)) / forexRate)))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </td>
                                    <td className="px-4 py-6">
                                        {tx.metadata?.penalty_applied || tx.metadata?.penalty_amount ? (
                                            <div className="flex flex-col">
                                                <span className="font-bold text-red-400 tabular-nums text-xs">$ {(Number(tx.metadata?.original_usd_penalty || (Number(tx.metadata?.finalized_penalty || tx.metadata?.penalty_amount || 0) / forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none">40% Early</span>
                                            </div>
                                        ) : "-"}
                                    </td>
                                    <td className="px-4 py-6">
                                        <div className="flex flex-col leading-tight">
                                            {(() => {
                                                const method = tx.metadata?.method_details;
                                                const isOneTime = tx.metadata?.payout_method?.startsWith('[ONE-TIME]');
                                                const name = method ? (method.type === 'BANK' ? method.bank_name : 'USDT TRC20') : (tx.profiles?.bank_name || tx.profiles?.kyc_data?.bank_name || "N/A");
                                                const account = method ? (method.type === 'BANK' ? method.account_number : method.usdt_address) : (tx.profiles?.account_number || tx.profiles?.kyc_data?.account_number || "-");
                                                
                                                return (
                                                    <>
                                                        <div className="flex items-center gap-1">
                                                            {isOneTime && <span className="text-[7px] bg-slate-900 text-gv-gold px-1 rounded font-black">ONE-TIME</span>}
                                                            <span className="text-[9px] font-black text-gray-900 uppercase tracking-tighter truncate max-w-[120px]">{name}</span>
                                                        </div>
                                                        <span className="text-[9px] font-mono text-gv-gold font-bold truncate max-w-[150px]">{account}</span>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td className="px-4 py-6 text-emerald-500 font-black tabular-nums">
                                        $ {(Number(tx.metadata?.original_usd_payout || (tx.original_currency === 'USD' ? Math.abs(Number(tx.amount)) : (Number(tx.metadata?.finalized_payout || tx.metadata?.expected_payout || Math.abs(Number(tx.amount))) / forexRate)))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-6 text-gray-400 font-mono text-[10px] uppercase">{formatDate(tx.created_at)}</td>
                                    <td className="px-4 py-6">
                                        <span className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest ${
                                            tx.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                            tx.status === 'Pending Release' ? 'bg-blue-500/10 text-blue-500' :
                                            tx.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                            tx.status === 'Rejected' ? 'bg-red-500/10 text-red-500' :
                                            'bg-amber-500/10 text-amber-500'
                                        }`}>{tx.status}</span>
                                    </td>
                                    <td className="px-4 py-6 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            {tx.status === 'Pending' && (
                                                <>
                                                    <button onClick={(e) => { e.stopPropagation(); handleRejectWithdrawal(tx); }} className="text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all">{t.reject}</button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleApproveWithdrawal(tx); }} className="bg-emerald-500 text-black px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-500/10 hover:-translate-y-0.5 transition-all">{t.approve}</button>
                                                </>
                                            )}
                                            {tx.status === 'Pending Release' && (
                                                <button onClick={(e) => { e.stopPropagation(); handleCompleteWithdrawal(tx); }} className="bg-gv-gold text-black px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-gv-gold/20 hover:-translate-y-0.5 transition-all font-bold">Release</button>
                                            )}
                                            {tx.status === 'Completed' && <span className="text-[10px] text-gray-400 font-black uppercase italic">Done</span>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="md:hidden divide-y divide-gray-100">
                        {filteredWithdrawals.map((tx) => {
                            const isExpanded = expandedId === tx.id;
                            const payoutUSD = Number(tx.metadata?.original_usd_payout || (tx.original_currency === 'USD' ? Math.abs(Number(tx.amount)) : (Number(tx.metadata?.finalized_payout || tx.metadata?.expected_payout || Math.abs(Number(tx.amount))) / forexRate)));
                            
                            return (
                                <div key={tx.id} className="flex flex-col animate-in slide-in-from-right-4 duration-300">
                                    <div 
                                        onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                                        className="px-6 py-5 space-y-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 font-mono text-[10px] uppercase">{formatDate(tx.created_at)}</span>
                                            <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                                tx.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                                tx.status === 'Pending Release' ? 'bg-blue-500/10 text-blue-500' :
                                                'bg-amber-500/10 text-amber-500'
                                            }`}>{tx.status}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <span className="text-[11px] font-black uppercase tracking-widest text-gray-900 leading-none block">{tx.profiles?.full_name}</span>
                                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">@{tx.profiles?.username}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-emerald-500 tabular-nums tracking-tighter">
                                                    $ {payoutUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                                <p className="text-[8px] font-bold text-gray-300 uppercase italic tracking-tighter shrink-0">Net Payout</p>
                                            </div>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="bg-gray-50/50 px-6 py-6 space-y-6 border-t border-gray-100 animate-in fade-in duration-300">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[8px] font-black uppercase text-gray-400 tracking-[0.1em]">Reference ID</span>
                                                    <span className="text-[10px] font-mono font-bold text-gray-600 tracking-tight">{tx.ref_id || "-"}</span>
                                                </div>
                                                <div className="flex flex-col gap-1 text-right">
                                                    <span className="text-[8px] font-black uppercase text-red-400 tracking-[0.1em]">Gross Amount</span>
                                                    <span className="text-xs font-black text-red-500 tracking-tight">$ {(Number(tx.original_currency_amount || Math.abs(Number(tx.amount)) / forexRate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
                                                <span className="text-[8px] font-black uppercase text-gv-gold tracking-[0.2em] mb-2">Payout destination</span>
                                                {(() => {
                                                    const method = tx.metadata?.method_details;
                                                    const isOneTime = tx.metadata?.payout_method?.startsWith('[ONE-TIME]');
                                                    const name = method ? (method.type === 'BANK' ? method.bank_name : 'USDT TRC20') : (tx.profiles?.bank_name || tx.profiles?.kyc_data?.bank_name || "N/A");
                                                    const account = method ? (method.type === 'BANK' ? method.account_number : method.usdt_address) : (tx.profiles?.account_number || tx.profiles?.kyc_data?.account_number || "-");
                                                    
                                                    return (
                                                        <>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                {isOneTime && <span className="text-[7px] bg-slate-900 text-gv-gold px-1.5 py-0.5 rounded font-black">ONE-TIME</span>}
                                                                <span className="text-[10px] font-black text-gray-900 uppercase leading-none">{name}</span>
                                                            </div>
                                                            <span className="text-[11px] font-mono font-bold text-gray-500 select-all tracking-tighter break-all">{account}</span>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                {tx.status === 'Pending' && (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <button onClick={() => handleRejectWithdrawal(tx)} className="bg-white border border-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest py-3 rounded-xl">{t.reject}</button>
                                                        <button onClick={() => handleApproveWithdrawal(tx)} className="bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest py-3 rounded-xl shadow-lg shadow-emerald-500/10">{t.approve}</button>
                                                    </div>
                                                )}
                                                {tx.status === 'Pending Release' && (
                                                    <button onClick={() => handleCompleteWithdrawal(tx)} className="w-full bg-gv-gold text-black text-[9px] font-black uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-gv-gold/20">Authorize Release</button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {filteredWithdrawals.length === 0 && (
                        <div className="p-20 text-center text-gray-500 font-black uppercase tracking-[0.2em]">{t.noWithdrawals}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
