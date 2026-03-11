"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import GlobalFooter from "@/components/GlobalFooter";
import { supabase } from "@/lib/supabaseClient";

export default function AdminPortal() {
    const router = useRouter();
    interface Profile {
        id: string;
        username: string;
        full_name: string;
        email: string;
        balance: number;
        balance_usd: number;
        is_verified: boolean;
        kyc_status: 'Pending' | 'Verified' | 'Rejected' | 'Draft' | null;
        kyc_step: number;
        kyc_data: any;
        kyc_id_front: string;
        kyc_id_back: string;
        dob: string;
        phone: string;
        tax_id: string;
        address: string;
        account_purpose: string;
        employment_status: string;
        industry: string;
        source_of_wealth: string[];
        annual_income: string;
        total_wealth: string;
        risk_acknowledged: boolean;
        accuracy_confirmed: boolean;
        is_not_pep: boolean;
        referred_by_username: string;
        verified_at: string;
    }

    const [activeTab, setActiveTab] = useState("deposits");
    const [mounted, setMounted] = useState(false);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [adminProfile, setAdminProfile] = useState<Profile | null>(null);
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });

    const showToast = (msg: string) => {
        setToast({ message: msg, visible: true });
        setTimeout(() => setToast({ message: "", visible: false }), 5000);
    };

    // Forex Control State
    const [currentForexRate, setCurrentForexRate] = useState<string>("4.752");
    const [newForexRate, setNewForexRate] = useState<string>("");
    const [forexHistory, setForexHistory] = useState<any[]>([]);
    const [isUpdatingRate, setIsUpdatingRate] = useState(false);

    // Supabase Data
    const [kycQueue, setKycQueue] = useState<Profile[]>([]);
    const [deposits, setDeposits] = useState<any[]>([]);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [users, setUsers] = useState<Profile[]>([]);
    const [salesData, setSalesData] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
    const [agentReferrals, setAgentReferrals] = useState<Partial<Profile>[]>([]);
    const [isLoadingSales, setIsLoadingSales] = useState(false);
    const [rejectionReasons, setRejectionReasons] = useState<{ [key: string]: string }>({});
    const [verificationLogs, setVerificationLogs] = useState<any[]>([]);
    const [auditSearchQuery, setAuditSearchQuery] = useState("");
    const [auditStatusFilter, setAuditStatusFilter] = useState("All");
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [viewingDoc, setViewingDoc] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        fetchData();
        checkMaintenance();
        fetchForexData();
        fetchSalesData();
        fetchAdminProfile();
    }, []);

    const fetchAdminProfile = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            setAdminProfile(profile || { id: session.user.id, username: session.user.email?.split('@')[0] });
        }
    };

    const fetchData = async () => {
        const { data: profileList } = await supabase.from('profiles').select('*');
        if (profileList) {
            setUsers(profileList as Profile[]);
            setKycQueue((profileList as Profile[]).filter((p: Profile) => p.kyc_status === 'Pending'));
        }

        const { data: txList } = await supabase
            .from('transactions')
            .select('*, profiles(full_name, email)')
            .order('created_at', { ascending: false });
        if (txList) {
            setDeposits(txList.filter((t: any) => t.type === 'Deposit' && t.status === 'Pending'));
            setWithdrawals(txList.filter((t: any) => t.type === 'Withdrawal' && t.status === 'Pending'));
        }

        const { data: logs } = await supabase
            .from('verification_logs')
            .select('*')
            .order('created_at', { ascending: false });
        if (logs) setVerificationLogs(logs);
    };

    const fetchForexData = async () => {
        const { data: currentRateData } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'usd_to_myr_rate')
            .single();
        if (currentRateData) {
            setCurrentForexRate(currentRateData.value);
            setNewForexRate(currentRateData.value);
        }

        const { data: historyData } = await supabase
            .from('forex_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        if (historyData) setForexHistory(historyData);
    };

    const fetchSalesData = async () => {
        setIsLoadingSales(true);
        try {
            const { data, error } = await supabase
                .from('sales_leaderboard')
                .select('*')
                .order('total_referred_capital', { ascending: false });

            if (error) throw error;
            if (data) setSalesData(data);
        } catch (err: any) {
            console.error("Leaderboard error:", err.message);
        } finally {
            setIsLoadingSales(false);
        }
    };

    const fetchAgentReferrals = async (username: string) => {
        setSelectedAgent(username);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, username, balance, balance_usd')
                .eq('referred_by_username', username);
            if (error) throw error;
            if (data) setAgentReferrals(data);
        } catch (err: any) {
            console.error("Referral fetch error:", err.message);
        }
    };

    const checkMaintenance = async () => {
        const { data } = await supabase.from('settings').select('value').eq('key', 'maintenance_mode').single();
        if (data) setMaintenanceMode(data.value === 'true');
    };

    const toggleMaintenance = async () => {
        const newVal = !maintenanceMode;
        setMaintenanceMode(newVal);
        await supabase.from('settings').upsert({ key: 'maintenance_mode', value: String(newVal) }, { onConflict: 'key' });
    };

    const handleUpdateForexRate = async () => {
        if (!newForexRate || isNaN(parseFloat(newForexRate))) {
            alert("Please enter a valid rate.");
            return;
        }

        setIsUpdatingRate(true);
        try {
            const { error: updateError } = await supabase
                .from('platform_settings')
                .upsert({ key: 'usd_to_myr_rate', value: newForexRate }, { onConflict: 'key' });

            if (updateError) throw updateError;

            const { error: historyError } = await supabase
                .from('forex_history')
                .insert([{
                    old_rate: parseFloat(currentForexRate),
                    new_rate: parseFloat(newForexRate),
                    changed_by: (await supabase.auth.getUser()).data.user?.email || 'admin'
                }]);

            if (historyError) throw historyError;

            alert("Forex rate updated successfully.");
            fetchForexData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsUpdatingRate(false);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const currentPassword = formData.get("currentPassword") as string;
        const newPassword = formData.get("newPassword") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (newPassword !== confirmPassword) {
            alert("New passwords do not match.");
            return;
        }

        setIsUpdatingRate(true); // Reusing for loading state
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            alert("Password updated successfully.");
            (e.target as HTMLFormElement).reset();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsUpdatingRate(false);
        }
    };

    const handleVerifyUser = async (userId: string) => {
        const userToVerify = users.find((u: any) => u.id === userId);
        if (!userToVerify) return;

        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    is_verified: true,
                    verified_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (updateError) throw updateError;

            // Log the verification
            await supabase
                .from('verification_logs')
                .insert({
                    admin_id: adminProfile?.id,
                    user_email: userToVerify.email,
                    admin_username: adminProfile?.username || adminProfile?.email?.split('@')[0] || 'Admin',
                    action: 'Verified',
                    created_at: new Date().toISOString()
                });

            fetchData();
            showToast(`User ${userToVerify.email} successfully verified by ${adminProfile?.username || adminProfile?.email?.split('@')[0] || 'Admin'}.`);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleRejectUser = async (userId: string) => {
        const userToReject = users.find((u: any) => u.id === userId);
        if (!userToReject) return;
        const reason = rejectionReasons[userId] || "";

        if (!reason.trim()) {
            alert("Please provide a rejection reason.");
            return;
        }

        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    kyc_status: 'rejected',
                    is_verified: false,
                    rejection_reason: reason
                })
                .eq('id', userId);

            if (updateError) throw updateError;

            // Log the rejection
            await supabase
                .from('verification_logs')
                .insert({
                    admin_id: adminProfile?.id,
                    user_email: userToReject.email,
                    admin_username: adminProfile?.username || adminProfile?.email?.split('@')[0] || 'Admin',
                    action: 'Rejected',
                    rejection_reason: reason,
                    created_at: new Date().toISOString()
                });

            // Clear the reason for this user
            setRejectionReasons((prev: any) => {
                const next = { ...prev };
                delete next[userId];
                return next;
            });

            fetchData();
            showToast(`User successfully rejected.`);
        } catch (err: any) {
            alert(err.message);
        }
    };


    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val || 0).replace("MYR", "RM");
    };

    if (!mounted) return null;

    return (
        <AuthGuard requireAdmin={true}>
            <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans flex flex-col selection:bg-gv-gold selection:text-black">
                <title>{`Admin Portal | GV Capital Trust`}</title>

                <header className="border-b border-white/10 bg-[#121212] px-8 py-4 flex items-center justify-between sticky top-0 z-50">
                    <div className="flex items-center gap-4">
                        <img src="/logo.png" className="h-[40px] w-auto mix-blend-screen" />
                        <div>
                            <h1 className="text-xl font-bold text-white uppercase tracking-tighter">Master Control</h1>
                            <p className="text-[10px] text-gv-gold font-black tracking-widest uppercase">Admin System Core</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Maintenance</span>
                            <button onClick={toggleMaintenance} className={`h-6 w-12 rounded-full relative transition-all ${maintenanceMode ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "bg-white/10"}`}>
                                <div className={`h-4 w-4 bg-white rounded-full absolute top-1 transition-all ${maintenanceMode ? "right-1" : "left-1"}`}></div>
                            </button>
                        </div>
                        <button onClick={() => { supabase.auth.signOut(); router.push("/login"); }} className="bg-white/5 border border-white/10 px-6 py-2 rounded-xl text-xs font-black uppercase hover:text-red-500 transition-all">Logout</button>
                    </div>
                </header>

                <main className="flex-1 p-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto space-y-12 pb-20">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-[#121212] border border-white/5 p-6 rounded-[32px] hover:border-gv-gold/20 transition-all">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Assets</p>
                                <h2 className="text-2xl font-black text-white">{formatCurrency(users.reduce((acc: number, u: any) => acc + (u.balance || 0), 0))}</h2>
                            </div>
                            <div className="bg-[#121212] border border-white/5 p-6 rounded-[32px]">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">KYC Pending</p>
                                <h2 className="text-2xl font-black text-gv-gold">{kycQueue.length}</h2>
                            </div>
                            <div className="bg-[#121212] border border-white/5 p-6 rounded-[32px]">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Unpaid Checks</p>
                                <h2 className="text-2xl font-black text-emerald-500">{deposits.length}</h2>
                            </div>
                            <div className="bg-[#121212] border border-white/5 p-6 rounded-[32px]">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Clients</p>
                                <h2 className="text-2xl font-black text-white">{users.length}</h2>
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex gap-4 border-b border-white/10 pb-4 overflow-x-auto">
                            {["deposits", "kyc", "withdrawals", "users", "sales", "forex", "audit", "security"].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? "bg-gv-gold text-black shadow-lg shadow-gv-gold/20" : "text-zinc-500 hover:text-white"}`}
                                >
                                    {tab === "kyc" ? `KYC Queue (${kycQueue.length})` : tab}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="bg-[#121212] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
                            {activeTab === "kyc" && (
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                        <tr>
                                            <th className="px-8 py-6">Client</th>
                                            <th className="px-8 py-6">Submission Date</th>
                                            <th className="px-8 py-6">Country</th>
                                            <th className="px-8 py-6 text-center">Status</th>
                                            <th className="px-8 py-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02]">
                                        {kycQueue.map((u: any, i: number) => (
                                            <tr 
                                                key={i} 
                                                className="text-sm font-bold group hover:bg-white/[0.01] cursor-pointer"
                                                onClick={() => { setSelectedUser(u); setIsDetailModalOpen(true); }}
                                            >
                                                <td className="px-8 py-6">
                                                    <div className="text-white">{u.full_name || u.email}</div>
                                                    <div className="text-[10px] text-zinc-500 font-medium">{u.email}</div>
                                                </td>
                                                <td className="px-8 py-6 text-zinc-400 font-mono text-xs">
                                                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A"}
                                                </td>
                                                <td className="px-8 py-6 text-zinc-400">{u.country || u.kyc_data?.country || "N/A"}</td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[9px] uppercase font-black border border-amber-500/20">
                                                        {u.kyc_status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button className="text-[10px] font-black uppercase text-gv-gold hover:underline">Review Profile</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {kycQueue.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-8 py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">
                                                    No pending KYC applications
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === "withdrawals" && (
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                        <tr><th className="px-8 py-6">Name</th><th className="px-8 py-6">Ref ID</th><th className="px-8 py-6">Amount (RM)</th><th className="px-8 py-6 text-right">Action</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02]">
                                        {withdrawals.map((w: any, i: number) => (
                                            <tr key={i} className="text-sm font-bold group hover:bg-white/[0.01]">
                                                <td className="px-8 py-6 text-white">{w.profiles?.full_name || w.user_id}</td>
                                                <td className="px-8 py-4 font-mono text-xs opacity-50">{w.ref_id}</td>
                                                <td className="px-8 py-6 text-red-400">{formatCurrency(w.amount * -1)}</td>
                                                <td className="px-8 py-6 text-right">
                                                    <button className="bg-red-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-red-500/10 hover:-translate-y-0.5 transition-all">Approve Withdrawal</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {withdrawals.length === 0 && <tr><td colSpan={4} className="px-8 py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">No pending withdrawals</td></tr>}
                                    </tbody>
                                </table>
                            )}
                            {activeTab === "sales" && (
                                <div className="p-8 space-y-8">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tighter text-white">Sales Performance</h3>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Global Agent Leaderboard</p>
                                        </div>
                                        <div className="relative w-full md:w-72">
                                            <input
                                                type="text"
                                                placeholder="Search Agent Username..."
                                                value={searchQuery}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-gv-gold transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 overflow-hidden border border-white/5 rounded-3xl">
                                            <table className="w-full text-left">
                                                <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                    <tr>
                                                        <th className="px-6 py-4">Rank</th>
                                                        <th className="px-6 py-4">Agent</th>
                                                        <th className="px-6 py-4">Total Ref</th>
                                                        <th className="px-6 py-4">Total Capital</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/[0.02]">
                                                    {salesData
                                                        .filter((agent: any) => agent.agent_username.toLowerCase().includes(searchQuery.toLowerCase()))
                                                        .map((agent: any, index: number) => (
                                                            <tr
                                                                key={agent.agent_username}
                                                                className={`text-sm group hover:bg-white/[0.02] transition-colors cursor-pointer ${selectedAgent === agent.agent_username ? "bg-gv-gold/5 border-gv-gold/20" : ""}`}
                                                                onClick={() => fetchAgentReferrals(agent.agent_username)}
                                                            >
                                                                <td className="px-6 py-5">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-mono text-zinc-500 text-xs">#{(index + 1).toString().padStart(2, '0')}</span>
                                                                        {index === 0 && <span className="text-lg">🥇</span>}
                                                                        {index === 1 && <span className="text-lg">🥈</span>}
                                                                        {index === 2 && <span className="text-lg">🥉</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-5">
                                                                    <div className="font-black text-white group-hover:text-gv-gold transition-colors">{agent.agent_username}</div>
                                                                </td>
                                                                <td className="px-6 py-5 font-bold text-zinc-400">{agent.total_referrals}</td>
                                                                <td className="px-6 py-5 font-black text-emerald-400">{formatCurrency(agent.total_referred_capital)}</td>
                                                            </tr>
                                                        ))
                                                    }
                                                    {salesData.length === 0 && !isLoadingSales && (
                                                        <tr>
                                                            <td colSpan={4} className="px-8 py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">No sales data recorded</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 h-fit min-h-[400px]">
                                            {selectedAgent ? (
                                                <div className="space-y-6 animate-in fade-in duration-300">
                                                    <div>
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gv-gold mb-1">Agent Detail Profile</h4>
                                                        <div className="text-2xl font-black text-white uppercase tracking-tighter">{selectedAgent}</div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Referred Clients ({agentReferrals.length})</h5>
                                                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                            {agentReferrals.map((ref: any, i: number) => (
                                                                <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between group">
                                                                    <div>
                                                                        <div className="text-xs font-black text-white">{ref.full_name || ref.username}</div>
                                                                        <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">@{ref.username}</div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="text-xs font-black text-emerald-400">{formatCurrency(ref.balance)}</div>
                                                                        <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">${(ref.balance_usd || 0).toFixed(2)} USD</div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {agentReferrals.length === 0 && (
                                                                <div className="text-center py-10 text-zinc-600 text-[10px] font-black uppercase">No referrals found</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-center p-10">
                                                    <div className="text-4xl mb-4 opacity-20">📊</div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Select an agent to view drill-down performance</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "forex" && (
                                <div className="p-10 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="max-w-md space-y-6">
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-white">Global Pricing Control</h3>
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Current Platform Rate</label>
                                                <div className="text-4xl font-black text-gv-gold tracking-tighter">1 USD = RM {parseFloat(currentForexRate).toFixed(3)}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">New Target Rate (MYR)</label>
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    value={newForexRate}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewForexRate(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-2xl font-black focus:outline-none focus:border-gv-gold transition-all text-white"
                                                    placeholder="4.752"
                                                />
                                            </div>
                                            <button
                                                onClick={handleUpdateForexRate}
                                                disabled={isUpdatingRate}
                                                className="w-full bg-gv-gold text-black font-black py-5 rounded-2xl uppercase tracking-widest shadow-xl hover:-translate-y-1 hover:shadow-gv-gold/20 transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                {isUpdatingRate ? "Propagating Rate..." : "Update Global Rate"}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xl font-black uppercase tracking-tighter text-white">Rate Audit History</h3>
                                            <div className="h-[1px] flex-1 bg-white/5 mx-8"></div>
                                        </div>
                                        <div className="overflow-hidden border border-white/5 rounded-3xl">
                                            <table className="w-full text-left">
                                                <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                    <tr>
                                                        <th className="px-8 py-4">Date</th>
                                                        <th className="px-8 py-4">Old Rate</th>
                                                        <th className="px-8 py-4">New Rate</th>
                                                        <th className="px-8 py-4">Change %</th>
                                                        <th className="px-8 py-4">Admin</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/[0.02]">
                                                    {forexHistory.map((h: any, i: number) => {
                                                        const change = ((h.new_rate - h.old_rate) / h.old_rate) * 100;
                                                        return (
                                                            <tr key={i} className="text-xs font-bold hover:bg-white/[0.01] transition-colors">
                                                                <td className="px-8 py-4 text-zinc-400 font-mono">{new Date(h.created_at).toLocaleString()}</td>
                                                                <td className="px-8 py-4 text-zinc-500">RM {h.old_rate.toFixed(3)}</td>
                                                                <td className="px-8 py-4 text-white">RM {h.new_rate.toFixed(3)}</td>
                                                                <td className={`px-8 py-4 ${change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                                                    {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                                                                </td>
                                                                <td className="px-8 py-4 text-zinc-500">{h.changed_by}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {forexHistory.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="px-8 py-12 text-center text-zinc-600 uppercase font-black tracking-widest">Initial global rate configured</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "users" && (
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                        <tr><th className="px-8 py-6">Client</th><th className="px-8 py-6">Balance (RM)</th><th className="px-8 py-6">Credit (USD)</th><th className="px-8 py-6 text-center">KYC</th><th className="px-8 py-6 text-center">Status</th><th className="px-8 py-6 text-right">Actions</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02]">
                                        {users.map((u: any, i: number) => (
                                            <tr 
                                                key={i} 
                                                className="text-sm font-bold group hover:bg-white/[0.01] cursor-pointer"
                                                onClick={() => { setSelectedUser(u); setIsDetailModalOpen(true); }}
                                            >
                                                <td className="px-8 py-6 text-white">{u.full_name || u.email}</td>
                                                <td className="px-8 py-6 text-emerald-400">{formatCurrency(u.balance)}</td>
                                                <td className="px-8 py-6 text-gv-gold">${(u.balance_usd || 0).toFixed(2)}</td>
                                                <td className="px-8 py-6">
                                                    <div className="flex justify-center">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] uppercase font-black text-center ${u.kyc_completed ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-500"}`}>{u.kyc_status || 'KYC Pending'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    {u.is_verified ? (
                                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Verified</span>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Pending</span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6 text-right space-x-3" onClick={(e: React.MouseEvent<HTMLTableCellElement>) => e.stopPropagation()}>
                                                    {!u.is_verified ? (
                                                        <div className="flex flex-col md:flex-row items-end md:items-center justify-end gap-3">
                                                            <input 
                                                                type="text"
                                                                placeholder="Rejection Reason..."
                                                                value={rejectionReasons[u.id] || ""}
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRejectionReasons({ ...rejectionReasons, [u.id]: e.target.value })}
                                                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[9px] focus:outline-none focus:border-red-500/50 w-full md:w-32"
                                                            />
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleVerifyUser(u.id)}
                                                                    className="bg-emerald-500 text-black px-4 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all whitespace-nowrap"
                                                                >
                                                                    Manual Verify
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRejectUser(u.id)}
                                                                    className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-lg shadow-red-500/20 hover:scale-105 transition-all whitespace-nowrap"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-500 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase">
                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>
                                                            Verified
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === "deposits" && (
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                        <tr><th className="px-8 py-6">Name</th><th className="px-8 py-6">Ref ID</th><th className="px-8 py-6">Paid (RM)</th><th className="px-8 py-6">Credit (USD)</th><th className="px-8 py-6 text-right">Action</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02]">
                                        {deposits.map((d: any, i: number) => (
                                            <tr key={i} className="text-sm font-bold group hover:bg-white/[0.01]">
                                                <td className="px-8 py-6 text-white">{d.profiles?.full_name}</td>
                                                <td className="px-8 py-4 font-mono text-xs opacity-50">{d.ref_id}</td>
                                                <td className="px-8 py-6 text-emerald-400">{formatCurrency(d.amount)}</td>
                                                <td className="px-8 py-6 text-gv-gold">${(d.amount_usd || 0).toFixed(2)}</td>
                                                <td className="px-8 py-6 text-right">
                                                    <button className="bg-emerald-500 text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/10 hover:-translate-y-0.5 transition-all">Verify & Credit</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {deposits.length === 0 && <tr><td colSpan={4} className="px-8 py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">No pending deposits</td></tr>}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === "audit" && (
                                <div className="p-8 animate-in fade-in duration-500">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tighter text-white">System Audit Log</h3>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Tracking Administrative Actions</p>
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-4">
                                            {/* Search Bar */}
                                            <div className="relative group">
                                                <input 
                                                    type="text"
                                                    placeholder="Search Email or Admin..."
                                                    value={auditSearchQuery}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuditSearchQuery(e.target.value)}
                                                    className="bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-xs focus:outline-none focus:border-gv-gold/50 transition-all w-full md:w-64"
                                                />
                                                <svg className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-gv-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            </div>

                                            {/* Status Filter */}
                                            <select 
                                                value={auditStatusFilter}
                                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAuditStatusFilter(e.target.value)}
                                                className="bg-[#121212] border border-white/10 rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-400 focus:outline-none focus:border-gv-gold/50 cursor-pointer transition-all"
                                            >
                                                <option value="All">All Actions</option>
                                                <option value="Verified">Verified Only</option>
                                                <option value="Rejected">Rejected Only</option>
                                            </select>

                                            <button onClick={fetchData} className="text-zinc-500 hover:text-gv-gold transition-colors p-2">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="overflow-hidden border border-white/5 rounded-3xl">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                <tr>
                                                    <th className="px-8 py-4">Date/Time</th>
                                                    <th className="px-8 py-4">Admin</th>
                                                    <th className="px-8 py-4">Target User</th>
                                                    <th className="px-8 py-4">Action</th>
                                                    <th className="px-8 py-4">Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.02]">
                                                {verificationLogs
                                                    .filter(log => {
                                                        const query = auditSearchQuery.toLowerCase();
                                                        const matchesSearch = log.user_email?.toLowerCase().includes(query) || 
                                                                            log.admin_username?.toLowerCase().includes(query);
                                                        const matchesFilter = auditStatusFilter === "All" || log.action === auditStatusFilter;
                                                        return matchesSearch && matchesFilter;
                                                    })
                                                    .map((log: any, i: number) => (
                                                    <tr key={i} className="text-xs font-bold hover:bg-white/[0.01] transition-colors">
                                                        <td className="px-8 py-4 text-zinc-400 font-mono">{new Date(log.created_at).toLocaleString()}</td>
                                                        <td className="px-8 py-4 text-white">
                                                            <div className="flex flex-col">
                                                                <span>{log.admin_username}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-4 text-zinc-300">{log.user_email}</td>
                                                        <td className="px-8 py-4">
                                                            <span className={`px-2 py-1 rounded-md text-[9px] uppercase font-black ${log.action === 'Verified' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                                                                {log.action}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-4 text-zinc-500 italic max-w-xs truncate overflow-hidden" title={log.rejection_reason}>
                                                            {log.rejection_reason || "-"}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {verificationLogs.filter(log => {
                                                    const query = auditSearchQuery.toLowerCase();
                                                    const matchesSearch = log.user_email?.toLowerCase().includes(query) || 
                                                                        log.admin_username?.toLowerCase().includes(query);
                                                    const matchesFilter = auditStatusFilter === "All" || log.action === auditStatusFilter;
                                                    return matchesSearch && matchesFilter;
                                                }).length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="px-8 py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">
                                                            {verificationLogs.length === 0 ? "No audit logs found" : "No logs found for this search"}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === "security" && (
                                <div className="p-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                    <div className="max-w-xl text-center mx-auto space-y-10">
                                        <div>
                                            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 text-white">Security Settings</h2>
                                            <p className="text-zinc-500 font-medium">Update your admin account password to ensure the platform remains protected.</p>
                                        </div>

                                        <form onSubmit={handlePasswordUpdate} className="space-y-6 text-left">
                                            <div className="space-y-2">
                                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Current Password</label>
                                                <input
                                                    name="currentPassword"
                                                    type="password"
                                                    required
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xl font-bold focus:outline-none focus:border-gv-gold transition-all"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">New Password</label>
                                                <input
                                                    name="newPassword"
                                                    type="password"
                                                    required
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xl font-bold focus:outline-none focus:border-gv-gold transition-all"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">Confirm New Password</label>
                                                <input
                                                    name="confirmPassword"
                                                    type="password"
                                                    required
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xl font-bold focus:outline-none focus:border-gv-gold transition-all"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={isUpdatingRate}
                                                className="w-full bg-gv-gold text-black font-black py-6 rounded-2xl uppercase tracking-widest shadow-xl hover:shadow-gv-gold/20 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-4 mt-10"
                                            >
                                                {isUpdatingRate ? "Updating..." : "Update Password"}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {toast.visible && (
                    <div className="fixed bottom-8 right-8 bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl z-[100] animate-in slide-in-from-bottom-10 duration-500 font-bold border border-white/20 flex items-center gap-3">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        {toast.message}
                    </div>
                )}

                {/* User Detail Modal */}
                {isDetailModalOpen && selectedUser && (
                    <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
                        <div className="bg-[#121212] border border-white/10 rounded-[40px] w-full max-w-5xl max-h-full overflow-y-auto shadow-[0_0_100px_rgba(0,0,0,0.8)] relative custom-scrollbar">
                            <button 
                                onClick={() => setIsDetailModalOpen(false)}
                                className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"
                            >
                                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>

                            <div className="p-10 md:p-16 space-y-16">
                                <header className="flex flex-col md:flex-row justify-between items-start gap-8">
                                    <div className="space-y-2">
                                        <p className="text-[10px] text-gv-gold font-black uppercase tracking-[0.2em]">Client Profile Audit</p>
                                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">{selectedUser.full_name || selectedUser.email}</h2>
                                        <div className="flex items-center gap-4 pt-2">
                                            <span className="text-xs font-mono text-zinc-500">{selectedUser.id}</span>
                                            <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase border ${selectedUser.is_verified ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
                                                {selectedUser.is_verified ? "Verified" : "Pending Verification"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        {!selectedUser.is_verified && (
                                            <>
                                                <button 
                                                    onClick={() => { handleVerifyUser(selectedUser.id); setIsDetailModalOpen(false); }}
                                                    className="bg-emerald-500 hover:bg-emerald-600 text-black font-black px-8 py-4 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/10 active:scale-95"
                                                >
                                                    Approve Identity
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        const reason = prompt("Enter rejection reason:");
                                                        if (reason) {
                                                            setRejectionReasons({ ...rejectionReasons, [selectedUser.id]: reason });
                                                            handleRejectUser(selectedUser.id);
                                                            setIsDetailModalOpen(false);
                                                        }
                                                    }}
                                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-black px-8 py-4 rounded-2xl text-xs uppercase tracking-widest transition-all active:scale-95"
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </header>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                                    {/* Section 1: Identity */}
                                    <section className="space-y-8">
                                        <div className="flex items-center gap-4">
                                            <div className="h-[1px] flex-1 bg-white/10"></div>
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Identity Details</h3>
                                            <div className="h-[1px] flex-1 bg-white/10"></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Full Name</p>
                                                <p className="text-sm font-bold text-white">{selectedUser.full_name || "N/A"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Date of Birth</p>
                                                <p className="text-sm font-bold text-white">{selectedUser.kyc_data?.dob || "N/A"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Phone Number</p>
                                                <p className="text-sm font-bold text-white">{selectedUser.kyc_data?.phone || "N/A"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Tax ID (TIN)</p>
                                                <p className="text-sm font-bold text-white uppercase tracking-tighter">{selectedUser.kyc_data?.tax_id || "None"}</p>
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Residential Address</p>
                                                <p className="text-sm font-bold text-white leading-relaxed">
                                                    {selectedUser.kyc_data?.address}<br/>
                                                    {selectedUser.kyc_data?.city}, {selectedUser.kyc_data?.country}
                                                </p>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Section 2: Financials */}
                                    <section className="space-y-8">
                                        <div className="flex items-center gap-4">
                                            <div className="h-[1px] flex-1 bg-white/10"></div>
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Financial Profile</h3>
                                            <div className="h-[1px] flex-1 bg-white/10"></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Account Purpose</p>
                                                <p className="text-sm font-bold text-white">{selectedUser.kyc_data?.account_purpose || "N/A"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Employment Status</p>
                                                <p className="text-sm font-bold text-white">{selectedUser.kyc_data?.employment_status || "N/A"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Industry</p>
                                                <p className="text-sm font-bold text-white">{selectedUser.kyc_data?.industry || "N/A"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Primary Wealth Source</p>
                                                <p className="text-sm font-bold text-white">{selectedUser.kyc_data?.source_of_wealth?.join(', ') || "N/A"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Annual Net Income</p>
                                                <p className="text-sm font-black text-emerald-400">{selectedUser.kyc_data?.annual_income || "N/A"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Total Net Worth</p>
                                                <p className="text-sm font-black text-gv-gold">{selectedUser.kyc_data?.total_wealth || "N/A"}</p>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                                    {/* Section 3: Compliance */}
                                    <section className="space-y-8">
                                        <div className="flex items-center gap-4">
                                            <div className="h-[1px] flex-1 bg-white/10"></div>
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Compliance & Risk</h3>
                                            <div className="h-[1px] flex-1 bg-white/10"></div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className={`flex items-center gap-3 p-4 rounded-2xl border ${selectedUser.kyc_data?.accuracy_confirmed ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-500" : "bg-white/5 border-white/10 text-zinc-500"}`}>
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                                <p className="text-[10px] font-black uppercase tracking-widest">Accuracy Confirmed</p>
                                            </div>
                                            <div className={`flex items-center gap-3 p-4 rounded-2xl border ${selectedUser.kyc_data?.risk_acknowledged ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-500" : "bg-white/5 border-white/10 text-zinc-500"}`}>
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                                <p className="text-[10px] font-black uppercase tracking-widest">Risk Acknowledged</p>
                                            </div>
                                            <div className={`flex items-center gap-3 p-4 rounded-2xl border ${!selectedUser.kyc_data?.is_not_pep ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-500" : "bg-white/5 border-white/10 text-zinc-500"}`}>
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                                <p className="text-[10px] font-black uppercase tracking-widest">Not a Politically Exposed Person (PEP)</p>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Section 4: Documents */}
                                    <section className="space-y-8">
                                        <div className="flex items-center gap-4">
                                            <div className="h-[1px] flex-1 bg-white/10"></div>
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Legal Documents</h3>
                                            <div className="h-[1px] flex-1 bg-white/10"></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest text-center">Front of ID</p>
                                                <div 
                                                    className="aspect-[3/2] rounded-2xl bg-white/5 border border-white/10 overflow-hidden cursor-pointer hover:border-gv-gold/50 transition-all group"
                                                    onClick={() => setViewingDoc(selectedUser.kyc_id_front)}
                                                >
                                                    {selectedUser.kyc_id_front ? (
                                                        <img src={supabase.storage.from('agreements').getPublicUrl(selectedUser.kyc_id_front).data.publicUrl} className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-zinc-700">NO UPLOAD</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest text-center">Back of ID</p>
                                                <div 
                                                    className="aspect-[3/2] rounded-2xl bg-white/5 border border-white/10 overflow-hidden cursor-pointer hover:border-gv-gold/50 transition-all group"
                                                    onClick={() => setViewingDoc(selectedUser.kyc_id_back)}
                                                >
                                                    {selectedUser.kyc_id_back ? (
                                                        <img src={supabase.storage.from('agreements').getPublicUrl(selectedUser.kyc_id_back).data.publicUrl} className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-zinc-700">NO UPLOAD</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Lightbox / Document Viewer */}
                {viewingDoc && (
                    <div className="fixed inset-0 z-[700] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 md:p-16 animate-in fade-in zoom-in-95 duration-300" onClick={() => setViewingDoc(null)}>
                        <div className="relative max-w-6xl w-full h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
                            <button 
                                onClick={() => setViewingDoc(null)}
                                className="absolute -top-12 right-0 text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:text-gv-gold transition-all"
                            >
                                Close Viewer <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <div className="w-full h-full flex items-center justify-center bg-white/5 rounded-[40px] overflow-hidden border border-white/10">
                                <img 
                                    src={supabase.storage.from('agreements').getPublicUrl(viewingDoc).data.publicUrl} 
                                    className="w-full h-full object-contain"
                                    alt="Identity Document High-Res"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthGuard>
    );
}
