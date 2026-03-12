"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import GlobalFooter from "@/components/GlobalFooter";
import { supabase } from "@/lib/supabaseClient";
import { updateGlobalForexRate } from "@/app/actions/forex";
import Link from "next/link";

export default function ForexControlPanel() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [currentRate, setCurrentRate] = useState<string>("4.0");
    const [newRate, setNewRate] = useState<string>("");
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    useEffect(() => {
        setMounted(true);
        fetchData();
        // Setup realtime subscription for data updates
        const channel = supabase
            .channel('forex_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings' }, () => fetchData())
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forex_history' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchData = async () => {
        // Fetch Current Rate
        const { data: currentData } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'usd_to_myr_rate')
            .single();

        if (currentData) {
            setCurrentRate(currentData.value);
            if (!newRate) setNewRate(currentData.value);
        }

        // Fetch Audit History
        const { data: historyData } = await supabase
            .from('forex_history')
            .select('*')
            .order('created_at', { ascending: false });

        if (historyData) setHistory(historyData);
    };

    const handleUpdate = async () => {
        const rateValue = parseFloat(newRate);
        if (isNaN(rateValue) || rateValue <= 0) {
            setMessage({ text: "Please enter a valid numeric exchange rate.", type: "error" });
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            const result = await updateGlobalForexRate(rateValue);

            if (result.success) {
                setMessage({ text: result.message || "Global forex rate updated successfully.", type: "success" });
                fetchData();
            } else {
                setMessage({ text: result.error || "Failed to update rate. Please try again.", type: "error" });
            }
        } catch (err) {
            setMessage({ text: "An unexpected error occurred during the update.", type: "error" });
        } finally {
            setIsLoading(false);
        }
    };

    if (!mounted) return null;

    return (
        <AuthGuard requireAdmin={true}>
            <div className="min-h-screen bg-[#0F0F0F] text-zinc-300 font-sans flex flex-col selection:bg-gv-gold selection:text-black">
                <title>{`Forex Control | Admin Portal`}</title>

                {/* Header */}
                <header className="border-b border-white/10 bg-[#0F0F0F] px-8 py-4 flex items-center justify-between sticky top-0 z-50">
                    <div className="flex items-center gap-4">
                        <Link href="/admin">
                            <img src="/logo.png" className="h-[40px] w-auto mix-blend-screen cursor-pointer hover:opacity-80 transition-opacity" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-white uppercase tracking-tighter">Forex Controller</h1>
                            <p className="text-[10px] text-gv-gold font-black tracking-widest uppercase">Global Pricing Matrix</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="bg-white/5 border border-white/10 px-6 py-2 rounded-lg text-xs font-black uppercase hover:text-gv-gold transition-all duration-300 flex items-center gap-2">
                            <span>鈫?Back to Dashboard</span>
                        </Link>
                    </div>
                </header>

                <main className="flex-1 p-8 overflow-y-auto">
                    <div className="max-w-4xl mx-auto space-y-8 pb-20">

                        {/* Status Message */}
                        {message && (
                            <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} animate-in fade-in slide-in-from-top-2 duration-300`}>
                                <div className="flex items-center gap-3">
                                    <div className={`h-2 w-2 rounded-full ${message.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                                    <p className="text-xs font-black uppercase tracking-widest">{message.text}</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Current Rate Card */}
                            <div className="bg-[#0F0F0F] border border-white/5 rounded-lg p-10 flex flex-col justify-center items-center text-center space-y-4 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                    <div className="text-9xl font-black text-gv-gold tracking-tighter">$</div>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Live Platform Benchmark</p>
                                <div className="space-y-1">
                                    <h2 className="text-5xl font-black text-white tracking-tighter">
                                        1 USD <span className="text-gv-gold">=</span>
                                    </h2>
                                    <h2 className="text-6xl font-black text-gv-gold tracking-tighter tabular-nums drop-shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                                        RM {parseFloat(currentRate).toFixed(3)}
                                    </h2>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Syncing with all terminal units...</p>
                            </div>

                            {/* Update Tool Card */}
                            <div className="bg-[#0F0F0F] border border-white/5 rounded-lg p-10 space-y-8 shadow-2xl border-t border-t-gv-gold/20">
                                <h3 className="text-xl font-black uppercase tracking-tighter text-white">Modify Global Rate</h3>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2">New Target Rate (MYR)</label>
                                        <div className="relative">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">RM</span>
                                            <input
                                                type="number"
                                                step="0.0001"
                                                value={newRate}
                                                onChange={(e) => setNewRate(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg py-5 pl-16 pr-6 text-2xl font-black focus:outline-none focus:border-gv-gold transition-all duration-300 text-white placeholder-zinc-700"
                                                placeholder="4.000"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleUpdate}
                                        disabled={isLoading}
                                        className="w-full bg-gv-gold text-black font-black py-6 rounded-lg uppercase tracking-[0.2em] shadow-xl hover:-translate-y-1 hover:shadow-gv-gold/20 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:translate-y-0 group overflow-hidden relative"
                                    >
                                        <span className="relative z-10">{isLoading ? "Propagating Global Updates..." : "Propagate New Rate"}</span>
                                        {isLoading && <div className="absolute inset-0 bg-white/10 animate-[shimmer_2s_infinite]" />}
                                    </button>
                                </div>
                                <p className="text-[9px] text-zinc-600 text-center uppercase font-black leading-relaxed">Warning: This action will instantly calculate all RM/USD ratios across the platform for new transactions.</p>
                            </div>
                        </div>

                        {/* Audit Table Section */}
                        <div className="bg-[#0F0F0F] border border-white/5 rounded-lg overflow-hidden shadow-2xl">
                            <div className="p-10 border-b border-white/5 flex items-center justify-between">
                                <h3 className="text-xl font-black uppercase tracking-tighter text-white">Rate Audit Matrix</h3>
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{history.length} Entries Recorded</span>
                            </div>
                            <div className="max-h-[500px] overflow-y-auto scrollbar-hide">
                                <table className="w-full text-left">
                                    <thead className="bg-[#1a1a1a] sticky top-0 z-10 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/5">
                                        <tr>
                                            <th className="px-10 py-6">Timestamp</th>
                                            <th className="px-10 py-6">Pre-State</th>
                                            <th className="px-10 py-6">Post-State</th>
                                            <th className="px-10 py-6">Delta %</th>
                                            <th className="px-10 py-6">Operator</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02]">
                                        {history.map((h, i) => {
                                            const oldR = parseFloat(h.old_rate);
                                            const newR = parseFloat(h.new_rate);
                                            const change = ((newR - oldR) / oldR) * 100;

                                            return (
                                                <tr key={i} className="text-xs font-bold hover:bg-white/[0.01] transition-colors group">
                                                    <td className="px-10 py-6 text-zinc-400 font-mono italic">
                                                        {new Date(h.created_at).toLocaleString('en-MY', {
                                                            day: '2-digit', month: 'short',
                                                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                                                        })}
                                                    </td>
                                                    <td className="px-10 py-6 text-zinc-500">RM {oldR.toFixed(4)}</td>
                                                    <td className="px-10 py-6 text-white text-lg font-black tracking-tight">RM {newR.toFixed(4)}</td>
                                                    <td className={`px-10 py-6 ${change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                                        <div className="flex items-center gap-1">
                                                            <span>{change >= 0 ? "鈻? : "鈻?}</span>
                                                            <span className="font-mono">{Math.abs(change).toFixed(2)}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-6">
                                                        <div className="flex flex-col">
                                                            <span className="text-zinc-400 text-[10px] uppercase font-black tracking-tighter">{h.changed_by?.split('@')[0]}</span>
                                                            <span className="text-[8px] text-zinc-600 truncate max-w-[120px]">{h.changed_by}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {history.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-10 py-24 text-center">
                                                    <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.5em]">No historical shifts recorded</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </main>
                <GlobalFooter />
            </div>

            <style jsx global>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </AuthGuard>
    );
}
