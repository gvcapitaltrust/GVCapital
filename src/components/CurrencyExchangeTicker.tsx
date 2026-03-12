"use client";

import { useSettings } from "@/providers/SettingsProvider";

export default function CurrencyExchangeTicker() {
    const { forexRate: rate } = useSettings();

    if (rate === null) return null;

    return (
        <div className="w-full bg-[#121212] border-y border-white/5 py-3 overflow-hidden relative group">
            <div className="flex items-center gap-12 animate-ticker-scroll whitespace-nowrap px-8">
                {/* Item 1 */}
                <div className="flex items-center gap-4">
                    <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]"></span>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 group-hover:text-zinc-300 transition-colors">
                        Platform Live Rate: <span className="text-white ml-2">1 USD = RM {rate.toFixed(3)}</span>
                    </p>
                </div>

                <span className="h-4 w-[1px] bg-white/10"></span>

                {/* Item 2 */}
                <div className="flex items-center gap-4">
                    <span className="h-2 w-2 bg-gv-gold rounded-full animate-pulse shadow-[0_0_12px_rgba(212,175,55,0.8)]"></span>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 group-hover:text-zinc-300 transition-colors">
                        Institutional Liquidity: <span className="text-gv-gold ml-2">Veritas Guaranteed</span>
                    </p>
                </div>

                <span className="h-4 w-[1px] bg-white/10"></span>

                {/* Item 3 */}
                <div className="flex items-center gap-4">
                    <span className="h-2 w-2 bg-sky-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(14,165,233,0.8)]"></span>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 group-hover:text-zinc-300 transition-colors">
                        GV Capital Pulse: <span className="text-white ml-2">Secure Transactions Active</span>
                    </p>
                </div>

                <span className="h-4 w-[1px] bg-white/10"></span>

                {/* Duplicated for smooth loop */}
                <div className="flex items-center gap-4">
                    <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]"></span>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 group-hover:text-zinc-300 transition-colors">
                        Platform Live Rate: <span className="text-white ml-2">1 USD = RM {rate.toFixed(3)}</span>
                    </p>
                </div>

                <span className="h-4 w-[1px] bg-white/10"></span>

                <div className="flex items-center gap-4">
                    <span className="h-2 w-2 bg-gv-gold rounded-full animate-pulse shadow-[0_0_12px_rgba(212,175,55,0.8)]"></span>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 group-hover:text-zinc-300 transition-colors">
                        Institutional Liquidity: <span className="text-gv-gold ml-2">Veritas Guaranteed</span>
                    </p>
                </div>
            </div>

            <div className="absolute top-0 left-0 h-full w-40 bg-gradient-to-r from-[#121212] via-[#121212]/50 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute top-0 right-0 h-full w-40 bg-gradient-to-l from-[#121212] via-[#121212]/50 to-transparent z-10 pointer-events-none"></div>

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
