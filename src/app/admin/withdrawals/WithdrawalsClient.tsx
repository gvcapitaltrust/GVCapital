"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/providers/AdminProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { formatDate, formatDateTime } from "@/lib/dateUtils";
import { ChevronDown, ExternalLink, ShieldCheck, History, XCircle, CheckCircle2, MoreVertical, Wallet, ArrowLeft } from "lucide-react";
import TierMedal from "@/components/TierMedal";
import { getTierByAmount } from "@/lib/tierUtils";

export default function WithdrawalsClient({ lang }: { lang: "en" | "zh" }) {
    const router = useRouter();
    const { withdrawals, loading, handleApproveWithdrawal, handleCompleteWithdrawal, handleRejectWithdrawal } = useAdmin();
    const { forexRate } = useSettings();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [selectedTx, setSelectedTx] = useState<any | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
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
                        <option value="Pending Release">{t.statusPendingRelease}</option>
                        <option value="Completed">{t.statusCompleted}</option>
                        <option value="Rejected">{t.statusRejected}</option>
                    </select>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-[32px] overflow-hidden shadow-2xl relative">
                <div className="overflow-x-auto overflow-y-auto max-h-[650px] scrollbar-thin scrollbar-thumb-gray-200">
                    <table className="w-full text-left border-collapse hidden md:table">
                        <thead className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10 backdrop-blur-md">
                            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                <th className="px-6 py-6 pl-10">User Context</th>
                                <th className="px-6 py-6">Net Payout</th>
                                <th className="px-6 py-6">Status</th>
                                <th className="px-6 py-6">{t.date}</th>
                                <th className="px-6 py-6 pr-10 text-right">Actions Hub</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredWithdrawals.map((tx, idx) => {
                                const payoutUSD = Number(tx.metadata?.final_payout_usd || Math.abs(Number(tx.original_currency_amount || (Number(tx.amount) / forexRate))));

                                return (
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
                                            <span className="font-black text-emerald-500 tabular-nums text-lg leading-none">$ {payoutUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </td>
                                        <td className="px-6 py-6">
                                            <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                                                tx.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                tx.status === 'Pending Release' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                tx.status === 'Rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                            }`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 pr-10 text-right">
                                            <button 
                                                onClick={() => { setSelectedTx(tx); setIsDetailsOpen(true); }} 
                                                className="bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest px-8 py-3 rounded-2xl transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                                            >
                                                Review Payout
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Mobile View (Cards) */}
                    <div className="md:hidden divide-y divide-slate-50">
                        {filteredWithdrawals.map((tx, idx) => {
                            const payoutUSD = Number(tx.metadata?.final_payout_usd || Math.abs(Number(tx.original_currency_amount || (Number(tx.amount) / forexRate))));
                            const tierName = tx.profiles?.tier?.toLowerCase() || getTierByAmount(tx.profiles?.balance_usd || 0).id;

                            return (
                                <div key={tx.id || idx} className="p-4 space-y-4 hover:bg-slate-50 transition-all flex flex-col" onClick={() => { setSelectedTx(tx); setIsDetailsOpen(true); }}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <TierMedal tierId={tierName} size="xs" />
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-900 uppercase tracking-tight text-[11px] truncate max-w-[150px]">{tx.profiles?.full_name}</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">@{tx.profiles?.username}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-black text-emerald-500 tabular-nums text-sm">$ {payoutUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            <div className="mt-1 flex justify-end">
                                                <span className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest border ${
                                                    tx.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                    tx.status === 'Pending Release' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                    tx.status === 'Rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                }`}>
                                                    {tx.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase italic tracking-tighter pt-2 border-t border-slate-50">
                                        <span>{formatDate(tx.created_at)}</span>
                                        <span>Payout ID: #{tx.id?.slice(-6).toUpperCase()}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filteredWithdrawals.length === 0 && (
                        <div className="p-32 text-center flex flex-col items-center gap-6">
                            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-100">
                                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.407 2.67 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.407-2.67-1M12 16v1" /></svg>
                            </div>
                            <span className="text-slate-300 font-black uppercase tracking-[0.3em] text-xs">{t.noWithdrawals}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Withdrawal Detail Modal */}
            {isDetailsOpen && selectedTx && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 px-6">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.3)] border border-slate-100 animate-in zoom-in-95 duration-500 p-10">
                        <div className="flex flex-col gap-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 flex items-center justify-center shrink-0 bg-slate-50 rounded-2xl">
                                        <TierMedal tierId={selectedTx.profiles?.tier?.toLowerCase() || getTierByAmount(selectedTx.profiles?.balance_usd || 0).id} size="lg" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-none mb-1">{selectedTx.profiles?.full_name}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">AUDIT RECORD: {selectedTx.ref_id || selectedTx.id}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsDetailsOpen(false)}
                                    className="h-12 w-12 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Financial Reconciliation</h4>
                                        <div className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem] space-y-4">
                                            <div className="flex justify-between items-center text-xs font-bold">
                                                <span className="text-slate-400 uppercase tracking-tighter">Gross Request</span>
                                                <span className="text-slate-900 tabular-nums font-black">$ {Number(selectedTx.original_currency_amount || (selectedTx.original_currency === 'USD' ? Math.abs(Number(selectedTx.amount)) : (Math.abs(Number(selectedTx.amount)) / forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            {selectedTx.metadata?.penalty_applied && (
                                                <div className="flex justify-between items-center text-xs font-bold">
                                                    <span className="text-red-400 uppercase italic tracking-tighter">Early Settlement (40%)</span>
                                                    <span className="text-red-500 tabular-nums font-black">-$ {Number(selectedTx.metadata?.original_usd_penalty || selectedTx.metadata?.penalty_amount_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            <div className="pt-4 border-t border-slate-200 flex flex-col items-end gap-1">
                                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest self-start">Final Liquid Asset</span>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-3xl font-black text-emerald-500 tabular-nums tracking-tighter leading-none">$ {Number(selectedTx.metadata?.original_usd_payout || selectedTx.metadata?.final_payout_usd || (selectedTx.original_currency === 'USD' ? Math.abs(Number(selectedTx.amount)) : (Number(selectedTx.metadata?.finalized_payout || selectedTx.metadata?.expected_payout || Math.abs(Number(selectedTx.amount))) / forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    <span className="text-[11px] font-black text-slate-400 mt-2">≈ RM {(Number(selectedTx.metadata?.original_usd_payout || selectedTx.metadata?.final_payout_usd || (selectedTx.original_currency === 'USD' ? Math.abs(Number(selectedTx.amount)) : (Number(selectedTx.metadata?.finalized_payout || selectedTx.metadata?.expected_payout || Math.abs(Number(selectedTx.amount))) / forexRate))) * (selectedTx.metadata?.forex_rate || (forexRate - 0.4))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Target Account</h4>
                                        {(() => {
                                            const method = selectedTx.metadata?.method_details;
                                            const isOneTime = selectedTx.metadata?.payout_method?.startsWith('[ONE-TIME]');
                                            const name = method ? (method.type === 'BANK' ? method.bank_name : 'USDT TRC20') : (selectedTx.profiles?.bank_name || selectedTx.profiles?.kyc_data?.bank_name || "N/A");
                                            const account = method ? (method.type === 'BANK' ? method.account_number : method.usdt_address) : (selectedTx.profiles?.account_number || selectedTx.profiles?.kyc_data?.account_number || "-");
                                            
                                            return (
                                                <div className="bg-white border border-slate-100 p-6 rounded-[2rem] space-y-3 shadow-md">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2 w-2 rounded-full bg-gv-gold shadow-[0_0_10px_rgba(212,175,55,0.4)]"></div>
                                                        <span className="text-xs font-black text-slate-900 uppercase">{name}</span>
                                                        {isOneTime && <span className="ml-auto text-[7px] bg-slate-900 text-gv-gold px-2 py-1 rounded-lg font-black tracking-widest">ONE-TIME</span>}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Account Number / Address</p>
                                                        <p className="text-sm font-mono font-bold text-gv-gold select-all tracking-tight break-all border-b border-gv-gold/10 pb-1">{account}</p>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <div className="space-y-8 flex flex-col">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Execution Pipeline</h4>
                                        <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 px-2 pt-2">
                                            <div className="flex items-start gap-6 pl-8 relative">
                                                <div className="h-4 w-4 rounded-full bg-slate-200 absolute left-[4px] border-4 border-white"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Request Origin</span>
                                                    <span className="text-xs font-bold text-slate-900">{formatDateTime(selectedTx.created_at)}</span>
                                                </div>
                                            </div>

                                            {['Approved', 'Completed', 'Pending Release'].includes(selectedTx.status) && (
                                                <div className="flex items-start gap-6 pl-8 relative">
                                                    <div className="h-4 w-4 rounded-full bg-blue-500 absolute left-[4px] border-4 border-white shadow-[0_0_12px_rgba(59,130,246,0.4)]"></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-2">Audit Compliance Passed</span>
                                                        <span className="text-xs font-bold text-slate-900">{formatDateTime(selectedTx.metadata?.approved_at || selectedTx.updated_at)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {selectedTx.status === 'Completed' && (
                                                <div className="flex items-start gap-6 pl-8 relative">
                                                    <div className="h-4 w-4 rounded-full bg-emerald-500 absolute left-[4px] border-4 border-white shadow-[0_0_12px_rgba(16,185,129,0.4)]"></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-2">Capital Dispatched</span>
                                                        <span className="text-xs font-bold text-slate-900">{formatDateTime(selectedTx.metadata?.released_at || selectedTx.metadata?.completed_at || selectedTx.updated_at)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {selectedTx.status === 'Rejected' && (
                                                <div className="flex items-start gap-6 pl-8 relative">
                                                    <div className="h-4 w-4 rounded-full bg-red-500 absolute left-[4px] border-4 border-white shadow-[0_0_12px_rgba(239,68,68,0.4)]"></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-none mb-2">Audit Exception</span>
                                                        <span className="text-xs font-bold text-slate-900">{formatDateTime(selectedTx.metadata?.rejected_at || selectedTx.updated_at)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {selectedTx.status === 'Rejected' && selectedTx.metadata?.reason && (
                                        <div className="p-6 bg-red-50 border border-red-100 rounded-[2rem] space-y-2 mt-auto">
                                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest px-1">Reject Basis</p>
                                            <p className="text-xs font-bold text-slate-900 leading-relaxed italic">"{selectedTx.metadata.reason}"</p>
                                        </div>
                                    )}

                                    <div className="mt-auto pt-10 flex flex-col gap-4">
                                        {selectedTx.status === 'Pending' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <button 
                                                    onClick={() => setRejectionTx(selectedTx)} 
                                                    className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 hover:bg-red-100 transition-all"
                                                >
                                                    {t.reject}
                                                </button>
                                                <button 
                                                    onClick={() => { handleApproveWithdrawal(selectedTx); setIsDetailsOpen(false); }} 
                                                    className="px-6 py-4 bg-emerald-500 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:-translate-y-1 transition-all"
                                                >
                                                    Pass Audit
                                                </button>
                                            </div>
                                        )}
                                        {selectedTx.status === 'Pending Release' && (
                                            <button 
                                                onClick={() => { handleCompleteWithdrawal(selectedTx); setIsDetailsOpen(false); }} 
                                                className="w-full py-5 bg-slate-900 text-gv-gold rounded-3xl text-sm font-black uppercase tracking-[0.2em] shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                                            >
                                                <ShieldCheck className="h-6 w-6" />
                                                Authorize Funds Release
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setRejectionTx(null)}
                                    className="flex-1 px-6 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button 
                                    disabled={!rejectionReason.trim() || isRejecting}
                                    onClick={triggerReject}
                                    className="flex-1 px-6 py-5 bg-slate-900 text-gv-gold rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-1 active:translate-y-0"
                                >
                                    {isRejecting ? 'Processing...' : 'Confirm Reject'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
