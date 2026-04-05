"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/providers/AdminProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { supabase } from "@/lib/supabaseClient";
import { formatDate, formatDateTime } from "@/lib/dateUtils";
import { getTierByAmount } from "@/lib/tierUtils";
import { ArrowLeft } from "lucide-react";
import TierMedal from "@/components/TierMedal";

export default function DepositsClient({ lang }: { lang: "en" | "zh" }) {
    const router = useRouter();
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
            {/* Standard Header */}
            <div className="flex items-center gap-6">
                <button 
                    onClick={() => router.push(`/admin?lang=${lang}`)}
                    className="h-12 w-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gv-gold transition-all shadow-sm hover:shadow-md"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{t.title}</h1>
                    <p className="text-slate-400 text-sm font-medium">{t.subtitle}</p>
                </div>
            </div>

            {/* Filter Controls Card - Separated from Header */}
            <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 md:p-10 flex flex-wrap items-center gap-8 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 min-w-full lg:min-w-[500px] flex-1">
                    <div className="relative group flex-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-gv-gold transition-colors">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input
                            type="text"
                            placeholder={t.searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-xs w-full focus:outline-none focus:border-gv-gold focus:bg-white focus:shadow-xl transition-all font-bold placeholder:text-slate-300"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-gv-gold transition-all text-slate-900 appearance-none cursor-pointer"
                    >
                        <option value="All">{t.statusAll}</option>
                        <option value="Pending">{t.statusPending}</option>
                        <option value="Approved">{t.statusApproved}</option>
                        <option value="Rejected">{t.statusRejected}</option>
                    </select>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-[32px] overflow-hidden shadow-2xl relative">
                <div className="overflow-x-auto overflow-y-auto max-h-[650px] scrollbar-thin scrollbar-thumb-gray-200">
                    <table className="w-full text-left border-collapse min-w-[800px] lg:min-w-full">
                        <thead className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10 backdrop-blur-md">
                            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                <th className="px-6 py-6 pl-10">User Info</th>
                                <th className="px-6 py-6">Amount (USD)</th>
                                <th className="px-6 py-6">{t.tableDate}</th>
                                <th className="px-6 py-6">Status</th>
                                <th className="px-6 py-6 pr-10 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredDeposits.map((tx, idx) => (
                                <tr key={tx.id || idx} className="group hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-0 border-collapse">
                                    <td className="px-6 py-6 pl-10">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 flex items-center justify-center shrink-0">
                                                <TierMedal tierId={tx.profiles?.tier?.toLowerCase() || getTierByAmount(tx.profiles?.balance_usd || 0).id} size="sm" />
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="font-black text-slate-900 uppercase tracking-tight text-sm group-hover:text-gv-gold transition-colors truncate max-w-[150px]">{tx.profiles?.full_name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">@{tx.profiles?.username}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex flex-col">
                                            <div className="flex items-baseline gap-2">
                                                <span className="font-black text-emerald-500 tabular-nums text-lg leading-none">$ {(Number(tx.original_currency_amount || (Number(tx.amount) / forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                <span className="text-[10px] font-black text-slate-400 italic">≈ RM {(Number(tx.original_currency_amount || (Number(tx.amount) / forexRate)) * forexRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            <span className="text-[9px] text-slate-300 font-bold uppercase mt-1 tracking-widest">Rate: {forexRate.toFixed(2)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-slate-500 font-mono text-[11px] font-bold tabular-nums">{formatDate(tx.created_at)}</span>
                                            <span className="text-[9px] text-slate-300 font-bold tabular-nums uppercase">{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                                            tx.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                            tx.status === 'Rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                            'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                        }`}>
                                            {tx.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-6 pr-10 text-right">
                                        {tx.status === 'Pending' ? (
                                            <button 
                                                onClick={() => openReceipt(tx)} 
                                                className="bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest px-8 py-3 rounded-2xl transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 text-center"
                                            >
                                                {t.viewReceipt}
                                            </button>
                                        ) : (
                                            <span className="text-[10px] text-slate-300 font-black uppercase italic tracking-widest px-4">Audit Finalized</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredDeposits.length === 0 && (
                        <div className="p-32 text-center flex flex-col items-center gap-6">
                            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-100">
                                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            </div>
                            <span className="text-slate-300 font-black uppercase tracking-[0.3em] text-xs">{t.noDeposits}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Receipt Modal/Drawer */}
            {isDrawerOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-xl" onClick={() => setIsDrawerOpen(false)}></div>
                    <div className="relative bg-white border border-gray-200 rounded-[40px] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-4 md:p-6 border-b border-gray-200 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter text-gray-900">Deposit Verification</h3>
                                <p className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest">Ref: {selectedTx?.ref_id}</p>
                            </div>
                            <button onClick={() => setIsDrawerOpen(false)} className="h-10 w-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        
                        <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto">
                            <div className="aspect-[3/4] md:h-full rounded-2xl border border-gray-100 bg-gray-50 overflow-hidden relative">
                                {receiptUrl ? (
                                    <img src={receiptUrl} alt="Receipt" className="w-full h-full object-contain" />
                                ) : (
                                    <div className="h-full flex items-center justify-center"><div className="h-8 w-8 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>
                                )}
                            </div>
                            <div className="space-y-8 flex flex-col justify-between">
                                <div className="space-y-6">
                                    <div className="bg-gray-50 p-4 md:p-5 rounded-3xl border border-gray-100">
                                        <p className="text-[8px] md:text-[9px] text-gray-400 font-black uppercase tracking-widest mb-3">Transaction Details</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[7px] md:text-[8px] font-black uppercase text-gray-500 tracking-tighter">Amount USD</p>
                                                <p className="text-xl md:text-2xl font-black text-gv-gold">$ {(Number(selectedTx?.original_currency_amount || (Number(selectedTx?.amount) / forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Client Identity</span>
                                            <span className="text-base font-black text-gray-900 uppercase">{selectedTx?.profiles?.full_name}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Transfer Reference</span>
                                            <span className="text-base font-black text-gray-500 font-mono italic">{selectedTx?.metadata?.bank_reference || "None Provided"}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={async () => {
                                        await handleRejectDeposit(selectedTx);
                                        setIsDrawerOpen(false);
                                    }} className="bg-red-500/10 border border-red-500/20 text-red-500 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-gray-900 transition-all">{t.reject}</button>
                                    <button onClick={async () => {
                                        await handleApproveDeposit(selectedTx);
                                        setIsDrawerOpen(false);
                                    }} className="bg-gv-gold text-black font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] hover:-translate-y-1 transition-all shadow-xl shadow-gv-gold/20">{t.approve}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
