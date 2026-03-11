"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface AuthGuardProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

export default function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    const [forbidden, setForbidden] = useState(false);

    useEffect(() => {
        const checkAuth = async (session: any) => {
            if (!session) {
                router.push("/login");
                return;
            }

            // Force refresh session to get latest JWT claims and role
            const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
            const activeUser = refreshedSession?.user || session.user;

            // Hardcode bypass for specific admin email:
            if (activeUser.email === "thenja96@gmail.com") {
                console.log("Admin Bypass Activated for thenja96@gmail.com");
                setAuthorized(true);
                return;
            }

            // Fetch latest profile from DB
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, is_verified')
                .eq('id', activeUser.id)
                .single();

            const role = profile?.role || activeUser.user_metadata?.role || "User";
            
            console.log("=== AUTH GUARD DEBUG ===");
            console.log("Email:", activeUser.email);
            console.log("Resolved Role:", role);

            if (requireAdmin && role.toLowerCase() !== "admin") {
                setForbidden(true);
                return;
            }

            setAuthorized(true);
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                router.push("/login");
            } else if (session) {
                checkAuth(session);
            } else {
                // Double check session to avoid transient nulls
                const { data: { session: checkSession } } = await supabase.auth.getSession();
                if (!checkSession) {
                    router.push("/login");
                } else {
                    checkAuth(checkSession);
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [router, requireAdmin]);

    if (forbidden) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#0a0a0a_100%)]">
                <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in duration-500">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full"></div>
                        <h1 className="text-[120px] font-black text-white/5 relative leading-none">403</h1>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="h-20 w-20 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-3xl font-black text-white tracking-tight uppercase">Access Denied</h2>
                        <p className="text-zinc-500 font-medium leading-relaxed">
                            403 Forbidden - Your account does not have the necessary permissions to access the Staff Portal.
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/")}
                        className="bg-zinc-800 text-white font-bold px-10 py-4 rounded-2xl hover:bg-zinc-700 transition-all active:scale-95 border border-white/5"
                    >
                        Return to Home
                    </button>
                </div>
            </div>
        );
    }

    if (!authorized) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="h-12 w-12 border-4 border-gv-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return <>{children}</>;
}
