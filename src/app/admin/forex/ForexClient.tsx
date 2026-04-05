"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/providers/AdminProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { ArrowLeft } from "lucide-react";

export default function ForexClient({ lang }: { lang: "en" | "zh" }) {
    const router = useRouter();
    const { forexHistory, loading, handleUpdateForexRate } = useAdmin();
    const { forexRate } = useSettings();
    const [newRate, setNewRate] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    const t = {
        en: {
            title: "Global Pricing Control",
            subtitle: "Manage the platform's primary valuation rate for USD to MYR conversions.",
            currentRate: "Current Platform Rate",
            newRateLabel: "New Target Rate (MYR)",
            updateBtn: "Update Global Rate",
            updatingBtn: "Propagating Rate...",
            historyTitle: "Rate Audit History",
            tableDate: "Date",
            tableOld: "Old Rate",
            tableNew: "New Rate",
            tableChange: "Change %",
            tableAdmin: "Admin",
            noHistory: "No rate adjustment history found."
        },
        zh: {
            title: "全局定价控制",
            subtitle: "管理平台 USD 转 MYR 的主要估值比率。",
            currentRate: "当前平台汇率",
            newRateLabel: "新目标汇率 (MYR)",
            updateBtn: "更新全局汇率",
            updatingBtn: "正在同步汇率...",
            historyTitle: "比率审计历史",
            tableDate: "日期",
            tableOld: "原汇率",
            tableNew: "新汇率",
            tableChange: "变动 %",
            tableAdmin: "管理员",
            noHistory: "未发现比率调整历史。"
        }
    }[lang];

    const handleSubmit = async () => {
        if (!newRate || isNaN(parseFloat(newRate))) return;
        setIsUpdating(true);
        await handleUpdateForexRate(parseFloat(newRate));
        setNewRate("");
        setIsUpdating(false);
    };

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Standard Header */}
            <div className="flex items-center gap-6">
                <button 
                    onClick={() => router.push(`/admin?lang=${lang}`)}
                    className="h-12 w-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gv-gold transition-all shadow-sm hover:shadow-md"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{t.title}</h1>
                    <p className="text-slate-400 text-sm font-medium">{t.subtitle}</p>
                </div>
            </div>

            <div className="max-w-xl bg-white border border-gray-200 rounded-[40px] p-10 space-y-8 backdrop-blur-md shadow-2xl">
                <div className="space-y-2">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest px-1">{t.currentRate}</p>
                    <div className="text-5xl font-black text-gv-gold tabular-nums tracking-tighter">1 USD = RM {forexRate.toFixed(4)}</div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest px-1">{t.newRateLabel}</label>
                        <input
                            type="number"
                            step="0.001"
                            value={newRate}
                            onChange={(e) => setNewRate(e.target.value)}
                            placeholder="4.500"
                            className="w-full bg-gray-100 border border-gray-200 rounded-3xl p-6 text-3xl font-black text-gray-900 focus:outline-none focus:border-gv-gold transition-all"
                        />
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={isUpdating || !newRate}
                        className="w-full bg-gv-gold text-black font-black py-6 rounded-3xl uppercase tracking-widest text-xs shadow-2xl shadow-gv-gold/20 hover:-translate-y-1 transition-all disabled:opacity-50"
                    >
                        {isUpdating ? t.updatingBtn : t.updateBtn}
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-gray-900">{t.historyTitle}</h3>
                    <div className="h-[1px] flex-1 bg-white mx-8"></div>
                </div>

                <div className="bg-white border border-gray-200 rounded-[30px] md:rounded-[40px] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-gray-200">
                        {/* Desktop View (Table) */}
                        <table className="w-full text-left hidden md:table">
                            <thead className="bg-white border-b border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-400 sticky top-0 z-10">
                                <tr>
                                    <th className="px-8 py-6">{t.tableDate}</th>
                                    <th className="px-8 py-6">{t.tableOld}</th>
                                    <th className="px-8 py-6">{t.tableNew}</th>
                                    <th className="px-8 py-6">{t.tableChange}</th>
                                    <th className="px-8 py-6 text-right">{t.tableAdmin}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {forexHistory.map((h, i) => {
                                    const change = ((h.new_rate - h.old_rate) / h.old_rate) * 100;
                                    return (
                                        <tr key={i} className="text-sm group hover:bg-gray-50 transition-colors">
                                            <td className="px-8 py-6 text-gray-500 font-mono text-xs">{new Date(h.created_at).toLocaleString()}</td>
                                            <td className="px-8 py-6 text-gray-400 tabular-nums">RM {h.old_rate.toFixed(4)}</td>
                                            <td className="px-8 py-6 text-gray-900 font-black tabular-nums">RM {h.new_rate.toFixed(4)}</td>
                                            <td className="px-8 py-6">
                                                <span className={`font-bold tabular-nums ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{h.admin_username}</div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Mobile View (Grid Cards) */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {forexHistory.map((h, i) => {
                                const change = ((h.new_rate - h.old_rate) / h.old_rate) * 100;
                                return (
                                    <div key={i} className="flex flex-col animate-in slide-in-from-right-4 duration-300">
                                        <div className="px-6 py-5 space-y-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400 font-mono text-[9px] uppercase">{new Date(h.created_at).toLocaleDateString()}</span>
                                                <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${change >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div className="space-y-1">
                                                    <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest block">ADMIN: {h.admin_username}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-mono text-gray-400 line-through">RM {h.old_rate.toFixed(3)}</span>
                                                        <svg className="h-2 w-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M9 5l7 7-7 7"/></svg>
                                                        <span className="text-[12px] font-black text-gray-900 tracking-tighter uppercase">RM {h.new_rate.toFixed(4)}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[8px] font-bold text-gray-300 uppercase italic">Rate Adjustment</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {forexHistory.length === 0 && (
                            <div className="p-20 text-center text-gray-400 font-black uppercase tracking-widest">{t.noHistory}</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
