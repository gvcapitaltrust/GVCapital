"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./AuthProvider";
import { useSettings } from "./SettingsProvider";

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

    const { forexRate } = useSettings();

    const fetchData = async () => {
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
                const approvedDeposits = txs.filter((tx: any) => tx.type === 'Deposit' && tx.status === 'Approved');
                const lockedCapital = approvedDeposits.reduce((acc, tx) => {
                    const txDate = new Date(tx.created_at || tx.transfer_date);
                    const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
                    return diffDays < 180 ? acc + Number(tx.amount) : acc;
                }, 0);

                const totalAssetsRM = Number(profile.balance || 0) + Number(profile.profit || 0);
                const withdrawableBalance = Math.max(0, (Number(profile.balance || 0) - lockedCapital) + Number(profile.profit || 0));
                
                const totalDeposited = txs.filter((t: any) => (t.type === 'Deposit' || t.type?.includes('Bonus Increase')) && t.status === 'Approved').reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);
                const totalWithdrawn = txs.filter((t: any) => (t.type === 'Withdrawal' || t.type?.includes('Bonus Decrease')) && t.status === 'Approved').reduce((acc: number, t: any) => acc + Math.abs(Number(t.amount || 0)), 0);

                const fullProfile = {
                    ...user,
                    ...profile,
                    fullName: profile.full_name || user.user_metadata?.full_name,
                    total_assets: totalAssetsRM,
                    withdrawable_balance: withdrawableBalance,
                    locked_capital: lockedCapital,
                    total_deposited: totalDeposited,
                    total_withdrawn: totalWithdrawn,
                    total_investment: totalDeposited - totalWithdrawn,
                    totalEquity: totalAssetsRM,
                    balanceUSD: Number(profile.balance || 0) / forexRate
                };

                setUserProfile(fullProfile);
                setTransactions(txs);
                setDividendHistory(txs.filter((t: any) => 
                    (t.type?.toLowerCase().includes('dividend') || t.type?.toLowerCase().includes('bonus')) &&
                    t.status === 'Approved'
                ).slice(0, 6).reverse());
            }

            // 4. Fetch Referrals
            const { data: refs, count } = await supabase
                .from('profiles')
                .select('id, full_name, username, balance, is_verified, created_at', { count: 'exact' })
                .eq('referred_by', user.id);
            
            if (refs) setReferredUsers(refs);
            if (count !== null) setReferredCount(count);

        } catch (error) {
            console.error("Error fetching user dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        if (!user?.id) return;

        // Real-time listeners
        const profileChannel = supabase
            .channel(`profile-updates-${user.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, 
            () => fetchData())
            .subscribe();

        const txChannel = supabase
            .channel(`tx-updates-${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, 
            () => fetchData())
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
