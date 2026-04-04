"use client";

import React, { useState } from "react";
import { useAdmin } from "@/providers/AdminProvider";
import { useSettings } from "@/providers/SettingsProvider";

export default function ForexClient({ lang }: { lang: "en" | "zh" }) {
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
        <div className="space-y-12 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-900">{t.title}</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t.subtitle}</p>
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

                <div className="bg-white border border-gray-200 rounded-[40px] overflow-hidden backdrop-blur-md">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white border-b border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-400">
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
                                {forexHistory.length === 0 && (
                                    <tr><td colSpan={5} className="p-20 text-center text-gray-400 font-black uppercase tracking-widest">{t.noHistory}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
