"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./AuthProvider";
import { useSettings } from "./SettingsProvider";
import { getTierByAmount } from "@/lib/tierUtils";

interface UserContextType {
    userProfile: any;
    transactions: any[];
    dividendHistory: any[];
    referredUsers: any[];
    referredCount: number;
    loading: boolean;
    refreshData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [userProfile, setUserProfile] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [dividendHistory, setDividendHistory] = useState<any[]>([]);
    const [referredUsers, setReferredUsers] = useState<any[]>([]);
    const [referredCount, setReferredCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const { forexRate: rawForexRate } = useSettings();
    const forexRate = rawForexRate > 0 ? rawForexRate : 4.4;

    const fetchData = useCallback(async () => {
        if (!user?.id) return;
        
        setLoading(true);
        try {
            // 1. Fetch Profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            // 2. Fetch Transactions
            const { data: txs } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            // 3. Process Data
            if (profile && txs) {
                const now = new Date();
                const approvedDeposits = txs.filter((tx: any) => 
                    (tx.type === 'Deposit' || tx.type === 'Bonus' || tx.type === 'Adjustment') && 
                    ['Approved', 'Completed'].includes(tx.status) &&
                    (tx.metadata?.adjustment_category !== 'Dividend' && tx.metadata?.adjustment_category !== 'Profit')
                );
                const totalDepositedRaw = txs.filter((t: any) => {
                    const category = (t.metadata?.adjustment_category || "").toLowerCase();
                    const isCapital = (t.type === 'Deposit' || t.type === 'Bonus' || t.type === 'Adjustment') && 
                                     category !== 'dividend' && 
                                     category !== 'profit' &&
                                     category !== 'bonus';
                    return isCapital && ['Approved', 'Completed'].includes(t.status);
                }).reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);

                const totalWithdrawnRaw = txs.filter((t: any) => {
                    const category = (t.metadata?.adjustment_category || "").toLowerCase();
                    const isCapitalWithdrawal = t.type === 'Withdrawal' && 
                                               category !== 'dividend' && 
                                               category !== 'bonus';
                    return isCapitalWithdrawal && ['Approved', 'Completed', 'Pending Release'].includes(t.status);
                }).reduce((acc: number, t: any) => acc + Math.abs(Number(t.amount || 0)), 0);

                const balanceUSD = Number(profile.balance_usd || 0);
                const currentTier = getTierByAmount(balanceUSD);
                const lockPeriodDays = currentTier.lockInDays || 180;

                const lockedCapitalUSD = approvedDeposits.reduce((acc, tx) => {
                    const rawDate = tx.transfer_date || tx.created_at;
                    const txDate = new Date(rawDate);
                    if (isNaN(txDate.getTime())) return acc;
                    const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
                    return diffDays < lockPeriodDays ? acc + Number(tx.original_currency_amount ?? (Number(tx.amount || 0) / forexRate)) : acc;
                }, 0);

                const profitUSD = Number(profile.profit || 0);
                const totalAssetsUSD = balanceUSD + profitUSD;
                const withdrawableBalanceUSD = Math.max(0, balanceUSD - lockedCapitalUSD) + profitUSD;
                
                const totalDepositedUSD = approvedDeposits.filter((t: any) => {
                    const category = (t.metadata?.adjustment_category || "").toLowerCase();
                    return category !== 'dividend' && category !== 'profit' && category !== 'bonus';
                }).reduce((acc: number, t: any) => acc + Number(t.original_currency_amount ?? (Number(t.amount || 0) / forexRate)), 0);

                const totalWithdrawnUSD = txs.filter((t: any) => 
                    t.type === 'Withdrawal' && 
                    (t.status === 'Approved' || t.status === 'Completed' || t.status === 'Pending Release')
                ).reduce((acc: number, t: any) => acc + Number(t.original_currency_amount ?? (Math.abs(Number(t.amount || 0)) / forexRate)), 0);

                const fullProfile = {
                    ...user,
                    ...profile,
                    fullName: profile.full_name || user.user_metadata?.full_name,
                    total_assets: totalAssetsUSD * forexRate, // RM value for legacy display only
                    total_assets_usd: totalAssetsUSD,
                    withdrawable_balance_usd: withdrawableBalanceUSD,
                    locked_capital: lockedCapitalUSD * forexRate, // RM value for legacy display
                    locked_capital_usd: lockedCapitalUSD,
                    total_deposited: totalDepositedUSD * forexRate,
                    total_deposited_usd: totalDepositedUSD,
                    total_withdrawn: totalWithdrawnUSD * forexRate,
                    total_withdrawn_usd: totalWithdrawnUSD,
                    total_investment: balanceUSD * forexRate,
                    total_investment_usd: balanceUSD,
                    totalEquity: totalAssetsUSD,
                    balanceUSD: balanceUSD,
                    profit_usd: profitUSD
                };

                setUserProfile(fullProfile);
                setTransactions(txs);
                setDividendHistory(txs.filter((t: any) => {
                    const type = (t.type || "").toLowerCase();
                    const category = (t.metadata?.adjustment_category || "").toLowerCase();
                    const isDividendOrBonus = 
                        type === 'dividend' || 
                        type === 'bonus' ||
                        category === 'dividend' || 
                        category === 'bonus';
                    
                    return isDividendOrBonus && t.status === 'Approved';
                }).reverse());
            }

            // 4. Fetch Referrals
            const { data: refs, count } = await supabase
                .from('profiles')
                .select('id, full_name, username, balance, is_verified, created_at, tier', { count: 'exact' })
                .eq('referred_by', user.id);
            
            if (refs) setReferredUsers(refs);
            if (count !== null) setReferredCount(count);

        } catch (error) {
            console.error("Error fetching user dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.id, forexRate]);

    useEffect(() => {
        fetchData();

        if (!user?.id) return;

        // Real-time listeners
        const profileChannel = supabase
            .channel(`profile-updates-${user.id}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'profiles', 
                filter: `id=eq.${user.id}` 
            }, (payload) => {
                console.log("[USER REALTIME] Profile change:", payload.eventType);
                fetchData();
            })
            .subscribe();

        const txChannel = supabase
            .channel(`tx-updates-${user.id}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'transactions', 
                filter: `user_id=eq.${user.id}` 
            }, (payload) => {
                console.log("[USER REALTIME] Transaction change:", payload.eventType);
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(profileChannel);
            supabase.removeChannel(txChannel);
        };
    }, [user?.id, forexRate]);

    return (
        <UserContext.Provider value={{ 
            userProfile,
            transactions, 
            dividendHistory, 
            referredUsers, 
            referredCount, 
            loading,
            refreshData: fetchData 
        }}>
            {children}
        </UserContext.Provider>
    );
}

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
};
