"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase, MASTER_ADMIN_EMAIL } from "@/lib/supabaseClient";
import { useRouter, usePathname } from "next/navigation";
import { generateUUID, safeStorage } from "@/lib/authUtils";

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
    const [lastLoginTime, setLastLoginTime] = useState<number | null>(null);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const router = useRouter();
    
    // Singleton Guards
    const isFetching = useRef(false);
    const currentUserId = useRef<string | null>(null);

    // 0. Device ID Management
    useEffect(() => {
        if (typeof window !== "undefined") {
            let id = safeStorage.getItem("gv_device_session_id");
            if (!id) {
                id = generateUUID();
                safeStorage.setItem("gv_device_session_id", id);
            }
            setDeviceId(id);
        }
    }, []);

    // 1. Stable Identity Listener
    useEffect(() => {
        const initSession = async () => {
            const { data: { session: s } } = await supabase.auth.getSession();
            if (s) {
                const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
                document.cookie = `gv-auth-v1=${encodeURIComponent(s.access_token)}; path=/; max-age=31536000; SameSite=Lax;${isSecure ? " Secure;" : ""}`;
                setLastLoginTime(Date.now()); // Set initial login time to enable the grace period after redirect
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
                const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
                document.cookie = `gv-auth-v1=${encodeURIComponent(s.access_token)}; path=/; max-age=31536000; SameSite=Lax;${isSecure ? " Secure;" : ""}`;
                if (event === 'SIGNED_IN') {
                    setLastLoginTime(Date.now());
                }
                currentUserId.current = s.user.id;
                setSession(s);
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    // 2. Atomic Profile Fetcher
    const fetchProfile = async () => {
        if (!session?.user || !deviceId) return;
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
                // MULTIPLE DEVICE CHECK (Limit 2)
                const activeSessions: string[] = Array.isArray(profile.active_sessions) ? profile.active_sessions : [];
                
                // CRITICAL: Only enforce the logout loop if we are reasonably sure the storage is persistent.
                // If storage is disabled (e.g. Private Mode), every reload generates a new UUID. 
                // We shouldn't lock users out just because their browser blocks storage.
                const isPersistent = safeStorage.isPersistent();
                const isWithinGracePeriod = lastLoginTime && (Date.now() - lastLoginTime < 3000); // 3-second grace period for mobile handshakes

                if (isPersistent && !activeSessions.includes(deviceId) && !isWithinGracePeriod) {
                    console.warn("[AUTH] Device not in active sessions list. Signing out...", {
                        deviceId,
                        activeSessions,
                        isWithinGracePeriod
                    });
                    document.cookie = `gv-auth-v1=; path=/; max-age=0;`;
                    await supabase.auth.signOut();
                    window.location.href = "/login?error=multiple_devices";
                    return;
                }

                setRole(profile.role || "User");
                setIsVerified(profile.is_verified === true || profile.is_verified === "Approved");
                setKycStep(profile.kyc_step || 0);
                setBalance(profile.balance || 0);
                
                // Fetch forex rate for conversion
                const { data: settings } = await supabase.from('platform_settings').select('value').eq('key', 'usd_to_myr_rate').single();
                const rawRate = Number(settings?.value || 4.4);
                const rate = rawRate > 0 ? rawRate : 4.4;
                
                // Fetch transactions for stable USD profit calculation
                const { data: txs } = await supabase
                    .from('transactions')
                    .select('type, amount, status, metadata, original_currency_amount')
                    .eq('user_id', uid)
                    .in('status', ['Approved', 'Completed', 'Pending Release']);

                const totalProfitUSD = (txs || []).filter((t: any) => {
                    const type = (t.type || "").toLowerCase();
                    const category = (t.metadata?.adjustment_category || "").toLowerCase();
                    const isDividendOrBonus = 
                        type === 'dividend' || 
                        type === 'bonus' ||
                        category === 'dividend' || 
                        category === 'bonus';
                    return isDividendOrBonus && t.status !== 'Pending Release';
                }).reduce((acc: number, t: any) => acc + Number(t.original_currency_amount ?? (Number(t.amount || 0) / rate)), 0);

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
                // Force a hard reload to the login page to fully clear all local states and break any redirect loops
                window.location.href = "/login?error=account_deleted";
            }
        } catch (err) {
            console.error("[AUTH] Fetch failed:", err);
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    };

    useEffect(() => {
        if (session?.user && deviceId) {
            fetchProfile();
        }
    }, [session, deviceId]);

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
            }, (payload) => {
                console.log("[AUTH] Profile update detected, refreshing...");
                
                // Optimized check: If the update was specifically for 'active_sessions' and it's not us, logout immediately
                const activeSessions = payload.new?.active_sessions;
                if (Array.isArray(activeSessions) && deviceId && !activeSessions.includes(deviceId)) {
                    console.warn("[AUTH] Session mismatch detected via REALTIME. Signing out...");
                    supabase.auth.signOut().then(() => {
                        window.location.href = "/login?error=multiple_devices";
                    });
                    return;
                }
                
                fetchProfile();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user?.id, deviceId]);

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
