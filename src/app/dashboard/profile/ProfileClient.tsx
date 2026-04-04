"use client";

import React, { useState } from "react";
import { useUser } from "@/providers/UserProvider";
import { supabase } from "@/lib/supabaseClient";

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
            username: "用户名",
            gender: "性别",
            male: "男",
            female: "女",
            email: "电子邮件",
            phone: "电话号码",
            country: "国家",
            compliance: "合规与行业",
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

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Personal Information */}
                <div className="bg-gray-50 border border-gray-200 p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gv-gold/5 blur-[50px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10 space-y-8">
                        <h3 className="text-lg font-bold uppercase tracking-tight text-gv-gold flex items-center gap-3">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            {t.personalInfo}
                        </h3>
                        <div className="grid gap-6">
                            {[
                                { label: t.fullName, value: user?.fullName },
                                { label: t.username, value: `@${user?.username}` },
                                { label: t.gender, value: user?.gender === "Male" ? t.male : user?.gender === "Female" ? t.female : user?.gender },
                                { label: t.email, value: user?.email },
                            ].map((item, i) => (
                                <div key={i} className="space-y-1">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{item.label}</p>
                                    <p className="text-base font-semibold text-gray-900 tracking-tight">{item.value || "-"}</p>
                                </div>
                            ))}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.phone}</p>
                                    <p className="text-base font-semibold text-gray-900 tracking-tight">{user?.phone || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.country}</p>
                                    <p className="text-base font-semibold text-gray-900 tracking-tight">{user?.country || "-"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Compliance */}
                <div className="bg-gray-50 border border-gray-200 p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gv-gold/5 blur-[50px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10 space-y-8">
                        <h3 className="text-lg font-bold uppercase tracking-tight text-gv-gold flex items-center gap-3">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            {t.compliance}
                        </h3>
                        <div className="grid gap-6">
                            {[
                                { label: t.occupation, value: user?.occupation },
                                { label: t.industry, value: user?.industry },
                                { label: t.wealthSource, value: user?.source_of_wealth },
                                { label: t.riskProfile, value: user?.risk_profile === "Moderate" ? "40%" : (user?.risk_profile || "-"), className: "text-emerald-400" },
                            ].map((item, i) => (
                                <div key={i} className="space-y-1">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{item.label}</p>
                                    <p className={`text-base font-semibold tracking-tight ${item.className || "text-gray-900"}`}>{item.value || "-"}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bank Details */}
            <div className="bg-gv-gold/5 border border-gv-gold/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/5 blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 space-y-8">
                    <h3 className="text-lg font-bold uppercase tracking-tight text-gv-gold flex items-center gap-3">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 00-3 3z" /></svg>
                        {t.bankDetails}
                    </h3>
                    <div className="flex flex-col md:flex-row gap-12">
                        <div className="space-y-1 flex-1">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.bankName}</p>
                            <p className="text-base font-bold text-gray-900 tracking-widest uppercase">{user?.bank_name || "-"}</p>
                        </div>
                        <div className="space-y-1 flex-1">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.accNumber}</p>
                            <p className="text-base font-bold text-gray-900 tracking-widest font-mono">{user?.account_number ? `**** **** ${user.account_number.slice(-4)}` : "-"}</p>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-12 pt-8 border-t border-gray-200">
                        <div className="space-y-1 flex-1">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.accHolder}</p>
                            <p className="text-base font-bold text-gray-900 tracking-widest uppercase">{user?.bank_account_holder || "-"}</p>
                        </div>
                        <div className="space-y-1 flex-1">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.bankStatement}</p>
                            {user?.bank_statement_url ? (
                                <button onClick={viewStatement} className="inline-flex items-center gap-2 bg-white hover:bg-gv-gold hover:text-black border border-gray-200 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all mt-2">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    {t.viewStatement}
                                </button>
                            ) : (
                                <p className="text-gray-500 font-bold uppercase text-[10px] mt-2 italic">Not Provided</p>
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
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
                            <h3 className="text-white font-black uppercase tracking-widest text-xs flex items-center gap-2">
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
