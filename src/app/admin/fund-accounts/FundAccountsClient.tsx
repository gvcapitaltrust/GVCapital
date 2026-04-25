"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/providers/AdminProvider";
import { ArrowLeft, Plus, X, Trash2, Edit2, CheckCircle, AlertCircle } from "lucide-react";

type Lang = "en" | "zh";

const t = {
    en: {
        title: "Fund Accounts",
        subtitle: "Create and manage fund accounts. Assign users and track performance.",
        newAccount: "New Account",
        searchPlaceholder: "Search accounts...",
        active: "Active",
        inactive: "Inactive",
        allStatus: "All Status",
        noAccounts: "No fund accounts found.",
        members: "Members",
        latestCapital: "Current Capital",
        initialCapital: "Initial Capital",
        platform: "Platform",
        formCreateTitle: "Create Fund Account",
        formEditTitle: "Edit Fund Account",
        fieldAccountName: "Account Name",
        fieldAccountCode: "Account Code",
        fieldPlatform: "Platform",
        fieldDescription: "Description",
        fieldInitialCapital: "Initial Capital (USD)",
        fieldCurrentCapital: "Current Capital (USD)",
        fieldFundStartDate: "Fund Start Date",
        fieldCurrency: "Base Currency",
        fieldIsActive: "Active",
        save: "Save",
        cancel: "Cancel",
        membersTitle: "Assigned Members",
        assignUser: "Assign User",
        selectUser: "Select User",
        allocatedAmount: "Allocated Amount (USD)",
        assignBtn: "Assign",
        noMembers: "No members assigned yet.",
        performanceTitle: "Performance Snapshots",
        addSnapshot: "Add Snapshot",
        editSnapshot: "Edit Snapshot",
        snapshotDate: "Date",
        snapshotType: "Type",
        daily: "Daily",
        monthly: "Monthly",
        openingCapital: "Opening Capital (USD)",
        closingCapital: "Closing Capital (USD)",
        gainLossAmt: "Gain/Loss (USD)",
        gainLossPct: "Gain/Loss (%)",
        notes: "Notes",
        enteredBy: "Entered By",
        editedBy: "Edited",
        noSnapshots: "No snapshots yet.",
    },
    zh: {
        title: "基金账户",
        subtitle: "创建并管理基金账户，分配用户并追踪表现。",
        newAccount: "新建账户",
        searchPlaceholder: "搜索账户...",
        active: "活跃",
        inactive: "停用",
        allStatus: "全部状态",
        noAccounts: "未找到基金账户。",
        members: "成员",
        latestCapital: "当前资本",
        initialCapital: "初始资本",
        platform: "平台",
        formCreateTitle: "创建基金账户",
        formEditTitle: "编辑基金账户",
        fieldAccountName: "账户名称",
        fieldAccountCode: "账户代码",
        fieldPlatform: "平台",
        fieldDescription: "描述",
        fieldInitialCapital: "初始资本 (USD)",
        fieldCurrentCapital: "当前资本 (USD)",
        fieldFundStartDate: "基金成立日期",
        fieldCurrency: "基础货币",
        fieldIsActive: "活跃",
        save: "保存",
        cancel: "取消",
        membersTitle: "分配的成员",
        assignUser: "分配用户",
        selectUser: "选择用户",
        allocatedAmount: "分配金额 (USD)",
        assignBtn: "分配",
        noMembers: "暂无已分配成员。",
        performanceTitle: "业绩快照",
        addSnapshot: "添加快照",
        editSnapshot: "编辑快照",
        snapshotDate: "日期",
        snapshotType: "类型",
        daily: "日报",
        monthly: "月报",
        openingCapital: "开始资本 (USD)",
        closingCapital: "结束资本 (USD)",
        gainLossAmt: "盈亏 (USD)",
        gainLossPct: "盈亏 (%)",
        notes: "备注",
        enteredBy: "录入人",
        editedBy: "已编辑",
        noSnapshots: "暂无快照。",
    }
};

const USD = (n: number) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const PCT = (n: number) => `${Number(n || 0) >= 0 ? "+" : ""}${Number(n || 0).toFixed(2)}%`;

type SnapForm = { snapshot_date: string; snapshot_type: string; opening_capital: string; closing_capital: string; notes: string; };
const emptySnapForm = (): SnapForm => ({ snapshot_date: new Date().toISOString().split("T")[0], snapshot_type: "daily", opening_capital: "", closing_capital: "", notes: "" });

