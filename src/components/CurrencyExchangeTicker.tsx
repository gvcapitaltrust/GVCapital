"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function CurrencyExchangeTicker() {
    const [rate, setRate] = useState<number | null>(null);

    useEffect(() => {
        const fetchRate = async () => {
            try {
                const { data, error } = await supabase
                    .from('platform_settings')
                    .select('value')
                    .eq('key', 'usd_to_myr_rate')
                    .single();

                if (!data || error) {
                    console.warn("Using fallback rate 1.0 due to fetch failure.");
                    setRate(1.0);
                    return;
                }

                const parsedRate = parseFloat(data.value) || 1.0;
                setRate(parsedRate);
            } catch (err) {
                console.error("Error fetching rate:", err);
                setRate(1.0);
            }
        };

        fetchRate();
    }, []);

    if (rate === null) return null;

    return (
        <div className="w-full bg-[#0F0F0F] border-y border-white/5 py-3 overflow-hidden relative group">
            <div className="flex items-center gap-12 animate-ticker-scroll whitespace-nowrap px-8">
                {/* Item 1 */}
                <div className="flex items-center gap-4">
                    <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]"></span>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 group-hover:text-zinc-300 transition-all duration-300">
                        Platform Live Rate: <span className="text-white ml-2">1 USD = RM {rate.toFixed(3)}</span>
                    </p>
                </div>

                <span className="h-4 w-[1px] bg-white/10"></span>

                {/* Item 2 */}
                <div className="flex items-center gap-4">
                    <span className="h-2 w-2 bg-gv-gold rounded-full animate-pulse shadow-[0_0_12px_rgba(212,175,55,0.8)]"></span>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 group-hover:text-zinc-300 transition-all duration-300">
                        Institutional Liquidity: <span className="text-gv-gold ml-2">Veritas Guaranteed</span>
                    </p>
                </div>

                <span className="h-4 w-[1px] bg-white/10"></span>

                {/* Item 3 */}
                <div className="flex items-center gap-4">
                    <span className="h-2 w-2 bg-sky-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(14,165,233,0.8)]"></span>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 group-hover:text-zinc-300 transition-all duration-300">
                        GV Capital Pulse: <span className="text-white ml-2">Secure Transactions Active</span>
                    </p>
                </div>

                <span className="h-4 w-[1px] bg-white/10"></span>

                {/* Duplicated for smooth loop */}
                <div className="flex items-center gap-4">
                    <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]"></span>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 group-hover:text-zinc-300 transition-all duration-300">
                        Platform Live Rate: <span className="text-white ml-2">1 USD = RM {rate.toFixed(3)}</span>
                    </p>
                </div>

                <span className="h-4 w-[1px] bg-white/10"></span>

                <div className="flex items-center gap-4">
                    <span className="h-2 w-2 bg-gv-gold rounded-full animate-pulse shadow-[0_0_12px_rgba(212,175,55,0.8)]"></span>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 group-hover:text-zinc-300 transition-all duration-300">
                        Institutional Liquidity: <span className="text-gv-gold ml-2">Veritas Guaranteed</span>
                    </p>
                </div>
            </div>

            <div className="absolute top-0 left-0 h-full w-40 bg-gradient-to-r from-[#0F0F0F] via-[#0F0F0F]/50 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute top-0 right-0 h-full w-40 bg-gradient-to-l from-[#0F0F0F] via-[#0F0F0F]/50 to-transparent z-10 pointer-events-none"></div>

            <style jsx>{`
                @keyframes ticker-scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-ticker-scroll {
                    display: inline-flex;
                    animation: ticker-scroll 40s linear infinite;
                    width: max-content;
                }
            `}</style>
        </div>
    );
}
