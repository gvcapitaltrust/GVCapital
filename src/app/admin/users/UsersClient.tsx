"use client";

import React, { useState } from "react";
import { useAdmin } from "@/providers/AdminProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { getTierByAmount } from "@/lib/tierUtils";

export default function UsersClient({ lang }: { lang: "en" | "zh" }) {
    const { users, combinedAuditLogs, loading, handleAdjustBalance, handleUpdatePortfolio, handleResetUserPassword, handleSetAdminRole, handleDeleteUser, handleToggleUserStatus } = useAdmin();
    const { forexRate } = useSettings();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    
    // Adjustment State
    const [adjustmentAmount, setAdjustmentAmount] = useState("");
    const [adjustmentType, setAdjustmentType] = useState<"balance" | "profit">("balance");
    const [adjustmentReason, setAdjustmentReason] = useState("");
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [isRoleChanging, setIsRoleChanging] = useState(false);
    const [isProcessingAction, setIsProcessingAction] = useState(false);

    // Portfolio State
    const [portfolioData, setPortfolioData] = useState({
        platform: "",
        account_id: "",
        password: "",
        remarks: ""
    });

    const t = {
        en: {
            title: "Client Directory",
            subtitle: "Manage institutional client profiles, internal capital allocations, and portfolio mapping.",
            searchPlaceholder: "Search by name, email, or username...",
            tableUser: "User",
            tableEquity: "Equity",
            tableTier: "Tier",
            tableStatus: "Status",
            tableActions: "Manage",
            noUsers: "No clients found in directory.",
            adjustHeader: "Capital Allocation",
            adjustAmount: "Adjustment Amount (RM)",
            adjustType: "Allocation Type",
            adjustReason: "Reference / Reasoning",
            adjustSubmit: "Execute Adjustment",
            portfolioHeader: "External Portfolio Mapping",
            portfolioPlatform: "Fund Management Platform",
            portfolioAccount: "Account ID",
            portfolioPassword: "Password",
            portfolioRemarks: "Internal Remarks",
            portfolioSubmit: "Update Mapping",
            resetPassword: "Reset Password",
            typeBalance: "Main Wallet",
            typeProfit: "Dividend Wallet",
            deleteUser: "Delete User",
            deactivateUser: "Suspend User",
            reactivateUser: "Reactivate User"
        },
        zh: {
            title: "客户目录",
            subtitle: "管理机构客户资料、内部资本分配和投资组合映射。",
            searchPlaceholder: "按姓名、邮箱或用户名搜索...",
            tableUser: "用户",
            tableEquity: "权益",
            tableTier: "等级",
            tableStatus: "状态",
            tableActions: "管理",
            noUsers: "目录中未发现客户。",
            adjustHeader: "资本分配",
            adjustAmount: "计入金额 (RM)",
            adjustType: "分配类型",
            adjustReason: "参考 / 理由",
            adjustSubmit: "执行分配",
            portfolioHeader: "外部投资组合映射",
            portfolioPlatform: "基金管理平台",
            portfolioAccount: "账户 ID",
            portfolioPassword: "密码",
            portfolioRemarks: "内部备注",
            portfolioSubmit: "更新映射",
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
            txRef: "Reference",
            txProcessedBy: "Processed By",
            noTx: "No transaction history recorded for this client."
        }
    }[lang];

    const openDetails = (user: any) => {
        setSelectedUser(user);
        setPortfolioData({
            platform: user.portfolio_platform_name || "",
            account_id: user.portfolio_account_id || "",
            password: user.portfolio_account_password || "",
            remarks: user.internal_remarks || ""
        });
        setIsDetailModalOpen(true);
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
        // Update local state immediately for UI feedback
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

    const handleExecutePortfolioUpdate = async () => {
        await handleUpdatePortfolio(selectedUser.id, portfolioData);
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-white">{t.title}</h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t.subtitle}</p>
                </div>
                <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs w-full md:w-80 focus:outline-none focus:border-gv-gold transition-all"
                />
            </div>

            <div className="bg-[#1a1a1a]/50 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            <tr>
                                <th className="px-8 py-6">{t.tableUser}</th>
                                <th className="px-8 py-6">{t.tableEquity}</th>
                                <th className="px-8 py-6">{t.tableTier}</th>
                                <th className="px-8 py-6">{t.tableStatus}</th>
                                <th className="px-8 py-6 text-right">{t.tableActions}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {filteredUsers.map((user, idx) => {
                                const totalEquity = Number(user.balance || 0) + Number(user.profit || 0);
                                return (
                                    <tr key={idx} className="text-sm group hover:bg-white/[0.02] transition-all">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gv-gold/20 to-zinc-800 border border-white/10 flex items-center justify-center font-black text-gv-gold text-xs shadow-inner">
                                                    {(user.full_name || user.username || "?")[0].toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-extrabold text-white uppercase tracking-tight text-xs">{user.full_name || user.username}</span>
                                                    <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">{user.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-white tabular-nums text-xs">RM {totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                <span className="text-[8px] text-gv-gold/60 font-black tracking-tighter uppercase whitespace-nowrap">B: RM {Number(user.balance || 0).toFixed(0)} | D: RM {Number(user.profit || 0).toFixed(0)}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-zinc-800 border border-white/5 text-zinc-400">
                                                {(user.tier && user.tier !== "Standard") ? user.tier : getTierByAmount(totalEquity).name}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-2 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                                user.kyc_status === 'Verified' ? 'bg-emerald-500/10 text-emerald-500' :
                                                'bg-zinc-800 text-zinc-500'
                                            }`}>{user.kyc_status}</span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button onClick={() => openDetails(user)} className="bg-gv-gold/10 text-gv-gold hover:bg-gv-gold hover:text-black text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all border border-gv-gold/20">{t.tableActions}</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Profile Detail Modal */}
            {isDetailModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-500">
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setIsDetailModalOpen(false)}></div>
                    <div className="relative bg-[#0d0d0d] border border-white/10 rounded-[40px] w-full max-w-7xl h-full flex flex-col overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-zinc-900/30">
                            <div className="flex items-center gap-6">
                                <div className="h-16 w-16 rounded-3xl bg-gv-gold flex items-center justify-center text-black text-2xl font-black shadow-2xl">
                                    {selectedUser?.full_name?.[0].toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tighter text-white">{selectedUser?.full_name}</h3>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[9px] text-gv-gold font-black uppercase tracking-[0.2em]">
                                            {(selectedUser?.tier && selectedUser?.tier !== "Standard") ? selectedUser?.tier : getTierByAmount(Number(selectedUser?.balance || 0) + Number(selectedUser?.profit || 0)).name} Class
                                        </span>
                                        <span className="h-1 w-1 rounded-full bg-zinc-700"></span>
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">@{selectedUser?.username}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {/* Admin Role Badge */}
                                {selectedUser?.role?.toLowerCase() === 'admin' && (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gv-gold/10 border border-gv-gold/30 rounded-xl text-[9px] font-black uppercase tracking-widest text-gv-gold">
                                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2 3h10v1a1 1 0 01-1 1H8a1 1 0 01-1-1v-1z"/></svg>
                                        Admin
                                    </span>
                                )}
                                {/* Set / Remove Admin Button */}
                                <button
                                    onClick={handleToggleAdmin}
                                    disabled={isRoleChanging}
                                    className={`text-[9px] font-black uppercase tracking-widest px-5 py-3 rounded-2xl transition-all border disabled:opacity-50 ${
                                        selectedUser?.role?.toLowerCase() === 'admin'
                                            ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                            : 'bg-gv-gold/10 text-gv-gold border-gv-gold/20 hover:bg-gv-gold hover:text-black'
                                    }`}
                                >
                                    {isRoleChanging ? '...' : selectedUser?.role?.toLowerCase() === 'admin' ? '⬇ Remove Admin' : '⬆ Set as Admin'}
                                </button>
                                <button 
                                    onClick={executeToggleStatus} 
                                    disabled={isProcessingAction}
                                    className="bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white text-[9px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl transition-all border border-orange-500/20 disabled:opacity-50"
                                >
                                    {isProcessingAction ? "..." : (selectedUser?.kyc_status === 'Suspended' ? t.reactivateUser : t.deactivateUser)}
                                </button>
                                <button 
                                    onClick={executeDeleteUser} 
                                    disabled={isProcessingAction}
                                    className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white text-[9px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl transition-all border border-red-500/20 disabled:opacity-50"
                                >
                                    {isProcessingAction ? "..." : t.deleteUser}
                                </button>
                                <button onClick={() => handleResetUserPassword(selectedUser.email)} className="bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl transition-all border border-white/5">{t.resetPassword}</button>
                                <button onClick={() => setIsDetailModalOpen(false)} className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Column 1: Capital Management */}
                                <div className="space-y-8">
                                    <div className="bg-white/5 rounded-[32px] p-8 border border-white/5 space-y-8">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gv-gold">{t.adjustHeader}</h4>
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-zinc-500 px-1">{t.adjustAmount}</label>
                                                <input 
                                                    type="number" 
                                                    value={adjustmentAmount}
                                                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-black text-xl focus:outline-none focus:border-gv-gold transition-all"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-zinc-500 px-1">{t.adjustType}</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button 
                                                        onClick={() => setAdjustmentType("balance")}
                                                        className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${adjustmentType === 'balance' ? 'bg-gv-gold text-black border-gv-gold' : 'bg-white/5 text-zinc-500 border-white/5'}`}
                                                    >
                                                        {t.typeBalance}
                                                    </button>
                                                    <button 
                                                        onClick={() => setAdjustmentType("profit")}
                                                        className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${adjustmentType === 'profit' ? 'bg-gv-gold text-black border-gv-gold' : 'bg-white/5 text-zinc-500 border-white/5'}`}
                                                    >
                                                        {t.typeProfit}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-zinc-500 px-1">{t.adjustReason}</label>
                                                <textarea 
                                                    value={adjustmentReason}
                                                    onChange={(e) => setAdjustmentReason(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-xs font-medium focus:outline-none focus:border-gv-gold transition-all min-h-[100px]"
                                                    placeholder="..."
                                                />
                                            </div>
                                            <button 
                                                onClick={handleExecuteAdjustment}
                                                disabled={isAdjusting}
                                                className="w-full bg-gv-gold text-black font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-2xl shadow-gv-gold/20 hover:-translate-y-1 transition-all disabled:opacity-50"
                                            >
                                                {isAdjusting ? "Executing..." : t.adjustSubmit}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Column 2: Portfolio & Remarks */}
                                <div className="space-y-8 lg:col-span-2">
                                    <div className="bg-white/5 rounded-[32px] p-8 border border-white/5 space-y-8">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gv-gold">{t.portfolioHeader}</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-zinc-500 px-1">{t.portfolioPlatform}</label>
                                                <input 
                                                    value={portfolioData.platform}
                                                    onChange={(e) => setPortfolioData(prev => ({ ...prev, platform: e.target.value }))}
                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-xs font-bold focus:outline-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-zinc-500 px-1">{t.portfolioAccount}</label>
                                                <input 
                                                    value={portfolioData.account_id}
                                                    onChange={(e) => setPortfolioData(prev => ({ ...prev, account_id: e.target.value }))}
                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-xs font-bold focus:outline-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-zinc-500 px-1">{t.portfolioPassword}</label>
                                                <input 
                                                    type="password"
                                                    value={portfolioData.password}
                                                    onChange={(e) => setPortfolioData(prev => ({ ...prev, password: e.target.value }))}
                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-xs font-bold focus:outline-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-zinc-500 px-1">Internal Reference</label>
                                                <input 
                                                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-2xl p-4 text-zinc-500 text-xs font-bold"
                                                    readOnly
                                                    value={selectedUser?.id}
                                                />
                                            </div>
                                            <div className="md:col-span-2 space-y-2">
                                                <label className="text-[9px] font-black uppercase text-zinc-500 px-1">{t.portfolioRemarks}</label>
                                                <textarea 
                                                    value={portfolioData.remarks}
                                                    onChange={(e) => setPortfolioData(prev => ({ ...prev, remarks: e.target.value }))}
                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-xs font-medium focus:outline-none min-h-[100px]"
                                                />
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleExecutePortfolioUpdate}
                                            className="bg-white text-black font-black px-10 py-4 rounded-2xl uppercase tracking-widest text-[9px] hover:-translate-y-1 transition-all"
                                        >
                                            {t.portfolioSubmit}
                                        </button>
                                </div>
                            </div>
                        </div>

                        {/* Column 3: Transaction History (Full Width) */}
                            <div className="mt-8 bg-white/5 rounded-[32px] p-8 border border-white/5 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gv-gold">{t.txHistory}</h4>
                                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{selectedUser?.email}</span>
                                </div>
                                <div className="overflow-x-auto overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-white/10">
                                    <table className="w-full text-left">
                                        <thead className="bg-[#1a1a1a] text-[8px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/5">
                                            <tr>
                                                <th className="px-4 py-3">{t.txDate}</th>
                                                <th className="px-4 py-3">{t.txAction}</th>
                                                <th className="px-4 py-3 text-right">{t.txAmount}</th>
                                                <th className="px-4 py-3 text-right">{t.txProcessedBy}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.03]">
                                            {combinedAuditLogs
                                                .filter(log => log.user_email === selectedUser?.email && log.auditType === 'transaction')
                                                .map((log, i) => (
                                                    <tr key={i} className="text-[10px] font-bold hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-4 py-4 text-zinc-500 whitespace-nowrap">{new Date(log.created_at).toLocaleDateString()}</td>
                                                        <td className="px-4 py-4">
                                                            <div className="text-zinc-300 uppercase tracking-tight">{log.action === 'Adjustment' ? (log.txType === 'Deposit' ? 'Admin Add' : 'Admin Remove') : log.action}</div>
                                                            <div className="text-[8px] text-zinc-600 font-medium truncate max-w-[200px]">{log.rejection_reason}</div>
                                                        </td>
                                                        <td className={`px-4 py-4 tabular-nums text-right ${log.txType === 'Withdrawal' && log.action !== 'Adjustment' ? 'text-red-400' : (log.rejection_reason?.toLowerCase().includes('decrease') ? 'text-red-400' : 'text-emerald-400')}`}>
                                                            RM {Number(log.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-4 py-4 text-right text-zinc-500">{log.admin_username}</td>
                                                    </tr>
                                                ))}
                                            {combinedAuditLogs.filter(log => log.user_email === selectedUser?.email && log.auditType === 'transaction').length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-20 text-center text-zinc-700 font-black uppercase tracking-widest text-[9px]">{t.noTx}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            {/* Additional Identity Fields */}
                            <div className="mt-8 bg-white/[0.02] rounded-[32px] p-8 border border-white/[0.03] grid grid-cols-2 md:grid-cols-4 gap-8">
                                <div>
                                    <p className="text-[8px] font-black uppercase text-zinc-600 mb-1">Country</p>
                                    <p className="text-xs font-black text-zinc-400">{selectedUser?.kyc_data?.country || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black uppercase text-zinc-600 mb-1">State</p>
                                    <p className="text-xs font-black text-zinc-400">{selectedUser?.kyc_data?.state || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black uppercase text-zinc-600 mb-1">ZIP Code</p>
                                    <p className="text-xs font-black text-zinc-400">{selectedUser?.kyc_data?.zip || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black uppercase text-zinc-600 mb-1">ID Type</p>
                                    <p className="text-xs font-black text-zinc-400">{selectedUser?.kyc_data?.idType || "Passport"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
