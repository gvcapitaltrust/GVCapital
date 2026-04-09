"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
    Calendar, 
    Search, 
    Save, 
    RefreshCcw, 
    CheckCircle2, 
    AlertCircle, 
    User, 
    Hash,
    ArrowUpDown,
    Filter
} from "lucide-react";
import { formatDateTime } from "@/lib/dateUtils";

interface Transaction {
    id: string;
    user_id: string;
    amount: number;
    original_currency_amount: number;
    type: string;
    status: string;
    ref_id: string;
    created_at: string;
    transfer_date?: string;
    metadata: any;
    profiles: {
        full_name: string;
        email: string;
        username: string;
    };
}

export default function TransactionEditorClient() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [typeFilter, setTypeFilter] = useState("All");
    const [saveStatus, setSaveStatus] = useState<{ id: string; status: "idle" | "saving" | "success" | "error" }[]>([]);

    const fetchTransactions = useCallback(async () => {
        setSearching(true);
        try {
            const { data, error } = await supabase
                .from("transactions")
                .select("*, profiles(full_name, email, username)")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
            // Initialize save status for each transaction
            setSaveStatus((data || []).map(tx => ({ id: tx.id, status: "idle" })));
        } catch (err) {
            console.error("Error fetching transactions:", err);
        } finally {
            setLoading(false);
            setSearching(false);
        }
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const handleUpdateDate = (id: string, field: string, value: string) => {
        setTransactions(prev => prev.map(tx => {
            if (tx.id !== id) return tx;
            
            if (field === "created_at" || field === "transfer_date") {
                return { ...tx, [field]: value };
            } else {
                return {
                    ...tx,
                    metadata: {
                        ...tx.metadata,
                        [field]: value
                    }
                };
            }
        }));
    };

    const handleSaveRow = async (tx: Transaction) => {
        setSaveStatus(prev => prev.map(s => s.id === tx.id ? { ...s, status: "saving" } : s));
        try {
            const { error } = await supabase
                .from("transactions")
                .update({
                    created_at: tx.created_at,
                    transfer_date: tx.transfer_date,
                    metadata: tx.metadata
                })
                .eq("id", tx.id);

            if (error) throw error;

            setSaveStatus(prev => prev.map(s => s.id === tx.id ? { ...s, status: "success" } : s));
            setTimeout(() => {
                setSaveStatus(prev => prev.map(s => s.id === tx.id ? { ...s, status: "idle" } : s));
            }, 3000);
        } catch (err) {
            console.error("Error saving transaction:", err);
            setSaveStatus(prev => prev.map(s => s.id === tx.id ? { ...s, status: "error" } : s));
        }
    };

    const filteredTransactions = transactions.filter(tx => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
            (tx.profiles?.full_name || "").toLowerCase().includes(query) ||
            (tx.profiles?.email || "").toLowerCase().includes(query) ||
            (tx.ref_id || "").toLowerCase().includes(query);
        
        const matchesStatus = statusFilter === "All" || tx.status === statusFilter;
        const matchesType = typeFilter === "All" || tx.type.toLowerCase() === typeFilter.toLowerCase();

        return matchesSearch && matchesStatus && matchesType;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-32 space-y-4">
                <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent animate-spin rounded-full shadow-lg shadow-indigo-500/20" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse">Synchronizing Ledger Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-xl shadow-indigo-500/20">
                            <Calendar className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Transaction Dates</h1>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1 italic">Ledger Correction & Audit Tool</p>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={fetchTransactions}
                    disabled={searching}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                    <RefreshCcw className={`h-3.5 w-3.5 ${searching ? "animate-spin" : ""}`} />
                    Refresh Data
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Search by Name, Email, or Reference ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold focus:outline-none focus:border-indigo-400 focus:bg-white focus:shadow-xl transition-all placeholder:text-slate-300"
                        />
                    </div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Filter className="h-3.5 w-3.5 text-slate-300" />
                        </div>
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest appearance-none focus:outline-none focus:border-indigo-400 transition-all cursor-pointer"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Completed">Completed</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <ArrowUpDown className="h-3.5 w-3.5 text-slate-300" />
                        </div>
                        <select 
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest appearance-none focus:outline-none focus:border-indigo-400 transition-all cursor-pointer"
                        >
                            <option value="All">All Types</option>
                            <option value="Deposit">Deposit</option>
                            <option value="Withdrawal">Withdrawal</option>
                            <option value="Dividend">Dividend</option>
                            <option value="Bonus">Bonus</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            <div className="bg-white border border-slate-200 rounded-[2rem] xl:rounded-[2.5rem] overflow-hidden shadow-2xl">
                {/* Desktop View (Table) - Only on large screens */}
                <div className="hidden xl:block overflow-x-auto pb-4">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 border-b border-slate-100 italic">
                            <tr className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                                <th className="px-6 py-5">Transaction Info</th>
                                <th className="px-3 py-5">Create Date</th>
                                <th className="px-3 py-5">Approve Date</th>
                                <th className="px-3 py-5">Release Date</th>
                                <th className="px-3 py-5">Completed Date</th>
                                <th className="px-3 py-5">Transfer Date</th>
                                <th className="px-6 py-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredTransactions.map(tx => {
                                const status = saveStatus.find(s => s.id === tx.id)?.status || "idle";
                                
                                return (
                                    <tr key={tx.id} className="group hover:bg-slate-50/50 transition-all">
                                        <td className="px-6 py-6 items-start">
                                            <div className="flex flex-col gap-1">
                                                <span className={`w-fit text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                                    tx.type === 'Deposit' ? 'bg-emerald-50 text-emerald-600' :
                                                    tx.type === 'Withdrawal' ? 'bg-amber-50 text-amber-600' :
                                                    'bg-indigo-50 text-indigo-600'
                                                }`}>
                                                    {tx.type}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight leading-tight">
                                                    {tx.profiles?.full_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-6">
                                            <div className="flex flex-col gap-1">
                                                <input 
                                                    type="date" 
                                                    value={tx.created_at ? new Date(tx.created_at).toISOString().slice(0, 10) : ""}
                                                    onChange={(e) => {
                                                        const d = new Date(tx.created_at || new Date());
                                                        const [ny, nm, nd] = e.target.value.split('-').map(Number);
                                                        d.setFullYear(ny, nm-1, nd);
                                                        handleUpdateDate(tx.id, "created_at", d.toISOString());
                                                    }}
                                                    className="bg-slate-50 border border-slate-100 focus:border-indigo-400 rounded px-1.5 py-0.5 text-[9px] font-bold text-slate-600 focus:outline-none transition-all w-full"
                                                />
                                                <input 
                                                    type="time" 
                                                    value={tx.created_at ? new Date(tx.created_at).toTimeString().slice(0, 5) : ""}
                                                    onChange={(e) => {
                                                        const d = new Date(tx.created_at || new Date());
                                                        const [nh, nmin] = e.target.value.split(':').map(Number);
                                                        d.setHours(nh, nmin);
                                                        handleUpdateDate(tx.id, "created_at", d.toISOString());
                                                    }}
                                                    className="bg-transparent border border-transparent hover:border-slate-100 focus:border-indigo-400 rounded px-1.5 py-0.5 text-[8px] font-medium text-slate-400 focus:outline-none transition-all w-full"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-3 py-6">
                                            <div className="flex flex-col gap-1">
                                                <input 
                                                    type="date" 
                                                    value={tx.metadata?.approved_at ? new Date(tx.metadata.approved_at).toISOString().slice(0, 10) : ""}
                                                    onChange={(e) => {
                                                        const d = new Date(tx.metadata?.approved_at || new Date());
                                                        const [ny, nm, nd] = e.target.value.split('-').map(Number);
                                                        d.setFullYear(ny, nm-1, nd);
                                                        handleUpdateDate(tx.id, "approved_at", d.toISOString());
                                                    }}
                                                    className="bg-slate-50 border border-slate-100 focus:border-indigo-400 rounded px-1.5 py-0.5 text-[9px] font-bold text-slate-600 focus:outline-none transition-all w-full"
                                                />
                                                <input 
                                                    type="time" 
                                                    value={tx.metadata?.approved_at ? new Date(tx.metadata.approved_at).toTimeString().slice(0, 5) : ""}
                                                    onChange={(e) => {
                                                        const d = new Date(tx.metadata?.approved_at || new Date());
                                                        const [nh, nmin] = e.target.value.split(':').map(Number);
                                                        d.setHours(nh, nmin);
                                                        handleUpdateDate(tx.id, "approved_at", d.toISOString());
                                                    }}
                                                    className="bg-transparent border border-transparent hover:border-slate-100 focus:border-indigo-400 rounded px-1.5 py-0.5 text-[8px] font-medium text-slate-400 focus:outline-none transition-all w-full"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-3 py-6">
                                            <div className="flex flex-col gap-1">
                                                <input 
                                                    type="date" 
                                                    value={tx.metadata?.released_at ? new Date(tx.metadata.released_at).toISOString().slice(0, 10) : ""}
                                                    onChange={(e) => {
                                                        const d = new Date(tx.metadata?.released_at || new Date());
                                                        const [ny, nm, nd] = e.target.value.split('-').map(Number);
                                                        d.setFullYear(ny, nm-1, nd);
                                                        handleUpdateDate(tx.id, "released_at", d.toISOString());
                                                    }}
                                                    className="bg-slate-50 border border-slate-100 focus:border-indigo-400 rounded px-1.5 py-0.5 text-[9px] font-bold text-slate-600 focus:outline-none transition-all w-full"
                                                />
                                                <input 
                                                    type="time" 
                                                    value={tx.metadata?.released_at ? new Date(tx.metadata.released_at).toTimeString().slice(0, 5) : ""}
                                                    onChange={(e) => {
                                                        const d = new Date(tx.metadata?.released_at || new Date());
                                                        const [nh, nmin] = e.target.value.split(':').map(Number);
                                                        d.setHours(nh, nmin);
                                                        handleUpdateDate(tx.id, "released_at", d.toISOString());
                                                    }}
                                                    className="bg-transparent border border-transparent hover:border-slate-100 focus:border-indigo-400 rounded px-1.5 py-0.5 text-[8px] font-medium text-slate-400 focus:outline-none transition-all w-full"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-3 py-6">
                                            <div className="flex flex-col gap-1">
                                                <input 
                                                    type="date" 
                                                    value={tx.metadata?.completed_at ? new Date(tx.metadata.completed_at).toISOString().slice(0, 10) : ""}
                                                    onChange={(e) => {
                                                        const d = new Date(tx.metadata?.completed_at || new Date());
                                                        const [ny, nm, nd] = e.target.value.split('-').map(Number);
                                                        d.setFullYear(ny, nm-1, nd);
                                                        handleUpdateDate(tx.id, "completed_at", d.toISOString());
                                                    }}
                                                    className="bg-slate-50 border border-slate-100 focus:border-indigo-400 rounded px-1.5 py-0.5 text-[9px] font-bold text-slate-600 focus:outline-none transition-all w-full"
                                                />
                                                <input 
                                                    type="time" 
                                                    value={tx.metadata?.completed_at ? new Date(tx.metadata.completed_at).toTimeString().slice(0, 5) : ""}
                                                    onChange={(e) => {
                                                        const d = new Date(tx.metadata?.completed_at || new Date());
                                                        const [nh, nmin] = e.target.value.split(':').map(Number);
                                                        d.setHours(nh, nmin);
                                                        handleUpdateDate(tx.id, "completed_at", d.toISOString());
                                                    }}
                                                    className="bg-transparent border border-transparent hover:border-slate-100 focus:border-indigo-400 rounded px-1.5 py-0.5 text-[8px] font-medium text-slate-400 focus:outline-none transition-all w-full"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-3 py-6">
                                            <div className="flex flex-col gap-1">
                                                <input 
                                                    type="date" 
                                                    value={tx.transfer_date ? new Date(tx.transfer_date).toISOString().slice(0, 10) : ""}
                                                    onChange={(e) => {
                                                        const d = new Date(tx.transfer_date || new Date());
                                                        const [ny, nm, nd] = e.target.value.split('-').map(Number);
                                                        d.setFullYear(ny, nm-1, nd);
                                                        handleUpdateDate(tx.id, "transfer_date", d.toISOString());
                                                    }}
                                                    className="bg-slate-50 border border-slate-100 focus:border-indigo-400 rounded px-1.5 py-0.5 text-[9px] font-bold text-slate-600 focus:outline-none transition-all w-full"
                                                />
                                                <input 
                                                    type="time" 
                                                    value={tx.transfer_date ? new Date(tx.transfer_date).toTimeString().slice(0, 5) : ""}
                                                    onChange={(e) => {
                                                        const d = new Date(tx.transfer_date || new Date());
                                                        const [nh, nmin] = e.target.value.split(':').map(Number);
                                                        d.setHours(nh, nmin);
                                                        handleUpdateDate(tx.id, "transfer_date", d.toISOString());
                                                    }}
                                                    className="bg-transparent border border-transparent hover:border-slate-100 focus:border-indigo-400 rounded px-1.5 py-0.5 text-[8px] font-medium text-slate-400 focus:outline-none transition-all w-full"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <button 
                                                onClick={() => handleSaveRow(tx)}
                                                disabled={status === "saving"}
                                                className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-90 ${
                                                    status === "saving" ? "bg-slate-100 text-slate-400" :
                                                    status === "success" ? "bg-emerald-500 text-white shadow-emerald-500/20" :
                                                    status === "error" ? "bg-red-500 text-white shadow-red-500/20" :
                                                    "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20"
                                                }`}
                                            >
                                                {status === "saving" ? <RefreshCcw className="h-4 w-4 animate-spin" /> :
                                                 status === "success" ? <CheckCircle2 className="h-4 w-4" /> :
                                                 status === "error" ? <AlertCircle className="h-4 w-4" /> :
                                                 <Save className="h-4 w-4" />}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile & Mid-size View (Cards) - Shown on all screens smaller than XL */}
                <div className="xl:hidden divide-y divide-slate-100">
                    {filteredTransactions.map(tx => {
                        const status = saveStatus.find(s => s.id === tx.id)?.status || "idle";
                        
                        return (
                            <div key={tx.id} className="p-6 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest italic group">
                                            <span className={`px-2 py-0.5 rounded ${
                                                tx.type === 'Deposit' ? 'bg-emerald-50 text-emerald-600' :
                                                tx.type === 'Withdrawal' ? 'bg-amber-50 text-amber-600' :
                                                'bg-indigo-50 text-indigo-600'
                                            }`}>{tx.type}</span>
                                            <span>{tx.status}</span>
                                        </div>
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{tx.profiles?.full_name}</h3>
                                        <div className="flex items-center gap-1.5 text-slate-400">
                                            <Hash className="h-3 w-3" />
                                            <span className="text-[10px] font-mono font-bold tracking-tighter uppercase">{tx.ref_id || tx.id.substring(0, 8)}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleSaveRow(tx)}
                                        disabled={status === "saving"}
                                        className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-95 ${
                                            status === "saving" ? "bg-slate-100 text-slate-400" :
                                            status === "success" ? "bg-emerald-500 text-white shadow-emerald-500/20" :
                                            status === "error" ? "bg-red-500 text-white shadow-red-500/20" :
                                            "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/30"
                                        }`}
                                    >
                                        {status === "saving" ? <RefreshCcw className="h-5 w-5 animate-spin" /> :
                                         status === "success" ? <CheckCircle2 className="h-6 w-6" /> :
                                         status === "error" ? <AlertCircle className="h-6 w-6" /> :
                                         <Save className="h-5 w-5" />}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Created Date</label>
                                        <input 
                                            type="datetime-local" 
                                            value={tx.created_at ? new Date(tx.created_at).toISOString().slice(0, 16) : ""}
                                            onChange={(e) => handleUpdateDate(tx.id, "created_at", new Date(e.target.value).toISOString())}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-600 focus:outline-none focus:border-indigo-400 transition-all placeholder:text-slate-300"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Approved Date</label>
                                        <input 
                                            type="datetime-local" 
                                            value={tx.metadata?.approved_at ? new Date(tx.metadata.approved_at).toISOString().slice(0, 16) : ""}
                                            onChange={(e) => handleUpdateDate(tx.id, "approved_at", new Date(e.target.value).toISOString())}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-600 focus:outline-none focus:border-indigo-400 transition-all placeholder:text-slate-300"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Released Date</label>
                                        <input 
                                            type="datetime-local" 
                                            value={tx.metadata?.released_at ? new Date(tx.metadata.released_at).toISOString().slice(0, 16) : ""}
                                            onChange={(e) => handleUpdateDate(tx.id, "released_at", new Date(e.target.value).toISOString())}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-600 focus:outline-none focus:border-indigo-400 transition-all placeholder:text-slate-300"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Completed Date</label>
                                        <input 
                                            type="datetime-local" 
                                            value={tx.metadata?.completed_at ? new Date(tx.metadata.completed_at).toISOString().slice(0, 16) : ""}
                                            onChange={(e) => handleUpdateDate(tx.id, "completed_at", new Date(e.target.value).toISOString())}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-600 focus:outline-none focus:border-indigo-400 transition-all placeholder:text-slate-300"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Transfer Date</label>
                                        <input 
                                            type="datetime-local" 
                                            value={tx.transfer_date ? new Date(tx.transfer_date).toISOString().slice(0, 16) : ""}
                                            onChange={(e) => handleUpdateDate(tx.id, "transfer_date", new Date(e.target.value).toISOString())}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-600 focus:outline-none focus:border-indigo-400 transition-all placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {filteredTransactions.length === 0 && (
                    <div className="p-24 text-center space-y-4">
                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                            <Search className="h-8 w-8 text-slate-200" />
                        </div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em]">No matching transactions found</p>
                    </div>
                )}
            </div>
            
            {/* Audit Note */}
            <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">Administrative Audit Warning</p>
                    <p className="text-[9px] font-bold text-amber-700/80 leading-relaxed uppercase tracking-tight">
                        Manual date corrections directly impact the General Ledger and financial statements. Use this tool only to correct synchronization errors or processing delays. All changes are logged in the transaction metadata history.
                    </p>
                </div>
            </div>
        </div>
    );
}
