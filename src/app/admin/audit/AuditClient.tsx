"use client";

import React, { useState } from "react";
import { useAdmin } from "@/providers/AdminProvider";

export default function AuditClient({ lang }: { lang: "en" | "zh" }) {
    const { combinedAuditLogs, loading } = useAdmin();
    const [searchQuery, setSearchQuery] = useState("");

    const t = {
        en: {
            title: "Platform Audit Trail",
            subtitle: "Comprehensive ledger of all administrative actions and financial approvals.",
            searchPlaceholder: "Search by user email or admin...",
            tableDate: "Timestamp",
            tableAction: "Action",
            tableUser: "Client",
            tableAdmin: "Processed By",
            tableDetails: "Details",
            noLogs: "No audit logs recorded."
        },
        zh: {
            title: "平台审计追踪",
            subtitle: "所有管理操作和财务批准的综合分类账。",
            searchPlaceholder: "搜索用户邮箱或管理员...",
            tableDate: "时间戳",
            tableAction: "操作",
            tableUser: "客户",
            tableAdmin: "处理人",
            tableDetails: "详情",
            noLogs: "暂无审计日志记录。"
        }
    }[lang];

    const filteredLogs = combinedAuditLogs.filter(log => {
        const query = searchQuery.toLowerCase();
        return (log.user_email || "").toLowerCase().includes(query) || 
               (log.admin_username || "").toLowerCase().includes(query) ||
               (log.action || "").toLowerCase().includes(query);
    });

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">{t.title}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.subtitle}</p>
                </div>
                <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs w-full md:w-80 focus:outline-none focus:border-gv-gold transition-all"
                />
            </div>

            <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden backdrop-blur-md shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <tr>
                                <th className="px-8 py-6">{t.tableDate}</th>
                                <th className="px-8 py-6">{t.tableAction}</th>
                                <th className="px-8 py-6">{t.tableUser}</th>
                                <th className="px-8 py-6">{t.tableAdmin}</th>
                                <th className="px-8 py-6 text-right">{t.tableDetails}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLogs.map((log, i) => (
                                <tr key={i} className="text-sm group hover:bg-slate-50 transition-colors font-medium">
                                    <td className="px-8 py-6 text-slate-400 font-mono text-[10px]">{new Date(log.created_at).toLocaleString()}</td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-1.5 w-1.5 rounded-full ${
                                                log.auditType === 'transaction' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gv-gold shadow-[0_0_8px_rgba(212,175,55,0.5)]'
                                            }`}></div>
                                            <span className="font-black text-slate-900 uppercase tracking-tight text-xs">{log.action}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-slate-500 font-bold text-xs">{log.user_email}</td>
                                    <td className="px-8 py-6">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{log.admin_username}</div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter truncate max-w-[200px] ml-auto">
                                            {log.rejection_reason || (log.amount ? `RM ${Number(log.amount).toFixed(2)}` : "System Action")}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-black uppercase tracking-widest">{t.noLogs}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
