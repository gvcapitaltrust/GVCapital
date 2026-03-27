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
        verifiedCount: number;
    };
    forexHistory: any[];
    verificationLogs: any[];
    combinedAuditLogs: any[];
    loading: boolean;
    forexRate: number;
    showToast: (msg: string) => void;
    refreshData: () => Promise<void>;
    handleApproveDeposit: (tx: any) => Promise<void>;
    handleRejectDeposit: (tx: any) => Promise<void>;
    handleApproveWithdrawal: (tx: any) => Promise<void>;
    handleCompleteWithdrawal: (tx: any) => Promise<void>;
    handleRejectWithdrawal: (tx: any) => Promise<void>;
    handleAdjustBalance: (user: any, amount: number, type: "balance" | "profit", reason: string) => Promise<void>;
    handleApproveKyc: (userId: string) => Promise<void>;
    handleRejectKyc: (userId: string, reason: string) => Promise<void>;
    handleUpdatePortfolio: (userId: string, data: any) => Promise<void>;
    handleResetUserPassword: (email: string) => Promise<void>;
    handleUpdateForexRate: (newRate: number) => Promise<void>;
    handleUpdatePassword: (password: string) => Promise<void>;
    handleSetAdminRole: (userId: string, makeAdmin: boolean) => Promise<void>;
    handleDeleteUser: (userId: string) => Promise<void>;
    handleToggleUserStatus: (userId: string, isDeactivated: boolean) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
    const { user: authUser } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [kycQueue, setKycQueue] = useState<any[]>([]);
    const [deposits, setDeposits] = useState<any[]>([]);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [salesData, setSalesData] = useState<any[]>([]);
    const [platformStats, setPlatformStats] = useState({ totalBalance: 0, totalProfit: 0, totalAssets: 0, userCount: 0, verifiedCount: 0 });
    const [forexHistory, setForexHistory] = useState<any[]>([]);
    const [verificationLogs, setVerificationLogs] = useState<any[]>([]);
    const [combinedAuditLogs, setCombinedAuditLogs] = useState<any[]>([]);
    const [forexRate, setForexRate] = useState(4.0); // Default fallback
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });

    const showToast = useCallback((msg: string) => {
        setToast({ message: msg, visible: true });
        setTimeout(() => setToast({ message: "", visible: false }), 5000);
    }, []);

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            // 1. Fetch Transactions
            const { data: txList } = await supabase
                .from('transactions')
                .select('*, profiles(*)')
                .order('created_at', { ascending: false });

            // 2. Fetch Profiles (All for global management)
            const { data: profileList } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            // 3. Fetch KYC Queue (Specifically all users with 'Pending' status)
            const { data: kycPendingList } = await supabase
                .from('profiles')
                .select('*')
                .in('kyc_status', ['Pending', 'Draft'])
                .order('created_at', { ascending: false });

            if (profileList && txList) {
                const now = new Date();
                const enrichedUsers = profileList.map((p: any) => {
                    const userTxs = txList.filter((t: any) => t.user_id === p.id && ['Approved', 'Completed'].includes(t.status));
                    
                    // Locked Capital Logic (same as UserProvider)
                    const lockedCapital = userTxs.filter((t: any) => t.type === 'Deposit').reduce((acc, tx) => {
                        const rawDate = tx.transfer_date || tx.created_at;
                        const txDate = new Date(rawDate);
                        if (isNaN(txDate.getTime())) return acc;
                        const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
                        return diffDays < 180 ? acc + Number(tx.amount) : acc;
                    }, 0);

                    const totalInvestment = Number(p.balance || 0);
                    const withdrawableBalance = Math.max(0, (Number(p.balance || 0) - lockedCapital) + Number(p.profit || 0));

                    return {
                        ...p,
                        total_investment: totalInvestment,
                        withdrawable_balance: withdrawableBalance,
                        locked_capital: lockedCapital
                    };
                });

                setUsers(enrichedUsers);
                setKycQueue(kycPendingList || []);

                // Calculate Global Platform Stats (Always RM)
                const stats = profileList.reduce((acc, p) => ({
                    totalBalance: acc.totalBalance + Number(p.balance || 0),
                    totalProfit: acc.totalProfit + Number(p.profit || 0),
                    totalAssets: acc.totalAssets + (Number(p.balance || 0) + Number(p.profit || 0)),
                    userCount: acc.userCount + 1,
                    verifiedCount: acc.verifiedCount + (p.kyc_status === 'Verified' ? 1 : 0)
                }), { totalBalance: 0, totalProfit: 0, totalAssets: 0, userCount: 0, verifiedCount: 0 });
                setPlatformStats(stats);
            }

            if (txList) {
                setDeposits(txList.filter((t: any) => t.type?.toLowerCase() === 'deposit'));
                setWithdrawals(txList.filter((t: any) => t.type?.toLowerCase() === 'withdrawal'));
            }

            // 4. Fetch Verification Logs
            const { data: logs } = await supabase
                .from('verification_logs')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (logs) setVerificationLogs(logs);

            // 5. Combine Audit Logs
            const financialTxs = txList?.filter((t: any) => ['Approved', 'Pending Release', 'Completed'].includes(t.status)) || [];
            const mergedLogs = [
                ...(logs || []).map(l => ({ ...l, auditType: 'verification', action: l.action_taken })),
                ...financialTxs.map(t => ({
                    id: t.id,
                    created_at: t.created_at,
                    admin_username: t.metadata?.processed_by_name || 'System',
                    user_email: t.profiles?.email || 'Unknown',
                    action: t.type === 'Deposit' ? 'Deposit Approved' : 
                            t.type === 'Withdrawal' ? (t.status === 'Pending Release' ? 'Withdrawal Accepted' : 'Withdrawal Released') : 
                            t.type === 'Audit' ? t.metadata?.action : 
                            t.type === 'Dividend' ? 'Dividend Payout' :
                            t.type === 'Bonus' ? 'Bonus Awarded' :
                            t.type === 'Penalty' ? 'Withdrawal Penalty' :
                            'Adjustment',
                    processed_by_name: t.metadata?.processed_by_name,
                    rejection_reason: t.metadata?.reason || t.metadata?.description || `${t.type} processed (${t.status})`,
                    auditType: 'transaction',
                    amount: t.amount,
                    txType: t.type
                }))
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setCombinedAuditLogs(mergedLogs);

            // 6. Fetch Sales Data
            const { data: sales } = await supabase
                .from('sales_leaderboard')
                .select('*')
                .order('total_referred_capital', { ascending: false });
            if (sales) setSalesData(sales);

            // 7. Fetch Forex History
            const { data: fHistory } = await supabase
                .from('forex_history')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);
            if (fHistory) setForexHistory(fHistory);

            // 8. Fetch Current Forex Rate
            const { data: fRate } = await supabase
                .from('platform_settings')
                .select('value')
                .eq('key', 'usd_to_myr_rate')
                .single();
            if (fRate) setForexRate(Number(fRate.value || 4.0));

        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            if (!isSilent) setLoading(false);
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

            await supabase.from('profiles').update({
                balance_usd: (tx.profiles?.balance_usd || (Number(tx.profiles?.balance || 0) / forexRate)) + Number(tx.original_currency_amount || 0)
            }).eq('id', tx.user_id);

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
                .select('balance, balance_usd, profit, bank_name, account_number, bank_account_holder, kyc_data')
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
                .in('status', ['Approved', 'Completed']);

            if (depositsError) throw depositsError;

            const now = new Date();
            const lockPeriodDays = 180;
            const lockedCapital = deposits?.reduce((acc: number, d: any) => {
                const rawDate = d.transfer_date || d.created_at;
                const txDate = new Date(rawDate);
                if (isNaN(txDate.getTime())) return acc;
                
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
            // Calculate USD deduction for balance_usd sync
            const withdrawalRate = forexRate - 0.4;
            const rmDeductedFromBalance = currentBalance - newBalance;
            const usdDeducted = rmDeductedFromBalance / withdrawalRate;
            const currentBalanceUSD = profile?.balance_usd || (currentBalance / forexRate);

            const { error: profileUpdateError } = await supabase
                .from('profiles')
                .update({ 
                    balance: newBalance, 
                    profit: newProfit,
                    balance_usd: Math.max(0, currentBalanceUSD - usdDeducted)
                })
                .eq('id', tx.user_id);
            
            if (profileUpdateError) throw profileUpdateError;

            // 5. Mark transaction as Pending Release (if penalty, split it)
            if (penaltyApplied) {
                // Update original to reflect final payout (Capital)
                const { error: txUpdateError } = await supabase
                    .from('transactions')
                    .update({ 
                        status: 'Pending Release',
                        amount: -Math.abs(finalPayout),
                        metadata: {
                            ...tx.metadata,
                            description: "Capital Withdrawal (Net)",
                            processed_by_name: authUser?.user_metadata?.full_name || "Admin",
                            processed_by_id: authUser?.id,
                            processed_by_email: authUser?.email,
                            finalized_penalty: penalty,
                            finalized_payout: finalPayout,
                            penalty_applied: true,
                            original_request_amount: withdrawAmount,
                            approved_at: new Date().toISOString(),
                            bank_name: profile.bank_name || profile.kyc_data?.bank_name || tx.metadata?.bank_name,
                            account_number: profile.account_number || profile.kyc_data?.account_number || tx.metadata?.account_number,
                            bank_account_holder: profile.bank_account_holder || profile.kyc_data?.bank_account_holder || tx.metadata?.bank_account_holder
                        }
                    })
                    .eq('id', tx.id);
                
                if (txUpdateError) throw txUpdateError;

                // Insert Penalty Transaction
                const { error: penaltyTxError } = await supabase
                    .from('transactions')
                    .insert({
                        user_id: tx.user_id,
                        type: 'Penalty',
                        amount: -Math.abs(penalty),
                        status: 'Pending Release', // Keep it in the queue for visibility
                        ref_id: `PEN-${tx.ref_id || Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                        metadata: {
                            description: "Early Withdrawal Penalty (40%)",
                            is_penalty: true,
                            parent_withdrawal_id: tx.id,
                            processed_by_name: authUser?.user_metadata?.full_name || "Admin",
                            processed_by_id: authUser?.id,
                            processed_by_email: authUser?.email,
                            approved_at: new Date().toISOString()
                        }
                    });
                
                if (penaltyTxError) throw penaltyTxError;
            } else {
                const { error: txError } = await supabase
                    .from('transactions')
                    .update({ 
                        status: 'Pending Release',
                        amount: -Math.abs(withdrawAmount),
                        metadata: {
                            ...tx.metadata,
                            description: "Capital Withdrawal",
                            processed_by_name: authUser?.user_metadata?.full_name || "Admin",
                            processed_by_id: authUser?.id,
                            processed_by_email: authUser?.email,
                            finalized_penalty: 0,
                            finalized_payout: withdrawAmount,
                            penalty_applied: false,
                            approved_at: new Date().toISOString(),
                            bank_name: profile.bank_name || profile.kyc_data?.bank_name || tx.metadata?.bank_name,
                            account_number: profile.account_number || profile.kyc_data?.account_number || tx.metadata?.account_number,
                            bank_account_holder: profile.bank_account_holder || profile.kyc_data?.bank_account_holder || tx.metadata?.bank_account_holder
                        }
                    })
                    .eq('id', tx.id);
                
                if (txError) throw txError;
            }
            
            showToast("Withdrawal accepted. Awaiting final release.");
            fetchData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleCompleteWithdrawal = async (tx: any) => {
        try {
            const { error: txError } = await supabase
                .from('transactions')
                .update({ 
                    status: 'Completed',
                    metadata: {
                        ...tx.metadata,
                        released_by_name: authUser?.user_metadata?.full_name || "Admin",
                        released_by_id: authUser?.id,
                        released_at: new Date().toISOString(),
                        completed_at: new Date().toISOString()
                    }
                })
                .eq('id', tx.id);
            
            if (txError) throw txError;

            // Also complete associated penalty if it exists
            // Since it's a JSONB search, we use the specific condition
            await supabase
                .from('transactions')
                .update({ 
                    status: 'Completed',
                    metadata: {
                        ...tx.metadata, // Optional: could just be current time
                        description: "Early Withdrawal Penalty (40%) - Collected",
                        released_at: new Date().toISOString(),
                        completed_at: new Date().toISOString()
                    }
                })
                .eq('type', 'Withdrawal')
                .eq('status', 'Pending Release')
                .filter('metadata->>parent_withdrawal_id', 'eq', tx.id);
            showToast("Withdrawal released and marked as completed.");
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

    const handleAdjustBalance = async (user: any, amountUSD: number, type: "balance" | "profit", reason: string) => {
        try {
            const isDividendOrBonus = type === 'profit' || reason?.toLowerCase().includes('dividend') || reason?.toLowerCase().includes('bonus');
            const targetField = isDividendOrBonus ? 'profit' : 'balance';

            const amountRM = amountUSD * forexRate;

            const updatePayload: any = { [targetField]: Number(user[targetField] || 0) + amountRM };
            if (targetField === 'balance') {
                const currentBalanceUSD = user.balance_usd || (Number(user.balance || 0) / forexRate);
                updatePayload.balance_usd = currentBalanceUSD + amountUSD;
            }

            const { error: profileError } = await supabase
                .from('profiles')
                .update(updatePayload)
                .eq('id', user.id);
            if (profileError) throw profileError;

            const txType = isDividendOrBonus ? (reason?.toLowerCase().includes('bonus') ? 'Bonus' : 'Dividend') : (amountUSD >= 0 ? 'Deposit' : 'Withdrawal');
            const { error: txError } = await supabase
                .from('transactions')
                .insert({
                    user_id: user.id,
                    type: txType,
                    amount: Math.abs(amountRM),
                    status: 'Approved',
                    original_currency: 'USD',
                    original_currency_amount: amountUSD,
                    ref_id: `${txType.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                    metadata: { 
                        is_adjustment: true,
                        reason: reason,
                        adjustment_category: isDividendOrBonus ? (reason?.toLowerCase().includes('bonus') ? 'Bonus' : 'Dividend') : 'Capital',
                        adjustment_type: amountUSD >= 0 ? 'Increase' : 'Decrease',
                        original_usd_amount: amountUSD,
                        forex_rate: forexRate,
                        description: reason || `${txType} ${amountUSD >= 0 ? 'Increase' : 'Decrease'} Adjustment`,
                        processed_by_name: authUser?.user_metadata?.full_name || "Admin",
                        processed_by_id: authUser?.id,
                        processed_by_email: authUser?.email
                    }
                });
            if (txError) throw txError;

            showToast(`Successfully adjusted ${targetField} by $${amountUSD.toFixed(2)} (≈ RM ${amountRM.toFixed(2)})`);
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
                .from('verification_logs')
                .insert({
                    user_id: userId,
                    user_email: user?.email,
                    admin_id: authUser?.id,
                    admin_username: authUser?.user_metadata?.full_name || "Admin",
                    action_taken: 'KYC Verified'
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
                .from('verification_logs')
                .insert({
                    user_id: userId,
                    user_email: user?.email,
                    admin_id: authUser?.id,
                    admin_username: authUser?.user_metadata?.full_name || "Admin",
                    action_taken: 'KYC Rejected',
                    rejection_reason: reason
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
                .eq('key', 'usd_to_myr_rate')
                .single();
            const oldRate = Number(currentSettings?.value || 4.0);

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
                    changed_by: authUser?.id
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
            const role = makeAdmin ? 'admin' : 'User';
            const res = await fetch("/api/admin/users/role", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    role,
                    adminId: authUser?.id,
                    adminName: authUser?.user_metadata?.full_name
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update role");
            
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

    const handleDeleteUser = async (userId: string) => {
        try {
            if (!confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) return;
            
            const res = await fetch("/api/admin/users/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    adminId: authUser?.id,
                    adminName: authUser?.user_metadata?.full_name
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete user");
            
            showToast("User permanently deleted.");
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleToggleUserStatus = async (userId: string, isDeactivated: boolean) => {
        try {
            const actionText = isDeactivated ? "deactivate" : "reactivate";
            if (!confirm(`Are you sure you want to ${actionText} this user?`)) return;

            const res = await fetch("/api/admin/users/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    isDeactivated,
                    adminId: authUser?.id,
                    adminName: authUser?.user_metadata?.full_name
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Failed to ${actionText} user`);
            
            showToast(`User ${isDeactivated ? "deactivated" : "reactivated"} successfully.`);
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('admin-realtime-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings' }, () => fetchData(true))
            .subscribe((status) => {
                console.log(`[ADMIN REALTIME] Subscription: ${status}`);
            });

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
            forexRate,
            showToast,
            refreshData: fetchData,
            handleApproveDeposit,
            handleRejectDeposit,
            handleApproveWithdrawal,
            handleCompleteWithdrawal,
            handleRejectWithdrawal,
            handleAdjustBalance,
            handleApproveKyc,
            handleRejectKyc,
            handleUpdatePortfolio,
            handleResetUserPassword,
            handleUpdateForexRate,
            handleUpdatePassword,
            handleSetAdminRole,
            handleDeleteUser,
            handleToggleUserStatus
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
