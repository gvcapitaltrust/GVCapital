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
    withdrawalMethods: any[];
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
    const [withdrawalMethods, setWithdrawalMethods] = useState<any[]>([]);
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
                const approvedDeposits = txs.filter((tx: any) => {
                    const type = (tx.type || "").toLowerCase();
                    const category = (tx.metadata?.adjustment_category || "").toLowerCase();
                    const isInvestmentCapital = (type === 'deposit' || type === 'adjustment') && 
                                               category !== 'dividend' && 
                                               category !== 'profit' && 
                                               category !== 'bonus';
                    return isInvestmentCapital && ['Approved', 'Completed'].includes(tx.status);
                });
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

                let nextMaturityDate: Date | null = null;
                const lockedCapitalUSD = approvedDeposits.reduce((acc, tx) => {
                    const rawDate = tx.transfer_date || tx.created_at;
                    const txDate = new Date(rawDate);
                    if (isNaN(txDate.getTime())) return acc;
                    
                    const maturityDate = new Date(txDate.getTime() + lockPeriodDays * 24 * 60 * 60 * 1000);
                    const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
                    
                    if (diffDays < lockPeriodDays) {
                        if (!nextMaturityDate || maturityDate < nextMaturityDate) {
                            nextMaturityDate = maturityDate;
                        }
                        return acc + Number(tx.original_currency_amount ?? (Number(tx.amount || 0) / forexRate));
                    }
                    return acc;
                }, 0);

                const profitUSD = Number(profile.profit || 0);
                const matureCapitalUSD = Math.max(0, balanceUSD - lockedCapitalUSD);
                const dividendWithdrawableUSD = profitUSD;
                const withdrawableBalanceUSD = matureCapitalUSD + dividendWithdrawableUSD;
                
                const totalDepositedUSD = approvedDeposits.filter((t: any) => {
                    const category = (t.metadata?.adjustment_category || "").toLowerCase();
                    return category !== 'dividend' && category !== 'profit' && category !== 'bonus';
                }).reduce((acc: number, t: any) => acc + Number(t.original_currency_amount ?? (Number(t.amount || 0) / forexRate)), 0);

                const totalWithdrawnUSD = txs.filter((t: any) => 
                    t.type === 'Withdrawal' && 
                    (t.status === 'Approved' || t.status === 'Completed' || t.status === 'Pending Release' || t.status === 'Pending')
                ).reduce((acc: number, t: any) => acc + Number(t.original_currency_amount ?? (Math.abs(Number(t.amount || 0)) / forexRate)), 0);

                const lifetimeDividendsUSD = txs.filter((t: any) => {
                    const type = (t.type || "").toLowerCase();
                    const category = (t.metadata?.adjustment_category || "").toLowerCase();
                    const reason = (t.metadata?.reason || "").toLowerCase();
                    const isDivOrBonus = type === 'dividend' || type === 'bonus' || category === 'dividend' || category === 'bonus' || category === 'profit' || reason.includes('dividend');
                    return isDivOrBonus && ['Approved', 'Completed'].includes(t.status);
                }).reduce((acc: number, t: any) => acc + Number(t.original_currency_amount ?? (Number(t.amount || 0) / forexRate)), 0);

                const fullProfile = {
                    ...user,
                    ...profile,
                    fullName: profile.full_name || user.user_metadata?.full_name,
                    total_assets: (balanceUSD + profitUSD) * forexRate, // RM value for legacy display only
                    total_assets_usd: balanceUSD + profitUSD,
                    withdrawable_balance: withdrawableBalanceUSD * (forexRate - 0.4),
                    withdrawable_balance_usd: withdrawableBalanceUSD,
                    mature_capital_usd: matureCapitalUSD,
                    mature_capital_rm: matureCapitalUSD * (forexRate - 0.4),
                    dividend_withdrawable_usd: dividendWithdrawableUSD,
                    dividend_withdrawable_rm: dividendWithdrawableUSD * (forexRate - 0.4),
                    locked_capital: lockedCapitalUSD * forexRate, // RM value for legacy display
                    locked_capital_usd: lockedCapitalUSD,
                    total_deposited: totalDepositedUSD * forexRate,
                    total_deposited_usd: totalDepositedUSD,
                    total_withdrawn: totalWithdrawnUSD * (forexRate - 0.4),
                    total_withdrawn_usd: totalWithdrawnUSD,
                    total_investment: balanceUSD * forexRate,
                    total_investment_usd: balanceUSD,
                    totalEquity: balanceUSD + profitUSD,
                    balanceUSD: balanceUSD,
                    profit_rm: profitUSD * forexRate,
                    profit_usd: profitUSD,
                    lifetime_dividends_usd: lifetimeDividendsUSD,
                    accumulated_dividend_rm: lifetimeDividendsUSD * forexRate, // Accumulated is historical gross
                    next_maturity_date: nextMaturityDate
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

                // 4. Fetch Referrals using both UUID and Username (e.g. for elwin87 case)
                const { data: refs, count: refsCount } = await supabase
                    .from('profiles')
                    .select('id, full_name, username, balance, is_verified, created_at, tier', { count: 'exact' })
                    .or(`referred_by.eq.${user.id},referred_by_username.eq.${profile.username}`);
                
                if (refs) setReferredUsers(refs);
                if (refsCount !== null) setReferredCount(refsCount);
            }

            // 5. Fetch Withdrawal Methods
            const { data: wMethods } = await supabase
                .from('withdrawal_methods')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            
            if (wMethods) setWithdrawalMethods(wMethods);

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
            withdrawalMethods,
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
