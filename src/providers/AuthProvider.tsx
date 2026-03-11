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
    const router = useRouter();
    const pathname = usePathname();

    const fetchProfile = async (session: any) => {
        const activeUser = session?.user;
        
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
        const { data: { session } } = await supabase.auth.refreshSession();
        await fetchProfile(session);
    };

    useEffect(() => {
        const initAuth = async () => {
            setLoading(true);
            // Ensure session is fresh on every app load
            const { data: { session } } = await supabase.auth.refreshSession();
            await fetchProfile(session);
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Supabase Auth Event:", event);
            if (event === 'SIGNED_OUT') {
                setUser(null);
                setRole("User");
                setIsVerified(false);
                setKycStep(0);
                setLoading(false);
                if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
                    router.push("/login");
                }
            } else if (session) {
                // If we have a session, we stay in loading until profile is fetched
                await fetchProfile(session);
            } else if (event === 'INITIAL_SESSION' && !session) {
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [pathname, router]);

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
