"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function ApprovalsClient() {
    const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [distributing, setDistributing] = useState(false);
    const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

    useEffect(() => {
        fetchPending();
    }, []);

    const fetchPending = async () => {
        const { data, error } = await supabase
            .from('transactions')
            .select('*, profiles(full_name, email)')
            .eq('type', 'Deposit')
            .eq('status', 'Pending')
            .order('created_at', { ascending: false });

        if (error) console.error("Error fetching pending deposits", error);
        else setPendingDeposits(data || []);
        setIsLoading(false);
    };

    const handleApprove = async (tx: any) => {
        if (!confirm(`Approve deposit of RM ${tx.amount} for ${tx.profiles.full_name}?`)) return;

        try {
            // 1. Update Transaction
            const { error: txError } = await supabase
                .from('transactions')
                .update({ status: 'Approved' })
                .eq('id', tx.id);

            if (txError) throw txError;

            // 2. Add to User profile (balance and total_equity)
            const { data: profile } = await supabase
                .from('profiles')
                .select('balance, total_equity')
                .eq('id', tx.user_id)
                .single();

            const newBalance = (profile?.balance || 0) + Number(tx.amount);
            const newTotalEquity = (profile?.total_equity || 0) + Number(tx.amount);

            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    balance: newBalance,
                    total_equity: newTotalEquity
                })
                .eq('id', tx.user_id);

            if (profileError) throw profileError;

            alert("Deposit approved successfully!");
            fetchPending();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleDistributeDividends = async () => {
        if (!confirm("Distribute 1% monthly dividends to ALL users?")) return;

        setDistributing(true);
        try {
            const { data: users, error: fetchError } = await supabase
                .from('profiles')
                .select('id, balance, total_equity, profit');

            if (fetchError) throw fetchError;

            for (const user of users) {
                const dividend = (user.total_equity || 0) * 0.01;
                if (dividend <= 0) continue;

                // Update Profile
                await supabase
                    .from('profiles')
                    .update({
                        balance: (user.balance || 0) + dividend,
                        profit: (user.profit || 0) + dividend,
                        total_equity: (user.total_equity || 0) + dividend
                    })
                    .eq('id', user.id);

                // Add Transaction Record
                await supabase
                    .from('transactions')
                    .insert({
                        user_id: user.id,
                        type: 'Dividend',
                        amount: dividend,
                        status: 'Approved',
                        ref_id: `DIV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
                    });
            }

            alert("Monthly dividends distributed successfully!");
        } catch (error: any) {
            alert(error.message);
        } finally {
            setDistributing(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val || 0).replace("MYR", "RM");
    };

    const getReceiptUrl = (path: string) => {
        const { data } = supabase.storage.from('agreements').getPublicUrl(path);
        return data.publicUrl;
    };

    if (isLoading) {
        return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6"><div className="h-12 w-12 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans p-8">
            <header className="max-w-7xl mx-auto mb-12 flex justify-between items-end">
                <div>
                    <Link href="/admin" className="text-zinc-600 hover:text-white transition-colors text-xs font-black uppercase tracking-widest mb-4 inline-block">← Back to Master Control</Link>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Approval Center</h1>
                    <p className="text-gv-gold text-xs font-black tracking-widest uppercase mt-2">Manage pending deposits & dividend payouts</p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={handleDistributeDividends}
                        disabled={distributing}
                        className="bg-emerald-500 hover:bg-emerald-600 text-black font-black px-8 py-4 rounded-2xl flex items-center gap-3 uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95 disabled:opacity-50"
                    >
                        {distributing ? "Distributing..." : "Distribute 1% Monthly Dividends"}
                    </button>
                    <button onClick={fetchPending} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black px-6 py-4 rounded-2xl uppercase tracking-widest text-xs transition-all">Refresh</button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto">
                <div className="bg-[#121212] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/10 flex items-center justify-between">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Pending Deposit Review</h2>
                        <span className="bg-gv-gold/10 text-gv-gold px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-gv-gold/20">{pendingDeposits.length} Pending</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#1a1a1a] text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/5">
                                <tr>
                                    <th className="px-8 py-6">Client Details</th>
                                    <th className="px-8 py-6">Reference ID</th>
                                    <th className="px-8 py-6">Amount (RM)</th>
                                    <th className="px-8 py-6">Receipt</th>
                                    <th className="px-8 py-6 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {pendingDeposits.map((tx) => (
                                    <tr key={tx.id} className="text-sm font-bold hover:bg-white/[0.01] transition-colors border-b border-white/[0.02]">
                                        <td className="px-8 py-6">
                                            <div className="text-white mb-1 uppercase tracking-tight">{tx.profiles.full_name}</div>
                                            <div className="text-[10px] text-zinc-600 lowercase font-medium">{tx.profiles.email}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="font-mono text-xs text-zinc-500">{tx.ref_id}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-lg tracking-tighter text-emerald-400">{formatCurrency(tx.amount)}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <button
                                                onClick={() => setViewingReceipt(tx.receipt_url)}
                                                className="bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all flex items-center gap-2"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                View Slip
                                            </button>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button
                                                onClick={() => handleApprove(tx)}
                                                className="bg-gv-gold hover:bg-gv-gold/90 text-black px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gv-gold/10 active:scale-95 transition-all"
                                            >
                                                Approve
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {pendingDeposits.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-32 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="h-20 w-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                                    <svg className="h-10 w-10 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                                <p className="text-zinc-600 font-black uppercase tracking-[0.2em] text-sm">Clear Queue - No Pending Deposits</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Receipt Modal */}
            {viewingReceipt && (
                <div
                    className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-10 animate-in fade-in duration-300"
                    onClick={() => setViewingReceipt(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setViewingReceipt(null)}
                            className="absolute -top-16 right-0 text-white font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:text-gv-gold transition-colors"
                        >
                            Close Viewer <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <img
                            src={getReceiptUrl(viewingReceipt)}
                            alt="Bank Receipt"
                            className="w-full h-full object-contain rounded-2xl shadow-[0_0_80px_rgba(212,175,55,0.15)] bg-white/5"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
