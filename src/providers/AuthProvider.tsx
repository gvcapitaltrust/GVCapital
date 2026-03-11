"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
    user: any;
    role: string;
    isVerified: boolean;
    kycStep: number;
    balance: number;
    totalEquity: number;
    totalAssets: number;
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
    const [totalEquity, setTotalEquity] = useState(0);
    const [totalAssets, setTotalAssets] = useState(0);
    const [loading, setLoading] = useState(true);
    
    const [session, setSession] = useState<any>(null);
    const router = useRouter();
    
    // Singleton Guards
    const isFetching = useRef(false);
    const currentUserId = useRef<string | null>(null);

    // 1. Stable Identity Listener
    useEffect(() => {
        // Initial session grab
        const initSession = async () => {
            const { data: { session: s } } = await supabase.auth.getSession();
            if (s) {
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
                setUser(null);
                setRole("User");
                setIsVerified(false);
                setKycStep(0);
                setBalance(0);
                setTotalEquity(0);
                setTotalAssets(0);
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
                currentUserId.current = s.user.id;
                setSession(s);
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    // 2. Atomic Profile Fetcher
    useEffect(() => {
        const fetchProfile = async () => {
            if (!session?.user) return;
            if (isFetching.current) return; // Prevent concurrent loops
            
            isFetching.current = true;
            const email = session.user.email;
            const uid = session.user.id;

            console.log(`[AUTH] Singleton Fetching for ${email}...`);

            // Emergency Resolver for Master Admin
            let emergencyTimer: NodeJS.Timeout | null = null;
            if (email === "thenja96@gmail.com") {
                emergencyTimer = setTimeout(() => {
                    if (isFetching.current) {
                        console.warn("[AUTH] Emergency Bypass Triggered for Admin.");
                        setUser(session.user);
                        setRole("admin");
                        setIsVerified(true);
                        setKycStep(3);
                        setLoading(false);
                        isFetching.current = false;
                    }
                }, 3000); // 3-second strict resolution
            }

            try {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', uid)
                    .single();

                if (emergencyTimer) clearTimeout(emergencyTimer);

                if (profile) {
                    setRole(profile.role || "User");
                    setIsVerified(profile.is_verified === true || profile.is_verified === "Approved");
                    setKycStep(profile.kyc_step || 0);
                    setBalance(profile.balance || 0);
                    setTotalEquity(Number(profile.balance || 0) + Number(profile.profit || 0));
                    setTotalAssets(Number(profile.balance || 0) + Number(profile.profit || 0));
                    setUser({ ...session.user, ...profile });
                } else {
                    setUser(session.user);
                }
            } catch (err) {
                console.error("[AUTH] Fetch Stalled:", err);
            } finally {
                setLoading(false);
                isFetching.current = false;
            }
        };

        if (session?.user) {
            fetchProfile();
        }
    }, [session]); // Only fetch when session state is explicitly updated by stable listener

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
                console.log("[AUTH] Profile Update Received via Realtime:", payload.new);
                const updated = payload.new as any;
                if (updated) {
                    const totalAssetsCalc = Number(updated.balance || 0) + Number(updated.profit || 0);
                    setBalance(updated.balance || 0);
                    setTotalEquity(totalAssetsCalc);
                    setTotalAssets(totalAssetsCalc);
                    setIsVerified(updated.is_verified === true || updated.is_verified === "Approved");
                    setKycStep(updated.kyc_step || 0);
                    setRole(updated.role || "User");
                    setUser((prev: any) => prev ? ({ ...prev, ...updated }) : updated);
                }
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
        <AuthContext.Provider value={{ user, role, isVerified, kycStep, balance, totalEquity, totalAssets, loading, refresh: refreshProfile }}>
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
