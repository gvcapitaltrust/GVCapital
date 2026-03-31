"use client";

import React, { useState } from "react";
import { useAdmin } from "@/providers/AdminProvider";
import { useSettings } from "@/providers/SettingsProvider";

export default function WithdrawalsClient({ lang }: { lang: "en" | "zh" }) {
    const { withdrawals, loading, handleApproveWithdrawal, handleCompleteWithdrawal, handleRejectWithdrawal } = useAdmin();
    const { forexRate } = useSettings();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

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
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-900">{t.title}</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t.subtitle}</p>
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
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white border-b border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <tr>
                                <th className="px-4 py-3">{t.tableUser}</th>
                                <th className="px-4 py-3">{t.tableAmount}</th>
                                <th className="px-4 py-3">Penalty</th>
                                <th className="px-4 py-3">Bank Details</th>
                                <th className="px-4 py-3">Total Payout</th>
                                <th className="px-4 py-3">{t.tableDate}</th>
                                <th className="px-4 py-3">{t.tableStatus}</th>
                                <th className="px-4 py-3 text-right">{t.tableActions}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredWithdrawals.map((tx, idx) => (
                                <tr key={idx} className="text-sm group hover:bg-gray-50 transition-all">
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-black text-gray-900 uppercase tracking-tight">{tx.profiles?.full_name}</span>
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">@{tx.profiles?.username}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-black text-red-500 tabular-nums text-lg whitespace-nowrap">$ {(Number(tx.original_currency_amount || (Math.abs(Number(tx.amount)) / forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {tx.metadata?.penalty_applied || tx.metadata?.penalty_amount ? (
                                            <div className="flex flex-col">
                                                <span className="font-black text-red-400 tabular-nums whitespace-nowrap">$ {(Number(tx.metadata?.original_usd_penalty || (Number(tx.metadata?.finalized_penalty || tx.metadata?.penalty_amount || 0) / forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none">40% Early</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 font-bold uppercase text-[10px]">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col max-w-[150px]">
                                            <span className="text-[10px] font-black text-gray-900 truncate uppercase tracking-tighter">
                                                {tx.profiles?.bank_name || tx.profiles?.kyc_data?.bank_name || "N/A"}
                                            </span>
                                            <span className="text-[10px] font-mono text-gv-gold font-bold">
                                                {tx.profiles?.account_number || tx.profiles?.kyc_data?.account_number || "-"}
                                            </span>
                                            <span className="text-[9px] text-gray-400 font-bold truncate uppercase tracking-widest">
                                                {tx.profiles?.bank_account_holder || tx.profiles?.kyc_data?.bank_account_holder || "Unknown"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-black text-emerald-500 tabular-nums text-md whitespace-nowrap">$ {(Number(tx.metadata?.original_usd_payout || (Number(tx.metadata?.finalized_payout || tx.metadata?.expected_payout || Math.abs(Number(tx.amount))) / forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                                            tx.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                            tx.status === 'Pending Release' ? 'bg-blue-500/10 text-blue-500' :
                                            tx.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                            tx.status === 'Rejected' ? 'bg-red-500/10 text-red-500' :
                                            'bg-amber-500/10 text-amber-500'
                                        }`}>{tx.status}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            {tx.status === 'Pending' && (
                                                <>
                                                    <button onClick={() => handleRejectWithdrawal(tx)} className="text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all">{t.reject}</button>
                                                    <button onClick={() => handleApproveWithdrawal(tx)} className="bg-emerald-500 text-black px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-500/10 hover:-translate-y-0.5 transition-all">{t.approve}</button>
                                                </>
                                            )}
                                            {tx.status === 'Pending Release' && (
                                                <button onClick={() => handleCompleteWithdrawal(tx)} className="bg-gv-gold text-black px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-gv-gold/20 hover:-translate-y-0.5 transition-all">Complete Release</button>
                                            )}
                                            {tx.status === 'Completed' && <span className="text-[10px] text-gray-400 font-black uppercase italic">Processed</span>}
                                            {tx.status === 'Approved' && <span className="text-[10px] text-gray-400 font-black uppercase italic">Legacy Success</span>}
                                            {tx.status === 'Rejected' && <span className="text-[10px] text-gray-400 font-black uppercase italic">Declined</span>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredWithdrawals.length === 0 && (
                        <div className="p-20 text-center text-gray-500 font-black uppercase tracking-[0.2em]">{t.noWithdrawals}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
