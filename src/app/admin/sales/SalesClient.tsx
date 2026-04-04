"use client";

import React, { useState, useEffect } from "react";
import { useAdmin } from "@/providers/AdminProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { supabase } from "@/lib/supabaseClient";

export default function SalesClient({ lang }: { lang: "en" | "zh" }) {
    const { salesData, loading } = useAdmin();
    const { forexRate } = useSettings();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
    const [agentReferrals, setAgentReferrals] = useState<any[]>([]);
    const [isLoadingReferrals, setIsLoadingReferrals] = useState(false);

    const t = {
        en: {
            title: "Global Sales Performance",
            subtitle: "Tracking institutional referring agents and capital inflow across the network.",
            searchPlaceholder: "Search agent by username...",
            tableRank: "Rank",
            tableAgent: "Agent",
            tableTotalRef: "Total Ref",
            tableTotalCapital: "Total Capital",
            noSales: "No sales performance data available.",
            detailTitle: "Agent Performance Profile",
            referredClients: "Referred Clients",
            noReferrals: "No clients referred yet.",
            selectAgent: "Select an agent to view drill-down performance"
        },
        zh: {
            title: "全球销售业绩",
            subtitle: "跟踪机构推荐代理和整个网络的资本流入。",
            searchPlaceholder: "按用户名搜索代理...",
            tableRank: "排名",
            tableAgent: "代理",
            tableTotalRef: "总推荐",
            tableTotalCapital: "总资本",
            noSales: "暂无销售业绩数据。",
            detailTitle: "代理业绩概况",
            referredClients: "已推荐客户",
            noReferrals: "暂未推荐任何客户。",
            selectAgent: "选择代理以查看详细业绩"
        }
    }[lang];

    const fetchAgentReferrals = async (username: string) => {
        setSelectedAgent(username);
        setIsLoadingReferrals(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, username, balance, balance_usd')
                .eq('referred_by_username', username);
            if (error) throw error;
            if (data) setAgentReferrals(data);
        } catch (err: any) {
            console.error("Referral fetch error:", err.message);
        } finally {
            setIsLoadingReferrals(false);
        }
    };

    const filteredSales = salesData.filter(agent => 
        agent.agent_username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-900">{t.title}</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t.subtitle}</p>
                </div>
                <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs w-full md:w-80 focus:outline-none focus:border-gv-gold transition-all"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Leaderboard */}
                <div className="lg:col-span-2 overflow-hidden border border-gray-200 rounded-[40px] bg-white backdrop-blur-md shadow-2xl">
                    <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gray-200">
                        {/* Desktop View (Table) */}
                        <table className="w-full text-left hidden md:table">
                            <thead className="bg-white border-b border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-400 sticky top-0 z-10">
                                <tr>
                                    <th className="px-8 py-6">{t.tableRank}</th>
                                    <th className="px-8 py-6">{t.tableAgent}</th>
                                    <th className="px-8 py-6">{t.tableTotalRef}</th>
                                    <th className="px-8 py-6 text-right">{t.tableTotalCapital}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredSales.map((agent, index) => (
                                    <tr 
                                        key={agent.agent_username} 
                                        className={`text-sm group hover:bg-gray-50 transition-colors cursor-pointer ${selectedAgent === agent.agent_username ? "bg-gv-gold/5 border-gv-gold/20" : ""}`}
                                        onClick={() => fetchAgentReferrals(agent.agent_username)}
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-gray-500 text-[10px]">#{(index + 1).toString().padStart(2, '0')}</span>
                                                {index === 0 && <span className="text-xl">🥇</span>}
                                                {index === 1 && <span className="text-xl">🥈</span>}
                                                {index === 2 && <span className="text-xl">🥉</span>}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="font-black text-gray-900 group-hover:text-gv-gold transition-colors uppercase tracking-tight">@{agent.agent_username}</div>
                                        </td>
                                        <td className="px-8 py-6 font-bold text-gray-400">{agent.total_referrals} Clients</td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex flex-col">
                                                <span className="font-black text-emerald-400 tabular-nums text-sm">$ {(Number(agent.total_referred_capital_usd || (Number(agent.total_referred_capital || 0) / forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Mobile View (Grid Cards) */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {filteredSales.map((agent, index) => (
                                <div 
                                    key={agent.agent_username} 
                                    className={`flex flex-col animate-in slide-in-from-right-4 duration-300 ${selectedAgent === agent.agent_username ? "bg-gv-gold/5" : "bg-white"}`}
                                >
                                    <div 
                                        onClick={() => fetchAgentReferrals(agent.agent_username)}
                                        className="px-6 py-5 space-y-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-gray-400 text-[10px]">RANK #{index + 1}</span>
                                                {index < 3 && <span className="text-sm">{index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}</span>}
                                            </div>
                                            <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{agent.total_referrals} REFS</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <span className="text-[12px] font-black uppercase tracking-widest text-gray-900 leading-none">@{agent.agent_username}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-emerald-500 tabular-nums tracking-tighter">
                                                    $ {(Number(agent.total_referred_capital_usd || (Number(agent.total_referred_capital || 0) / forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                                <p className="text-[8px] font-bold text-gray-300 uppercase italic">Total Volume</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredSales.length === 0 && (
                            <div className="p-20 text-center text-gray-400 font-black uppercase tracking-widest">{t.noSales}</div>
                        )}
                    </div>
                </div>

                {/* Detail Panel */}
                <div className="bg-gray-50 border border-gray-200 rounded-[40px] p-8 h-fit min-h-[500px] shadow-2xl backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 select-none text-9xl font-black">GV</div>
                    {selectedAgent ? (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500 relative z-10">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gv-gold mb-2">{t.detailTitle}</h4>
                                    <div className="text-4xl font-black text-gray-900 uppercase tracking-tighter">@{selectedAgent}</div>
                                    <div className="mt-4 flex flex-col">
                                        {(() => {
                                            const totalUSD = agentReferrals.reduce((sum, ref) => sum + Number(ref.balance_usd || 0), 0);
                                            return (
                                                <>
                                                    <span className="text-2xl font-black text-emerald-500 tabular-nums">$ {totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                                
                                <div className="space-y-6">
                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-200 pb-2">{t.referredClients} ({agentReferrals.length})</h5>
                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {isLoadingReferrals ? (
                                            <div className="py-20 flex justify-center"><div className="h-6 w-6 border-2 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>
                                        ) : agentReferrals.map((ref, i) => (
                                            <div key={i} className="bg-white border border-gray-200 p-5 rounded-3xl flex items-center justify-between group hover:border-gray-200 transition-all">
                                                <div>
                                                    <div className="text-xs font-black text-gray-900 uppercase tracking-tight">{ref.full_name || ref.username}</div>
                                                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">@{ref.username}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-emerald-400">$ {(Number(ref.balance_usd || (Number(ref.balance || 0) / forexRate))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    {agentReferrals.length === 0 && !isLoadingReferrals && (
                                        <div className="text-center py-20 text-gray-400 text-[10px] font-black uppercase tracking-widest">{t.noReferrals}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-6">
                            <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center border border-gray-200">
                                <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 max-w-[140px] leading-relaxed">{t.selectAgent}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
