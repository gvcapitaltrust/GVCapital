"use client";

import React, { useState } from "react";
import { useUser } from "@/providers/UserProvider";
import { supabase } from "@/lib/supabaseClient";

export default function ProfileClient({ lang }: { lang: "en" | "zh" }) {
    const { userProfile: user, withdrawalMethods, loading, refreshData } = useUser();
    const [viewDocumentUrl, setViewDocumentUrl] = useState<string | null>(null);
    const [isAddMethodOpen, setIsAddMethodOpen] = useState(false);
    const [newMethod, setNewMethod] = useState({
        type: 'BANK' as 'BANK' | 'USDT',
        bank_name: '',
        account_number: '',
        bank_account_holder: '',
        usdt_address: '',
        usdt_network: 'TRC20',
        is_default: false
    });
    const [isSaving, setIsSaving] = useState(false);

    const malaysianBanks = [
        "Maybank", "CIMB Bank", "Public Bank", "RHB Bank", "Hong Leong Bank", 
        "AmBank", "UOB Malaysia", "OCBC Bank Malaysia", "HSBC Bank Malaysia", 
        "Bank Islam Malaysia", "Affin Bank", "Alliance Bank", "Standard Chartered Malaysia", 
        "MBSB Bank", "Bank Rakyat", "Bank Muamalat", "Other"
    ];

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

    const handleSaveMethod = async () => {
        if (!user?.id) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('withdrawal_methods')
                .insert([{
                    user_id: user.id,
                    ...newMethod,
                    is_default: withdrawalMethods.length === 0 ? true : newMethod.is_default
                }]);
            
            if (error) throw error;
            setIsAddMethodOpen(false);
            refreshData();
            setNewMethod({
                type: 'BANK', bank_name: '', account_number: '', bank_account_holder: '', 
                usdt_address: '', usdt_network: 'TRC20', is_default: false
            });
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteMethod = async (id: string) => {
        if (!confirm("Are you sure you want to remove this withdrawal method?")) return;
        try {
            const { error } = await supabase
                .from('withdrawal_methods')
                .delete()
                .eq('id', id);
            if (error) throw error;
            refreshData();
        } catch (err: any) {
            alert(err.message);
        }
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
                                { 
                                    label: t.wealthSource, 
                                    value: (() => {
                                        const val = user?.source_of_wealth;
                                        if (!val) return "-";
                                        if (Array.isArray(val)) return val.join(", ");
                                        try {
                                            const parsed = JSON.parse(val);
                                            if (Array.isArray(parsed)) return parsed.join(", ");
                                        } catch (e) {}
                                        return val;
                                    })()
                                },
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

            {/* Withdrawal Methods Manager */}
            <div className="bg-white border border-gray-200 p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/5 blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 space-y-8">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold uppercase tracking-tight text-gv-gold flex items-center gap-3">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 00-3 3z" /></svg>
                            {lang === 'en' ? 'Withdrawal Methods' : '提款方式'}
                        </h3>
                        <button 
                            onClick={() => setIsAddMethodOpen(true)}
                            className="bg-slate-900 text-gv-gold px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center gap-2"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M12 4v16m8-8H4" /></svg>
                            {lang === 'en' ? 'Add New Method' : '添加提款方式'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {withdrawalMethods && withdrawalMethods.length > 0 ? (
                            withdrawalMethods.map((method: any) => (
                                <div key={method.id} className="bg-gray-50 border border-gray-200 p-6 rounded-2xl relative group/item hover:border-gv-gold/30 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${method.type === 'BANK' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                {method.type === 'BANK' ? (
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 00-3 3z" /></svg>
                                                ) : (
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-900 uppercase">{method.type === 'BANK' ? method.bank_name : 'USDT TRC20'}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{method.type === 'BANK' ? t.bankDetails : 'Stablecoin Payout'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {method.is_default && (
                                                <span className="bg-gv-gold/10 text-gv-gold text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Default</span>
                                            )}
                                            <button 
                                                onClick={() => handleDeleteMethod(method.id)}
                                                className="text-gray-300 hover:text-red-500 transition-colors"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{method.type === 'BANK' ? t.accNumber : 'Wallet Address'}</p>
                                            <p className="text-sm font-bold text-gray-900 font-mono tracking-tight break-all">
                                                {method.type === 'BANK' ? `**** **** ${method.account_number.slice(-4)}` : method.usdt_address}
                                            </p>
                                        </div>
                                        {method.type === 'BANK' && (
                                            <div className="space-y-1">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{t.accHolder}</p>
                                                <p className="text-xs font-bold text-gray-900 uppercase tracking-tight">{method.bank_account_holder}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-[32px] bg-gray-50/50">
                                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mb-4">
                                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 00-3 3z" /></svg>
                                </div>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{lang === 'en' ? 'No withdrawal methods added yet' : '尚未添加提款方式'}</p>
                            </div>
                        )}
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

            {/* Add Method Modal */}
            {isAddMethodOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => !isSaving && setIsAddMethodOpen(false)}></div>
                    <div className="bg-white w-full max-w-lg rounded-[32px] p-8 relative z-20 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">
                                {lang === 'en' ? 'Add Payout Destination' : '添加提款目标'}
                            </h3>
                            <button onClick={() => setIsAddMethodOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Method Type Toggle */}
                            <div className="bg-gray-100 p-1 rounded-2xl flex gap-1">
                                <button 
                                    onClick={() => setNewMethod({...newMethod, type: 'BANK'})}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newMethod.type === 'BANK' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Bank Account
                                </button>
                                <button 
                                    onClick={() => setNewMethod({...newMethod, type: 'USDT'})}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newMethod.type === 'USDT' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    USDT (TRC20)
                                </button>
                            </div>

                            {newMethod.type === 'BANK' ? (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bank Name</label>
                                        <select 
                                            value={newMethod.bank_name}
                                            onChange={(e) => setNewMethod({...newMethod, bank_name: e.target.value})}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-gv-gold transition-all"
                                        >
                                            <option value="">{lang === 'en' ? 'Select Bank...' : '选择银行...'}</option>
                                            {malaysianBanks.map(bank => <option key={bank} value={bank}>{bank}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Number</label>
                                        <input 
                                            type="text"
                                            value={newMethod.account_number}
                                            onChange={(e) => setNewMethod({...newMethod, account_number: e.target.value})}
                                            placeholder="XXXX-XXXX-XXXX"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-gv-gold transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Holder Name</label>
                                        <input 
                                            type="text"
                                            value={newMethod.bank_account_holder}
                                            onChange={(e) => setNewMethod({...newMethod, bank_account_holder: e.target.value})}
                                            placeholder="As per bank records"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-gv-gold transition-all"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">USDT Wallet Address (TRC20)</label>
                                        <input 
                                            type="text"
                                            value={newMethod.usdt_address}
                                            onChange={(e) => setNewMethod({...newMethod, usdt_address: e.target.value})}
                                            placeholder="T..."
                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-gv-gold transition-all font-mono"
                                        />
                                    </div>
                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                                        <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        </div>
                                        <p className="text-[10px] text-amber-700 font-bold leading-relaxed uppercase">
                                            Please ensure your wallet address is on the **TRC20 (Tron)** network. Funds sent to wrong addresses cannot be recovered.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                                <input 
                                    type="checkbox" 
                                    id="isDefault" 
                                    checked={newMethod.is_default}
                                    onChange={(e) => setNewMethod({...newMethod, is_default: e.target.checked})}
                                    className="h-5 w-5 rounded-lg border-gray-300 text-gv-gold focus:ring-gv-gold"
                                />
                                <label htmlFor="isDefault" className="text-xs font-bold text-gray-600 uppercase tracking-tight">Set as default payout method</label>
                            </div>

                            <button 
                                onClick={handleSaveMethod}
                                disabled={isSaving || (newMethod.type === 'BANK' && (!newMethod.bank_name || !newMethod.account_number)) || (newMethod.type === 'USDT' && !newMethod.usdt_address)}
                                className="w-full bg-slate-900 text-gv-gold py-5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-50 disabled:hover:bg-slate-900 flex items-center justify-center gap-2"
                            >
                                {isSaving && <div className="h-4 w-4 border-2 border-gv-gold border-t-transparent animate-spin rounded-full"></div>}
                                {lang === 'en' ? 'Add Withdrawal Method' : '确认添加'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