const CalcPreview = ({ open, close }: { open: string; close: string }) => {
    const o = Number(open), c = Number(close);
    if (!o || !c) return null;
    const diff = c - o;
    const pct = o !== 0 ? (diff / o) * 100 : 0;
    const pos = diff >= 0;
    return (
        <div className={`rounded-xl p-3 border flex flex-col justify-center ${pos ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
            <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">Calc. Gain/Loss</p>
            <p className={`text-sm font-black tabular-nums ${pos ? "text-emerald-600" : "text-red-500"}`}>{diff >= 0 ? "+" : ""}{USD(diff)}</p>
            <p className={`text-[9px] font-bold ${pos ? "text-emerald-500" : "text-red-400"}`}>{o !== 0 ? PCT(pct) : "—"}</p>
        </div>
    );
};

export default function FundAccountsClient({ lang }: { lang: Lang }) {
    const router = useRouter();
    const {
        fundAccounts, fundAccountMembers, fundAccountPerformance,
        users,
        handleCreateFundAccount, handleUpdateFundAccount,
        handleAssignUserToFundAccount, handleRemoveUserFromFundAccount,
        handleAddPerformanceSnapshot, handleEditPerformanceSnapshot, handleDeletePerformanceSnapshot,
        loading,
    } = useAdmin();

    const tx = t[lang];

    // ── UI State ──────────────────────────────────────────────────────
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedAccount, setSelectedAccount] = useState<any>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingAccount, setEditingAccount] = useState<any>(null);
    const [activePanel, setActivePanel] = useState<"members" | "performance">("performance");

    // Account form
    const [form, setForm] = useState({ account_name: "", account_code: "", platform_name: "", description: "", initial_capital: "", current_capital: "", is_active: true, fund_start_date: "", base_currency: "USD" });

    // Member assign
    const [assignUserId, setAssignUserId] = useState("");
    const [assignAmount, setAssignAmount] = useState("");

    // Snapshot form (shared for add + edit)
    const [snapForm, setSnapForm] = useState<SnapForm>(emptySnapForm());
    const [showSnapForm, setShowSnapForm] = useState(false);
    const [editingSnap, setEditingSnap] = useState<any>(null); // null = adding new

    // ── Derived data ──────────────────────────────────────────────────
    const filtered = useMemo(() => fundAccounts.filter(fa => {
        const matchSearch = fa.account_name?.toLowerCase().includes(search.toLowerCase()) || fa.account_code?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || (statusFilter === "active" ? fa.is_active : !fa.is_active);
        return matchSearch && matchStatus;
    }), [fundAccounts, search, statusFilter]);

    const accountMembers = (faId: string) => fundAccountMembers.filter(m => m.fund_account_id === faId);
    const accountPerf = (faId: string) => fundAccountPerformance.filter(p => p.fund_account_id === faId && !p.is_deleted);
    const latestGain = (faId: string, type: "daily" | "monthly") => accountPerf(faId).find(p => p.snapshot_type === type) || null;

    // ── Account form handlers ─────────────────────────────────────────
    const openCreate = () => {
        setEditingAccount(null);
        setForm({ account_name: "", account_code: "", platform_name: "", description: "", initial_capital: "", current_capital: "", is_active: true, fund_start_date: "", base_currency: "USD" });
        setShowForm(true);
    };
    const openEdit = (fa: any) => {
        setEditingAccount(fa);
        setForm({ account_name: fa.account_name, account_code: fa.account_code, platform_name: fa.platform_name || "", description: fa.description || "", initial_capital: String(fa.initial_capital), current_capital: String(fa.current_capital), is_active: fa.is_active, fund_start_date: fa.fund_start_date || "", base_currency: fa.base_currency || "USD" });
        setShowForm(true);
    };
    const handleSubmitForm = async () => {
        if (editingAccount) await handleUpdateFundAccount(editingAccount.id, form);
        else await handleCreateFundAccount(form);
        setShowForm(false);
    };

    // ── Member handlers ───────────────────────────────────────────────
    const handleAssign = async () => {
        if (!selectedAccount || !assignUserId) return;
        await handleAssignUserToFundAccount(selectedAccount.id, assignUserId, Number(assignAmount || 0));
        setAssignUserId("");
        setAssignAmount("");
    };

    // ── Snapshot handlers ─────────────────────────────────────────────
    const openAddSnap = () => {
        setEditingSnap(null);
        setSnapForm(emptySnapForm());
        setShowSnapForm(true);
    };
    const openEditSnap = (snap: any) => {
        setEditingSnap(snap);
        setSnapForm({ snapshot_date: snap.snapshot_date, snapshot_type: snap.snapshot_type, opening_capital: String(snap.opening_capital), closing_capital: String(snap.closing_capital), notes: snap.notes || "" });
        setShowSnapForm(true);
    };
    const handleSubmitSnap = async () => {
        if (!selectedAccount) return;
        if (editingSnap) {
            await handleEditPerformanceSnapshot(editingSnap.id, selectedAccount.id, snapForm);
        } else {
            await handleAddPerformanceSnapshot(selectedAccount.id, snapForm);
        }
        setShowSnapForm(false);
        setEditingSnap(null);
    };

    const unassignedUsers = useMemo(() => {
        if (!selectedAccount) return users;
        const assignedIds = accountMembers(selectedAccount.id).map((m: any) => m.user_id);
        return users.filter(u => !assignedIds.includes(u.id));
    }, [users, selectedAccount, fundAccountMembers]);

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-6">
                <button onClick={() => router.push(`/admin?lang=${lang}`)} className="h-12 w-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gv-gold transition-all shadow-sm hover:shadow-md">
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex-1 space-y-1">
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{tx.title}</h1>
                    <p className="text-slate-400 text-sm font-medium">{tx.subtitle}</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 bg-gv-gold text-black font-black uppercase tracking-widest text-[10px] px-6 py-3 rounded-2xl hover:-translate-y-0.5 transition-all shadow-lg shadow-gv-gold/20">
                    <Plus className="h-4 w-4" />
                    {tx.newAccount}
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-[2rem] p-6 flex flex-col md:flex-row gap-4 shadow-sm">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input type="text" placeholder={tx.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-6 py-3.5 text-xs w-full focus:outline-none focus:border-gv-gold transition-all font-bold placeholder:text-slate-300" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-3.5 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-gv-gold transition-all appearance-none cursor-pointer">
                    <option value="all">{tx.allStatus}</option>
                    <option value="active">{tx.active}</option>
                    <option value="inactive">{tx.inactive}</option>
                </select>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Account List */}
                <div className="xl:col-span-1 space-y-4">
                    {filtered.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-[2rem] p-16 text-center">
                            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="h-8 w-8 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <p className="text-slate-300 font-black uppercase tracking-[0.3em] text-xs">{tx.noAccounts}</p>
                        </div>
                    ) : filtered.map(fa => {
                        const isSelected = selectedAccount?.id === fa.id;
                        const members = accountMembers(fa.id);
                        const daily = latestGain(fa.id, "daily");
                        const monthly = latestGain(fa.id, "monthly");
                        return (
                            <div key={fa.id} onClick={() => { setSelectedAccount(fa); setShowSnapForm(false); }} className={`cursor-pointer bg-white border rounded-[2rem] p-6 space-y-4 transition-all hover:shadow-lg ${isSelected ? "border-gv-gold shadow-lg shadow-gv-gold/10" : "border-gray-200 shadow-sm"}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`h-2 w-2 rounded-full ${fa.is_active ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-gray-300"}`}></span>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{fa.account_code}</span>
                                            {fa.base_currency && fa.base_currency !== "USD" && <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-black">{fa.base_currency}</span>}
                                        </div>
                                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight leading-none">{fa.account_name}</h3>
                                        {fa.platform_name && <p className="text-[10px] text-gv-gold font-bold mt-1">{fa.platform_name}</p>}
                                    </div>
                                    <button onClick={e => { e.stopPropagation(); openEdit(fa); }} className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-gray-400 hover:text-gv-gold transition-colors shrink-0">
                                        <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">{tx.latestCapital}</p>
                                        <p className="text-sm font-black text-slate-900 tabular-nums">{USD(fa.current_capital)}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">{tx.members}</p>
                                        <p className="text-sm font-black text-slate-900">{members.length}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {daily && <div className={`rounded-2xl p-3 border ${Number(daily.gain_loss_amount) >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Daily</p>
                                        <p className={`text-xs font-black tabular-nums ${Number(daily.gain_loss_amount) >= 0 ? "text-emerald-600" : "text-red-500"}`}>{PCT(daily.gain_loss_percent)}</p>
                                        <p className={`text-[9px] font-bold tabular-nums ${Number(daily.gain_loss_amount) >= 0 ? "text-emerald-500" : "text-red-400"}`}>{USD(daily.gain_loss_amount)}</p>
                                    </div>}
                                    {monthly && <div className={`rounded-2xl p-3 border ${Number(monthly.gain_loss_amount) >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Monthly</p>
                                        <p className={`text-xs font-black tabular-nums ${Number(monthly.gain_loss_amount) >= 0 ? "text-emerald-600" : "text-red-500"}`}>{PCT(monthly.gain_loss_percent)}</p>
                                        <p className={`text-[9px] font-bold tabular-nums ${Number(monthly.gain_loss_amount) >= 0 ? "text-emerald-500" : "text-red-400"}`}>{USD(monthly.gain_loss_amount)}</p>
                                    </div>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Management Panel */}
                {selectedAccount ? (
                    <div className="xl:col-span-2 bg-white border border-gray-200 rounded-[2rem] overflow-hidden shadow-sm">
                        {/* Panel Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">{selectedAccount.account_code}</p>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{selectedAccount.account_name}</h3>
                                {selectedAccount.fund_start_date && <p className="text-[9px] text-slate-400 font-medium mt-0.5">Since {selectedAccount.fund_start_date}</p>}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setActivePanel("performance")} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activePanel === "performance" ? "bg-gv-gold text-black" : "bg-slate-50 text-slate-400 border border-slate-100 hover:text-slate-900"}`}>📊 {lang === "en" ? "Performance" : "业绩"}</button>
                                <button onClick={() => setActivePanel("members")} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activePanel === "members" ? "bg-gv-gold text-black" : "bg-slate-50 text-slate-400 border border-slate-100 hover:text-slate-900"}`}>👥 {tx.membersTitle}</button>
                            </div>
                        </div>

                        {/* Performance Panel */}
                        {activePanel === "performance" && (
                            <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{tx.performanceTitle}</p>
                                    <button onClick={openAddSnap} className="flex items-center gap-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:-translate-y-0.5 transition-all">
                                        <Plus className="h-3.5 w-3.5" />
                                        {tx.addSnapshot}
                                    </button>
                                </div>

                                {/* Snapshot Form (add or edit) */}
                                {showSnapForm && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{editingSnap ? tx.editSnapshot : tx.addSnapshot}</p>
                                        {editingSnap && (
                                            <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[9px] font-bold text-amber-700">
                                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                Editing will preserve original values in audit trail. Entered by: <strong>{editingSnap.entered_by_name || "—"}</strong>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">{tx.snapshotDate}</label>
                                                <input type="date" value={snapForm.snapshot_date} onChange={e => setSnapForm(p => ({...p, snapshot_date: e.target.value}))} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-gv-gold transition-all" />
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">{tx.snapshotType}</label>
                                                <select value={snapForm.snapshot_type} onChange={e => setSnapForm(p => ({...p, snapshot_type: e.target.value}))} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-gv-gold transition-all appearance-none cursor-pointer">
                                                    <option value="daily">{tx.daily}</option>
                                                    <option value="monthly">{tx.monthly}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">{tx.openingCapital}</label>
                                                <input type="number" step="0.01" placeholder="0.00" value={snapForm.opening_capital} onChange={e => setSnapForm(p => ({...p, opening_capital: e.target.value}))} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-gv-gold transition-all" />
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">{tx.closingCapital}</label>
                                                <input type="number" step="0.01" placeholder="0.00" value={snapForm.closing_capital} onChange={e => setSnapForm(p => ({...p, closing_capital: e.target.value}))} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-gv-gold transition-all" />
                                            </div>
                                            <CalcPreview open={snapForm.opening_capital} close={snapForm.closing_capital} />
                                            <div className="col-span-2 md:col-span-3">
                                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">{tx.notes}</label>
                                                <input type="text" placeholder="Optional notes..." value={snapForm.notes} onChange={e => setSnapForm(p => ({...p, notes: e.target.value}))} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-gv-gold transition-all" />
                                            </div>
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <button onClick={handleSubmitSnap} className="bg-gv-gold text-black font-black text-[9px] uppercase tracking-widest px-6 py-2.5 rounded-xl hover:-translate-y-0.5 transition-all shadow-md">{tx.save}</button>
                                            <button onClick={() => { setShowSnapForm(false); setEditingSnap(null); }} className="bg-slate-100 text-slate-500 font-black text-[9px] uppercase tracking-widest px-6 py-2.5 rounded-xl hover:bg-slate-200 transition-all">{tx.cancel}</button>
                                        </div>
                                    </div>
                                )}

                                {/* Snapshot Table */}
                                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                                    {accountPerf(selectedAccount.id).length === 0 ? (
                                        <div className="p-12 text-center">
                                            <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">{tx.noSnapshots}</p>
                                        </div>
                                    ) : (
                                        <table className="w-full text-left min-w-[700px]">
                                            <thead className="bg-slate-50 border-b border-slate-100">
                                                <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                    <th className="px-4 py-3">{tx.snapshotDate}</th>
                                                    <th className="px-4 py-3">{tx.snapshotType}</th>
                                                    <th className="px-4 py-3">{tx.openingCapital}</th>
                                                    <th className="px-4 py-3">{tx.closingCapital}</th>
                                                    <th className="px-4 py-3">{tx.gainLossAmt}</th>
                                                    <th className="px-4 py-3">{tx.gainLossPct}</th>
                                                    <th className="px-4 py-3">{tx.enteredBy}</th>
                                                    <th className="px-4 py-3"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {accountPerf(selectedAccount.id).map(snap => (
                                                    <tr key={snap.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-4 py-3 text-xs font-bold text-slate-600 tabular-nums whitespace-nowrap font-mono">
                                                            {snap.snapshot_date}
                                                            {snap.edited_at && (
                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                    <AlertCircle className="h-2.5 w-2.5 text-amber-400" />
                                                                    <span className="text-[7px] text-amber-500 font-bold">{tx.editedBy} {snap.edited_by}</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${snap.snapshot_type === "daily" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                                                                {snap.snapshot_type === "daily" ? tx.daily : tx.monthly}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-bold text-slate-600 tabular-nums">
                                                            {USD(snap.opening_capital)}
                                                            {snap.original_opening_capital && <div className="text-[7px] text-slate-300 line-through">{USD(snap.original_opening_capital)}</div>}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-bold text-slate-900 tabular-nums">
                                                            {USD(snap.closing_capital)}
                                                            {snap.original_closing_capital && <div className="text-[7px] text-slate-300 line-through">{USD(snap.original_closing_capital)}</div>}
                                                        </td>
                                                        <td className={`px-4 py-3 text-xs font-black tabular-nums ${Number(snap.gain_loss_amount) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                            {Number(snap.gain_loss_amount) >= 0 ? "+" : ""}{USD(snap.gain_loss_amount)}
                                                        </td>
                                                        <td className={`px-4 py-3 text-xs font-black tabular-nums ${Number(snap.gain_loss_percent) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                            {PCT(snap.gain_loss_percent)}
                                                        </td>
                                                        <td className="px-4 py-3 text-[9px] text-slate-400 font-medium max-w-[100px] truncate">
                                                            {snap.entered_by_name || "—"}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-1">
                                                                <button onClick={() => openEditSnap(snap)} className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-gv-gold hover:bg-amber-50 transition-colors">
                                                                    <Edit2 className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button onClick={() => handleDeletePerformanceSnapshot(snap.id)} className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Members Panel */}
                        {activePanel === "members" && (
                            <div className="p-6 space-y-6">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{tx.membersTitle}</p>

                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{tx.assignUser}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">{tx.selectUser}</label>
                                            <select value={assignUserId} onChange={e => setAssignUserId(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-gv-gold transition-all appearance-none cursor-pointer">
                                                <option value="">{tx.selectUser}...</option>
                                                {unassignedUsers.map((u: any) => (
                                                    <option key={u.id} value={u.id}>{u.full_name} — {u.email} (${Number(u.balance_usd || 0).toFixed(2)})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">{tx.allocatedAmount}</label>
                                            <input type="number" step="0.01" placeholder="0.00" value={assignAmount} onChange={e => setAssignAmount(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-gv-gold transition-all" />
                                        </div>
                                    </div>
                                    <button onClick={handleAssign} disabled={!assignUserId} className="bg-gv-gold disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-[9px] uppercase tracking-widest px-6 py-2.5 rounded-xl hover:-translate-y-0.5 transition-all shadow-md">{tx.assignBtn}</button>
                                </div>

                                {accountMembers(selectedAccount.id).length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                                        <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">{tx.noMembers}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {accountMembers(selectedAccount.id).map((m: any) => (
                                            <div key={m.id} className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-gv-gold/20 to-amber-100 border border-gv-gold/20 flex items-center justify-center font-black text-gv-gold text-sm shrink-0">
                                                        {(m.profiles?.full_name?.[0] || "U").toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 uppercase">{m.profiles?.full_name}</p>
                                                        <p className="text-[9px] text-slate-400 font-medium">{m.profiles?.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Allocated</p>
                                                        <p className="text-sm font-black text-gv-gold tabular-nums">{USD(m.allocated_amount_usd)}</p>
                                                    </div>
                                                    <button onClick={() => handleRemoveUserFromFundAccount(m.id)} className="h-8 w-8 flex items-center justify-center rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors border border-gray-100">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="xl:col-span-2 bg-white border border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center justify-center p-20 gap-4">
                        <div className="h-20 w-20 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <svg className="h-10 w-10 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <p className="text-slate-300 font-black uppercase tracking-[0.3em] text-xs text-center">{lang === "en" ? "Select an account to manage" : "选择账户以管理"}</p>
                    </div>
                )}
            </div>

            {/* Create/Edit Account Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-xl" onClick={() => setShowForm(false)}></div>
                    <div className="relative bg-white border border-gray-200 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">{editingAccount ? tx.formEditTitle : tx.formCreateTitle}</h3>
                            <button onClick={() => setShowForm(false)} className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-gray-400 hover:text-gray-900 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">{tx.fieldAccountName}</label>
                                    <input type="text" value={form.account_name} onChange={e => setForm(p => ({...p, account_name: e.target.value}))} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-gv-gold transition-all" />
                                </div>
                                <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">{tx.fieldAccountCode}</label>
                                    <input type="text" value={form.account_code} onChange={e => setForm(p => ({...p, account_code: e.target.value.toUpperCase()}))} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-gv-gold transition-all" placeholder="FA-001" />
                                </div>
                                <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">{tx.fieldPlatform}</label>
                                    <input type="text" value={form.platform_name} onChange={e => setForm(p => ({...p, platform_name: e.target.value}))} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-gv-gold transition-all" placeholder="MetaTrader 5" />
                                </div>
                                <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">{tx.fieldCurrency}</label>
                                    <select value={form.base_currency} onChange={e => setForm(p => ({...p, base_currency: e.target.value}))} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-gv-gold transition-all appearance-none cursor-pointer">
                                        <option value="USD">USD</option>
                                        <option value="MYR">MYR</option>
                                        <option value="EUR">EUR</option>
                                        <option value="GBP">GBP</option>
                                        <option value="SGD">SGD</option>
                                        <option value="USDT">USDT</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">{tx.fieldFundStartDate}</label>
                                    <input type="date" value={form.fund_start_date} onChange={e => setForm(p => ({...p, fund_start_date: e.target.value}))} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-gv-gold transition-all" />
                                </div>
                                <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">{editingAccount ? tx.fieldCurrentCapital : tx.fieldInitialCapital}</label>
                                    <input type="number" step="0.01" value={editingAccount ? form.current_capital : form.initial_capital} onChange={e => setForm(p => editingAccount ? {...p, current_capital: e.target.value} : {...p, initial_capital: e.target.value})} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-gv-gold transition-all" placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">{tx.fieldDescription}</label>
                                <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={2} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-gv-gold transition-all resize-none" />
                            </div>
                            {editingAccount && (
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setForm(p => ({...p, is_active: !p.is_active}))} className={`h-5 w-10 rounded-full relative transition-all ${form.is_active ? "bg-gv-gold" : "bg-gray-200"}`}>
                                        <div className={`h-3.5 w-3.5 bg-white rounded-full absolute top-[3px] transition-all shadow-sm ${form.is_active ? "right-1" : "left-1"}`}></div>
                                    </button>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{tx.fieldIsActive}</span>
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button onClick={handleSubmitForm} className="flex-1 bg-gv-gold text-black font-black text-[9px] uppercase tracking-widest py-3.5 rounded-2xl hover:-translate-y-0.5 transition-all shadow-md">{tx.save}</button>
                                <button onClick={() => setShowForm(false)} className="flex-1 bg-slate-100 text-slate-500 font-black text-[9px] uppercase tracking-widest py-3.5 rounded-2xl hover:bg-slate-200 transition-all">{tx.cancel}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
