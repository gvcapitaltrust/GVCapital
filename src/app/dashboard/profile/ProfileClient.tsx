"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";

export default function ProfileClient() {
    const { user: authUser, loading: authLoading, role, isVerified, totalEquity, totalAssets, refresh } = useAuth();
    const router = useRouter();

    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [forexRate, setForexRate] = useState(4.3); // Safe fallback (MYR to 1 USD)

    // Form states
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [country, setCountry] = useState("");

    // Identify account level
    const [accountLevel, setAccountLevel] = useState("Basic");

    const GOLD = "#c9a84c";

    useEffect(() => {
        if (!authLoading && !authUser) {
            router.push(`/login?lang=en&redirect=${encodeURIComponent('/dashboard/profile')}`);
        }
    }, [authUser, authLoading, router]);

    useEffect(() => {
        const fetchData = async () => {
            if (!authUser) return;

            try {
                // 1. Fetch Forex Rate for level calculation
                const { data: psRate } = await supabase.from('platform_settings').select('value').eq('key', 'usd_to_myr_rate').single();
                const rate = psRate ? parseFloat(psRate.value) : 4.3;
                setForexRate(rate);

                // 2. Fetch Profile
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', authUser.id)
                    .single();

                if (profileData) {
                    setProfile(profileData);
                    setFullName(profileData.full_name || "");
                    setEmail(authUser.email || "");
                    setPhoneNumber(profileData.phone_number || profileData.phone || "");
                    setCountry(profileData.country || "");

                    // 3. Level Calculation (based on total assets converted to USD)
                    const assetsRM = Number(profileData.balance || 0) + Number(profileData.profit || 0);
                    const assetsUSD = assetsRM / rate;

                    let level = "Basic";
                    if (assetsUSD >= 5000) level = "Platinum";
                    else if (assetsUSD >= 3000) level = "Gold";
                    else if (assetsUSD >= 1000) level = "Silver";
                    setAccountLevel(level);
                }
            } catch (err) {
                console.error("Error fetching profile data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [authUser]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!authUser) return;

        setIsUpdating(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    full_name: fullName,
                    phone_number: phoneNumber,
                    country: country
                })
                .eq('id', authUser.id);

            if (error) throw error;

            setMessage({ type: 'success', text: 'Profile updated successfully.' });
            await refresh(); // Refresh global auth state
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
        } finally {
            setIsUpdating(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 text-white">
                <div className="h-12 w-12 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-gv-gold selection:text-black font-body">
            <title>Account Profile | GV Capital Trust</title>

            {/* Background elements */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-0 right-0 h-[600px] w-[600px] bg-gv-gold/5 blur-[150px] -translate-y-1/2 translate-x-1/4"></div>
                <div className="absolute bottom-0 left-0 h-[600px] w-[600px] bg-gv-gold/5 blur-[150px] translate-y-1/2 -translate-x-1/4"></div>
            </div>

            <main className="container max-w-[1200px] mx-auto px-6 py-12 md:py-24">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="space-y-4">
                        <Link href="/dashboard" className="inline-flex items-center gap-2 text-zinc-500 hover:text-gv-gold transition-colors text-sm font-black uppercase tracking-widest mb-4">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M15 19l-7-7 7-7"/></svg>
                            Back to Dashboard
                        </Link>
                        <h2 className="text-gv-gold text-xs font-black uppercase tracking-[0.4em]">Account Overview</h2>
                        <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tight">Profile Management</h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-150">
                    
                    {/* Level Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-[#111] border border-white/5 p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all">
                                <svg className="h-24 w-24 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            
                            <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-12">Account Verification</h3>
                            
                            <div className="flex items-center gap-6 mb-8">
                                <div className="h-20 w-20 rounded-3xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center text-[#c9a84c] shadow-[0_0_40px_rgba(201,168,76,0.1)]">
                                    {accountLevel === "Platinum" ? (
                                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                        </svg>
                                    ) : accountLevel === "Gold" ? (
                                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                        </svg>
                                    ) : accountLevel === "Silver" ? (
                                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                                        </svg>
                                    ) : (
                                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-3xl font-black font-heading tracking-tight text-white">{accountLevel} Member</h4>
                                    <p className="text-xs text-zinc-500 font-black uppercase tracking-widest">Growth Path</p>
                                </div>
                            </div>

                            <p className="text-zinc-500 text-sm leading-relaxed mb-6 font-medium">
                                Level is determined by your total assets. Invest more to unlock higher dividend tiers.
                            </p>

                            <div className="space-y-3">
                                {['Basic', 'Silver', 'Gold', 'Platinum'].map((lvl) => (
                                    <div key={lvl} className={`flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-2xl border transition-all ${accountLevel === lvl ? 'bg-[#c9a84c] text-black border-[#c9a84c] shadow-lg shadow-[#c9a84c]/20' : 'border-white/5 text-zinc-600 bg-white/[0.02]'}`}>
                                        <span>{lvl} TIERS</span>
                                        <svg className={`h-4 w-4 ${accountLevel === lvl ? 'opacity-100' : 'opacity-20'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="lg:col-span-2">
                        <div className="bg-[#1a1a1a] border border-white/5 p-8 md:p-12 rounded-[50px] shadow-2xl">
                            <form onSubmit={handleUpdateProfile} className="space-y-10">
                                
                                {message && (
                                    <div className={`p-4 rounded-2xl text-sm font-black uppercase tracking-widest animate-in fade-in zoom-in-95 duration-300 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10' : 'bg-red-500/10 text-red-500 border border-red-500/10'}`}>
                                        {message.text}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-4">Full Legal Name</label>
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Enter your full name"
                                            className="w-full bg-[#0a0a0a] border border-[#c9a84c]/30 rounded-[28px] px-8 py-5 text-lg font-black focus:outline-none focus:border-[#c9a84c] focus:shadow-[0_0_30px_rgba(201,168,76,0.1)] transition-all placeholder:text-zinc-800"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-4">Email Address</label>
                                        <input
                                            type="email"
                                            value={email}
                                            disabled
                                            className="w-full bg-[#0a0a0a] border border-white/5 rounded-[28px] px-8 py-5 text-lg font-black text-zinc-500 cursor-not-allowed opacity-50 font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-4">Phone Number</label>
                                        <input
                                            type="text"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            placeholder="e.g. +60 123 4567"
                                            className="w-full bg-[#0a0a0a] border border-[#c9a84c]/30 rounded-[28px] px-8 py-5 text-lg font-black focus:outline-none focus:border-[#c9a84c] focus:shadow-[0_0_30px_rgba(201,168,76,0.1)] transition-all placeholder:text-zinc-800"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-4">Country</label>
                                        <input
                                            type="text"
                                            value={country}
                                            onChange={(e) => setCountry(e.target.value)}
                                            placeholder="Enter your country"
                                            className="w-full bg-[#0a0a0a] border border-[#c9a84c]/30 rounded-[28px] px-8 py-5 text-lg font-black focus:outline-none focus:border-[#c9a84c] focus:shadow-[0_0_30px_rgba(201,168,76,0.1)] transition-all placeholder:text-zinc-800"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-4">Account Level</label>
                                        <div className="w-full bg-white/[0.03] border border-white/5 rounded-[28px] px-8 py-5 text-lg font-black text-[#c9a84c]/80 flex items-center justify-between opacity-80 cursor-default">
                                            <span>{accountLevel} Package</span>
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-4">Verification Status</label>
                                        <div className={`w-full border rounded-[28px] px-8 py-5 text-lg font-black flex items-center justify-between ${isVerified ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500' : 'bg-amber-500/5 border-amber-500/10 text-amber-500'}`}>
                                            <span>{isVerified ? 'Verified Account' : 'Action Required'}</span>
                                            {isVerified ? (
                                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                                            ) : (
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
                                    <p className="text-zinc-600 text-xs font-medium max-w-sm">
                                        Keep your details up to date to ensure accurate reporting and verification for withdrawals.
                                    </p>
                                    <button
                                        type="submit"
                                        disabled={isUpdating}
                                        className="btn-primary w-full md:w-auto bg-[#c9a84c] text-black font-black text-xs uppercase tracking-[0.3em] px-12 py-6 rounded-2xl shadow-xl shadow-[#c9a84c]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 border border-[#c9a84c]/50"
                                    >
                                        {isUpdating ? 'Saving...' : 'Update Profile'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}
