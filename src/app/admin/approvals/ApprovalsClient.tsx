"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSettings } from "@/providers/SettingsProvider";
import { ArrowLeft } from "lucide-react";

export default function ApprovalsClient() {
    const router = useRouter();
    const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [distributing, setDistributing] = useState(false);
    const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const { forexRate } = useSettings();

    useEffect(() => {
        fetchPending();

        const channel = supabase
            .channel('approvals-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
                console.log("[REALTIME] Change in approvals detected...");
                fetchPending();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchPending = async () => {
        console.log('Admin Fetching Transactions from: transactions...');
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*, profiles(email, full_name, role)')
                .order('created_at', { ascending: false });

            console.log('Raw Data from Supabase (Approvals):', data);
            if (error) {
                console.error("Error fetching deposits", error);
            } else {
                setPendingDeposits(data || []);
            }
        } catch (err) {
            console.error("Fatal fetch error", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (tx: any) => {
        const displayRm = Number(tx.amount || 0).toFixed(2);
        if (!confirm(`Confirming deposit of RM ${displayRm} for ${tx.profiles.full_name}?`)) return;

        try {
            // Use RPC for atomic update of transaction and profile balance
            // Standardized to RM storage, so we pass tx.amount directly
            const { error: rpcError } = await supabase.rpc('approve_deposit', {
                p_tx_id: tx.id,
                p_user_id: tx.user_id,
                p_amount: Number(tx.amount || 0)
            });

            if (rpcError) throw rpcError;

            alert("Deposit approved successfully!");
            fetchPending();
            router.refresh();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleReject = async (tx: any) => {
        const displayRm = Number(tx.amount || 0).toFixed(2);
        if (!confirm(`Reject deposit of RM ${displayRm} for ${tx.profiles?.full_name || 'Client'}?`)) return;

        try {
            const { error } = await supabase
                .from('transactions')
                .update({ status: 'Rejected' })
                .eq('id', tx.id);

            if (error) throw error;

            alert("Deposit rejected.");
            fetchPending();
            router.refresh();
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
                .select('id, balance_usd, profit'); // balance_usd is the new truth

            if (fetchError) throw fetchError;

            for (const user of users) {
                // Basis for dividend is now the USD balance (Investment)
                const dividendUSD = (user.balance_usd || 0) * 0.01;
                if (dividendUSD <= 0) continue;

                // Update Profile: Credits go to withdrawable profit (which is now USD-primary)
                await supabase
                    .from('profiles')
                    .update({
                        profit: (user.profit || 0) + dividendUSD
                    })
                    .eq('id', user.id);

                    await supabase
                        .from('transactions')
                        .insert({
                            user_id: user.id,
                            type: 'Dividend', // Changed from Deposit to Dividend for clarity
                            amount: dividendUSD, // Record USD value
                            status: 'Approved',
                            original_currency: 'USD',
                            original_currency_amount: dividendUSD,
                            ref_id: `DIV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
                            metadata: {
                                is_adjustment: true,
                                adjustment_category: 'Dividend',
                                adjustment_type: 'Increase',
                                reason: 'Monthly Dividend Distribution (1%)',
                                forex_rate: forexRate
                            }
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
        return `RM ${Number(val || 0).toFixed(2)}`;
    };

    const getReceiptUrl = (path: string) => {
        const { data } = supabase.storage.from('agreements').getPublicUrl(path);
        return data.publicUrl;
    };

    if (isLoading) {
        return <div className="min-h-screen bg-white flex items-center justify-center p-6"><div className="h-12 w-12 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;
    }

    return (
        <div className="min-h-screen bg-slate-50/30 text-slate-700 font-sans p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Standard Header */}
            <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => router.push(`/admin?lang=en`)} // lang is not passed but router is available
                        className="h-12 w-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gv-gold transition-all shadow-sm hover:shadow-md"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Approval Center</h1>
                        <p className="text-slate-400 text-sm font-medium">Manage pending deposits & dividend payouts</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDistributeDividends}
                        disabled={distributing}
                        className="bg-emerald-500 hover:bg-emerald-600 text-black font-black px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] transition-all shadow-xl active:scale-95 disabled:opacity-50"
                    >
                        {distributing ? "Distributing..." : "Distribute 1% Monthly Dividends"}
                    </button>
                    <button 
                        onClick={fetchPending} 
                        className="bg-white border border-gray-200 hover:bg-gray-100 text-gray-900 font-black px-6 py-3.5 rounded-xl uppercase tracking-widest text-[10px] transition-all shadow-sm"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            <main className="max-w-7xl mx-auto">
                <div className="bg-white border border-gray-200 rounded-[30px] md:rounded-[40px] overflow-hidden shadow-2xl">
                    <div className="p-6 md:p-8 border-b border-gray-200 flex items-center justify-between">
                        <h2 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-tight">Pending Deposit Review</h2>
                        <span className="bg-gv-gold/10 text-gv-gold px-3 md:px-4 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-gv-gold/20">{pendingDeposits.length} Pending</span>
                    </div>

                    <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gray-300">
                        {/* Desktop View (Table) */}
                        <table className="w-full text-left border-collapse hidden md:table">
                            <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 sticky top-0 z-10">
                                <tr>
                                     <th className="px-6 py-4">Client Details</th>
                                     <th className="px-6 py-4">Reference ID</th>
                                     <th className="px-6 py-4">Amount (USD)</th>
                                     <th className="px-6 py-4">Status</th>
                                     <th className="px-6 py-4">Date</th>
                                     <th className="px-6 py-4">Receipt</th>
                                     <th className="px-6 py-4 text-right">Action</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-100">
                                 {pendingDeposits.map((tx) => (
                                     <tr key={tx.id} className="text-sm font-bold hover:bg-gray-50 transition-colors">
                                         <td className="px-6 py-4">
                                             <div className="text-gray-900 mb-0.5 uppercase tracking-tight">{tx.profiles?.full_name || tx.profiles?.email || "Unknown"}</div>
                                             <div className="text-[10px] text-gray-500 lowercase font-medium">{tx.profiles?.email}</div>
                                         </td>
                                         <td className="px-6 py-4">
                                             <span className="font-mono text-[10px] text-gray-400">{tx.ref_id}</span>
                                         </td>
                                          <td className="px-6 py-4 font-black text-emerald-500">
                                               ${(Number(tx.original_currency_amount || (Number(tx.amount || 0) / forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </td>
                                         <td className="px-6 py-4">
                                             <span className={`px-2.5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest ${
                                                 tx.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                                 tx.status === 'Rejected' ? 'bg-red-500/10 text-red-500' :
                                                 'bg-amber-500/10 text-amber-500'
                                             }`}>
                                                 { (tx.status === 'Approved' || tx.status === 'Rejected') ? tx.status : 'Pending' }
                                             </span>
                                         </td>
                                         <td className="px-6 py-4 text-gray-500 font-mono text-[10px] whitespace-nowrap">
                                             {tx.created_at ? new Date(tx.created_at).toLocaleString() : "N/A"}
                                         </td>
                                         <td className="px-6 py-4">
                                             <button
                                                 onClick={() => setViewingReceipt(tx.receipt_url)}
                                                 className="bg-white hover:bg-gray-100 border border-gray-200 text-[9px] font-black uppercase px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
                                             >
                                                 <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                 View Slip
                                             </button>
                                         </td>
                                         <td className="px-6 py-4 text-right">
                                            {tx.status === 'Pending' && (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleReject(tx)}
                                                        className="bg-white hover:bg-red-500/10 text-red-500 border border-gray-200 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        onClick={() => handleApprove(tx)}
                                                        className="bg-gv-gold hover:bg-gv-gold/90 text-black px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-gv-gold/10 active:scale-95 transition-all"
                                                    >
                                                        Approve
                                                    </button>
                                                </div>
                                            )}
                                         </td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>

                         {/* Mobile View (Grid Cards) */}
                         <div className="md:hidden divide-y divide-gray-100">
                             {pendingDeposits.map((tx) => {
                                 const isExpanded = expandedId === tx.id;
                                 const amountUSD = Number(tx.original_currency_amount || (Number(tx.amount || 0) / forexRate));

                                 return (
                                     <div key={tx.id} className="flex flex-col animate-in slide-in-from-right-4 duration-300">
                                         <div 
                                             onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                                             className="px-6 py-5 space-y-4 hover:bg-gray-50 transition-colors"
                                         >
                                             <div className="flex justify-between items-center">
                                                 <span className="text-gray-500 font-mono text-[9px] uppercase">{tx.created_at ? new Date(tx.created_at).toLocaleDateString() : "N/A"}</span>
                                                 <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                                     tx.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                                     tx.status === 'Rejected' ? 'bg-red-500/10 text-red-500' :
                                                     'bg-amber-500/10 text-amber-500'
                                                 }`}>
                                                     { (tx.status === 'Approved' || tx.status === 'Rejected') ? tx.status : 'Pending' }
                                                 </span>
                                             </div>
                                             <div className="flex justify-between items-end">
                                                 <div className="space-y-1">
                                                     <span className="text-[11px] font-black uppercase tracking-widest text-gray-900 leading-none block">{tx.profiles?.full_name || tx.profiles?.email || "Unknown"}</span>
                                                     <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none truncate w-40 block">{tx.profiles?.email}</span>
                                                 </div>
                                                 <div className="text-right">
                                                     <p className="text-sm font-black text-emerald-500 tabular-nums tracking-tighter">
                                                         $ {amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                     </p>
                                                 </div>
                                             </div>
                                         </div>

                                         {isExpanded && (
                                             <div className="bg-gray-50 px-6 py-6 space-y-6 border-t border-gray-100 animate-in fade-in duration-300">
                                                 <div className="flex flex-col gap-1">
                                                     <span className="text-[8px] font-black uppercase text-gray-400 tracking-[0.1em]">Reference ID</span>
                                                     <span className="text-[10px] font-mono font-bold text-gray-600 tracking-tight">{tx.ref_id || "-"}</span>
                                                 </div>
                                                 
                                                 <div className="flex flex-col gap-3">
                                                     <button
                                                         onClick={() => setViewingReceipt(tx.receipt_url)}
                                                         className="w-full bg-white border border-gray-200 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2"
                                                     >
                                                         <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                         View Bank Receipt
                                                     </button>
                                                     
                                                     {tx.status === 'Pending' && (
                                                         <div className="grid grid-cols-2 gap-3">
                                                             <button onClick={() => handleReject(tx)} className="bg-white border border-red-500/20 text-red-500 text-[10px] font-black uppercase py-3 rounded-xl">Reject</button>
                                                             <button onClick={() => handleApprove(tx)} className="bg-gv-gold text-black text-[10px] font-black uppercase py-3 rounded-xl shadow-lg shadow-gv-gold/20">Approve</button>
                                                         </div>
                                                     )}
                                                 </div>
                                             </div>
                                         )}
                                     </div>
                                 );
                             })}
                         </div>

                         {pendingDeposits.length === 0 && (
                             <div className="p-20 text-center">
                                 <div className="flex flex-col items-center">
                                     <div className="h-16 md:h-20 w-16 md:w-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                         <svg className="h-8 md:h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M5 13l4 4L19 7" /></svg>
                                     </div>
                                     <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-xs">No pending deposits</p>
                                 </div>
                             </div>
                         )}
                    </div>
                </div>
            </main>

            {/* Receipt Modal */}
            {viewingReceipt && (
                <div
                    className="fixed inset-0 z-[500] bg-gray-900/60 backdrop-blur-xl flex flex-col items-center justify-center p-10 animate-in fade-in duration-300"
                    onClick={() => setViewingReceipt(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setViewingReceipt(null)}
                            className="absolute -top-16 right-0 text-gray-900 font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:text-gv-gold transition-colors"
                        >
                            Close Viewer <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <img
                            src={getReceiptUrl(viewingReceipt)}
                            alt="Bank Receipt"
                            className="w-full h-full object-contain rounded-2xl shadow-[0_0_80px_rgba(212,175,55,0.15)] bg-white"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
