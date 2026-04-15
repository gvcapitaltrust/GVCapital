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
            noDeposits: "No deposit records found.",
            method: "Method",
            paymentTitle: "Payment Method",
            remark: "User Remark",
            payTo: "Paid To Address"
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
            noDeposits: "未发现入金记录。",
            method: "支付方式",
            paymentTitle: "支付方式",
            remark: "用户备注",
            payTo: "支付地址"
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
                    <table className="w-full text-left border-collapse hidden md:table">
                        <thead className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10 backdrop-blur-md">
                            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                <th className="px-4 py-4 pl-8">User Info</th>
                                <th className="px-4 py-4">Amount (USD)</th>
                                <th className="px-4 py-4">{t.tableDate}</th>
                                <th className="px-4 py-4">{t.method}</th>
                                <th className="px-4 py-4">Status</th>
                                <th className="px-4 py-4 pr-8 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredDeposits.map((tx, idx) => (
                                <tr key={tx.id || idx} className="group hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-0 border-collapse">
                                    <td className="px-4 py-4 pl-8">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 flex items-center justify-center shrink-0">
                                                <TierMedal tierId={tx.profiles?.tier?.toLowerCase() || getTierByAmount(tx.profiles?.balance_usd || 0).id} size="sm" />
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="font-black text-slate-900 uppercase tracking-tight text-[13px] group-hover:text-gv-gold transition-colors truncate max-w-[150px]">{tx.profiles?.full_name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">@{tx.profiles?.username}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 font-black text-emerald-500 tabular-nums text-base leading-none whitespace-nowrap">
                                        $ {(Number(tx.original_currency_amount || (Number(tx.amount) / forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500 font-mono text-[11px] font-bold tabular-nums whitespace-nowrap">{formatDate(tx.created_at)}</span>
                                            <span className="text-[9px] text-slate-300 font-bold tabular-nums uppercase whitespace-nowrap opacity-60">{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        {(() => {
                                            const method = tx.metadata?.payment_method || 'bank';
                                            if (method === 'bank') return <span className="text-[10px] font-black uppercase text-slate-400">FPX Bank</span>;
                                            const network = method.split('_')[1]?.toUpperCase() || 'TRON';
                                            return (
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase text-gv-gold">USDT</span>
                                                    <span className="text-[8px] font-bold text-slate-400 leading-none">{network}</span>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2.5 px-1">
                                            <div className={`h-1.5 w-1.5 rounded-full ${
                                                tx.status === 'Approved' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' :
                                                tx.status === 'Rejected' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' :
                                                'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)] animate-pulse'
                                            }`} />
                                            <span className={`text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${
                                                tx.status === 'Approved' ? 'text-emerald-600' :
                                                tx.status === 'Rejected' ? 'text-red-500' :
                                                'text-amber-600'
                                            }`}>
                                                {tx.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 pr-8 text-right">
                                        {tx.status === 'Pending' ? (
                                            <button 
                                                onClick={() => openReceipt(tx)} 
                                                className="bg-slate-900 text-white hover:bg-slate-800 text-[9px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 text-center"
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

                    {/* Mobile View (Cards) */}
                    <div className="md:hidden divide-y divide-slate-50">
                        {filteredDeposits.map((tx, idx) => {
                            const amountUSD = Number(tx.original_currency_amount || (Number(tx.amount || 0) / forexRate));
                            const tierName = tx.profiles?.tier?.toLowerCase() || getTierByAmount(tx.profiles?.balance_usd || 0).id;

                            return (
                                <div key={tx.id || idx} className="p-3 space-y-3 hover:bg-slate-50 transition-all flex flex-col" onClick={() => openReceipt(tx)}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <TierMedal tierId={tierName} size="xs" />
                                             <div className="flex flex-col">
                                                <span className="font-black text-slate-900 uppercase tracking-tight text-[10px] truncate max-w-[150px]">{tx.profiles?.full_name}</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">@{tx.profiles?.username}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[9px] font-black text-emerald-500 tabular-nums text-[13px] leading-none">$ {amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                                {tx.metadata?.payment_method?.startsWith('usdt') ? `USDT - ${tx.metadata?.payment_method.split('_')[1].toUpperCase()}` : 'FPX Bank'}
                                            </span>
                                            <div className="mt-1 flex justify-end">
                                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">
                                                    <div className={`h-1.5 w-1.5 rounded-full ${
                                                        tx.status === 'Approved' ? 'bg-emerald-500' :
                                                        tx.status === 'Rejected' ? 'bg-red-500' :
                                                        'bg-amber-500 animate-pulse'
                                                    }`} />
                                                    <span className={`text-[8px] font-black uppercase tracking-widest ${
                                                        tx.status === 'Approved' ? 'text-emerald-500' :
                                                        tx.status === 'Rejected' ? 'text-red-500' :
                                                        'text-amber-500'
                                                    }`}>
                                                        {tx.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase italic tracking-tighter pt-2 border-t border-slate-50">
                                        <span>{formatDate(tx.created_at)}</span>
                                        <span>Ref: {tx.ref_id?.slice(-8).toUpperCase()}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

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
                        
                        <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto custom-scrollbar">
                            <div className="h-[280px] md:h-full rounded-2xl border border-gray-100 bg-gray-50 overflow-hidden relative shrink-0">
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{t.paymentTitle}</span>
                                                <span className="text-sm font-black text-slate-900 uppercase">
                                                    {selectedTx?.metadata?.payment_method?.startsWith('usdt') 
                                                        ? `USDT (${selectedTx?.metadata?.payment_method.split('_')[1].toUpperCase()})` 
                                                        : "FPX Online Banking"}
                                                </span>
                                            </div>
                                            {selectedTx?.metadata?.payment_method?.startsWith('usdt') && (
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{t.payTo}</span>
                                                    <span className="text-[10px] font-mono font-bold text-gv-gold break-all">
                                                        {selectedTx?.metadata?.payment_method === 'usdt_sol' ? '5x786gH4cTUzhoSpa8AD5XiWubNu2bfpR5PjHkYjP9i9' :
                                                         selectedTx?.metadata?.payment_method === 'usdt_tron' ? 'TErRkQXxTaLBB6VCafeaBjzx9Ji5eUZGgE' : 
                                                         '0x9b891193b672fd4293a775a0c58f402d256ebd79'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                                            <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">{t.remark}</span>
                                            <span className="text-xs font-bold text-slate-500 whitespace-pre-wrap">{selectedTx?.metadata?.remark || "None Provided"}</span>
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
