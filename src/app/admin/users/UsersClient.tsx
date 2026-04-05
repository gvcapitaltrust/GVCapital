"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/providers/AdminProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { getTierByAmount } from "@/lib/tierUtils";
import TierMedal from "@/components/TierMedal";
import { formatDateTime } from "@/lib/dateUtils";
import { CheckCircle2, ShieldCheck, AlertTriangle, Search, Info, Clock, ArrowLeft } from "lucide-react";

export default function UsersClient({ lang }: { lang: "en" | "zh" }) {
    const router = useRouter();
    const { users, combinedAuditLogs, loading, handleAdjustBalance, handleResetUserPassword, handleSetAdminRole, handleDeleteUser, handleToggleUserStatus, getUserWithdrawalMethods } = useAdmin();
    const { forexRate } = useSettings();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [userMethods, setUserMethods] = useState<any[]>([]);
    const [isLoadingMethods, setIsLoadingMethods] = useState(false);
    
    // Adjustment State
    const [adjustmentAmount, setAdjustmentAmount] = useState("");
    const [adjustmentType, setAdjustmentType] = useState<"balance" | "profit">("balance");
    const [adjustmentReason, setAdjustmentReason] = useState("");
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [isRoleChanging, setIsRoleChanging] = useState(false);
    const [isProcessingAction, setIsProcessingAction] = useState(false);
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    const t = {
        en: {
            title: "Client Directory",
            subtitle: "Manage institutional client profiles, internal capital allocations, and portfolio mapping.",
            searchPlaceholder: "Search by name, email, or username...",
            tableUser: "User",
            tableAssets: "Total Assets (USD)",
            tableInvestment: "Invested (USD)",
            tableWithdrawable: "Withdrawable (USD)",
            tableTier: "Tier Status",
            tableStatus: "Verification",
            tableActions: "Details",
            noUsers: "No clients found in directory.",
            adjustHeader: "Capital Allocation",
            adjustAmount: "Adjustment Amount (USD)",
            adjustType: "Allocation Type",
            adjustReason: "Reference / Reasoning",
            adjustSubmit: "Execute Adjustment",
            resetPassword: "Reset Password",
            typeBalance: "Main Wallet",
            typeProfit: "Dividend Wallet",
            deleteUser: "Delete User",
            deactivateUser: "Suspend User",
            reactivateUser: "Reactivate User",
            txHistory: "Transaction Audit History",
            txDate: "Date",
            txAction: "Action / Category",
            txAmount: "Amount",
            txProcessedBy: "Processed By",
            noTx: "No transaction history recorded for this client."
        },
        zh: {
            title: "客户目录",
            subtitle: "管理机构客户资料、内部资本分配和投资组合映射。",
            searchPlaceholder: "按姓名、邮箱或用户名搜索...",
            tableUser: "用户",
            tableAssets: "总资产",
            tableInvestment: "投资额",
            tableWithdrawable: "可提现额",
            tableTier: "等级",
            tableStatus: "状态",
            tableActions: "管理",
            noUsers: "目录中未发现客户。",
            adjustHeader: "资本分配",
            adjustAmount: "计入金额 (USD)",
            adjustType: "分配类型",
            adjustReason: "参考 / 理由",
            adjustSubmit: "执行分配",
            resetPassword: "重置密码",
            typeBalance: "主钱包",
            typeProfit: "红利钱包",
            deleteUser: "删除用户",
            deactivateUser: "暂停用户",
            reactivateUser: "重新激活用户",
            txHistory: "Transaction Audit History",
            txDate: "Date",
            txAction: "Action / Category",
            txAmount: "Amount",
            txProcessedBy: "Processed By",
            noTx: "No transaction history recorded for this client."
        }
    }[lang];

    const openDetails = async (user: any) => {
        setSelectedUser(user);
        setIsDetailModalOpen(true);
        setIsLoadingMethods(true);
        try {
            const methods = await getUserWithdrawalMethods(user.id);
            setUserMethods(methods || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingMethods(false);
        }
    };

    const handleExecuteAdjustment = async () => {
        if (!adjustmentAmount || !adjustmentReason) return;
        setIsAdjusting(true);
        await handleAdjustBalance(selectedUser, Number(adjustmentAmount), adjustmentType, adjustmentReason);
        setAdjustmentAmount("");
        setAdjustmentReason("");
        setIsAdjusting(false);
    };

    const handleToggleAdmin = async () => {
        if (!selectedUser) return;
        const isCurrentlyAdmin = selectedUser.role?.toLowerCase() === 'admin';
        const action = isCurrentlyAdmin ? 'remove admin from' : 'promote';
        const confirmed = window.confirm(`Are you sure you want to ${action} ${selectedUser.full_name || selectedUser.email}?`);
        if (!confirmed) return;
        setIsRoleChanging(true);
        await handleSetAdminRole(selectedUser.id, !isCurrentlyAdmin);
        setSelectedUser((prev: any) => ({ ...prev, role: isCurrentlyAdmin ? 'User' : 'admin' }));
        setIsRoleChanging(false);
    };

    const executeDeleteUser = async () => {
        setIsProcessingAction(true);
        await handleDeleteUser(selectedUser.id);
        setIsProcessingAction(false);
        setIsDetailModalOpen(false);
    };

    const executeToggleStatus = async () => {
        setIsProcessingAction(true);
        const isDeactivating = selectedUser.kyc_status !== 'Suspended';
        await handleToggleUserStatus(selectedUser.id, isDeactivating);
        setSelectedUser((prev: any) => ({ ...prev, kyc_status: isDeactivating ? 'Suspended' : 'Pending' }));
        setIsProcessingAction(false);
    };

    const filteredUsers = users.filter(u => {
        const query = searchQuery.toLowerCase();
        return (u.full_name || "").toLowerCase().includes(query) || 
               (u.email || "").toLowerCase().includes(query) || 
               (u.username || "").toLowerCase().includes(query);
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
                </div>
            </div>

            <div className="bg-white backdrop-blur-md rounded-3xl border border-gray-200 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gray-300">
                    {/* Desktop View (Table) */}
                    <table className="w-full text-left hidden md:table">
                        <thead className="bg-white border-b border-gray-200 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <tr>
                                <th className="px-4 py-4 md:px-8 md:py-6">{t.tableUser}</th>
                                <th className="px-4 py-4 md:px-8 md:py-6">{t.tableAssets}</th>
                                <th className="px-4 py-4 md:px-8 md:py-6">{t.tableInvestment}</th>
                                <th className="px-4 py-4 md:px-8 md:py-6">{t.tableWithdrawable}</th>
                                <th className="px-4 py-4 md:px-8 md:py-6 text-right">{t.tableActions}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map((user, idx) => (
                                <tr key={idx} className="text-sm group hover:bg-gray-50 transition-all">
                                    <td className="px-4 py-4 md:px-8 md:py-6">
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <TierMedal 
                                                tierId={(user.tier && user.tier !== "Standard") ? user.tier : getTierByAmount(user.total_investment_usd || 0).name} 
                                                size="xs" 
                                            />
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-extrabold text-gray-900 uppercase tracking-tight text-[10px] md:text-sm">{user.full_name || user.username}</span>
                                                    {user.kyc_status === 'Verified' && (
                                                        <CheckCircle2 className="h-3 w-3 md:h-3.5 md:w-3.5 text-emerald-500 fill-emerald-500/10" strokeWidth={3} />
                                                    )}
                                                </div>
                                                <span className="text-[8px] md:text-[9px] text-gray-400 font-bold uppercase tracking-widest truncate max-w-[150px]">{user.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 md:px-8 md:py-6">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-[11px] md:text-[14px] font-black text-gray-900 tabular-nums leading-none">$</span>
                                                <span className="text-[12px] md:text-[16px] font-black text-gray-900 tabular-nums leading-none">{(user.total_assets_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Gross Equity</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 md:px-8 md:py-6">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] md:text-sm font-black text-emerald-600 tabular-nums whitespace-nowrap leading-none">$ {(user.total_investment_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            {user.next_maturity_date ? (
                                                <div className="flex items-center gap-1 text-[8px] font-bold text-gray-400 uppercase tracking-tight">
                                                    <Clock className="h-2 w-2" />
                                                    {(() => {
                                                        const diffMs = new Date(user.next_maturity_date).getTime() - new Date().getTime();
                                                        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                                                        return diffDays > 0 ? (lang === 'zh' ? `${diffDays} 天后到期` : `${diffDays}D to Maturity`) : (lang === 'zh' ? '已到期' : 'Fully Matured');
                                                    })()}
                                                </div>
                                            ) : (
                                                <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{lang === 'en' ? 'Unlocked' : '未锁定'}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 md:px-8 md:py-6">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] md:text-sm font-black text-gv-gold tabular-nums whitespace-nowrap leading-none">$ {(user.withdrawable_balance_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{lang === 'en' ? 'Liquid Capital' : '流动资本'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 md:px-8 md:py-6 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <button 
                                                onClick={() => openDetails(user)} 
                                                className="bg-white hover:bg-gray-50 text-gray-900 text-[8px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-gray-200 shadow-sm transition-all flex items-center gap-2 group"
                                            >
                                                <span>{t.tableActions}</span>
                                                <Info className="h-3 w-3 text-gray-400 group-hover:text-gv-gold" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Mobile View (Grid Cards) */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {filteredUsers.map((user) => {
                            const isExpanded = expandedUserId === user.id;
                            const tierName = (user.tier && user.tier !== "Standard") ? user.tier : getTierByAmount(user.total_investment_usd || 0).name;
                            
                            return (
                                <div key={user.id} className="flex flex-col animate-in slide-in-from-right-4 duration-300">
                                    <div 
                                        onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                                        className="px-6 py-5 space-y-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <TierMedal tierId={tierName} size="xs" />
                                                <span className="text-gray-500 font-mono text-[9px] uppercase">Client #{user.username?.slice(-4)}</span>
                                            </div>
                                            <span className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest ${
                                                user.kyc_status === 'Verified' ? 'bg-emerald-500/10 text-emerald-500' :
                                                'bg-gray-100 text-gray-400'
                                            }`}>{user.kyc_status}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <span className="text-[11px] font-black uppercase tracking-widest text-gray-900 leading-none block">{user.full_name || user.username}</span>
                                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none truncate w-40 block">{user.email}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-emerald-500 tabular-nums tracking-tighter">
                                                    $ {(user.total_assets_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                                <p className="text-[8px] font-bold text-gray-300 uppercase italic tracking-tighter">Total Assets</p>
                                            </div>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="bg-gray-50/50 px-6 py-6 space-y-6 border-t border-gray-100 animate-in fade-in duration-300">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[8px] font-black uppercase text-gray-400 tracking-[0.1em]">Invested</span>
                                                    <span className="text-[10px] font-black text-gray-900 tracking-tight">$ {(user.total_investment_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="flex flex-col gap-1 text-right">
                                                    <span className="text-[8px] font-black uppercase text-gv-gold tracking-[0.1em]">Withdrawable</span>
                                                    <span className="text-[10px] font-black text-gv-gold tracking-tight">$ {(user.withdrawable_balance_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                <button onClick={() => openDetails(user)} className="w-full bg-black text-white text-[9px] font-black uppercase tracking-widest py-3.5 rounded-xl shadow-lg shadow-black/10">Manage Profile</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {isDetailModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-500">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-2xl" onClick={() => setIsDetailModalOpen(false)}></div>
                    <div className="relative bg-white border border-gray-200 rounded-[40px] w-full max-w-7xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                        <div className="p-4 md:p-8 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between bg-gray-50 gap-4">
                            <div className="flex items-center gap-4 md:gap-6">
                                <TierMedal 
                                    tierId={(selectedUser?.tier && selectedUser?.tier !== "Standard") ? selectedUser.tier : getTierByAmount(selectedUser?.total_investment_usd || 0).name} 
                                    size="md" 
                                />
                                <div>
                                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-gray-900">{selectedUser?.full_name}</h3>
                                    <div className="flex items-center gap-2 md:gap-3">
                                        <span className="text-[8px] md:text-[9px] text-gv-gold font-black uppercase tracking-[0.2em]">
                                            {(selectedUser?.tier && selectedUser?.tier !== "Standard") ? selectedUser?.tier : getTierByAmount(selectedUser?.total_investment_usd || 0).name} Class
                                        </span>
                                        <span className="h-1 w-1 rounded-full bg-zinc-700"></span>
                                        <span className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate max-w-[80px] md:max-w-none">@{selectedUser?.username}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 md:gap-4">
                                <button
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        window.location.href = `/admin/users/${selectedUser.id}/portfolio?lang=${lang}`;
                                    }}
                                    className="bg-black text-white text-[8px] md:text-[9px] font-black uppercase tracking-widest px-4 md:px-6 py-2.5 md:py-3 rounded-2xl transition-all shadow-xl hover:bg-gv-gold hover:text-black flex items-center gap-2"
                                >
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
                                    Manage Portfolio
                                </button>
                                <button 
                                    onClick={executeToggleStatus} 
                                    disabled={isProcessingAction}
                                    className="bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-gray-900 text-[8px] md:text-[9px] font-black uppercase tracking-widest px-4 md:px-6 py-2.5 md:py-3 rounded-2xl transition-all border border-orange-500/20 disabled:opacity-50"
                                >
                                    {isProcessingAction ? "..." : (selectedUser?.kyc_status === 'Suspended' ? t.reactivateUser : t.deactivateUser)}
                                </button>
                                <button 
                                    onClick={executeDeleteUser} 
                                    disabled={isProcessingAction}
                                    className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-gray-900 text-[8px] md:text-[9px] font-black uppercase tracking-widest px-4 md:px-6 py-2.5 md:py-3 rounded-2xl transition-all border border-red-500/20 disabled:opacity-50"
                                >
                                    {isProcessingAction ? "..." : t.deleteUser}
                                </button>
                                <button onClick={() => handleResetUserPassword(selectedUser.email)} className="bg-white hover:bg-gray-100 text-[8px] md:text-[9px] font-black uppercase tracking-widest px-4 md:px-6 py-2.5 md:py-3 rounded-2xl transition-all border border-gray-200">{t.resetPassword}</button>
                                <button onClick={() => setIsDetailModalOpen(false)} className="h-10 w-10 md:h-12 md:w-12 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-all">
                                    <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-8">
                                    <div className="bg-white rounded-[32px] p-6 md:p-8 border border-gray-200 space-y-8">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gv-gold">{t.adjustHeader}</h4>
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-gray-400 px-1">{t.adjustAmount}</label>
                                                <input 
                                                    type="number" 
                                                    value={adjustmentAmount}
                                                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                                                    className="w-full bg-gray-100 border border-gray-200 rounded-2xl p-4 text-gray-900 font-black text-xl focus:outline-none focus:border-gv-gold transition-all"
                                                    placeholder="0.00"
                                                />
                                                {adjustmentAmount && (
                                                    <p className="mt-1 text-[9px] text-gv-gold font-bold px-1 uppercase tracking-tighter">
                                                        ≈ RM {(parseFloat(adjustmentAmount) * forexRate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-gray-400 px-1">{t.adjustType}</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button 
                                                        onClick={() => setAdjustmentType("balance")}
                                                        className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${adjustmentType === 'balance' ? 'bg-gv-gold text-black border-gv-gold' : 'bg-white text-gray-400 border-gray-200'}`}
                                                    >
                                                        {t.typeBalance}
                                                    </button>
                                                    <button 
                                                        onClick={() => setAdjustmentType("profit")}
                                                        className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${adjustmentType === 'profit' ? 'bg-gv-gold text-black border-gv-gold' : 'bg-white text-gray-400 border-gray-200'}`}
                                                    >
                                                        {t.typeProfit}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-gray-400 px-1">{t.adjustReason}</label>
                                                <textarea 
                                                    value={adjustmentReason}
                                                    onChange={(e) => setAdjustmentReason(e.target.value)}
                                                    className="w-full bg-gray-100 border border-gray-200 rounded-2xl p-4 text-gray-900 text-[10px] md:text-xs font-medium focus:outline-none focus:border-gv-gold transition-all min-h-[100px]"
                                                    placeholder="..."
                                                />
                                            </div>
                                            <button 
                                                onClick={handleExecuteAdjustment}
                                                disabled={isAdjusting}
                                                className="w-full bg-gv-gold text-black font-black py-4 rounded-2xl uppercase tracking-widest text-[9px] md:text-[10px] shadow-2xl shadow-gv-gold/20 hover:-translate-y-1 transition-all disabled:opacity-50"
                                            >
                                                {isAdjusting ? "Executing..." : t.adjustSubmit}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="bg-white rounded-[32px] p-6 md:p-8 border border-gray-200 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gv-gold">{t.txHistory}</h4>
                                        </div>
                                        <div className="overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar scrollbar-thin scrollbar-thumb-gray-300">
                                            {/* Desktop View */}
                                            <table className="w-full text-left hidden md:table">
                                                <thead className="bg-gray-50 text-[7px] md:text-[8px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-3 py-3 md:px-4">{t.txDate}</th>
                                                        <th className="px-3 py-3 md:px-4">{t.txAction}</th>
                                                        <th className="px-3 py-3 md:px-4 text-right">{t.txAmount}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {combinedAuditLogs
                                                        .filter(log => log.user_email === selectedUser?.email && log.auditType === 'transaction')
                                                        .map((log, i) => (
                                                            <tr key={i} className="text-[9px] md:text-[10px] font-bold hover:bg-gray-50 transition-colors">
                                                                <td className="px-3 py-4 md:px-4 text-gray-400 whitespace-nowrap">
                                                                    {formatDateTime(log.created_at)}
                                                                </td>
                                                                <td className="px-3 py-4 md:px-4">
                                                                    <div className="text-gray-700 uppercase tracking-tight">{log.action === 'Adjustment' ? (log.txType === 'Deposit' ? 'Admin Add' : 'Admin Remove') : log.action}</div>
                                                                    <div className="text-[7px] md:text-[8px] text-gray-500 font-medium truncate max-w-[100px] md:max-w-none">{log.rejection_reason}</div>
                                                                </td>
                                                                <td className={`px-3 py-4 md:px-4 tabular-nums text-right ${log.txType === 'Withdrawal' && log.action !== 'Adjustment' ? 'text-red-400' : (log.rejection_reason?.toLowerCase().includes('decrease') ? 'text-red-400' : 'text-emerald-400')}`}>
                                                                    $ {(Number(log.original_currency_amount || (Number(log.amount) / forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>

                                            {/* Mobile View */}
                                            <div className="md:hidden divide-y divide-gray-100">
                                                {combinedAuditLogs
                                                    .filter(log => log.user_email === selectedUser?.email && log.auditType === 'transaction')
                                                    .map((log, j) => {
                                                        const isExpanded = expandedLogId === `${log.created_at}-${j}`;
                                                        const isNegative = log.txType === 'Withdrawal' && log.action !== 'Adjustment' || log.rejection_reason?.toLowerCase().includes('decrease');
                                                        
                                                        return (
                                                            <div key={j} className="flex flex-col animate-in slide-in-from-right-4 duration-300">
                                                                <div 
                                                                    onClick={() => setExpandedLogId(isExpanded ? null : `${log.created_at}-${j}`)}
                                                                    className="px-4 py-4 space-y-3 hover:bg-gray-50 transition-colors"
                                                                >
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-gray-400 font-mono text-[8px] uppercase">{formatDateTime(log.created_at)}</span>
                                                                        <span className={`text-[9px] font-black uppercase tracking-tight ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>
                                                                            {log.action === 'Adjustment' ? (log.txType === 'Deposit' ? 'Add' : 'Remove') : log.action}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between items-end">
                                                                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest truncate max-w-[150px]">{log.rejection_reason || "System Process"}</span>
                                                                        <span className={`text-xs font-black tabular-nums ${isNegative ? 'text-red-500' : 'text-emerald-500'}`}>
                                                                            $ {(Number(log.original_currency_amount || (Number(log.amount) / forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>

                                            {combinedAuditLogs.filter(log => log.user_email === selectedUser?.email && log.auditType === 'transaction').length === 0 && (
                                                <div className="p-20 text-center text-gray-400 font-black uppercase tracking-widest text-[9px]">{t.noTx}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 bg-gray-50 rounded-[32px] p-6 md:p-8 border border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                                <div>
                                    <p className="text-[7px] md:text-[8px] font-black uppercase text-gray-500 mb-1">Country</p>
                                    <p className="text-[10px] md:text-xs font-black text-gray-500">{selectedUser?.kyc_data?.country || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-[7px] md:text-[8px] font-black uppercase text-gray-500 mb-1">State</p>
                                    <p className="text-[10px] md:text-xs font-black text-gray-500">{selectedUser?.kyc_data?.state || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-[7px] md:text-[8px] font-black uppercase text-gray-500 mb-1">ZIP Code</p>
                                    <p className="text-[10px] md:text-xs font-black text-gray-500">{selectedUser?.kyc_data?.zip || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-[7px] md:text-[8px] font-black uppercase text-gray-500 mb-1">ID Type</p>
                                    <p className="text-[10px] md:text-xs font-black text-gray-500">{selectedUser?.kyc_data?.idType || "Passport"}</p>
                                </div>
                            </div>

                            {/* New Withdrawal Methods Section */}
                            <div className="mt-8 space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gv-gold flex items-center gap-2">
                                    <span className="h-1 w-4 bg-gv-gold rounded-full"></span>
                                    Payout Destinations
                                </h4>
                                
                                {isLoadingMethods ? (
                                    <div className="flex items-center justify-center py-10"><div className="h-8 w-8 border-2 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>
                                ) : userMethods.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {userMethods.map((method: any) => (
                                            <div key={method.id} className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-16 h-16 bg-gv-gold/5 blur-2xl group-hover:bg-gv-gold/10 transition-all"></div>
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${method.type === 'BANK' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                            {method.type === 'BANK' ? (
                                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 00-3 3z" /></svg>
                                                            ) : (
                                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-gray-900 uppercase">{method.type === 'BANK' ? method.bank_name : 'USDT TRC20'}</p>
                                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{method.type === 'BANK' ? 'Bank Payout' : 'Crypto Payout'}</p>
                                                        </div>
                                                    </div>
                                                    {method.is_default && (
                                                        <span className="bg-gv-gold/10 text-gv-gold text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">Default</span>
                                                    )}
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="space-y-1">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{method.type === 'BANK' ? 'Account Number' : 'Wallet Address'}</p>
                                                        <p className="text-xs font-bold text-gray-900 break-all font-mono tracking-tight leading-relaxed">{method.type === 'BANK' ? method.account_number : method.usdt_address}</p>
                                                    </div>
                                                    {method.type === 'BANK' && (
                                                        <div className="space-y-1">
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Account Holder</p>
                                                            <p className="text-xs font-bold text-gray-900 uppercase tracking-tight">{method.bank_account_holder}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-[32px] p-12 text-center">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No saved payout destinations found for this client.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
