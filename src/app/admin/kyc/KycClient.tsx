"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/providers/AdminProvider";
import { supabase } from "@/lib/supabaseClient";
import { formatDate, formatDateTime } from "@/lib/dateUtils";
import { getTierByAmount } from "@/lib/tierUtils";
import { ArrowLeft } from "lucide-react";
import TierMedal from "@/components/TierMedal";

export default function KycClient({ lang }: { lang: "en" | "zh" }) {
    const router = useRouter();
    const { kycQueue, loading, handleApproveKyc, handleRejectKyc } = useAdmin();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [userDocs, setUserDocs] = useState<{name: string, url: string}[]>([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [viewDocumentUrl, setViewDocumentUrl] = useState<string | null>(null);

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
            rejectReasonPlaceholder: "Provide a reason for rejection...",
            statusAll: "All Status",
            statusPending: "Pending",
            statusApproved: "Verified",
            statusRejected: "Rejected"
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
            rejectReasonPlaceholder: "提供拒绝理由...",
            statusAll: "全部状态",
            statusPending: "待审核",
            statusApproved: "已验证",
            statusRejected: "已拒绝"
        }
    }[lang];

    const openDetails = async (user: any) => {
        setSelectedUser(user);
        setIsDetailModalOpen(true);
        setIsLoadingDocs(true);
        try {
            const docFields = [
                { key: 'kyc_id_front', label: 'ID Front' },
                { key: 'kyc_id_back', label: 'ID Back' },
                { key: 'bank_statement_url', label: 'Bank Statement' }
            ];

            const docs = await Promise.all(
                docFields.map(async (field) => {
                    const path = user[field.key];
                    if (!path) return null;
                    const { data: urlData } = await supabase.storage.from('agreements').createSignedUrl(path, 3600);
                    return { name: field.label, url: urlData?.signedUrl || "" };
                })
            );
            
            setUserDocs(docs.filter((d): d is {name: string, url: string} => d !== null && d.url !== ""));
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingDocs(false);
        }
    };

    const filteredKyc = kycQueue.filter(u => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (u.full_name || u.email || "").toLowerCase().includes(query);
        const matchesStatus = statusFilter === "All" || u.kyc_status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
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
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-gv-gold transition-all text-slate-900 appearance-none cursor-pointer"
                    >
                        <option value="All">{t.statusAll}</option>
                        <option value="Pending">{t.statusPending}</option>
                        <option value="Verified">{t.statusApproved}</option>
                        <option value="Rejected">{t.statusRejected}</option>
                    </select>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-[32px] overflow-hidden shadow-2xl relative">
                <div className="overflow-x-auto overflow-y-auto max-h-[650px] scrollbar-thin scrollbar-thumb-gray-200">
                    <table className="w-full text-left border-collapse min-w-[800px] lg:min-w-full">
                        <thead className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10 backdrop-blur-md">
                            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                <th className="px-6 py-6 pl-10">Institutional Client</th>
                                <th className="px-6 py-6">ID Specification</th>
                                <th className="px-6 py-6">Audit Status</th>
                                <th className="px-6 py-6 pr-10 text-right">Verification Hub</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredKyc.map((user: any, idx: number) => (
                                <tr key={user.id || idx} className="group hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-0 border-collapse">
                                    <td className="px-6 py-6 pl-10">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 flex items-center justify-center shrink-0">
                                                <TierMedal tierId={user.tier?.toLowerCase() || getTierByAmount(user.balance_usd || 0).id} size="sm" />
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="font-black text-slate-900 uppercase tracking-tight text-sm group-hover:text-gv-gold transition-colors truncate max-w-[150px]">{user.full_name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">@{user.username}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">{user.kyc_data?.id_type || '-'}</span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{user.kyc_data?.country || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                                            user.kyc_status === 'Verified' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                            user.kyc_status === 'Rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                            'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                        }`}>
                                            {user.kyc_status || 'Pending'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-6 pr-10 text-right">
                                        <button 
                                            onClick={() => openDetails(user)} 
                                            className="bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest px-8 py-3 rounded-2xl transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                                        >
                                            {t.viewDocs}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredKyc.length === 0 && (
                        <div className="p-32 text-center flex flex-col items-center gap-6">
                            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-100">
                                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 20a10.003 10.003 0 006.239-2.223l.054.09m-3.44 2.04C13.01 17.799 12 14.517 12 11V5a2 2 0 00-2-2H8a2 2 0 00-2 2v6a10 10 0 0010 10V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v6a10 10 0 0010 10V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v6a10 10 0 0010 10z" /></svg>
                            </div>
                            <span className="text-slate-300 font-black uppercase tracking-[0.3em] text-xs">{t.noKyc}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* KYC Detail Modal */}
            {isDetailModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-xl" onClick={() => setIsDetailModalOpen(false)}></div>
                    <div className="relative bg-white border border-gray-200 rounded-[40px] w-full max-w-6xl h-full flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-gray-200 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-gray-900">Identity Verification Hub</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">UID: {selectedUser?.id}</p>
                            </div>
                            <button onClick={() => setIsDetailModalOpen(false)} className="h-12 w-12 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-all">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        
                        <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">
                            {/* Main Content Area: Detailed Data */}
                            <div className="lg:col-span-8 space-y-8 overflow-y-auto pr-6 scrollbar-thin scrollbar-thumb-gray-300">
                                
                                {/* Personal Information Section */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gv-gold flex items-center gap-2">
                                        <span className="h-1 w-4 bg-gv-gold rounded-full"></span>
                                        Personal Information
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { label: "Full Name", value: selectedUser?.full_name || selectedUser?.kyc_data?.full_name },
                                            { label: "Date of Birth", value: selectedUser?.kyc_data?.dob },
                                            { label: "Gender", value: selectedUser?.kyc_data?.gender },
                                            { label: "Phone", value: selectedUser?.phone || selectedUser?.kyc_data?.phone },
                                            { label: "Tax ID / TIN", value: selectedUser?.kyc_data?.tax_id || "N/A" },
                                            { label: "Country", value: selectedUser?.country || selectedUser?.kyc_data?.country },
                                            { label: "City", value: selectedUser?.kyc_data?.city },
                                        ].map((item, i) => (
                                            <div key={i} className="bg-white border border-gray-200 p-3 rounded-2xl">
                                                <p className="text-[8px] font-black text-gray-500 uppercase mb-1">{item.label}</p>
                                                <p className="text-xs font-bold text-gray-900 truncate">{item.value || "-"}</p>
                                            </div>
                                        ))}
                                        <div className="bg-white border border-gray-200 p-3 rounded-2xl col-span-2">
                                            <p className="text-[8px] font-black text-gray-500 uppercase mb-1">Residential Address</p>
                                            <p className="text-xs font-bold text-gray-900">{selectedUser?.kyc_data?.address || "-"}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Investment Profile Section */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gv-gold flex items-center gap-2">
                                        <span className="h-1 w-4 bg-gv-gold rounded-full"></span>
                                        Investment & Profile
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { label: "Account Purpose", value: selectedUser?.kyc_data?.account_purpose },
                                            { label: "Employment", value: selectedUser?.kyc_data?.employment_status },
                                            { label: "Industry", value: selectedUser?.kyc_data?.industry },
                                            { label: "Net Worth", value: selectedUser?.kyc_data?.total_wealth },
                                            { label: "Annual Income", value: selectedUser?.kyc_data?.annual_income },
                                            { label: "Expected Deposit", value: selectedUser?.kyc_data?.yearly_deposit },
                                        ].map((item, i) => (
                                            <div key={i} className="bg-white border border-gray-200 p-3 rounded-2xl">
                                                <p className="text-[8px] font-black text-gray-500 uppercase mb-1">{item.label}</p>
                                                <p className="text-xs font-bold text-gray-900">{item.value || "-"}</p>
                                            </div>
                                        ))}
                                        <div className="bg-white border border-gray-200 p-3 rounded-2xl col-span-2">
                                            <p className="text-[8px] font-black text-gray-500 uppercase mb-1">Sources of Wealth</p>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {(() => {
                                                    const val = selectedUser?.kyc_data?.source_of_wealth;
                                                    let list: string[] = [];
                                                    if (Array.isArray(val)) {
                                                        list = val;
                                                    } else if (val) {
                                                        try {
                                                            const parsed = JSON.parse(val);
                                                            if (Array.isArray(parsed)) list = parsed;
                                                            else list = [val];
                                                        } catch (e) {
                                                            list = [val];
                                                        }
                                                    }
                                                    
                                                    if (list.length === 0) return <span className="text-xs font-bold text-gray-500">-</span>;

                                                    return list.map((s: string, i: number) => (
                                                        <span key={i} className="bg-gv-gold/10 text-gv-gold text-[9px] font-black px-2 py-1 rounded-lg uppercase">{s}</span>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bank Information Section */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gv-gold flex items-center gap-2">
                                        <span className="h-1 w-4 bg-gv-gold rounded-full"></span>
                                        Bank Information
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[
                                            { label: "Bank Name", value: selectedUser?.bank_name || selectedUser?.kyc_data?.bank_name },
                                            { label: "Account Number", value: selectedUser?.account_number || selectedUser?.kyc_data?.account_number },
                                            { label: "Account Holder", value: selectedUser?.bank_account_holder || selectedUser?.kyc_data?.bank_account_holder },
                                        ].map((item, i) => (
                                            <div key={i} className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl">
                                                <p className="text-[8px] font-black text-emerald-500/50 uppercase mb-1">{item.label}</p>
                                                <p className="text-sm font-black text-emerald-400">{item.value || "-"}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Compliance & Declarations */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gv-gold flex items-center gap-2">
                                        <span className="h-1 w-4 bg-gv-gold rounded-full"></span>
                                        Compliance Declarations
                                    </h4>
                                    <div className="flex flex-wrap gap-3">
                                        {[
                                            { label: "Nationality Match", value: selectedUser?.kyc_data?.nationality_match },
                                            { label: "Accuracy Confirmed", value: selectedUser?.kyc_data?.accuracy_confirmed },
                                            { label: "Risk Acknowledged", value: selectedUser?.kyc_data?.risk_acknowledged },
                                            { label: "Not a PEP", value: selectedUser?.kyc_data?.is_not_pep },
                                        ].map((item, i) => (
                                            <div key={i} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${item.value ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                                <div className={`h-2 w-2 rounded-full ${item.value ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
                                                {item.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Area: Documents & Actions */}
                            <div className="lg:col-span-4 space-y-8 flex flex-col overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 border-l border-gray-200 pl-6">
                                
                                {/* Document List Section */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Submitted Documents</h4>
                                    {isLoadingDocs ? (
                                        <div className="h-32 flex items-center justify-center"><div className="h-8 w-8 border-3 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>
                                    ) : userDocs.length > 0 ? (
                                        <div className="space-y-3">
                                            {userDocs.map((doc, i) => (
                                                <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-100 transition-all group gap-4 min-w-0">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="h-8 w-8 bg-gv-gold/20 text-gv-gold rounded-full flex items-center justify-center shrink-0">
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] text-gray-700 font-bold uppercase truncate">{doc.name}</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setViewDocumentUrl(doc.url)} className="shrink-0 bg-gray-100 text-gray-900 font-black uppercase tracking-widest text-[9px] px-3 py-1.5 rounded-lg hover:bg-gv-gold hover:text-black transition-all">View</button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-10 border-2 border-dashed border-gray-200 rounded-3xl text-center text-gray-400 text-[10px] font-black uppercase tracking-widest">No Documents Found</div>
                                    )}
                                </div>

                                {/* Decision Actions Section */}
                                <div className="space-y-4 pt-4 border-t border-gray-200 mt-auto">
                                    <div className="space-y-3">
                                        <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest px-1">Rejection Reason</label>
                                        <textarea
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            placeholder={t.rejectReasonPlaceholder}
                                            className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-xs font-medium focus:outline-none focus:border-red-500/50 transition-all min-h-[100px] text-gray-900"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        <button 
                                            onClick={() => {
                                                if (!rejectReason) { alert("Please provide a reason for rejection."); return; }
                                                handleRejectKyc(selectedUser.id, rejectReason);
                                                setIsDetailModalOpen(false);
                                            }}
                                            className="bg-red-500/10 border border-red-500/20 text-red-500 font-black py-4 rounded-xl uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-gray-900 transition-all w-full shadow-lg"
                                        >
                                            {t.reject}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                handleApproveKyc(selectedUser.id);
                                                setIsDetailModalOpen(false);
                                            }}
                                            className="bg-gv-gold text-black font-black py-4 rounded-xl uppercase tracking-widest text-[10px] hover:-translate-y-1 transition-all shadow-xl shadow-gv-gold/20 w-full"
                                        >
                                            {t.approve}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* In-page Document Viewer (Lightbox) */}
            {viewDocumentUrl && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12 animate-in fade-in zoom-in-95 duration-200">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-3xl" onClick={() => setViewDocumentUrl(null)}></div>
                    <div className="relative w-full max-w-5xl h-full flex flex-col pointer-events-none">
                        <div className="w-full flex justify-end mb-4 pointer-events-auto">
                            <button onClick={() => setViewDocumentUrl(null)} className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 hover:scale-105 text-gray-900 transition-all shadow-xl backdrop-blur-md">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="w-full flex-1 relative bg-white rounded-3xl overflow-hidden border border-gray-200 pointer-events-auto shadow-[0_0_100px_rgba(0,0,0,0.5)] flex items-center justify-center p-2">
                            {viewDocumentUrl.toLowerCase().split('?')[0].endsWith('.pdf') ? (
                                <iframe src={viewDocumentUrl} className="w-full h-full rounded-2xl bg-white" />
                            ) : (
                                <img src={viewDocumentUrl} alt="Document View" className="max-w-full max-h-full object-contain rounded-2xl" />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
