"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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
    const [isLoopDetected, setIsLoopDetected] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    const lastFetchTimeRef = React.useRef(0);

    const fetchProfile = async (session: any) => {
        const activeUser = session?.user;
        
        // Debounce: Don't fetch the same profile more than once every 2 seconds
        const now = Date.now();
        if (now - lastFetchTimeRef.current < 2000 && user?.id === activeUser?.id) {
            console.log("[AUTH] Fetch skipped (de-bounced)");
            setLoading(false);
            return;
        }
        lastFetchTimeRef.current = now;
        
        // IMMEDIATE MASTER ADMIN BYPASS
        if (activeUser?.email === "thenja96@gmail.com") {
            setUser(activeUser);
            setRole("admin");
            setIsVerified(true);
            setKycStep(3);
            setBalance(0);
            setTotalEquity(0);
            setTotalAssets(0);
            setLoading(false);
            
            console.log("%c MASTER ADMIN BYPASS ACTIVATED ", "background: #d4af37; color: #000; font-weight: bold; padding: 4px;");
            console.table({
                email: activeUser.email,
                role: "admin",
                verified: true,
                kycStep: 3,
                status: "MASTER_OVERRIDE"
            });
            return;
        }

        if (!activeUser) {
            setUser(null);
            setRole("User");
            setIsVerified(false);
            setKycStep(0);
            setLoading(false);
            return;
        }

        setUser(activeUser);

        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('role, is_verified, kyc_step, balance, total_equity, total_assets')
                .eq('id', activeUser.id)
                .single();

            if (error) {
                console.error("Profile Fetch Error:", error);
            }

            if (!profile && !error) {
                console.warn("No profile found for user:", activeUser.id);
            }

            const resolvedRole = profile?.role || "User";
            const resolvedVerified = profile?.is_verified === true || profile?.is_verified === "Approved" || profile?.is_verified === "true";
            const resolvedStep = profile?.kyc_step || 0;
            const resolvedBalance = profile?.balance || 0;
            const resolvedEquity = profile?.total_equity || 0;
            const resolvedAssets = profile?.total_assets || 0;

            setRole(resolvedRole);
            setIsVerified(resolvedVerified);
            setKycStep(resolvedStep);
            setBalance(resolvedBalance);
            setTotalEquity(resolvedEquity);
            setTotalAssets(resolvedAssets);

            console.log("=== AUTH STATE AUDIT ===");
            console.table({
                email: activeUser.email,
                role: resolvedRole,
                verified: resolvedVerified,
                kycStep: resolvedStep
            });
        } catch (err) {
            console.error("Auth fetch crash:", err);
        } finally {
            setLoading(false);
        }
    };

    const refresh = async () => {
        setLoading(true);
        // We only call refreshSession. The onAuthStateChange listener 
        // will catch 'TOKEN_REFRESHED' and call fetchProfile(session) for us.
        await supabase.auth.refreshSession();
        // Fail-safe if no event fires
        setTimeout(() => setLoading(false), 3000);
    };

    const eventCountRef = React.useRef(0);
    const lastTimeRef = React.useRef(Date.now());
    const isFetchingRef = React.useRef(false);

    useEffect(() => {
        const handleAuthEvent = async (event: string, session: any) => {
            console.log(`[AUTH] Event: ${event}`, session?.user?.email);
            
            // EMERGENCY LOOP DETECTION (10 events in 5 seconds)
            const now = Date.now();
            if (now - lastTimeRef.current < 5000) {
                eventCountRef.current++;
            } else {
                eventCountRef.current = 1;
                lastTimeRef.current = now;
            }

            if (eventCountRef.current > 12) {
                console.error("FATAL: Auth Loop Detected. Halting system.");
                setIsLoopDetected(true);
                window.stop();
                return;
            }

            if (event === 'SIGNED_OUT') {
                setUser(null);
                setRole("User");
                setIsVerified(false);
                setKycStep(0);
                setLoading(false);
                if (window.location.pathname.startsWith('/dashboard') || window.location.pathname.startsWith('/admin')) {
                    router.push("/login");
                }
            } else if (session) {
                // Critical events: SIGNED_IN, INITIAL_SESSION, TOKEN_REFRESHED
                // We use isFetchingRef to prevent parallel fetches if multiple events fire at once
                if (['SIGNED_IN', 'INITIAL_SESSION', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
                    if (!isFetchingRef.current) {
                        isFetchingRef.current = true;
                        await fetchProfile(session);
                        isFetchingRef.current = false;
                    }
                }
            } else if (event === 'INITIAL_SESSION' && !session) {
                setLoading(false);
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            handleAuthEvent(event, session);
        });

        // Fail-safe: If no auth event fires within 4 seconds, force loading to stop
        const timer = setTimeout(() => {
            setLoading(prev => {
                if (prev) console.warn("Auth initialization timed out. Forcing UI...");
                return false;
            });
        }, 4000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, []); // Empty dependencies are CRITICAL to stop the re-subscription loop

    if (isLoopDetected) {
        return (
            <div className="min-h-screen bg-red-950 flex items-center justify-center p-6 text-center">
                <div className="max-w-md space-y-4">
                    <h1 className="text-3xl font-black text-white uppercase">System Loop Detected</h1>
                    <p className="text-red-200">The application encountered an infinite authentication loop and has been halted to prevent account lockout (429 Error).</p>
                    <button onClick={() => window.location.reload()} className="bg-white text-red-900 px-8 py-3 rounded-xl font-bold uppercase tracking-widest">
                        Hard Refresh
                    </button>
                </div>
            </div>
        );
    }

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
