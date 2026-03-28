"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase, MASTER_ADMIN_EMAIL } from "@/lib/supabaseClient";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
    user: any;
    role: string;
    isVerified: boolean;
    kycStep: number;
    balance: number;
    balanceUSD: number;
    totalEquity: number;
    totalAssets: number;
    totalAssetsUSD: number;
    loading: boolean;
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState("User");
    const [isVerified, setIsVerified] = useState(false);
    const [kycStep, setKycStep] = useState(0);
    const [balance, setBalance] = useState(0);
    const [balanceUSD, setBalanceUSD] = useState(0);
    const [totalEquity, setTotalEquity] = useState(0);
    const [totalAssets, setTotalAssets] = useState(0);
    const [totalAssetsUSD, setTotalAssetsUSD] = useState(0);
    const [loading, setLoading] = useState(true);
    
    const [session, setSession] = useState<any>(null);
    const router = useRouter();
    
    // Singleton Guards
    const isFetching = useRef(false);
    const currentUserId = useRef<string | null>(null);

    // 1. Stable Identity Listener
    useEffect(() => {
        const initSession = async () => {
            const { data: { session: s } } = await supabase.auth.getSession();
            if (s) {
                document.cookie = `gv-auth-v1=${encodeURIComponent(JSON.stringify(s))}; path=/; max-age=31536000; SameSite=Lax;`;
                currentUserId.current = s.user.id;
                setSession(s);
            } else {
                setLoading(false);
            }
        };
        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
            console.log(`[AUTH EVENT]: ${event}`);
            
            if (event === 'SIGNED_OUT') {
                document.cookie = `gv-auth-v1=; path=/; max-age=0;`;
                setUser(null);
                setRole("User");
                setIsVerified(false);
                setKycStep(0);
                setBalance(0);
                setBalanceUSD(0);
                setTotalEquity(0);
                setTotalAssets(0);
                setTotalAssetsUSD(0);
                currentUserId.current = null;
                setSession(null);
                setLoading(false);
                if (window.location.pathname.startsWith('/dashboard') || window.location.pathname.startsWith('/admin')) {
                    router.push("/login");
                }
                return;
            }

            // Stable Identity Check: Only trigger if the user ID changed or explicitly signed in
            if (s && (s.user.id !== currentUserId.current || event === 'SIGNED_IN')) {
                document.cookie = `gv-auth-v1=${encodeURIComponent(JSON.stringify(s))}; path=/; max-age=31536000; SameSite=Lax;`;
                currentUserId.current = s.user.id;
                setSession(s);
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    // 2. Atomic Profile Fetcher
    const fetchProfile = async () => {
        if (!session?.user) return;
        if (isFetching.current) return;
        
        isFetching.current = true;
        const uid = session.user.id;

        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', uid)
                .maybeSingle();

            if (profile) {
                setRole(profile.role || "User");
                setIsVerified(profile.is_verified === true || profile.is_verified === "Approved");
                setKycStep(profile.kyc_step || 0);
                setBalance(profile.balance || 0);
                
                // Fetch forex rate for conversion
                const { data: settings } = await supabase.from('platform_settings').select('value').eq('key', 'usd_to_myr_rate').single();
                const rate = Number(settings?.value || 4.4);
                
                // Fetch transactions for stable USD profit calculation
                const { data: txs } = await supabase
                    .from('transactions')
                    .select('type, amount, status, metadata, original_currency_amount')
                    .eq('user_id', uid)
                    .eq('status', 'Approved');

                const totalProfitUSD = (txs || []).filter((t: any) => {
                    const type = (t.type || "").toLowerCase();
                    const category = (t.metadata?.adjustment_category || "").toLowerCase();
                    const isDividendOrBonus = 
                        type === 'dividend' || 
                        type === 'bonus' ||
                        category === 'dividend' || 
                        category === 'bonus';
                    return isDividendOrBonus;
                }).reduce((acc: number, t: any) => acc + Number(t.original_currency_amount || (Number(t.amount || 0) / rate)), 0);

                const currentBalanceUSD = profile.balance_usd ?? (Number(profile.balance || 0) / rate);
                setBalanceUSD(currentBalanceUSD);
                
                const assetsRM = Number(profile.balance || 0) + Number(profile.profit || 0);
                
                setTotalEquity(assetsRM);
                setTotalAssets(assetsRM);
                setTotalAssetsUSD(currentBalanceUSD + totalProfitUSD);
                setUser({ ...session.user, ...profile, profit_usd: totalProfitUSD });
            } else if (session?.user && !isFetching.current) {
                // Profile missing but auth session exists -> User was likely deleted by admin
                console.warn("[AUTH] Profile missing for active session. Signing out...");
                document.cookie = `gv-auth-v1=; path=/; max-age=0;`;
                await supabase.auth.signOut();
                router.push("/login?error=account_deleted");
            }
        } catch (err) {
            console.error("[AUTH] Fetch failed:", err);
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    };

    useEffect(() => {
        if (session?.user) {
            fetchProfile();
        }
    }, [session]);

    // 3. Real-time Profile Sync
    useEffect(() => {
        if (!session?.user?.id) return;

        const uid = session.user.id;
        const channel = supabase
            .channel(`profile-updates-${uid}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'profiles', 
                filter: `id=eq.${uid}` 
            }, () => {
                console.log("[AUTH] Profile update detected, refreshing...");
                fetchProfile();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user?.id]);

    const refreshProfile = async () => {
        setLoading(true);
        isFetching.current = false; // Force unlock
        const { data: { session: s } } = await supabase.auth.refreshSession();
        setSession(s);
    };

    return (
        <AuthContext.Provider value={{ user, role, isVerified, kycStep, balance, balanceUSD, totalEquity, totalAssets, totalAssetsUSD, loading, refresh: refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
