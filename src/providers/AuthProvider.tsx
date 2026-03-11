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
    
    // Drive profile fetching with a dedicated session state
    const [session, setSession] = useState<any>(null);
    
    const router = useRouter();
    const pathname = usePathname();
    
    // Gate to prevent multiple parallel or redundant fetches for the same user
    const hasFetchedForId = useRef<string | null>(null);

    // 1. Session Management (Minimal Listener)
    useEffect(() => {
        console.log("[AUTH] Initializing Session Listener...");
        
        // Initial check without triggering a 'TOKEN_REFRESHED' event
        supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
            setSession(initialSession);
            if (!initialSession) setLoading(false);
        });

        // Listen for Auth events. This only updates the 'session' state.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
            console.log(`[AUTH] Supabase Event: ${event}`);
            
            if (event === 'SIGNED_OUT') {
                setUser(null);
                setRole("User");
                setIsVerified(false);
                setKycStep(0);
                setBalance(0);
                setTotalEquity(0);
                setTotalAssets(0);
                hasFetchedForId.current = null;
                setSession(null);
                setLoading(false);
                
                if (window.location.pathname.startsWith('/dashboard') || window.location.pathname.startsWith('/admin')) {
                    router.push("/login");
                }
            } else if (newSession) {
                // If it's a critical change, update session state to trigger profile useEffect
                if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED', 'INITIAL_SESSION'].includes(event)) {
                    setSession(newSession);
                }
            }
        });

        return () => {
            console.log("[AUTH] Cleaning up listener...");
            subscription.unsubscribe();
        };
    }, [router]);

    // 2. Profile Fetching (Strict Gate + Master Bypass)
    useEffect(() => {
        const userId = session?.user?.id;
        const email = session?.user?.email;

        if (!userId) {
            if (!loading) return; // Already handled by initial session check
            setLoading(false);
            return;
        }

        // PREVENT REDUNDANT FETCHES
        if (hasFetchedForId.current === userId && user) {
            setLoading(false);
            return;
        }

        const fetchProfileData = async () => {
            console.log(`[AUTH] Fetching Profile for ${email}...`);
            setLoading(true);

            // MASTER ADMIN BYPASS (Immediate UI Restore)
            if (email === "thenja96@gmail.com") {
                setUser(session.user);
                setRole("admin");
                setIsVerified(true);
                setKycStep(3);
                hasFetchedForId.current = userId;
                setLoading(false);
                console.log("[AUTH] Master Admin Bypass Applied Successfully.");
                return;
            }

            try {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role, is_verified, kyc_step, balance, total_equity, total_assets')
                    .eq('id', userId)
                    .single();

                if (error) {
                    console.error("[AUTH] Profile Sync Error:", error.message);
                }

                if (profile) {
                    const resolvedRole = profile.role || "User";
                    const resolvedVerified = profile.is_verified === true || profile.is_verified === "Approved" || profile.is_verified === "true";
                    
                    setRole(resolvedRole);
                    setIsVerified(resolvedVerified);
                    setKycStep(profile.kyc_step || 0);
                    setBalance(profile.balance || 0);
                    setTotalEquity(profile.total_equity || 0);
                    setTotalAssets(profile.total_assets || 0);
                    setUser({ ...session.user, ...profile });
                } else {
                    setUser(session.user);
                }
                
                hasFetchedForId.current = userId;
            } catch (err) {
                console.error("[AUTH] Fatal Fetch Exception:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();

        // Fail-safe to ensure loading ends
        const timer = setTimeout(() => setLoading(false), 5000);
        return () => clearTimeout(timer);

    }, [session?.user?.id]); // ONLY restart when the user ID changes

    const refresh = async () => {
        hasFetchedForId.current = null; // Un-gate the fetcher
        setLoading(true);
        const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
        setSession(refreshedSession);
    };

    return (
        <AuthContext.Provider value={{ user, role, isVerified, kycStep, balance, totalEquity, totalAssets, loading, refresh }}>
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
