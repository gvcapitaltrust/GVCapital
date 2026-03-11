"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
    user: any;
    role: string;
    isVerified: boolean;
    kycStep: number;
    loading: boolean;
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState("User");
    const [isVerified, setIsVerified] = useState(false);
    const [kycStep, setKycStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const fetchProfile = async (session: any) => {
        if (!session?.user) {
            setUser(null);
            setRole("User");
            setIsVerified(false);
            setKycStep(0);
            setLoading(false);
            return;
        }

        const activeUser = session.user;
        setUser(activeUser);

        // MASTER ADMIN BYPASS - FORCE FLAGS IMMEDIATELY
        if (activeUser.email === "thenja96@gmail.com") {
            const masterState = {
                email: activeUser.email,
                role: "admin",
                verified: true,
                kycStep: 3,
                source: "Master Override"
            };
            
            setRole("admin");
            setIsVerified(true);
            setKycStep(3);
            setLoading(false);
            
            console.log("=== AUTH PROVIDER MASTER BYPASS ===");
            console.table(masterState);
            return;
        }

        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('role, is_verified, kyc_step')
                .eq('id', activeUser.id)
                .single();

            if (error) {
                console.warn("Profile fetch error, using defaults:", error.message);
            }

            const resolvedRole = profile?.role || "User";
            const resolvedVerified = profile?.is_verified === true || profile?.is_verified === "Approved" || profile?.is_verified === "true";
            const resolvedStep = profile?.kyc_step || 0;

            const currentState = {
                email: activeUser.email,
                role: resolvedRole,
                verified: resolvedVerified,
                kycStep: resolvedStep
            };

            setRole(resolvedRole);
            setIsVerified(resolvedVerified);
            setKycStep(resolvedStep);

            console.log("=== AUTH PROVIDER STATE ===");
            console.table(currentState);
        } catch (err) {
            console.error("Auth fetch crash:", err);
        } finally {
            setLoading(false);
        }
    };

    const refresh = async () => {
        const { data: { session } } = await supabase.auth.refreshSession();
        await fetchProfile(session);
    };

    useEffect(() => {
        const initAuth = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.refreshSession();
            await fetchProfile(session);
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth Event:", event);
            if (event === 'SIGNED_OUT') {
                setUser(null);
                setRole("User");
                setIsVerified(false);
                setKycStep(0);
                if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
                    router.push("/login");
                }
            } else if (session) {
                await fetchProfile(session);
            }
        });

        return () => subscription.unsubscribe();
    }, [pathname, router]);

    return (
        <AuthContext.Provider value={{ user, role, isVerified, kycStep, loading, refresh }}>
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
