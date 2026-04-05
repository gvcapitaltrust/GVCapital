"use client";

import React, { useState } from "react";
import { useAdmin } from "@/providers/AdminProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { formatDate } from "@/lib/dateUtils";
import { ChevronDown, ExternalLink, ShieldCheck, History, XCircle, CheckCircle2, MoreVertical, Wallet } from "lucide-react";
import TierMedal from "@/components/TierMedal";
import { getTierByAmount } from "@/lib/tierUtils";

export default function WithdrawalsClient({ lang }: { lang: "en" | "zh" }) {
    const { withdrawals, loading, handleApproveWithdrawal, handleCompleteWithdrawal, handleRejectWithdrawal } = useAdmin();
    const { forexRate } = useSettings();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [rejectionTx, setRejectionTx] = useState<any | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [isRejecting, setIsRejecting] = useState(false);

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
            approve: "Approve",
            reject: "Reject",
            release: "Release Funds",
            noWithdrawals: "No withdrawal records found.",
            gross: "Gross Request",
            penalty: "Early Penalty",
            netPayout: "Final Net Payout",
            bankDetails: "Bank Details",
            reference: "Reference ID",
            date: "Request Date"
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
            approve: "批准",
            reject: "拒绝",
            release: "释放资金",
            noWithdrawals: "未发现提款记录。",
            gross: "提款总额",
            penalty: "提前惩罚",
            netPayout: "实收金额",
            bankDetails: "银行资料",
            reference: "参考编号",
            date: "申请日期"
        }
    }[lang];

    const filteredWithdrawals = withdrawals.filter(tx => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (tx.profiles?.full_name || "").toLowerCase().includes(query) || (tx.profiles?.email || "").toLowerCase().includes(query);
        const matchesStatus = statusFilter === "All" || tx.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const triggerReject = async () => {
        if (!rejectionTx || !rejectionReason.trim()) return;
        setIsRejecting(true);
        try {
            await handleRejectWithdrawal(rejectionTx, rejectionReason);
            setRejectionTx(null);
            setRejectionReason("");
        } finally {
            setIsRejecting(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
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

            <div className="bg-white backdrop-blur-md rounded-[32px] border border-gray-200 overflow-hidden shadow-2xl">
                <div className="divide-y divide-gray-100">
                    {filteredWithdrawals.map((tx, idx) => {
                        const isExpanded = expandedId === tx.id;
                        const payoutUSD = Number(tx.metadata?.original_usd_payout || tx.metadata?.final_payout_usd || (tx.original_currency === 'USD' ? Math.abs(Number(tx.amount)) : (Number(tx.metadata?.finalized_payout || tx.metadata?.expected_payout || Math.abs(Number(tx.amount))) / forexRate)));
                        const grossUSD = Number(tx.original_currency_amount || (tx.original_currency === 'USD' ? Math.abs(Number(tx.amount)) : (Math.abs(Number(tx.amount)) / forexRate)));
                        const penaltyUSD = tx.metadata?.penalty_applied ? Number(tx.metadata?.original_usd_penalty || tx.metadata?.penalty_amount_usd || 0) : 0;
                        const rateToUse = tx.metadata?.forex_rate || (forexRate - 0.4);
                        const payoutRM = payoutUSD * rateToUse;

                        return (
                            <div key={tx.id || idx} className={`flex flex-col transition-all duration-300 ${isExpanded ? 'bg-gray-50/50' : 'hover:bg-gray-50/30'}`}>
                                {/* Line 1: Primary Identification and Net Payout */}
                                <div 
                                    onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                                    className="px-8 py-6 flex flex-wrap items-center justify-between gap-4 cursor-pointer"
                                >
                                    <div className="flex items-center gap-4 min-w-[240px]">
                                        <div className="h-10 w-10 flex items-center justify-center shrink-0">
                                            <TierMedal tierId={tx.profiles?.tier?.toLowerCase() || getTierByAmount(tx.profiles?.balance_usd || 0).id} size="sm" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-gray-900 uppercase tracking-tight text-sm leading-none mb-1">{tx.profiles?.full_name || "N/A"}</span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">@{tx.profiles?.username || "N/A"}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-8 md:gap-16">
                                        <div className="flex flex-col items-start min-w-[100px]">
                                            <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{t.date}</span>
                                            <span className="text-[9px] font-mono text-gray-500 font-bold">{formatDate(tx.created_at)}</span>
                                        </div>

                                        <div className="flex flex-col items-start min-w-[120px]">
                                            <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">NET PAYOUT (USD)</span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-sm font-black text-emerald-500 tabular-nums">
                                                    $ {payoutUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-[9px] font-black text-gray-400 italic">
                                                    ≈ RM {payoutRM.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                                                tx.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                tx.status === 'Pending Release' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                tx.status === 'Rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                            }`}>{tx.status}</span>
                                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                </div>

                                {/* Line 2: Expanded Details */}
                                {isExpanded && (
                                    <div className="px-8 pb-8 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl shadow-gray-200/40">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                                <div className="space-y-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">{t.reference}</span>
                                                        <span className="text-xs font-mono font-bold text-gray-900 select-all tracking-tighter">{tx.ref_id || "-"}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Gross Request</span>
                                                        <span className="text-base font-black text-slate-900 tabular-nums tracking-tighter">$ {grossUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black uppercase text-red-400 tracking-widest mb-1">{t.penalty}</span>
                                                        <span className={`text-base font-black tabular-nums tracking-tighter ${penaltyUSD > 0 ? 'text-red-500' : 'text-gray-200'}`}>
                                                            {penaltyUSD > 0 ? `-$ ${penaltyUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                                                        </span>
                                                        {penaltyUSD > 0 && <span className="text-[8px] font-black uppercase text-red-300">40% Early Settle</span>}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col space-y-1">
                                                    <span className="text-[9px] font-black uppercase text-gv-gold tracking-widest mb-1">{t.bankDetails}</span>
                                                    {(() => {
                                                        const method = tx.metadata?.method_details;
                                                        const isOneTime = tx.metadata?.payout_method?.startsWith('[ONE-TIME]');
                                                        const name = method ? (method.type === 'BANK' ? method.bank_name : 'USDT TRC20') : (tx.profiles?.bank_name || tx.profiles?.kyc_data?.bank_name || "N/A");
                                                        const account = method ? (method.type === 'BANK' ? method.account_number : method.usdt_address) : (tx.profiles?.account_number || tx.profiles?.kyc_data?.account_number || "-");
                                                        
                                                        return (
                                                            <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl">
                                                                <div className="flex items-center gap-1 mb-1">
                                                                    {isOneTime && <span className="text-[7px] bg-slate-900 text-gv-gold px-1.5 py-0.5 rounded font-black">ONE-TIME</span>}
                                                                    <span className="text-[10px] font-black text-gray-900 uppercase tracking-tighter truncate leading-none">{name}</span>
                                                                </div>
                                                                <span className="text-[10px] font-mono text-gv-gold font-bold truncate block select-all tracking-tighter">{account}</span>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                <div className="flex flex-col items-end justify-center">
                                                    <span className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em] mb-1">{t.netPayout}</span>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-2xl font-black text-emerald-500 tabular-nums leading-none tracking-tighter underline decoration-emerald-500/20 decoration-4 underline-offset-4">$ {payoutUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        <span className="text-[10px] font-black text-gray-400 mt-2">≈ RM {payoutRM.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Bar */}
                                            <div className="mt-8 pt-8 border-t border-gray-100 flex items-center justify-end gap-3">
                                                {tx.status === 'Pending' && (
                                                    <>
                                                        <button 
                                                            onClick={() => setRejectionTx(tx)} 
                                                            className="px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all"
                                                        >
                                                            {t.reject}
                                                        </button>
                                                        <button 
                                                            onClick={() => handleApproveWithdrawal(tx)} 
                                                            className="px-10 py-3 bg-emerald-500 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:-translate-y-0.5 transition-all"
                                                        >
                                                            {t.approve}
                                                        </button>
                                                    </>
                                                )}
                                                {tx.status === 'Pending Release' && (
                                                    <button 
                                                        onClick={() => handleCompleteWithdrawal(tx)} 
                                                        className="px-12 py-4 bg-slate-900 text-gv-gold rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
                                                    >
                                                        <ShieldCheck className="h-5 w-5" />
                                                        {t.release}
                                                    </button>
                                                )}
                                                {['Completed', 'Rejected'].includes(tx.status) && (
                                                    <div className="flex items-center gap-2 px-6 py-2 bg-gray-50 rounded-xl">
                                                        <History className="h-4 w-4 text-gray-400" />
                                                        <span className="text-[10px] text-gray-400 font-black uppercase italic tracking-widest">Transaction Closed</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {filteredWithdrawals.length === 0 && (
                    <div className="p-20 text-center flex flex-col items-center gap-4">
                        <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center">
                            <XCircle className="h-8 w-8 text-gray-200" />
                        </div>
                        <span className="text-gray-400 font-black uppercase tracking-[0.2em]">{t.noWithdrawals}</span>
                    </div>
                )}
            </div>

            {/* Rejection Reason Modal */}
            {rejectionTx && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 px-6">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300 p-8">
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">Reject Withdrawal</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Specify the reason for denial</p>
                                </div>
                                <button 
                                    onClick={() => setRejectionTx(null)}
                                    className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 transition-colors"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[9px] font-black uppercase text-red-500 tracking-widest">Amount to Refund</span>
                                        <span className="text-sm font-black text-red-600 tabular-nums text-lg">$ {(Math.abs(Number(rejectionTx.amount))).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <p className="text-[8px] font-bold text-red-400 uppercase tracking-tighter">Funds will be returned to user dividend wallet</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Reason for rejection</label>
                                    <textarea 
                                        autoFocus
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="e.g. Invalid bank details, Account verification required..."
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-gv-gold focus:bg-white transition-all min-h-[120px] resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setRejectionTx(null)}
                                    className="flex-1 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all font-bold"
                                >
                                    Cancel
                                </button>
                                <button 
                                    disabled={!rejectionReason.trim() || isRejecting}
                                    onClick={triggerReject}
                                    className="flex-1 px-6 py-4 bg-slate-900 text-gv-gold rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
                                >
                                    {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
