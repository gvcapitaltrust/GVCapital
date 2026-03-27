"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { MASTER_ADMIN_EMAIL } from "@/lib/supabaseClient";

interface AuthGuardProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

export default function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
    const router = useRouter();
    const { user, role, loading } = useAuth();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    if (!isClient || loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="h-12 w-12 border-4 border-gv-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) return null;

    // Email bypass check for master admin
    const isMasterAdmin = user.email === MASTER_ADMIN_EMAIL;

    if (requireAdmin && !isMasterAdmin && role.toLowerCase() !== "admin") {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#0a0a0a_100%)]">
                <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in duration-500">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full"></div>
                        <h1 className="text-[120px] font-black text-gray-900/5 relative leading-none">403</h1>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="h-20 w-20 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Access Denied</h2>
                        <p className="text-gray-400 font-medium leading-relaxed">
                            403 Forbidden - Your account does not have the necessary permissions to access the Staff Portal.
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/")}
                        className="bg-gray-200 text-gray-900 font-bold px-10 py-4 rounded-2xl hover:bg-zinc-700 transition-all active:scale-95 border border-gray-200"
                    >
                        Return to Home
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
