"use client";

import React, { useState } from "react";
import { useAdmin } from "@/providers/AdminProvider";
import { supabase } from "@/lib/supabaseClient";

export default function KycClient({ lang }: { lang: "en" | "zh" }) {
    const { kycQueue, loading, handleApproveKyc, handleRejectKyc } = useAdmin();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [userDocs, setUserDocs] = useState<{name: string, url: string}[]>([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");

    const t = {
        en: {
            title: "KYC Verification Queue",
            subtitle: "Process and verify institutional identity documents for account activation.",
            searchPlaceholder: "Search by name or email...",
            tableUser: "User",
            tableDate: "Submitted",
            tableStatus: "Status",
            tableActions: "Actions",
            viewDocs: "View Documents",
            approve: "Approve User",
            reject: "Reject Application",
            noKyc: "No pending KYC applications.",
            rejectReasonPlaceholder: "Provide a reason for rejection..."
        },
        zh: {
            title: "KYC 审核队列",
            subtitle: "处理并验证机构身份文档以激活账户。",
            searchPlaceholder: "按姓名或邮箱搜索...",
            tableUser: "用户",
            tableDate: "提交日期",
            tableStatus: "状态",
            tableActions: "操作",
            viewDocs: "查看文档",
            approve: "批准用户",
            reject: "拒绝申请",
            noKyc: "暂无待处理的 KYC 申请。",
            rejectReasonPlaceholder: "提供拒绝理由..."
        }
    }[lang];

    const openDetails = async (user: any) => {
        setSelectedUser(user);
        setIsDetailModalOpen(true);
        setIsLoadingDocs(true);
        try {
            const { data, error } = await supabase.storage.from('agreements').list(user.id);
            if (error) throw error;
            if (data) {
                const docs = await Promise.all(
                    data.map(async (file) => {
                        const { data: urlData } = await supabase.storage.from('agreements').createSignedUrl(`${user.id}/${file.name}`, 3600);
                        return { name: file.name, url: urlData?.signedUrl || "" };
                    })
                );
                setUserDocs(docs.filter(d => d.url !== ""));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingDocs(false);
        }
    };

    const filteredKyc = kycQueue.filter(u => {
        const query = searchQuery.toLowerCase();
        return (u.full_name || "").toLowerCase().includes(query) || (u.email || "").toLowerCase().includes(query);
    });

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-white">{t.title}</h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t.subtitle}</p>
                </div>
                <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs w-full md:w-64 focus:outline-none focus:border-gv-gold transition-all"
                />
            </div>

            <div className="bg-[#1a1a1a]/50 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            <tr>
                                <th className="px-8 py-6">{t.tableUser}</th>
                                <th className="px-8 py-6">{t.tableDate}</th>
                                <th className="px-8 py-6">{t.tableStatus}</th>
                                <th className="px-8 py-6 text-right">{t.tableActions}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {filteredKyc.map((user, idx) => (
                                <tr key={idx} className="text-sm group hover:bg-white/[0.02] transition-all">
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="font-black text-white uppercase tracking-tight">{user.full_name}</span>
                                            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">@{user.username}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-zinc-500 font-mono text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td className="px-8 py-6">
                                        <span className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500">{user.kyc_status}</span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button onClick={() => openDetails(user)} className="bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border border-white/5">{t.viewDocs}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredKyc.length === 0 && (
                        <div className="p-20 text-center text-zinc-600 font-black uppercase tracking-[0.2em]">{t.noKyc}</div>
                    )}
                </div>
            </div>

            {/* KYC Detail Modal */}
            {isDetailModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setIsDetailModalOpen(false)}></div>
                    <div className="relative bg-[#111] border border-white/10 rounded-[40px] w-full max-w-6xl h-full flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Identity Verification Hub</h3>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">UID: {selectedUser?.id}</p>
                            </div>
                            <button onClick={() => setIsDetailModalOpen(false)} className="h-12 w-12 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-all">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        
                        <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden">
                            {/* Documents List */}
                            <div className="lg:col-span-2 space-y-6 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10">
                                {isLoadingDocs ? (
                                    <div className="h-64 flex items-center justify-center"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>
                                ) : userDocs.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-6">
                                        {userDocs.map((doc, i) => (
                                            <div key={i} className="space-y-4">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2">{doc.name}</p>
                                                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:bg-white/10 transition-all group shadow-xl">
                                                    <div className="h-16 w-16 bg-gv-gold/20 text-gv-gold rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-white mb-1">Document Attachment</h4>
                                                        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest truncate max-w-[200px]">{doc.name}</p>
                                                    </div>
                                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="mt-4 bg-gv-gold text-black font-black uppercase tracking-widest text-xs px-6 py-3 rounded-xl shadow-lg hover:shadow-gv-gold/20 transition-all inline-block hover:-translate-y-0.5">View Document</a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-64 border-2 border-dashed border-white/5 rounded-3xl flex items-center justify-center text-zinc-700 font-black uppercase tracking-widest">No physical documents uploaded</div>
                                )}
                            </div>

                            {/* Actions & Info */}
                            <div className="space-y-8 flex flex-col overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10">
                                <div className="space-y-6 flex-1">
                                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2">User Profile Summary</p>
                                        <div className="space-y-4">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black uppercase text-zinc-600">Full Name</span>
                                                <span className="text-lg font-black text-white">{selectedUser?.full_name}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black uppercase text-zinc-600">Email</span>
                                                <span className="text-sm font-bold text-zinc-400">{selectedUser?.email}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black uppercase text-zinc-600">Phone</span>
                                                <span className="text-sm font-bold text-zinc-400">{selectedUser?.phone || "N/A"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest px-1">Rejection Reason (Internal & External)</label>
                                        <textarea
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            placeholder={t.rejectReasonPlaceholder}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-medium focus:outline-none focus:border-red-500/50 transition-all min-h-[120px] text-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 pt-6 border-t border-white/5">
                                    <button 
                                        onClick={() => {
                                            if (!rejectReason) { alert("Please provide a reason for rejection."); return; }
                                            handleRejectKyc(selectedUser.id, rejectReason);
                                            setIsDetailModalOpen(false);
                                        }}
                                        className="bg-red-500/10 border border-red-500/20 text-red-500 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-white transition-all w-full"
                                    >
                                        {t.reject}
                                    </button>
                                    <button 
                                        onClick={() => {
                                            handleApproveKyc(selectedUser.id);
                                            setIsDetailModalOpen(false);
                                        }}
                                        className="bg-gv-gold text-black font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] hover:-translate-y-1 transition-all shadow-xl shadow-gv-gold/20 w-full"
                                    >
                                        {t.approve}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
