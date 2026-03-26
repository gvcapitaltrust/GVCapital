"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./AuthProvider";

interface AdminContextType {
    users: any[];
    kycQueue: any[];
    deposits: any[];
    withdrawals: any[];
    salesData: any[];
    platformStats: {
        totalBalance: number;
        totalProfit: number;
        totalAssets: number;
        userCount: number;
    };
    forexHistory: any[];
    verificationLogs: any[];
    combinedAuditLogs: any[];
    loading: boolean;
    showToast: (msg: string) => void;
    refreshData: () => Promise<void>;
    handleApproveDeposit: (tx: any) => Promise<void>;
    handleRejectDeposit: (tx: any) => Promise<void>;
    handleApproveWithdrawal: (tx: any) => Promise<void>;
    handleRejectWithdrawal: (tx: any) => Promise<void>;
    handleAdjustBalance: (user: any, amount: number, type: "balance" | "profit", reason: string) => Promise<void>;
    handleApproveKyc: (userId: string) => Promise<void>;
    handleRejectKyc: (userId: string, reason: string) => Promise<void>;
    handleUpdatePortfolio: (userId: string, data: any) => Promise<void>;
    handleResetUserPassword: (email: string) => Promise<void>;
    handleUpdateForexRate: (newRate: number) => Promise<void>;
    handleUpdatePassword: (password: string) => Promise<void>;
    handleSetAdminRole: (userId: string, makeAdmin: boolean) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
    const { user: authUser } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [kycQueue, setKycQueue] = useState<any[]>([]);
    const [deposits, setDeposits] = useState<any[]>([]);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [salesData, setSalesData] = useState<any[]>([]);
    const [platformStats, setPlatformStats] = useState({ totalBalance: 0, totalProfit: 0, totalAssets: 0, userCount: 0 });
    const [forexHistory, setForexHistory] = useState<any[]>([]);
    const [verificationLogs, setVerificationLogs] = useState<any[]>([]);
    const [combinedAuditLogs, setCombinedAuditLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });

    const showToast = useCallback((msg: string) => {
        setToast({ message: msg, visible: true });
        setTimeout(() => setToast({ message: "", visible: false }), 5000);
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Profiles (Latest 1,000 for general management)
            const { data: profileList } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1000);

            // 2. Fetch KYC Queue (Specifically all users with 'Pending' status)
            const { data: kycPendingList } = await supabase
                .from('profiles')
                .select('*')
                .eq('kyc_status', 'Pending')
                .order('created_at', { ascending: false });

            if (profileList) {
                setUsers(profileList);
                setKycQueue(kycPendingList || []);

                const stats = profileList.reduce((acc, p) => ({
                    totalBalance: acc.totalBalance + Number(p.balance || 0),
                    totalProfit: acc.totalProfit + Number(p.profit || 0),
                    totalAssets: acc.totalAssets + (Number(p.balance || 0) + Number(p.profit || 0)),
                    userCount: acc.userCount + 1
                }), { totalBalance: 0, totalProfit: 0, totalAssets: 0, userCount: 0 });
                setPlatformStats(stats);
            }

            // 2. Fetch Transactions
            const { data: txList } = await supabase
                .from('transactions')
                .select('*, profiles(*)')
                .order('created_at', { ascending: false });
            
            if (txList) {
                setDeposits(txList.filter((t: any) => t.type?.toLowerCase() === 'deposit'));
                setWithdrawals(txList.filter((t: any) => t.type?.toLowerCase() === 'withdrawal'));
            }

            // 3. Fetch Verification Logs
            const { data: logs } = await supabase
                .from('verification_logs')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (logs) setVerificationLogs(logs);

            // 4. Combine Audit Logs
            const financialTxs = txList?.filter((t: any) => t.status === 'Approved') || [];
            const mergedLogs = [
                ...(logs || []).map(l => ({ ...l, auditType: 'verification' })),
                ...financialTxs.map(t => ({
                    id: t.id,
                    created_at: t.created_at,
                    admin_username: t.metadata?.processed_by_name || 'System',
                    user_email: t.profiles?.email || 'Unknown',
                    action: t.type === 'Deposit' ? 'Deposit Approved' : 
                            t.type === 'Withdrawal' ? 'Withdrawal Approved' : 
                            t.type === 'Audit' ? t.metadata?.action : 'Adjustment',
                    processed_by_name: t.metadata?.processed_by_name,
                    rejection_reason: t.metadata?.reason || t.metadata?.description || `${t.type} processed`,
                    auditType: 'transaction',
                    amount: t.amount,
                    txType: t.type
                }))
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setCombinedAuditLogs(mergedLogs);

            // 5. Fetch Sales Data
            const { data: sales } = await supabase
                .from('sales_leaderboard')
                .select('*')
                .order('total_referred_capital', { ascending: false });
            if (sales) setSalesData(sales);

            // 6. Fetch Forex History
            const { data: fHistory } = await supabase
                .from('forex_history')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);
            if (fHistory) setForexHistory(fHistory);

        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleApproveDeposit = async (tx: any) => {
        try {
            const { error: rpcError } = await supabase.rpc('approve_deposit', {
                p_tx_id: tx.id,
                p_user_id: tx.user_id,
                p_amount: Number(tx.amount || 0)
            });
            if (rpcError) throw rpcError;

            await supabase.from('transactions').update({
                metadata: {
                    ...tx.metadata,
                    processed_by_name: authUser?.user_metadata?.full_name || "Admin",
                    processed_by_id: authUser?.id,
                    processed_by_email: authUser?.email
                }
            }).eq('id', tx.id);
            
            showToast("Deposit approved successfully.");
            fetchData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleRejectDeposit = async (tx: any) => {
        try {
            const { error: txError } = await supabase
                .from('transactions')
                .update({ 
                    status: 'Rejected',
                    metadata: {
                        ...tx.metadata,
                        processed_by_name: authUser?.user_metadata?.full_name || "Admin",
                        processed_by_id: authUser?.id,
                        processed_by_email: authUser?.email,
                        reason: "Policy violation or invalid receipt"
                    }
                })
                .eq('id', tx.id);
            if (txError) throw txError;
            showToast("Deposit rejected.");
            fetchData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleApproveWithdrawal = async (tx: any) => {
        try {
            // 1. Fetch current user balance/profit to calculate deduction
            const { data: profile, error: profileFetchError } = await supabase
                .from('profiles')
                .select('balance, profit')
                .eq('id', tx.user_id)
                .single();
            
            if (profileFetchError) throw profileFetchError;

            const withdrawAmount = Math.abs(Number(tx.amount || 0));
            const currentProfit = Number(profile?.profit || 0);
            const currentBalance = Number(profile?.balance || 0);

            // 2. Fetch User Deposits to verify lock-in period
            const { data: deposits, error: depositsError } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', tx.user_id)
                .eq('type', 'Deposit')
                .eq('status', 'Approved');

            if (depositsError) throw depositsError;

            const now = new Date();
            const lockPeriodDays = 180;
            const lockedCapital = deposits?.reduce((acc: number, d: any) => {
                const txDate = new Date(d.created_at || d.transfer_date);
                const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
                return diffDays < lockPeriodDays ? acc + Number(d.amount) : acc;
            }, 0) || 0;

            const withdrawableCapital = Math.max(0, currentBalance - lockedCapital);
            const totalWithdrawable = currentProfit + withdrawableCapital;

            let penalty = 0;
            let finalPayout = withdrawAmount;
            let penaltyApplied = false;

            if (withdrawAmount > totalWithdrawable) {
                const penalizedPortion = withdrawAmount - totalWithdrawable;
                penalty = penalizedPortion * 0.4;
                finalPayout = withdrawAmount - penalty;
                penaltyApplied = true;
            }

            // 3. Deduct: first from profit (dividends), then from balance (capital)
            let newProfit = currentProfit;
            let newBalance = currentBalance;
            let remaining = withdrawAmount;

            if (remaining <= newProfit) {
                newProfit -= remaining;
                remaining = 0;
            } else {
                remaining -= newProfit;
                newProfit = 0;
                newBalance = Math.max(0, newBalance - remaining);
            }

            // 4. Update profile with new balance/profit
            const { error: profileUpdateError } = await supabase
                .from('profiles')
                .update({ balance: newBalance, profit: newProfit })
                .eq('id', tx.user_id);
            
            if (profileUpdateError) throw profileUpdateError;

            // 5. Mark transaction as Approved
            const { error: txError } = await supabase
                .from('transactions')
                .update({ 
                    status: 'Approved',
                    metadata: {
                        ...tx.metadata,
                        processed_by_name: authUser?.user_metadata?.full_name || "Admin",
                        processed_by_id: authUser?.id,
                        processed_by_email: authUser?.email,
                        finalized_penalty: penaltyApplied ? penalty : 0,
                        finalized_payout: finalPayout,
                        penalty_applied: penaltyApplied
                    }
                })
                .eq('id', tx.id);
            
            if (txError) throw txError;
            showToast("Withdrawal approved and balance deducted.");
            fetchData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleRejectWithdrawal = async (tx: any) => {
        try {
            const { error: txError } = await supabase
                .from('transactions')
                .update({ 
                    status: 'Rejected',
                    metadata: {
                        ...tx.metadata,
                        processed_by_name: authUser?.user_metadata?.full_name || "Admin",
                        processed_by_id: authUser?.id,
                        processed_by_email: authUser?.email
                    }
                })
                .eq('id', tx.id);
            
            if (txError) throw txError;
            showToast("Withdrawal rejected.");
            fetchData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleAdjustBalance = async (user: any, amount: number, type: "balance" | "profit", reason: string) => {
        try {
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ [type]: Number(user[type] || 0) + amount })
                .eq('id', user.id);
            if (profileError) throw profileError;

            const txBaseType = amount >= 0 ? 'Deposit' : 'Withdrawal';
            const { error: txError } = await supabase
                .from('transactions')
                .insert({
                    user_id: user.id,
                    type: txBaseType,
                    amount: Math.abs(amount),
                    status: 'Approved',
                    ref_id: `ADJ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                    metadata: { 
                        is_adjustment: true,
                        reason: reason,
                        adjustment_category: type === 'balance' ? 'Bonus' : 'Dividend',
                        adjustment_type: amount >= 0 ? 'Increase' : 'Decrease',
                        description: reason || `${txBaseType} ${amount >= 0 ? 'Increase' : 'Decrease'} Adjustment`,
                        processed_by_name: authUser?.user_metadata?.full_name || "Admin",
                        processed_by_id: authUser?.id,
                        processed_by_email: authUser?.email
                    }
                });
            if (txError) throw txError;

            showToast(`Successfully adjusted ${type} by RM ${amount.toFixed(2)}`);
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleApproveKyc = async (userId: string) => {
        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                    kyc_status: 'Verified', 
                    is_verified: true,
                    verified_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (updateError) throw updateError;

            const user = users.find(u => u.id === userId);
            await supabase
                .from('transactions')
                .insert({
                    user_id: userId,
                    type: 'Audit',
                    amount: 0,
                    status: 'Approved',
                    ref_id: `KYC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                    metadata: {
                        is_audit: true,
                        action: 'KYC Verified',
                        description: `User identity verified`,
                        processed_by_name: authUser?.user_metadata?.full_name || "Admin",
                        processed_by_id: authUser?.id,
                        processed_by_email: authUser?.email
                    }
                });

            showToast(`User successfully verified.`);
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleRejectKyc = async (userId: string, reason: string) => {
        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                    kyc_status: 'Rejected', 
                    is_verified: false,
                    rejection_reason: reason
                })
                .eq('id', userId);

            if (updateError) throw updateError;

            const user = users.find(u => u.id === userId);
            await supabase
                .from('transactions')
                .insert({
                    user_id: userId,
                    type: 'Audit',
                    amount: 0,
                    status: 'Approved',
                    ref_id: `KYC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                    metadata: {
                        is_audit: true,
                        action: 'KYC Rejected',
                        reason: reason,
                        description: `User identity rejected: ${reason}`,
                        processed_by_name: authUser?.user_metadata?.full_name || "Admin",
                        processed_by_id: authUser?.id,
                        processed_by_email: authUser?.email
                    }
                });

            showToast(`User successfully rejected.`);
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleUpdatePortfolio = async (userId: string, data: any) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    portfolio_platform_name: data.platform,
                    portfolio_account_id: data.account_id,
                    portfolio_account_password: data.password,
                    internal_remarks: data.remarks
                })
                .eq('id', userId);
            
            if (error) throw error;
            showToast("Portfolio details updated successfully.");
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleResetUserPassword = async (email: string) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.host === 'localhost:3000' ? 'http://localhost:3000' : 'https://' + window.location.host}/reset-password`,
            });
            if (error) throw error;
            showToast("Password reset email sent.");
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleUpdateForexRate = async (newRate: number) => {
        try {
            const { data: currentSettings } = await supabase
                .from('platform_settings')
                .select('value')
                .eq('key', 'forex_rate')
                .single();
            const oldRate = Number(currentSettings?.value || 4.2);

            // 1. Update Platform Settings
            const { error: settingsError } = await supabase
                .from('platform_settings')
                .upsert({ key: 'usd_to_myr_rate', value: String(newRate) }, { onConflict: 'key' });
            if (settingsError) throw settingsError;

            // 2. Log History
            const { error: historyError } = await supabase
                .from('forex_history')
                .insert({
                    old_rate: oldRate,
                    new_rate: newRate,
                    admin_id: authUser?.id,
                    admin_username: authUser?.user_metadata?.full_name || "Admin"
                });
            if (historyError) throw historyError;

            showToast(`Global rate updated to 1 USD = RM ${newRate.toFixed(4)}`);
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleSetAdminRole = async (userId: string, makeAdmin: boolean) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: makeAdmin ? 'admin' : 'User' })
                .eq('id', userId);
            if (error) throw error;
            showToast(makeAdmin ? 'User promoted to Admin.' : 'Admin role removed.');
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleUpdatePassword = async (password: string) => {
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            showToast("Password updated successfully.");
        } catch (err: any) {
            alert(err.message);
        }
    };

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('admin-realtime-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    return (
        <AdminContext.Provider value={{ 
            users, 
            kycQueue, 
            deposits, 
            withdrawals, 
            salesData, 
            platformStats, 
            forexHistory, 
            verificationLogs, 
            combinedAuditLogs,
            loading, 
            showToast,
            refreshData: fetchData,
            handleApproveDeposit,
            handleRejectDeposit,
            handleApproveWithdrawal,
            handleRejectWithdrawal,
            handleAdjustBalance,
            handleApproveKyc,
            handleRejectKyc,
            handleUpdatePortfolio,
            handleResetUserPassword,
            handleUpdateForexRate,
            handleUpdatePassword,
            handleSetAdminRole
        }}>
            {children}
            
            {/* Action Toast UI */}
            {toast.visible && (
                <div className="fixed bottom-6 right-6 z-[1000] bg-gv-gold text-black font-black py-4 px-8 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-5 uppercase tracking-widest text-[10px]">
                    {toast.message}
                </div>
            )}
        </AdminContext.Provider>
    );
}

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (context === undefined) {
        throw new Error("useAdmin must be used within an AdminProvider");
    }
    return context;
};
