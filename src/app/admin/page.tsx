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
        created_at?: string;
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
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [userStatusFilter, setUserStatusFilter] = useState("All");
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
    const [userKycDocs, setUserKycDocs] = useState<{name: string, url: string}[]>([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectReasonText, setRejectReasonText] = useState("");

    useEffect(() => {
        setMounted(true);
        fetchData();
        checkMaintenance();
        fetchForexData();
        fetchSalesData();
        fetchAdminProfile();
    }, []);

    useEffect(() => {
        if (selectedUser && isDetailModalOpen) {
            fetchUserDocs(selectedUser.id);
        } else {
            setUserKycDocs([]);
        }
    }, [selectedUser, isDetailModalOpen]);

    const fetchUserDocs = async (userId: string) => {
        setIsLoadingDocs(true);
        try {
            const { data, error } = await supabase.storage.from('kyc-documents').list(userId);
            if (error) throw error;
            
            if (data && data.length > 0) {
                const validFiles = data.filter(f => f.name !== '.emptyFolderPlaceholder' && f.name !== '.gitkeep');
                const docs = await Promise.all(
                    validFiles.map(async (file) => {
                        const { data: urlData } = await supabase.storage.from('kyc-documents').createSignedUrl(`${userId}/${file.name}`, 3600);
                        return { name: file.name, url: urlData?.signedUrl || "" };
                    })
                );
                setUserKycDocs(docs.filter(d => d.url !== ""));
            } else {
                setUserKycDocs([]);
            }
        } catch (error) {
            console.error('Error fetching docs:', error);
            setUserKycDocs([]);
        } finally {
            setIsLoadingDocs(false);
        }
    };

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

    const handleResetKyc = async (userId: string, reason: string) => {
        const userToReject = users.find((u: any) => u.id === userId);
        if (!userToReject) return;

        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    kyc_step: 0,
                    is_verified: false,
                    kyc_status: 'Rejected',
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

            fetchData();
            showToast(`User KYC has been reset and rejected.`);
        } catch (err: any) {
            alert(err.message);
        }
    };


    const handleApproveDeposit = async (tx: any) => {
        if (!confirm(`Approve deposit of RM ${tx.amount} for ${tx.profiles?.full_name || 'Client'}?`)) return;
        try {
            const { error: txError } = await supabase.from('transactions').update({ status: 'Approved' }).eq('id', tx.id);
            if (txError) throw txError;
            
            const { data: profile } = await supabase.from('profiles').select('balance, total_equity').eq('id', tx.user_id).single();
            const newBalance = (profile?.balance || 0) + Number(tx.amount);
            const newTotalEquity = (profile?.total_equity || 0) + Number(tx.amount);
            
            const { error: profileError } = await supabase.from('profiles').update({ balance: newBalance, total_equity: newTotalEquity }).eq('id', tx.user_id);
            if (profileError) throw profileError;
            
            showToast("Deposit approved successfully!");
            fetchData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleRejectDeposit = async (tx: any) => {
        if (!confirm(`Reject deposit of RM ${tx.amount} for ${tx.profiles?.full_name || 'Client'}?`)) return;
        try {
            const { error: txError } = await supabase.from('transactions').update({ status: 'Rejected' }).eq('id', tx.id);
            if (txError) throw txError;
            showToast("Deposit rejected.");
            fetchData();
        } catch (error: any) {
            alert(error.message);
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
                                <div className="p-8 space-y-6 animate-in fade-in duration-500">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tighter text-white">Client Directory</h3>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Global User Management</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4">
                                            {/* Search Bar */}
                                            <div className="relative group w-full md:w-64">
                                                <input 
                                                    type="text"
                                                    placeholder="Search Email..."
                                                    value={userSearchQuery}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserSearchQuery(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-xs focus:outline-none focus:border-gv-gold/50 transition-all text-white"
                                                />
                                                <svg className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-gv-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            </div>
                                            {/* Status Filter */}
                                            <select 
                                                value={userStatusFilter}
                                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUserStatusFilter(e.target.value)}
                                                className="bg-[#121212] border border-white/10 rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-400 focus:outline-none focus:border-gv-gold/50 cursor-pointer transition-all"
                                            >
                                                <option value="All">All Users</option>
                                                <option value="Verified">Fully Verified</option>
                                                <option value="KYC Pending">KYC Pending</option>
                                                <option value="Unverified">Unverified</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="overflow-hidden border border-white/5 rounded-3xl">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                <tr><th className="px-8 py-6">Client</th><th className="px-8 py-6">Balance (RM)</th><th className="px-8 py-6">Credit (USD)</th><th className="px-8 py-6 text-center">KYC</th><th className="px-8 py-6 text-center">Status</th><th className="px-8 py-6 text-right">Actions</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.02]">
                                                {users.filter((u: any) => {
                                                    const matchesSearch = (u.email || "").toLowerCase().includes(userSearchQuery.toLowerCase());
                                                    let matchesFilter = true;
                                                    if (userStatusFilter === "Verified") {
                                                        matchesFilter = u.is_verified === true;
                                                    } else if (userStatusFilter === "KYC Pending") {
                                                        matchesFilter = !u.is_verified && u.kyc_step === 3;
                                                    } else if (userStatusFilter === "Unverified") {
                                                        matchesFilter = !u.is_verified && (u.kyc_step || 0) < 3;
                                                    }
                                                    return matchesSearch && matchesFilter;
                                                }).map((u: any, i: number) => (
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
                                                {users.filter((u: any) => {
                                                    const matchesSearch = (u.email || "").toLowerCase().includes(userSearchQuery.toLowerCase());
                                                    let matchesFilter = true;
                                                    if (userStatusFilter === "Verified") {
                                                        matchesFilter = u.is_verified === true;
                                                    } else if (userStatusFilter === "KYC Pending") {
                                                        matchesFilter = !u.is_verified && u.kyc_step === 3;
                                                    } else if (userStatusFilter === "Unverified") {
                                                        matchesFilter = !u.is_verified && (u.kyc_step || 0) < 3;
                                                    }
                                                    return matchesSearch && matchesFilter;
                                                }).length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="px-8 py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">
                                                            No users found
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === "deposits" && (
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                        <tr>
                                            <th className="px-8 py-6">Name</th>
                                            <th className="px-8 py-6">Ref ID</th>
                                            <th className="px-8 py-6">Amount (RM)</th>
                                            <th className="px-8 py-6">Date</th>
                                            <th className="px-8 py-6">Receipt</th>
                                            <th className="px-8 py-6 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02]">
                                        {deposits.map((d: any, i: number) => (
                                            <tr key={i} className="text-sm font-bold group hover:bg-white/[0.01]">
                                                <td className="px-8 py-6 text-white">{d.profiles?.full_name || "Unknown"}</td>
                                                <td className="px-8 py-4 font-mono text-xs opacity-50">{d.ref_id}</td>
                                                <td className="px-8 py-6 text-emerald-400">{formatCurrency(d.amount)}</td>
                                                <td className="px-8 py-6 text-zinc-400 font-mono text-xs">{d.transfer_date ? new Date(d.transfer_date).toLocaleDateString() : "N/A"}</td>
                                                <td className="px-8 py-6">
                                                    {d.receipt_url ? (
                                                        <button 
                                                            onClick={() => {
                                                                const url = supabase.storage.from('agreements').getPublicUrl(d.receipt_url).data.publicUrl;
                                                                window.open(url, '_blank');
                                                            }}
                                                            className="text-gv-gold text-[10px] uppercase tracking-widest hover:underline flex items-center gap-2"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg> View
                                                        </button>
                                                    ) : <span className="text-zinc-600 text-[10px] uppercase">No File</span>}
                                                </td>
                                                <td className="px-8 py-6 text-right flex items-center justify-end gap-3 h-full pt-4">
                                                    <button onClick={() => handleRejectDeposit(d)} className="text-red-500 hover:text-red-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all hidden md:block">Reject</button>
                                                    <button onClick={() => handleApproveDeposit(d)} className="bg-emerald-500 text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/10 hover:-translate-y-0.5 transition-all">Verify & Credit</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {deposits.length === 0 && <tr><td colSpan={6} className="px-8 py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">No pending deposits</td></tr>}
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

                {/* User Detail Slide-over */}
                {isDetailModalOpen && selectedUser && (
                    <>
                        {/* Backdrop */}
                        <div 
                            className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
                            onClick={() => setIsDetailModalOpen(false)}
                        ></div>
                        
                        {/* Drawer */}
                        <div className="fixed inset-y-0 right-0 z-[600] w-full max-w-md bg-[#121212] border-l border-white/10 shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
                            <button 
                                onClick={() => setIsDetailModalOpen(false)}
                                className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            
                            <div className="mt-8 space-y-10">
                                <header className="space-y-2">
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{selectedUser.full_name || "User Details"}</h2>
                                    <p className="text-zinc-400 text-sm font-medium">{selectedUser.email}</p>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pt-2">
                                        Account Created: {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : 'N/A'}
                                    </p>
                                </header>
                                
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gv-gold">Current Status</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
                                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">KYC Step</p>
                                            <p className="text-2xl font-black text-white">{selectedUser.kyc_step || 0} / 3</p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
                                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Verification</p>
                                            <p className={`text-sm font-black uppercase mt-2 ${selectedUser.is_verified ? "text-emerald-500" : "text-amber-500"}`}>
                                                {selectedUser.is_verified ? "Verified" : "Unverified"}
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gv-gold">Compliance Documents</h3>
                                    <div className="space-y-3">
                                        {isLoadingDocs ? (
                                            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-xl text-center text-[10px] font-black uppercase tracking-widest text-zinc-500 animate-pulse">
                                                Loading documents...
                                            </div>
                                        ) : userKycDocs.length > 0 ? (
                                            userKycDocs.map((doc, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:border-gv-gold/30 transition-all">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <svg className="h-5 w-5 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                        <span className="text-xs font-bold text-white truncate pr-4">{doc.name}</span>
                                                    </div>
                                                    <a 
                                                        href={doc.url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-white/10 hover:bg-gv-gold hover:text-black hover:shadow-[0_0_15px_rgba(238,206,128,0.3)] text-white rounded-lg transition-all flex-shrink-0"
                                                    >
                                                        View
                                                    </a>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-xl text-center text-[10px] font-black uppercase tracking-widest text-zinc-600">No documents uploaded yet.</div>
                                        )}
                                    </div>
                                </section>

                                <div className="pt-8 border-t border-white/10 space-y-4">
                                    <button 
                                        onClick={() => { handleVerifyUser(selectedUser.id); setIsDetailModalOpen(false); }}
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                                    >
                                        Verify User
                                    </button>
                                    <button 
                                        onClick={() => { setRejectReasonText(""); setIsRejectModalOpen(true); }}
                                        className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95"
                                    >
                                        Reject / Reset KYC
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
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
                                    src={viewingDoc} 
                                    className="w-full h-full object-contain"
                                    alt="Identity Document High-Res"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Reject Confirmation Modal */}
                {isRejectModalOpen && selectedUser && (
                    <div className="fixed inset-0 z-[800] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setIsRejectModalOpen(false)}>
                        <div className="bg-[#121212] border border-white/10 shadow-2xl rounded-3xl p-8 max-w-md w-full animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Reject KYC Submission</h2>
                            <p className="text-zinc-400 text-sm mb-6">Please provide a reason for rejecting <span className="text-white font-bold">{selectedUser.email}</span>'s KYC application.</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Reason for Rejection</label>
                                    <textarea
                                        value={rejectReasonText}
                                        onChange={(e) => setRejectReasonText(e.target.value)}
                                        placeholder="e.g., ID document is blurred, or details do not match..."
                                        rows={4}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all resize-none"
                                    />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button 
                                        onClick={() => setIsRejectModalOpen(false)}
                                        className="flex-1 bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (!rejectReasonText.trim()) {
                                                alert("Please enter a rejection reason.");
                                                return;
                                            }
                                            handleResetKyc(selectedUser.id, rejectReasonText);
                                            setIsRejectModalOpen(false);
                                            setIsDetailModalOpen(false);
                                        }}
                                        className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                                    >
                                        Confirm Rejection
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthGuard>
    );
}
