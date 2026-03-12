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
        total_equity: number;
        total_assets: number;
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
        role: string;
        profit?: number;
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
    const [currentForexRate, setCurrentForexRate] = useState<string>("4.0");
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
    const [isDepositDrawerOpen, setIsDepositDrawerOpen] = useState(false);
    const [selectedDepositTx, setSelectedDepositTx] = useState<any>(null);
    const [depositReceiptUrl, setDepositReceiptUrl] = useState<string | null>(null);

    const hasFetchedRef = React.useRef(false);

    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        setMounted(true);
        fetchData();
        checkMaintenance();
        fetchForexData();
        fetchSalesData();
        fetchAdminProfile();

        // Real-time listener for ALL transactions (New Deposits, etc.)
        const channel = supabase
            .channel('admin-realtime-tx')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
                console.log("[REALTIME] Transaction change detected. Refreshing...");
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                console.log("[REALTIME] User change detected. Refreshing...");
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings' }, () => {
                console.log("[REALTIME] Forex change detected. Refreshing...");
                fetchForexData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
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
        // Use getSession to avoid triggering an infinite auth event loop
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            
            if (profile) {
                if (session.user.email === "thenja96@gmail.com") {
                    profile.role = "admin";
                }
                setAdminProfile(profile as Profile);
            } else {
                setAdminProfile({ 
                    id: session.user.id, 
                    email: session.user.email || "", 
                    role: "Bypassed",
                    username: session.user.email?.split('@')[0] || "Admin",
                    full_name: "Admin Bypass",
                    balance: 0,
                    balance_usd: 0,
                    total_equity: 0,
                    total_assets: 0,
                    is_verified: true,
                    kyc_status: 'Verified',
                    kyc_step: 3,
                    kyc_data: {},
                    kyc_id_front: "",
                    kyc_id_back: "",
                    dob: "",
                    phone: "",
                    tax_id: "",
                    address: "",
                    account_purpose: "",
                    employment_status: "",
                    industry: "",
                    source_of_wealth: [],
                    annual_income: "",
                    total_wealth: "",
                    risk_acknowledged: true,
                    accuracy_confirmed: true,
                    is_not_pep: true,
                    referred_by_username: "",
                    verified_at: new Date().toISOString()
                } as Profile);
            }
        }
    };

    const fetchData = async () => {
        const { data: profileList, error: profileError } = await supabase.from('profiles').select('*');
        console.log('Fetched Profiles Data:', profileList, 'Error:', profileError);
        
        if (profileList) {
            setUsers(profileList as Profile[]);
            setKycQueue((profileList as Profile[]).filter((p: Profile) => p.kyc_status === 'Pending'));
        }

        console.log('Admin Fetching Transactions from: transactions...');
        const { data: txList, error: txError } = await supabase
            .from('transactions')
            .select('*, profiles(email, full_name, role)')
            .order('created_at', { ascending: false });
            
        console.log('Raw Data from Supabase:', txList);
        if (txError) console.error('Supabase TX Error:', txError);
        
        if (txList) {
            // REMOVED STATUS FILTER: Show ALL deposits and withdrawals
            setDeposits(txList.filter((t: any) => t.type === 'Deposit'));
            setWithdrawals(txList.filter((t: any) => t.type === 'Withdrawal'));
        }

        const { data: logs } = await supabase
            .from('verification_logs')
            .select('*')
            .order('created_at', { ascending: false });
        if (logs) setVerificationLogs(logs);
    };

    const fetchForexData = async () => {
        const { data: currentRateData, error } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'usd_to_myr_rate')
            .single();

        if (!currentRateData || error) {
            console.error("Forex fetch error, using fallback 4.0:", error);
            setCurrentForexRate("4.0");
            setNewForexRate("4.0");
            return;
        }

        const rateStr = parseFloat(currentRateData.value).toString() || "1.0";
        setCurrentForexRate(rateStr);
        setNewForexRate(rateStr);
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
        if (adminProfile?.role !== 'admin' && adminProfile?.email !== 'thenja96@gmail.com') {
            showToast("You do not have permission to change system settings.");
            return;
        }

        const newVal = !maintenanceMode;
        setMaintenanceMode(newVal);
        try {
            console.log('Saving settings with:', { key: 'maintenance_mode', value: String(newVal) });
            const { error } = await supabase.from('settings').upsert({ key: 'maintenance_mode', value: String(newVal) }, { onConflict: 'key' });
            if (error) throw error;
        } catch (err: any) {
            if (err.code === '42501' || err.status === 403) {
                showToast("You do not have permission to change system settings.");
            } else {
                alert(err.message);
            }
            // Revert state if failed
            setMaintenanceMode(!newVal);
        }
    };

    const handleUpdateForexRate = async () => {
        if (adminProfile?.role !== 'admin' && adminProfile?.email !== 'thenja96@gmail.com') {
            showToast("You do not have permission to change system settings.");
            return;
        }

        if (!newForexRate || isNaN(parseFloat(newForexRate))) {
            alert("Please enter a valid rate.");
            return;
        }

        setIsUpdatingRate(true);
        try {
            console.log('Current User Role:', adminProfile?.role);
            console.log('Attempting Session Refresh...');
            await supabase.auth.refreshSession();

            console.log('Saving settings with:', { key: 'usd_to_myr_rate', value: newForexRate });
            const { error: updateError } = await supabase
                .from('platform_settings')
                .upsert({ key: 'usd_to_myr_rate', value: newForexRate }, { onConflict: 'key' });

            if (updateError) {
                console.error('SUPABASE FOREX UPDATE ERROR:', updateError);
                throw updateError;
            }

            const { data: { user } } = await supabase.auth.getUser();
            const { error: historyError } = await supabase
                .from('forex_history')
                .insert([{
                    old_rate: parseFloat(currentForexRate),
                    new_rate: parseFloat(newForexRate),
                    changed_by: user?.id || null // MUST use ID for UUID fields
                }]);

            if (historyError) {
                console.error('SUPABASE HISTORY INSERT ERROR:', historyError);
                throw historyError;
            }

            alert("Forex rate updated successfully.");
            fetchForexData();
        } catch (err: any) {
            if (err.code === '42501' || err.status === 403) {
                showToast("You do not have permission to change system settings.");
            } else {
                alert(err.message);
            }
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


    const openDepositReceipt = async (tx: any) => {
        setSelectedDepositTx(tx);
        setDepositReceiptUrl(null);
        setIsDepositDrawerOpen(true);
        try {
            const { data, error } = await supabase.storage.from('agreements').createSignedUrl(tx.receipt_url, 3600);
            if (error || !data) throw error;
            setDepositReceiptUrl(data.signedUrl);
        } catch (err: any) {
            console.error(err);
            showToast("Failed to load secure receipt document.");
        }
    };

    const handleApproveDeposit = async (tx: any) => {
        const displayRm = Number(tx.amount || 0).toFixed(2);
        const creditUsd = (Number(tx.amount || 0) / (parseFloat(currentForexRate) || 4.0)).toFixed(2);
        if (!confirm(`Confirming deposit of RM ${displayRm} (Credit: $${creditUsd} USD) for ${tx.profiles?.full_name || 'Client'}?`)) return;
        try {
            // Use RPC for atomic update of transaction and profile balance
            const { error: rpcError } = await supabase.rpc('approve_deposit', {
                p_tx_id: tx.id,
                p_user_id: tx.user_id,
                p_amount: Number(tx.amount)
            });
            
            if (rpcError) throw rpcError;
            
            showToast("Deposit approved successfully.");
            setIsDepositDrawerOpen(false);
            fetchData();
            router.refresh(); // Optimistic server refresh
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleRejectDeposit = async (tx: any) => {
        const amountRm = Number(tx.amount || 0);
        const amountUsd = amountRm / (parseFloat(currentForexRate) || 4.0);
        if (!confirm(`Reject deposit: Client sent RM ${amountRm.toFixed(2)}. This will void the $${amountUsd.toFixed(2)} USD credit for ${tx.profiles?.full_name || 'Client'}?`)) return;
        try {
            const { error: txError } = await supabase.from('transactions').update({ status: 'Rejected' }).eq('id', tx.id);
            if (txError) throw txError;
            showToast("Deposit rejected.");
            setIsDepositDrawerOpen(false);
            fetchData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleApproveWithdrawal = async (tx: any) => {
        const amountRm = Math.abs(Number(tx.amount || 0));
        const amountUsd = amountRm / (parseFloat(currentForexRate) || 4.0);
        if (!confirm(`Approve withdrawal of RM ${amountRm.toFixed(2)} ($${amountUsd.toFixed(2)} USD) for ${tx.profiles?.full_name || 'Client'}?`)) return;
        try {
            // DATABASE TRIGGER HANDLES BALANCE UPDATES
            // We only need to set the status to Approved
            const { error: txError } = await supabase
                .from('transactions')
                .update({ status: 'Approved' })
                .eq('id', tx.id);
            
            if (txError) throw txError;
            
            showToast("Withdrawal approved. Trigger processing balances...");
            fetchData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleRejectWithdrawal = async (tx: any) => {
        const amountRm = Math.abs(Number(tx.amount || 0));
        const amountUsd = amountRm / (parseFloat(currentForexRate) || 4.0);
        if (!confirm(`Reject withdrawal: Client requested RM ${amountRm.toFixed(2)} ($${amountUsd.toFixed(2)} USD) for ${tx.profiles?.full_name || 'Client'}?`)) return;
        try {
            const { error: txError } = await supabase.from('transactions').update({ status: 'Rejected' }).eq('id', tx.id);
            if (txError) throw txError;
            showToast("Withdrawal rejected.");
            fetchData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const formatCurrency = (val: number) => {
        return `RM ${Number(val || 0).toFixed(2)}`;
    };

    if (!mounted) return null;

    return (
        <AuthGuard requireAdmin={true}>
            <div className="min-h-screen bg-[var(--bg-primary)] text-zinc-300 font-body flex flex-col selection:bg-gv-gold selection:text-black">
                <title>{`Admin Portal | GV Capital Trust`}</title>

                <header className="border-b border-white/10 bg-[var(--bg-card)] px-8 py-4 flex items-center justify-between sticky top-0 z-50">
                    <div className="flex items-center gap-4">
                        <img src="/logo.png" className="h-[40px] w-auto mix-blend-screen" />
                        <div>
                            <h1 className="text-xl font-heading font-light text-white uppercase tracking-tighter">Master Control</h1>
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] text-gv-gold font-heading font-light tracking-widest uppercase">Admin System Core</p>
                                <span className="text-[8px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20 font-mono">DEBUG: {adminProfile?.role || 'Bypassed'} | {adminProfile?.email}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-heading font-light uppercase tracking-widest text-zinc-500">Maintenance</span>
                            <button onClick={toggleMaintenance} className={`h-6 w-12 rounded-full relative transition-all ${maintenanceMode ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "bg-white/10"}`}>
                                <div className={`h-4 w-4 bg-white rounded-full absolute top-1 transition-all ${maintenanceMode ? "right-1" : "left-1"}`}></div>
                            </button>
                        </div>
                        <button onClick={() => { supabase.auth.signOut(); router.push("/login"); }} className="bg-white/5 border border-white/10 px-6 py-2 rounded-xl text-xs font-heading font-light uppercase hover:text-red-500 transition-all">Logout</button>
                    </div>
                </header>

                <main className="flex-1 p-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto space-y-12 pb-20">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-[var(--bg-card)] border border-[rgba(201,168,76,0.1)] p-6 rounded-[12px] hover:border-gv-gold/20 transition-all">
                                {(() => {
                                    const totalRm = users.reduce((acc, u) => acc + (Number(u.balance || 0) + Number(u.profit || 0)), 0);
                                    const rate = parseFloat(currentForexRate) || 4.0;
                                    return (
                                        <>
                                            <p className="text-[10px] font-heading font-light text-zinc-500 uppercase tracking-widest mb-1">Total Assets</p>
                                            <h2 className="text-2xl font-heading font-light text-white">RM {totalRm.toFixed(2)}</h2>
                                            <p className="text-[10px] text-zinc-500 font-body font-light uppercase tracking-widest mt-1">(${(totalRm / rate).toFixed(2)} USD)</p>
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="bg-[var(--bg-card)] border border-[rgba(201,168,76,0.1)] p-6 rounded-[12px]">
                                <p className="text-[10px] font-heading font-light text-zinc-500 uppercase tracking-widest mb-1">KYC Pending</p>
                                <h2 className="text-2xl font-heading font-light text-gv-gold">{kycQueue.length}</h2>
                            </div>
                            <div className="bg-[var(--bg-card)] border border-[rgba(201,168,76,0.1)] p-6 rounded-[12px]">
                                <p className="text-[10px] font-heading font-light text-zinc-500 uppercase tracking-widest mb-1">Pending Deposit Approval</p>
                                <h2 className="text-2xl font-heading font-light text-[#0a8b6d]">{deposits.filter((d: any) => d.status === 'pending' || d.status === 'Pending').length}</h2>
                            </div>
                            <div className="bg-[var(--bg-card)] border border-[rgba(201,168,76,0.1)] p-6 rounded-[12px]">
                                <p className="text-[10px] font-heading font-light text-zinc-500 uppercase tracking-widest mb-1">Total Clients</p>
                                <h2 className="text-2xl font-heading font-light text-white">{users.length}</h2>
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex gap-4 border-b border-white/10 pb-4 overflow-x-auto">
                            {["deposits", "kyc", "withdrawals", "users", "sales", "forex", "audit", "security"].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-8 py-3 rounded-xl text-[10px] font-heading font-light uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? "bg-gv-gold text-black shadow-lg shadow-gv-gold/20" : "text-zinc-500 hover:text-white"}`}
                                >
                                    {tab === "kyc" ? `KYC Queue (${kycQueue.length})` : tab}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="bg-[var(--bg-card)] border border-[rgba(201,168,76,0.1)] rounded-[12px] overflow-hidden shadow-2xl">
                            {activeTab === "kyc" && (
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 border-b border-white/10 text-[10px] font-heading font-light uppercase tracking-widest text-zinc-500">
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
                                                className="border-b border-white/[0.02] hover:bg-white/[0.01] cursor-pointer group"
                                                onClick={() => { setSelectedUser(u); setIsDetailModalOpen(true); }}
                                            >
                                                <td className="px-8 py-6">
                                                    <div className="text-white font-heading font-light">{u.full_name || u.email}</div>
                                                    <div className="text-[10px] text-zinc-500 font-body font-light">{u.email}</div>
                                                </td>
                                                <td className="px-8 py-6 text-zinc-400 font-mono text-xs">
                                                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A"}
                                                </td>
                                                <td className="px-8 py-6 text-zinc-400 font-body font-light">{u.country || u.kyc_data?.country || "N/A"}</td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[9px] uppercase font-heading font-light border border-amber-500/20">
                                                        {u.kyc_status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button className="text-[10px] font-heading font-light uppercase text-gv-gold hover:underline">Review Profile</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {kycQueue.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-8 py-20 text-center text-zinc-600 font-heading font-light uppercase tracking-widest">
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
                                        <tr><th className="px-8 py-6">Name</th><th className="px-8 py-6">Bank Details</th><th className="px-8 py-6">Ref ID</th><th className="px-8 py-6">Amount (RM)</th><th className="px-8 py-6 text-right">Action</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02]">
                                        {withdrawals.map((w: any, i: number) => (
                                            <tr key={i} className="text-sm font-bold group hover:bg-white/[0.01]">
                                                <td className="px-8 py-6 text-white">{w.profiles?.full_name || w.user_id}</td>
                                                <td className="px-8 py-6">
                                                    <div className="text-white text-xs">{w.profiles?.bank_name || 'N/A'}</div>
                                                    <div className="font-mono text-[10px] text-zinc-500">{w.profiles?.bank_account_number || 'N/A'}</div>
                                                </td>
                                                <td className="px-8 py-4 font-mono text-xs opacity-50">{w.ref_id}</td>
                                                <td className="px-8 py-6 text-red-400">
                                                    <div className="flex flex-col">
                                                        <span>RM {Math.abs(Number(w.amount || 0)).toFixed(2)}</span>
                                                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">(${(Math.abs(Number(w.amount || 0)) / (parseFloat(currentForexRate) || 4.0)).toFixed(2)})</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right flex items-center justify-end gap-3 h-full pt-4">
                                                    <button onClick={() => handleRejectWithdrawal(w)} className="text-red-500 hover:text-red-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all hidden md:block">Reject</button>
                                                    <button onClick={() => handleApproveWithdrawal(w)} className="bg-emerald-500 text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/10 hover:-translate-y-0.5 transition-all">Approve Withdrawal</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {withdrawals.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-8 py-20 text-center">
                                                    <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">No withdrawals found</p>
                                                    <p className="text-[10px] text-zinc-800 mt-2 font-black uppercase tracking-widest">No data in state</p>
                                                </td>
                                            </tr>
                                        )}
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
                                                                        {index === 0 && <span className="text-lg">馃</span>}
                                                                        {index === 1 && <span className="text-lg">馃</span>}
                                                                        {index === 2 && <span className="text-lg">馃</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-5">
                                                                    <div className="font-black text-white group-hover:text-gv-gold transition-colors">{agent.agent_username}</div>
                                                                </td>
                                                                <td className="px-6 py-5 font-bold text-zinc-400">{agent.total_referrals}</td>
                                                                <td className="px-6 py-5 font-black text-emerald-400">
                                                                    <div className="flex flex-col">
                                                                        <span>RM {Number(agent.total_referred_capital || 0).toFixed(2)}</span>
                                                                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">(${(Number(agent.total_referred_capital || 0) / 4).toFixed(2)})</span>
                                                                    </div>
                                                                </td>
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
                                                                        <div className="flex flex-col items-end">
                                                                            <span className="text-xs font-black text-emerald-400">RM {Number(ref.balance || 0).toFixed(2)}</span>
                                                                            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">(${(Number(ref.balance || 0) / 4).toFixed(2)})</span>
                                                                        </div>
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
                                                    <div className="text-4xl mb-4 opacity-20">馃搳</div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Select an agent to view drill-down performance</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "forex" && (
                                adminProfile?.role !== 'admin' && adminProfile?.email !== 'thenja96@gmail.com' ? (
                                    <div className="min-h-[400px] flex items-center justify-center text-center p-12">
                                        <div className="space-y-4">
                                            <div className="text-4xl">馃攼</div>
                                            <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Access Restricted</h3>
                                            <p className="text-zinc-500 text-sm max-w-xs">You do not have the necessary permissions to access global pricing controls.</p>
                                        </div>
                                    </div>
                                ) : (
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
                                                    placeholder="4.000"
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
                                )
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
                                                <tr>
                                                    <th className="px-8 py-6">Client</th>
                                                    <th className="px-8 py-6">Total Balance (RM/USD)</th>
                                                    <th className="px-8 py-6">Profit Earned</th>
                                                    <th className="px-8 py-6">Total Assets</th>
                                                    <th className="px-8 py-6 text-center">KYC</th>
                                                    <th className="px-8 py-6 text-center">Status</th>
                                                    <th className="px-8 py-6 text-right">Actions</th>
                                                </tr>
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
                                                 <td className="px-8 py-6">
                                                      <div className="flex flex-col">
                                                          <span className="text-emerald-400 font-black">RM {Number(u.balance || 0).toFixed(2)}</span>
                                                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">(${(Number(u.balance || 0) / 4).toFixed(2)})</span>
                                                      </div>
                                                  </td>
                                                  <td className="px-8 py-6 text-gv-gold font-mono text-xs">RM {Number(u.profit || 0).toFixed(2)}</td>
                                                  <td className="px-8 py-6 text-white font-black">
                                                      <div className="flex flex-col">
                                                          <span>RM {(Number(u.balance || 0) + Number(u.profit || 0)).toFixed(2)}</span>
                                                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">(${( (Number(u.balance || 0) + Number(u.profit || 0)) / 4).toFixed(2)})</span>
                                                      </div>
                                                  </td>
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
                                            <th className="px-8 py-6">Status</th>
                                            <th className="px-8 py-6">Date</th>
                                            <th className="px-8 py-6">Receipt</th>
                                            <th className="px-8 py-6 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02]">
                                        {deposits.map((d: any, i: number) => (
                                            <tr key={i} className="text-sm font-bold group hover:bg-white/[0.01]">
                                                <td className="px-8 py-6 text-white">
                                                    <div className="flex flex-col">
                                                        <span>{d.profiles?.full_name || d.profiles?.email || "Unknown"}</span>
                                                        <span className="text-[10px] text-zinc-500 lowercase font-medium">{d.profiles?.email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 font-bold text-emerald-400">
                                                    RM {Number(d.amount || 0).toFixed(2)}
                                                    <span className="text-xs text-zinc-500 ml-2 font-medium">(${(Number(d.amount || 0) / 4).toFixed(2)})</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                        d.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-500' :
                                                        d.status === 'Rejected' ? 'bg-red-500/20 text-red-500' :
                                                        'bg-amber-500/20 text-amber-500'
                                                    }`}>
                                                        { (d.status === 'Approved' || d.status === 'Rejected') ? d.status : 'Pending' }
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-zinc-400 font-mono text-xs whitespace-nowrap">
                                                    {d.created_at ? new Date(d.created_at).toLocaleString() : "N/A"}
                                                </td>
                                                <td className="px-8 py-6">
                                                    {d.receipt_url ? (
                                                        <button 
                                                            onClick={() => openDepositReceipt(d)}
                                                            className="text-gv-gold text-[10px] uppercase tracking-widest hover:underline flex items-center gap-2"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg> View
                                                        </button>
                                                    ) : <span className="text-zinc-600 text-[10px] uppercase">No File</span>}
                                                </td>
                                                <td className="px-8 py-6 text-right flex items-center justify-end gap-3 h-full pt-4">
                                                    {d.status === 'Pending' && (
                                                        <>
                                                            <button onClick={() => handleRejectDeposit(d)} className="text-red-500 hover:text-red-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all hidden md:block">Reject</button>
                                                            <button onClick={() => handleApproveDeposit(d)} className="bg-emerald-500 text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/10 hover:-translate-y-0.5 transition-all">Verify & Credit</button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {deposits.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-8 py-20 text-center">
                                                    <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">No deposits found</p>
                                                    <p className="text-[10px] text-zinc-800 mt-2 font-black uppercase tracking-widest">No data in state</p>
                                                </td>
                                            </tr>
                                        )}
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
                                    <div className="mt-6 space-y-4">
                                        <div className="bg-gv-gold/10 border border-gv-gold/30 p-4 rounded-2xl flex items-center justify-between shadow-[0_0_15px_rgba(238,206,128,0.1)]">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-gv-gold text-black flex items-center justify-center">
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </div>
                                                <span className="text-xs font-black uppercase text-gv-gold tracking-widest">Total Assets</span>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <div className="text-xl font-black text-white">RM {(Number(selectedUser.balance || 0) + Number(selectedUser.profit || 0)).toFixed(2)}</div>
                                                <div className="text-[10px] font-bold text-zinc-500">(${( (Number(selectedUser.balance || 0) + Number(selectedUser.profit || 0)) / 4).toFixed(2)} USD)</div>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-white/10 text-zinc-400 flex items-center justify-center">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                                </div>
                                                <span className="text-xs font-black uppercase text-zinc-400 tracking-widest">Total Equity</span>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <div className="text-xl font-black text-white">RM {(Number(selectedUser.balance || 0)).toFixed(2)}</div>
                                                <div className="text-[10px] font-bold text-zinc-500">(${(Number(selectedUser.balance || 0) / 4).toFixed(2)} USD)</div>
                                            </div>
                                        </div>
                                    </div>
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
                                                <div key={idx} className="flex flex-col gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-gv-gold/30 transition-all group">
                                                    <div className="flex items-center justify-between">
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
                                                            Open Full
                                                        </a>
                                                    </div>
                                                    <div className="w-full mt-2 rounded-lg overflow-hidden border border-white/10 bg-black/50 aspect-video flex items-center justify-center relative">
                                                         {doc.name.toLowerCase().endsWith('.pdf') ? (
                                                             <iframe src={doc.url} className="w-full h-full" title={doc.name} />
                                                         ) : (
                                                             <img src={doc.url} alt={doc.name} className="w-full h-full object-contain cursor-zoom-in group-hover:scale-105 transition-transform duration-500" onClick={() => window.open(doc.url, '_blank')} />
                                                         )}
                                                    </div>
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

                {/* Deposit Receipt Drawer / Modal */}
                {isDepositDrawerOpen && selectedDepositTx && (
                    <div className="fixed inset-0 z-[750] bg-black/80 backdrop-blur-md flex justify-end animate-in fade-in duration-300">
                        <div className="w-full max-w-xl bg-[#121212] border-l border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] h-full overflow-y-auto animate-in slide-in-from-right-full duration-500 flex flex-col">
                            <div className="p-8 border-b border-white/10 shrink-0 flex items-center justify-between bg-black/40 sticky top-0 z-10 backdrop-blur-xl">
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Deposit Review</h2>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Ref: {selectedDepositTx.ref_id}</p>
                                </div>
                                <button 
                                    onClick={() => setIsDepositDrawerOpen(false)}
                                    className="h-10 w-10 bg-white/5 hover:bg-white/10 hover:text-white text-zinc-500 rounded-full flex items-center justify-center transition-all"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            
                            <div className="p-8 flex-1 flex flex-col">
                                <div className="space-y-8 flex-1 flex flex-col">
                                    {/* Image Viewer */}
                                    <div className="relative group w-full bg-[#0a0a0a] border border-white/10 rounded-3xl flex-1 min-h-[400px] overflow-hidden flex items-center justify-center p-2 shadow-inner">
                                        {depositReceiptUrl ? (
                                            <>
                                                {selectedDepositTx.receipt_url && selectedDepositTx.receipt_url.toLowerCase().endsWith('.pdf') ? (
                                                    <iframe src={depositReceiptUrl} className="w-full h-full rounded-2xl bg-white"/>
                                                ) : (
                                                    <img 
                                                        src={depositReceiptUrl} 
                                                        alt="Deposit Receipt" 
                                                        className="w-full h-full object-contain rounded-2xl group-hover:scale-[1.02] transition-transform duration-700"
                                                    />
                                                )}
                                                <a 
                                                    href={depositReceiptUrl}
                                                    download={`Receipt_${selectedDepositTx.ref_id}`}
                                                    target="_blank" 
                                                    className="absolute bottom-6 right-6 bg-black/80 hover:bg-gv-gold hover:text-black hover:shadow-[0_0_20px_rgba(238,206,128,0.4)] backdrop-blur-lg border border-white/10 p-4 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all hidden md:flex"
                                                    title="Download Original"
                                                >
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                </a>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center animate-pulse">
                                                <div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full mb-6 shadow-[0_0_15px_rgba(238,206,128,0.5)]"></div>
                                                <p className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Initiating Secure Connection...</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Transaction Quick Details */}
                                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center shrink-0">
                                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-3">Request Amount</div>
                                        <h3 className="text-5xl font-black text-emerald-400 tracking-tighter drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                                            RM {Number(selectedDepositTx.amount || 0).toFixed(2)}
                                        </h3>
                                        <div className="text-sm text-zinc-500 font-bold uppercase tracking-widest mt-2">
                                            (${(Number(selectedDepositTx.amount || 0) / 4).toFixed(2)} USD)
                                        </div>
                                        <div className="mt-4 flex flex-col items-center gap-1 text-center">
                                            <div className="text-white text-sm font-bold uppercase tracking-widest">{selectedDepositTx.profiles?.full_name || 'Client'}</div>
                                            <div className="text-zinc-500 text-[10px] uppercase font-black">
                                                {selectedDepositTx.transfer_date ? new Date(selectedDepositTx.transfer_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "Unknown Date"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Area */}
                            <div className="p-8 border-t border-white/10 bg-black/40 backdrop-blur-xl shrink-0">
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => handleRejectDeposit(selectedDepositTx)}
                                        className="w-1/3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 px-6 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-center hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] active:scale-95"
                                    >
                                        Reject
                                    </button>
                                    <button 
                                        onClick={() => handleApproveDeposit(selectedDepositTx)}
                                        className="w-2/3 bg-emerald-500 hover:bg-emerald-600 text-black px-6 py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all text-center shadow-[0_0_20px_rgba(52,211,153,0.3)] active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Approve & Credit
                                    </button>
                                </div>
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
