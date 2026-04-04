"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./AuthProvider";
import { getTierByAmount } from "@/lib/tierUtils";

interface AdminContextType {
    users: any[];
    kycQueue: any[];
    deposits: any[];
    withdrawals: any[];
    salesData: any[];
    platformStats: {
        totalBalance: number;
        totalBalanceUSD: number;
        totalProfit: number;
        totalProfitUSD: number;
        totalAssets: number;
        totalAssetsUSD: number;
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
    const [platformStats, setPlatformStats] = useState({ totalBalance: 0, totalBalanceUSD: 0, totalProfit: 0, totalProfitUSD: 0, totalAssets: 0, totalAssetsUSD: 0, userCount: 0, verifiedCount: 0 });
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
                    const totalInvestment = Number(p.balance || 0);
                    const totalInvestmentUSD = p.balance_usd ?? (totalInvestment / forexRate);
                    const currentTier = getTierByAmount(totalInvestmentUSD);
                    const lockPeriodDays = currentTier.lockInDays || 180;
                    
                    // Locked Capital Logic (standardized to USD-primary)
                    const lockedCapitalUSD = userTxs.filter((t: any) => t.type === 'Deposit').reduce((acc: number, tx: any) => {
                        const rawDate = tx.transfer_date || tx.created_at;
                        const txDate = new Date(rawDate);
                        if (isNaN(txDate.getTime())) return acc;
                        const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
                        return diffDays < lockPeriodDays ? acc + Number(tx.original_currency_amount ?? (Number(tx.amount || 0) / forexRate)) : acc;
                    }, 0);

                    const profitUSD = Number(p.profit || 0); // Profit field is USD-primary
                    const withdrawableBalanceUSD = Math.max(0, (totalInvestmentUSD - lockedCapitalUSD) + profitUSD);
                    const withdrawableBalance = withdrawableBalanceUSD * forexRate;
                    const lockedCapital = lockedCapitalUSD * forexRate;
                    const totalAssetsUSD = totalInvestmentUSD + profitUSD;

                    return {
                        ...p,
                        total_investment: totalInvestment,
                        total_investment_usd: totalInvestmentUSD,
                        withdrawable_balance: withdrawableBalance,
                        withdrawable_balance_usd: withdrawableBalanceUSD,
                        locked_capital: lockedCapital,
                        profit_usd: profitUSD,
                        total_assets_usd: totalAssetsUSD
                    };
                });

                setUsers(enrichedUsers);
                setKycQueue(kycPendingList || []);

                // Calculate Global Platform Stats (Both RM and USD)
                const stats = profileList.reduce((acc, p) => {
                    const currentBalanceUSD = p.balance_usd ?? (Number(p.balance || 0) / forexRate);
                    const currentProfitUSD = Number(p.profit || 0); // Profit is USD-primary
                    return {
                        totalBalance: acc.totalBalance + (currentBalanceUSD * forexRate),
                        totalBalanceUSD: acc.totalBalanceUSD + currentBalanceUSD,
                        totalProfit: acc.totalProfit + (currentProfitUSD * forexRate),
                        totalProfitUSD: acc.totalProfitUSD + currentProfitUSD,
                        totalAssets: acc.totalAssets + (currentBalanceUSD + currentProfitUSD) * forexRate,
                        totalAssetsUSD: acc.totalAssetsUSD + currentBalanceUSD + currentProfitUSD,
                        userCount: acc.userCount + 1,
                        verifiedCount: acc.verifiedCount + (p.kyc_status === 'Verified' ? 1 : 0)
                    };
                }, { totalBalance: 0, totalBalanceUSD: 0, totalProfit: 0, totalProfitUSD: 0, totalAssets: 0, totalAssetsUSD: 0, userCount: 0, verifiedCount: 0 });
                setPlatformStats(stats as any);
            }

            // 6. Fetch Sales Data & Synchronize USD Totals
            const { data: sales } = await supabase
                .from('sales_leaderboard')
                .select('*')
                .order('total_referred_capital', { ascending: false });

            if (sales && profileList && txList) {
                // We use the same enrichment logic or the existing enrichedUsers if we restructure
                // Better approach: Calculate preciseSalesData here where we have the fresh data
                const now = new Date();
                const enrichedUsers = profileList.map((p: any) => {
                    const userTxs = txList.filter((t: any) => t.user_id === p.id && ['Approved', 'Completed'].includes(t.status));
                    const totalInvUSD = p.balance_usd ?? (Number(p.balance || 0) / forexRate);
                    return { ...p, balance_usd: totalInvUSD };
                });

                const preciseSalesData = sales.map(agent => {
                    const referredUsers = enrichedUsers.filter(u => u.referred_by_username === agent.agent_username);
                    const totalUSD = referredUsers.reduce((sum, u) => sum + Number(u.balance_usd || 0), 0);
                    const totalRM = referredUsers.reduce((sum, u) => sum + Number(u.balance || 0), 0);
                    return {
                        ...agent,
                        total_referred_capital: totalRM,
                        total_referred_capital_usd: totalUSD
                    };
                });
                setSalesData(preciseSalesData);
            } else if (sales) {
                setSalesData(sales);
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
                    original_currency: t.original_currency,
                    original_currency_amount: t.original_currency_amount,
                    txType: t.type
                }))
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setCombinedAuditLogs(mergedLogs);



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

            const amountUSD = Number(tx.original_currency_amount ?? (Number(tx.amount || 0) / forexRate));
            const currentUSD = tx.profiles?.balance_usd ?? (Number(tx.profiles?.balance || 0) / forexRate);

            await supabase.from('profiles').update({
                balance_usd: currentUSD + amountUSD,
                balance: 0 // Record only in USD from now on
            }).eq('id', tx.user_id);

            await supabase.from('transactions').update({
                metadata: {
                    ...tx.metadata,
                    processed_by_name: authUser?.user_metadata?.full_name || "Admin",
                    processed_by_id: authUser?.id,
                    processed_by_email: authUser?.email,
                    approved_at: new Date().toISOString()
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
                        reason: "Policy violation or invalid receipt",
                        approved_at: new Date().toISOString()
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

            const withdrawAmountUSD = Number(tx.original_currency_amount ?? (Math.abs(Number(tx.amount || 0)) / forexRate));
            const currentProfitUSD = Number(profile?.profit || 0); // Profit is now USD
            const currentBalanceUSD = Number(profile?.balance_usd || 0);

            // 2. Fetch User Capital Inflows to verify lock-in period (USD basis)
            const { data: deposits, error: depositsError } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', tx.user_id)
                .in('type', ['Deposit', 'Bonus', 'Adjustment'])
                .in('status', ['Approved', 'Completed']);

            if (depositsError) throw depositsError;

            const now = new Date();
            const currentTier = getTierByAmount(currentBalanceUSD);
            const lockPeriodDays = currentTier.lockInDays || 180;

            const lockedCapitalUSD = deposits?.reduce((acc: number, d: any) => {
                const category = (d.metadata?.adjustment_category || "").toLowerCase();
                if (category === 'dividend' || category === 'profit') return acc;

                const rawDate = d.transfer_date || d.created_at;
                const txDate = new Date(rawDate);
                if (isNaN(txDate.getTime())) return acc;
                
                const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
                return diffDays < lockPeriodDays ? acc + Number(d.original_currency_amount ?? (Number(d.amount || 0) / forexRate)) : acc;
            }, 0) || 0;

            const withdrawableCapitalUSD = Math.max(0, currentBalanceUSD - lockedCapitalUSD);
            const totalWithdrawableUSD = currentProfitUSD + withdrawableCapitalUSD;

            let penaltyUSD = 0;
            let finalPayoutUSD = withdrawAmountUSD;
            let penaltyApplied = false;

            if (withdrawAmountUSD > totalWithdrawableUSD) {
                const penalizedPortionUSD = withdrawAmountUSD - totalWithdrawableUSD;
                penaltyUSD = penalizedPortionUSD * 0.4;
                finalPayoutUSD = withdrawAmountUSD - penaltyUSD;
                penaltyApplied = true;
            }

            // 3. Deduct: first from profit (dividends), then from balance (capital) - ALL USD
            let newProfitUSD = currentProfitUSD;
            let newBalanceUSD = currentBalanceUSD;
            let remainingUSD = withdrawAmountUSD;

            if (remainingUSD <= newProfitUSD) {
                newProfitUSD -= remainingUSD;
                remainingUSD = 0;
            } else {
                remainingUSD -= newProfitUSD;
                newProfitUSD = 0;
                newBalanceUSD = Math.max(0, newBalanceUSD - remainingUSD);
            }

            // 4. Update profile with new balances (USD-Primary)
            const { error: profileUpdateError } = await supabase
                .from('profiles')
                .update({ 
                    balance: 0, // RM balance is now legacy 0
                    profit: newProfitUSD, // profit field repurposed to USD
                    balance_usd: newBalanceUSD
                })
                .eq('id', tx.user_id);
            
            if (profileUpdateError) throw profileUpdateError;

            // 5. Mark transaction as Pending Release
            // We maintain ONE single transaction for the full requested amount (Gross)
            // But we add penalty/payout details to the metadata for the admin/user to see.
            const { error: txUpdateError } = await supabase
                .from('transactions')
                .update({ 
                    status: 'Pending Release',
                    amount: -Math.abs(Number(withdrawAmountUSD)), // Keep Gross amount in USD
                    metadata: {
                        ...tx.metadata,
                        description: penaltyApplied ? "Capital Withdrawal (Penalized)" : "Capital Withdrawal",
                        penalty_applied: penaltyApplied,
                        penalty_amount: penaltyUSD * (forexRate - 0.4), // RM value for audit
                        penalty_amount_usd: penaltyUSD,
                        final_payout_usd: finalPayoutUSD,
                        final_payout_rm: finalPayoutUSD * (forexRate - 0.4), // RM value for payment
                        original_request_amount_usd: withdrawAmountUSD,
                        original_request_amount_rm: withdrawAmountUSD * (forexRate - 0.4),
                        approved_at: new Date().toISOString(),
                        bank_name: profile.bank_name || profile.kyc_data?.bank_name || tx.metadata?.bank_name,
                        account_number: profile.account_number || profile.kyc_data?.account_number || tx.metadata?.account_number,
                        bank_account_holder: profile.bank_account_holder || profile.kyc_data?.bank_account_holder || tx.metadata?.bank_account_holder
                    }
                })
                .eq('id', tx.id);
            
            if (txUpdateError) throw txUpdateError;
            
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
            const newRM = Number(user[targetField] || 0) + amountRM;
            const updatePayload: any = { [targetField]: newRM };
            if (targetField === 'balance') {
                const currentBalanceUSD = user.balance_usd || (Number(user.balance || 0) / forexRate);
                let newBalanceUSD = currentBalanceUSD + amountUSD;
                
                // Final safety guard: If RM balance is 0, USD balance MUST be 0
                if (Math.abs(newRM) < 0.01) {
                    newBalanceUSD = 0;
                }
                
                updatePayload.balance_usd = newBalanceUSD;
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
                    amount: amountUSD, // Records USD value as main amount
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
                console.log("[ADMIN REALTIME] Transactions update:", payload.eventType);
                fetchData(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
                console.log("[ADMIN REALTIME] Profiles update:", payload.eventType);
                fetchData(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings' }, (payload) => {
                console.log("[ADMIN REALTIME] Settings update:", payload.eventType);
                fetchData(true);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log("[ADMIN REALTIME] Subscription active.");
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error("[ADMIN REALTIME] Subscription failed/timed out. Status:", status);
                }
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
