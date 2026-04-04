"use client";

import React, { useState, useEffect } from "react";
import { useAdmin } from "@/providers/AdminProvider";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import TierMedal from "@/components/TierMedal";
import { getTierByAmount } from "@/lib/tierUtils";
import { ArrowLeft, Save, Globe, Shield, Lock, ExternalLink } from "lucide-react";

export default function UserPortfolioClient({ lang }: { lang: "en" | "zh" }) {
    const { id } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { users, handleUpdatePortfolio, loading } = useAdmin();
    
    const user = users.find(u => u.id === id);
    
    const [portfolioData, setPortfolioData] = useState({
        platform: "",
        account_id: "",
        password: "",
        remarks: ""
    });

    useEffect(() => {
        if (user) {
            setPortfolioData({
                platform: user.portfolio_platform_name || "",
                account_id: user.portfolio_account_id || "",
                password: user.portfolio_account_password || "",
                remarks: user.portfolio_remarks || ""
            });
        }
    }, [user]);

    const t = {
        en: {
            title: "Capital Allocation Specialist",
            back: "Back to Portfolio",
            header: "External Portfolio Mapping",
            sub: "Configure secure external fund mapping and account credentials for this client.",
            platform: "Management Platform",
            accountId: "Account ID / Login",
            password: "Secure Password",
            remarks: "Internal Allocation Notes",
            save: "Save Allocation",
            assets: "Total Managed Assets",
            tier: "Investor Tier",
            securityNote: "This data is encrypted and used only for internal fiduciary tracking.",
            mappingStatus: "Mapping Status"
        },
        zh: {
            title: "资金分配专家",
            back: "返回资产概览",
            header: "外部投资组合映射",
            sub: "为此客户配置安全的外部基金映射和账户凭据。",
            platform: "管理平台",
            accountId: "账户 ID / 登录名",
            password: "安全密码",
            remarks: "内部分配备注",
            save: "保存分配",
            assets: "管理资产总额",
            tier: "投资者等级",
            securityNote: "此数据已加密，仅用于内部信托跟踪。",
            mappingStatus: "映射状态"
        }
    }[lang];

    const handleSave = async () => {
        if (!user) return;
        await handleUpdatePortfolio(user.id, portfolioData);
        router.push(`/admin/portfolio?lang=${lang}`);
    };

    if (loading || !user) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            {/* Action Bar */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {t.back}
                </button>
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Active Terminal Session</span>
                </div>
            </div>

            {/* User Profile Header */}
            <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                    <TierMedal tierId={getTierByAmount(user.balance_usd || 0).name} size="lg" />
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-900">{user.full_name || user.username}</h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{user.email}</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="bg-gray-50 px-6 py-4 rounded-3xl border border-gray-100 text-right">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{t.assets}</p>
                        <p className="text-2xl font-black text-gray-900">$ {(user.balance_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Configuration Form */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-[40px] border border-gray-100 p-10 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Globe className="h-32 w-32" />
                        </div>
                        
                        <div className="relative space-y-8">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 flex items-center gap-3">
                                    <Shield className="h-5 w-5 text-gv-gold" />
                                    {t.header}
                                </h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{t.sub}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">{t.platform}</label>
                                    <input 
                                        type="text" 
                                        value={portfolioData.platform}
                                        onChange={(e) => setPortfolioData(prev => ({ ...prev, platform: e.target.value }))}
                                        placeholder="e.g. MetaTrader 5 / Bloomberg"
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-bold focus:bg-white focus:border-gv-gold focus:ring-4 focus:ring-gv-gold/5 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">{t.accountId}</label>
                                    <input 
                                        type="text" 
                                        value={portfolioData.account_id}
                                        onChange={(e) => setPortfolioData(prev => ({ ...prev, account_id: e.target.value }))}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-bold focus:bg-white focus:border-gv-gold focus:ring-4 focus:ring-gv-gold/5 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">{t.password}</label>
                                    <input 
                                        type="password" 
                                        value={portfolioData.password}
                                        onChange={(e) => setPortfolioData(prev => ({ ...prev, password: e.target.value }))}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-bold focus:bg-white focus:border-gv-gold focus:ring-4 focus:ring-gv-gold/5 transition-all"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">{t.remarks}</label>
                                    <textarea 
                                        rows={4}
                                        value={portfolioData.remarks}
                                        onChange={(e) => setPortfolioData(prev => ({ ...prev, remarks: e.target.value }))}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-bold focus:bg-white focus:border-gv-gold focus:ring-4 focus:ring-gv-gold/5 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-50 flex justify-end">
                                <button 
                                    onClick={handleSave}
                                    className="bg-black text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-gv-gold hover:text-black transition-all transform hover:-translate-y-1 active:scale-95 flex items-center gap-3"
                                >
                                    <Save className="h-4 w-4" />
                                    {t.save}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-8">
                    <div className="bg-slate-900 p-8 rounded-[40px] text-white space-y-6">
                        <div className="flex items-center gap-3 text-gv-gold">
                            <Lock className="h-5 w-5" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest">Fiduciary Guard</h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">
                            {t.securityNote}
                        </p>
                        <div className="pt-6 border-t border-slate-800 space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                <span className="text-slate-500">{t.mappingStatus}</span>
                                <span className={user.portfolio_platform_name ? 'text-emerald-500' : 'text-amber-500'}>
                                    {user.portfolio_platform_name ? 'Verified' : 'Pending'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[40px] border border-gray-100 space-y-4">
                        <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400">Quick Actions</h4>
                        <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gv-gold/10 hover:text-gv-gold transition-all group">
                            <span className="text-[10px] font-black uppercase tracking-tighter">Open External Terminal</span>
                            <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
