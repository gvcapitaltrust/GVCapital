"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/providers/AdminProvider";
import { ArrowLeft } from "lucide-react";

export default function AuditClient({ lang }: { lang: "en" | "zh" }) {
    const router = useRouter();
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

            {/* Filter Controls Card - Separated from Header */}
            <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 md:p-10 flex flex-wrap items-center gap-8 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 min-w-full lg:min-w-[500px] flex-1">
                    <div className="relative group flex-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-gv-gold transition-colors">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input
                            type="text"
                            placeholder={t.searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-xs w-full focus:outline-none focus:border-gv-gold focus:bg-white focus:shadow-xl transition-all font-bold placeholder:text-slate-300"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-[30px] md:rounded-[40px] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gray-200">
                    {/* Desktop View (Table) */}
                    <table className="w-full text-left hidden md:table">
                        <thead className="bg-white border-b border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-400 sticky top-0 z-10">
                            <tr>
                                <th className="px-8 py-6">{t.tableDate}</th>
                                <th className="px-8 py-6">{t.tableAction}</th>
                                <th className="px-8 py-6">{t.tableUser}</th>
                                <th className="px-8 py-6">{t.tableAdmin}</th>
                                <th className="px-8 py-6 text-right">{t.tableDetails}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredLogs.map((log, i) => (
                                <tr key={i} className="text-sm group hover:bg-gray-50 transition-colors">
                                    <td className="px-8 py-6 text-gray-400 font-mono text-[10px]">{new Date(log.created_at).toLocaleString()}</td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-1.5 w-1.5 rounded-full ${
                                                log.auditType === 'transaction' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gv-gold shadow-[0_0_8px_rgba(212,175,55,0.5)]'
                                            }`}></div>
                                            <span className="font-black text-gray-900 uppercase tracking-tight text-xs">{log.action}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-gray-500 font-bold text-xs">{log.user_email}</td>
                                    <td className="px-8 py-6">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{log.admin_username}</div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter truncate max-w-[200px] ml-auto">
                                            {log.rejection_reason || (log.amount ? `RM ${Number(log.amount).toFixed(2)}` : "System Action")}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Mobile View (Grid Cards) */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {filteredLogs.map((log, i) => {
                            const isTransaction = log.auditType === 'transaction';
                            const detailText = log.rejection_reason || (log.amount ? `RM ${Number(log.amount).toFixed(2)}` : "System Profile Update");
                            
                            return (
                                <div key={i} className="flex flex-col animate-in slide-in-from-right-4 duration-300">
                                    <div className="px-6 py-5 space-y-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400 font-mono text-[9px] uppercase">{new Date(log.created_at).toLocaleDateString()}</span>
                                            <div className="flex items-center gap-2">
                                                <div className={`h-1.5 w-1.5 rounded-full ${isTransaction ? 'bg-emerald-500' : 'bg-gv-gold'}`}></div>
                                                <span className={`text-[8px] font-black uppercase tracking-widest ${isTransaction ? 'text-emerald-500' : 'text-gv-gold'}`}>
                                                    {log.auditType}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <span className="text-[11px] font-black uppercase tracking-widest text-gray-900 leading-none block">{log.action}</span>
                                                <span className="text-[8px] font-black text-gray-300 uppercase italic tracking-tighter truncate w-40 block">{log.user_email}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight truncate max-w-[120px]">
                                                    {detailText}
                                                </p>
                                                <p className="text-[7px] font-bold text-gray-300 uppercase tracking-widest">BY: {log.admin_username}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filteredLogs.length === 0 && (
                        <div className="p-20 text-center text-gray-400 font-black uppercase tracking-widest">{t.noLogs}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
