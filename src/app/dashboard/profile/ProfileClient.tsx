"use client";

import React, { useState } from "react";
import { useUser } from "@/providers/UserProvider";
import { supabase } from "@/lib/supabaseClient";
import PremiumLoader from "@/components/PremiumLoader";

export default function ProfileClient({ lang }: { lang: "en" | "zh" }) {
    const { userProfile: user, loading } = useUser();
    const [viewDocumentUrl, setViewDocumentUrl] = useState<string | null>(null);

    const t = {
        en: {
            personalInfo: "Personal Information",
            fullName: "Full Name",
            username: "Username",
            gender: "Gender",
            male: "Male",
            female: "Female",
            email: "Email Address",
            phone: "Phone Number",
            country: "Country",
            compliance: "Compliance & Industry",
            occupation: "Occupation",
            industry: "Industry",
            wealthSource: "Source of Wealth",
            riskProfile: "Risk Profile",
            bankDetails: "Banking Information",
            bankName: "Bank Name",
            accNumber: "Account Number",
            accHolder: "Account Holder Name",
            bankStatement: "Bank Statement",
            viewStatement: "View Document",
        },
        zh: {
            personalInfo: "个人信息",
            fullName: "姓名",
            username: "用户�?,
            gender: "性别",
            male: "�?,
            female: "�?,
            email: "电子邮件",
            phone: "电话号码",
            country: "国家",
            compliance: "合规与行�?,
            occupation: "职业",
            industry: "行业",
            wealthSource: "财富来源",
            riskProfile: "风险概况",
            bankDetails: "银行信息",
            bankName: "银行名称",
            accNumber: "账号",
            accHolder: "开户人姓名",
            bankStatement: "银行账单",
            viewStatement: "查看文档",
        }
    }[lang];

    const viewStatement = async () => {
        if (!user?.bank_statement_url) return;
        const { data, error } = await supabase.storage.from('agreements').createSignedUrl(user.bank_statement_url, 3600);
        if (data?.signedUrl) setViewDocumentUrl(data.signedUrl);
        else alert("Could not generate secure link.");
    };

    if (loading) return <div className="flex items-center justify-center p-20"><PremiumLoader /></div>;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                {/* Personal Information */}
                <div className="premium-glass bg-white border border-slate-200 p-10 rounded-[48px] shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/[0.03] blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/5 transition-all duration-1000"></div>
                    <div className="relative z-10 space-y-10">
                        <h3 className="text-xl font-black uppercase tracking-[0.3em] text-gv-gold flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-gv-gold/10 flex items-center justify-center border border-gv-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            {t.personalInfo}
                        </h3>
                        <div className="grid gap-6">
                            {[
                                { label: t.fullName, value: user?.fullName },
                                { label: t.username, value: `@${user?.username}` },
                                { label: t.gender, value: user?.gender === "Male" ? t.male : user?.gender === "Female" ? t.female : user?.gender },
                                { label: t.email, value: user?.email },
                            ].map((item, i) => (
                                <div key={i} className="space-y-2 group/field">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] group-hover:text-gv-gold/60 transition-colors">{item.label}</p>
                                    <p className="text-lg font-black text-slate-900 tracking-tight">{item.value || "-"}</p>
                                </div>
                            ))}
                            <div className="grid grid-cols-2 gap-10">
                                <div className="space-y-2 group/field">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] group-hover:text-gv-gold/60 transition-colors">{t.phone}</p>
                                    <p className="text-lg font-black text-slate-900 tracking-tight">{user?.phone || "-"}</p>
                                </div>
                                <div className="space-y-2 group/field">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] group-hover:text-gv-gold/60 transition-colors">{t.country}</p>
                                    <p className="text-lg font-black text-slate-900 tracking-tight">{user?.country || "-"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Compliance */}
                <div className="premium-glass bg-white border border-slate-200 p-10 rounded-[48px] shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/[0.03] blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/5 transition-all duration-1000"></div>
                    <div className="relative z-10 space-y-10">
                        <h3 className="text-xl font-black uppercase tracking-[0.3em] text-gv-gold flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-gv-gold/10 flex items-center justify-center border border-gv-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            </div>
                            {t.compliance}
                        </h3>
                        <div className="grid gap-8">
                            {[
                                { label: t.occupation, value: user?.occupation },
                                { label: t.industry, value: user?.industry },
                                { label: t.wealthSource, value: user?.source_of_wealth },
                                { label: t.riskProfile, value: user?.risk_profile === "Moderate" ? "40%" : (user?.risk_profile || "-"), className: "text-emerald-600" },
                            ].map((item, i) => (
                                <div key={i} className="space-y-2 group/field">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] group-hover:text-gv-gold/60 transition-colors">{item.label}</p>
                                    <p className={`text-lg font-black tracking-tight ${item.className || "text-slate-900"}`}>{item.value || "-"}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bank Details */}
            <div className="premium-glass bg-slate-50 border border-slate-200 p-10 sm:p-14 rounded-[56px] shadow-xl relative overflow-hidden group/bank">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gv-gold/[0.03] blur-[150px] -translate-y-1/2 translate-x-1/4 pointer-events-none group-hover/bank:bg-gv-gold/5 transition-all duration-1000"></div>
                <div className="relative z-10 space-y-12">
                    <h3 className="text-2xl font-black uppercase tracking-[0.4em] text-gv-gold flex items-center gap-6">
                        <div className="h-14 w-14 rounded-[20px] bg-gv-gold/10 flex items-center justify-center border border-gv-gold/40 shadow-[0_0_30px_rgba(212,175,55,0.25)]">
                            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 00-3 3z" /></svg>
                        </div>
                        {t.bankDetails}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                        <div className="space-y-3 group/field">
                            <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.5em] group-hover:text-gv-gold/60 transition-colors">{t.bankName}</p>
                            <p className="text-2xl font-black text-slate-900 tracking-[0.2em] uppercase">{user?.bank_name || "-"}</p>
                        </div>
                        <div className="space-y-3 group/field">
                            <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.5em] group-hover:text-gv-gold/60 transition-colors">{t.accNumber}</p>
                            <p className="text-2xl font-black text-slate-900 tracking-[0.3em] font-mono shadow-inner bg-slate-100 px-6 py-3 rounded-2xl border border-slate-200">
                                {user?.account_number ? `**** **** ${user.account_number.slice(-4)}` : "-"}
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 pt-12 border-t border-slate-200 relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-2 bg-slate-100 border border-slate-200 rounded-full text-[8px] font-black uppercase tracking-[0.4em] text-slate-400">Secure Protocol</div>
                        <div className="space-y-3 group/field">
                            <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.5em] group-hover:text-gv-gold/60 transition-colors">{t.accHolder}</p>
                            <p className="text-2xl font-black text-slate-900 tracking-[0.1em] uppercase">{user?.bank_account_holder || "-"}</p>
                        </div>
                        <div className="space-y-4 group/field">
                            <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.5em] group-hover:text-gv-gold/60 transition-colors">{t.bankStatement}</p>
                            {user?.bank_statement_url ? (
                                <button 
                                    onClick={viewStatement} 
                                    className="group/btn relative inline-flex items-center gap-3 bg-slate-100 hover:bg-gv-gold text-slate-900 hover:text-black border border-slate-200 hover:border-gv-gold px-10 py-5 rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 shadow-xl active:scale-95 overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gv-gold/20 blur-xl opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                                    <svg className="h-5 w-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    <span className="relative z-10">{t.viewStatement}</span>
                                </button>
                            ) : (
                                <p className="text-slate-600 font-black uppercase text-xs mt-3 italic opacity-40">Verification Document Pending</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Document Viewer Modal */}
            {viewDocumentUrl && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 md:p-12 animate-in fade-in duration-300">
                    <button 
                        onClick={() => setViewDocumentUrl(null)}
                        className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full z-[110]"
                    >
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="w-full h-full max-w-6xl relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0A0A0A] shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-slate-900 font-black uppercase tracking-widest text-xs flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-gv-gold animate-pulse"></div>
                                {t.bankStatement}
                            </h3>
                            <a 
                                href={viewDocumentUrl || undefined} 
                                download 
                                className="text-[10px] font-black uppercase tracking-widest text-gv-gold hover:text-white transition-colors"
                            >
                                Download Original
                            </a>
                        </div>
                        <div className="flex-1 overflow-hidden relative group">
                            <iframe 
                                src={viewDocumentUrl || undefined} 
                                className="w-full h-full border-none bg-white rounded-b-[32px]"
                                title="Document Viewer"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
