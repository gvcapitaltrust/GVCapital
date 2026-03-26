"use client";

import React, { useState } from "react";
import { useAdmin } from "@/providers/AdminProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { supabase } from "@/lib/supabaseClient";

export default function DepositsClient({ lang }: { lang: "en" | "zh" }) {
    const { deposits, loading, handleApproveDeposit, handleRejectDeposit } = useAdmin();
    const { forexRate } = useSettings();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [selectedTx, setSelectedTx] = useState<any>(null);
    const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const t = {
        en: {
            title: "Deposit Management",
            subtitle: "Review and process incoming capital allocations from institutional clients.",
            searchPlaceholder: "Search by name or email...",
            statusAll: "All Status",
            statusPending: "Pending",
            statusApproved: "Approved",
            statusRejected: "Rejected",
            tableUser: "User",
            tableAmount: "Amount",
            tableDate: "Date",
            tableStatus: "Status",
            tableActions: "Actions",
            viewReceipt: "View Receipt",
            approve: "Approve",
            reject: "Reject",
            noDeposits: "No deposit records found."
        },
        zh: {
            title: "入金管理",
            subtitle: "审核并处理来自机构客户的入金分配。",
            searchPlaceholder: "按姓名或邮箱搜索...",
            statusAll: "全部状态",
            statusPending: "待处理",
            statusApproved: "已批准",
            statusRejected: "已拒绝",
            tableUser: "用户",
            tableAmount: "金额",
            tableDate: "日期",
            tableStatus: "状态",
            tableActions: "操作",
            viewReceipt: "查看凭证",
            approve: "批准",
            reject: "拒绝",
            noDeposits: "未发现入金记录。"
        }
    }[lang];

    const openReceipt = async (tx: any) => {
        setSelectedTx(tx);
        setReceiptUrl(null);
        setIsDrawerOpen(true);
        try {
            const { data, error } = await supabase.storage.from('agreements').createSignedUrl(tx.receipt_url, 3600);
            if (error || !data) throw error;
            setReceiptUrl(data.signedUrl);
        } catch (err) {
            console.error(err);
        }
    };

    const filteredDeposits = deposits.filter(tx => {
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
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-white">{t.title}</h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t.subtitle}</p>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                    <input
                        type="text"
                        placeholder={t.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs w-full md:w-64 focus:outline-none focus:border-gv-gold transition-all"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-gv-gold transition-all text-white"
                    >
                        <option value="All" className="bg-[#111]">{t.statusAll}</option>
                        <option value="Pending" className="bg-[#111]">{t.statusPending}</option>
                        <option value="Approved" className="bg-[#111]">{t.statusApproved}</option>
                        <option value="Rejected" className="bg-[#111]">{t.statusRejected}</option>
                    </select>
                </div>
            </div>

            <div className="bg-[#1a1a1a]/50 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            <tr>
                                <th className="px-8 py-6">{t.tableUser}</th>
                                <th className="px-8 py-6">{t.tableAmount}</th>
                                <th className="px-8 py-6">{t.tableDate}</th>
                                <th className="px-8 py-6">{t.tableStatus}</th>
                                <th className="px-8 py-6 text-right">{t.tableActions}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {filteredDeposits.map((tx, idx) => (
                                <tr key={idx} className="text-sm group hover:bg-white/[0.02] transition-all">
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="font-black text-white uppercase tracking-tight">{tx.profiles?.full_name}</span>
                                            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">@{tx.profiles?.username}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="font-black text-emerald-400 tabular-nums">RM {Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">(${(Number(tx.amount) / forexRate).toFixed(2)} USD)</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-zinc-500 font-mono text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                                    <td className="px-8 py-6">
                                        <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                                            tx.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                            tx.status === 'Rejected' ? 'bg-red-500/10 text-red-500' :
                                            'bg-amber-500/10 text-amber-500'
                                        }`}>{tx.status}</span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            {tx.status === 'Pending' && (
                                                <button onClick={() => openReceipt(tx)} className="bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border border-white/5">{t.viewReceipt}</button>
                                            )}
                                            {tx.status !== 'Pending' && <span className="text-[10px] text-zinc-700 font-black uppercase italic">Processed</span>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredDeposits.length === 0 && (
                        <div className="p-20 text-center text-zinc-600 font-black uppercase tracking-[0.2em]">{t.noDeposits}</div>
                    )}
                </div>
            </div>

            {/* Receipt Modal/Drawer */}
            {isDrawerOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setIsDrawerOpen(false)}></div>
                    <div className="relative bg-[#111] border border-white/10 rounded-[40px] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter text-white">Deposit Verification</h3>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Ref: {selectedTx?.ref_id}</p>
                            </div>
                            <button onClick={() => setIsDrawerOpen(false)} className="h-10 w-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-all">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        
                        <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto">
                            <div className="h-full rounded-2xl border border-white/10 bg-black overflow-hidden relative">
                                {receiptUrl ? (
                                    <img src={receiptUrl} alt="Receipt" className="w-full h-full object-contain" />
                                ) : (
                                    <div className="h-full flex items-center justify-center"><div className="h-8 w-8 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>
                                )}
                            </div>
                            <div className="space-y-8 flex flex-col justify-between">
                                <div className="space-y-6">
                                    <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-3">Transaction Details</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[8px] font-black uppercase text-zinc-600 tracking-tighter">Amount MYR</p>
                                                <p className="text-xl font-black text-white">RM {Number(selectedTx?.amount).toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black uppercase text-zinc-600 tracking-tighter">Credit USD</p>
                                                <p className="text-xl font-black text-gv-gold">${(Number(selectedTx?.amount) / forexRate).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Client Identity</span>
                                            <span className="text-base font-black text-white uppercase">{selectedTx?.profiles?.full_name}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Transfer Reference</span>
                                            <span className="text-base font-black text-zinc-400 font-mono italic">{selectedTx?.metadata?.bank_reference || "None Provided"}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => handleRejectDeposit(selectedTx)} className="bg-red-500/10 border border-red-500/20 text-red-500 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-white transition-all">{t.reject}</button>
                                    <button onClick={() => handleApproveDeposit(selectedTx)} className="bg-gv-gold text-black font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] hover:-translate-y-1 transition-all shadow-xl shadow-gv-gold/20">{t.approve}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
