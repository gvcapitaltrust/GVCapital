"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/providers/UserProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { supabase } from "@/lib/supabaseClient";
import TierMedal from "@/components/TierMedal";
import { getTierByAmount, TIERS } from "@/lib/tierUtils";
import ComparisonTable from "@/components/ComparisonTable";
import ProductSelection from "@/components/ProductSelection";
import { X } from "lucide-react";

export default function OverviewClient({ lang }: { lang: "en" | "zh" }) {
    const { userProfile: user, transactions, dividendHistory, loading: isCheckingAuth, refreshData } = useUser();
    const { forexRate } = useSettings();
    const router = useRouter();

    const [actionToast, setActionToast] = useState<{message: string, actionUrl?: string, actionText?: string} | null>(null);
    const [isProfileExpanded, setIsProfileExpanded] = useState(false);

    const t = {
        en: {
            verificationInProgress: "Verification In Progress",
            verificationInProgressDesc: "Our compliance team is currently reviewing your documents. You'll receive a notification once your account is ready for full access.",
            verificationUnsuccessful: "Verification Unsuccessful",
            verificationUnsuccessfulDesc: "We couldn't verify your documents. Please review the reason below and re-submit your details.",
            rejectionReasonLabel: "No reason provided",
            reuploadPrompt: "Please double check your information and provide clear photos of your documents.",
            reuploadBtn: "Re-submit Verification",
            completeProfile: "Complete Your Profile",
            completeProfileDesc: "To start investing and earn monthly dividends, please complete your identification process.",
            totalEquity: "Total Investment",
            totalProfit: "Accumulated Dividend",
            investmentNote: "Net Flow (Deposits - Withdrawals)",
            dividendNote: "Including Bonuses",
            startVerification: "Start Verification",
            resumeVerification: "Resume Verification",
            expectedMonthly: "Expected Monthly Dividend",
            projectedYearly: "Projected Yearly Dividend",
            dividendRateDesc: "based on current tier dividend rate",
            basedOn: "Based on",
            dividendTrends: "Dividend Trends",
            noDividendData: "No dividend data yet",
            latestActivity: "Latest Activity",
            noTxFound: "No transactions found",
            deposit: "Deposit",
            withdraw: "Withdraw",
            noTier: "-",
            activeStatus: "Active Status",
            currentPackage: "Current Tier",
            depositTitle: "New Deposit",
            amountMYR: "Amount (USD)",
            transferDate: "Transfer Date",
            bankReceipt: "Bank Receipt / Proof of Transfer",
            selectDocument: "Select Document",
            confirmDeposit: "Submit Deposit",
            withdrawTitle: "Request Withdrawal",
            requestWithdraw: "Continue to PIN",
            securityPin: "Security PIN",
            enterPin: "Please enter your 6-digit security PIN to authorize this withdrawal.",
            confirmWithdraw: "Confirm Withdrawal",
            cancelTx: "Cancel Transaction",
            successTitle: "Submission Successful",
            successDesc: "Your request has been received and is now being processed by our finance team.",
            docSubmitted: "Documents Received",
            docSubmittedDesc: "Your verification request has been updated. Our team will review it within 24-48 hours.",
            totalPrincipal: "Total Principal Capital",
            lifetimeDeposit: "Lifetime Deposits",
            totalWithdraw: "Total Withdrawn",
            member: "Member",
        },
        zh: {
            verificationInProgress: "审核中",
            verificationInProgressDesc: "我们的合规团队正在审核您的文档。帐户访问就绪后，您将收到通知。",
            verificationUnsuccessful: "审核未通过",
            verificationUnsuccessfulDesc: "我们无法验证您的文档。请查看以下原因并重新提交您的详细信息。",
            rejectionReasonLabel: "未提供原因",
            reuploadPrompt: "请仔细检查您的信息并提供清晰的文档照片。",
            reuploadBtn: "重新提交验证",
            completeProfile: "完善您的资料",
            completeProfileDesc: "要开始投资并赚取每月分红，请完成您的身份识别流程。",
            totalEquity: "总投资额",
            totalProfit: "累计分红",
            investmentNote: "净流量 (存款 - 提款)",
            dividendNote: "包括奖金",
            startVerification: "开始验证",
            resumeVerification: "继续验证",
            expectedMonthly: "预计每月分红",
            projectedYearly: "预计年度分红",
            dividendRateDesc: "基于当前等级分红率",
            basedOn: "基于",
            dividendTrends: "分红趋势",
            noDividendData: "暂无分红数据",
            latestActivity: "近期活动",
            noTxFound: "未找到交易",
            deposit: "存款",
            withdraw: "提款",
            noTier: "-",
            activeStatus: "活跃会员",
            currentPackage: "当前等级",
            depositTitle: "新存款",
            amountMYR: "金额 (USD)",
            transferDate: "转账日期",
            bankReceipt: "银行收据 / 转账凭证",
            selectDocument: "选择文件",
            confirmDeposit: "提交存款",
            withdrawTitle: "申请提款",
            requestWithdraw: "继续输入密码",
            securityPin: "安全密码",
            enterPin: "请输入您的 6 位安全密码以授权此提款。",
            confirmWithdraw: "确认提款",
            cancelTx: "取消交易",
            successTitle: "提交成功",
            successDesc: "您的请求已收到，财务团队正在处理中。",
            docSubmitted: "文档已接收",
            docSubmittedDesc: "您的验证请求已更新。我们的团队将在 24-48 小时内进行审核。",
            totalWithdraw: "总提款额",
            walletBalance: "可用分红",
            lifetimeDeposit: "累计充值",
            totalPrincipal: "总本金",
            member: "会员",
        }
    }[lang];

    const handleProtectedAction = (e: React.MouseEvent, onSuccess: () => void) => {
        e.preventDefault();
        if (user?.is_verified) {
            onSuccess();
        } else if (user?.kyc_status === 'Pending') {
            setActionToast({
                message: "Your documents are under review. Access will be granted shortly."
            });
        } else {
            setActionToast({
                message: "KYC required",
                actionText: "Verify Now",
                actionUrl: `/dashboard/kyc`
            });
        }
    };

    if (isCheckingAuth && !user) {
        return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;
    }

    return (
        <div className="space-y-12">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-2 mt-4 animate-in slide-in-from-top-4 duration-700">
                <div className="space-y-4">
                    <div className="hidden md:flex items-center gap-3">
                        <div className="h-0.5 w-10 bg-gv-gold rounded-full"></div>
                        <span className="text-gv-gold text-[10px] font-black uppercase tracking-[0.4em] mb-0.5">Institutional Access</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-gray-900 leading-none">
                            {lang === "en" ? "Overview" : "概览"}
                        </h1>
                        
                        {user?.is_verified && (
                            <div className="flex items-center gap-3 bg-white border border-gray-200 px-4 py-2.5 rounded-2xl shadow-sm hover:shadow-xl hover:border-gv-gold/30 transition-all group scale-90 origin-left">
                                <TierMedal 
                                    tierId={(user?.tier && user?.tier !== "Standard") ? user.tier.toLowerCase() : getTierByAmount(Number(user?.total_investment_usd || 0)).id} 
                                    size="sm" 
                                    className="group-hover:rotate-12 transition-transform"
                                />
                                <div className="flex flex-col">
                                    <span className="text-xs font-black uppercase tracking-tighter text-gray-900">
                                        {(user?.tier && user?.tier !== "Standard") ? user.tier : getTierByAmount(Number(user?.total_investment_usd || 0)).name}
                                    </span>
                                    <span className="text-[8px] font-bold text-gv-gold uppercase tracking-widest leading-none mt-0.5">{t.activeStatus}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="space-y-10">
                {(!user?.is_verified && user?.email !== "thenja96@gmail.com") ? (
                    (user?.kyc_status === 'Pending' || user?.kyc_status === 'pending') ? (
                        <div className="bg-amber-400/10 border border-amber-400/20 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-in fade-in duration-700 max-w-4xl mx-auto">
                            <div className="h-12 w-12 bg-amber-400/20 rounded-full flex items-center justify-center shrink-0">
                                <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-xl font-bold text-amber-500">{t.verificationInProgress}</h2>
                                <p className="text-gray-500 text-sm leading-relaxed">{t.verificationInProgressDesc}</p>
                            </div>
                        </div>
                    ) : (user?.kyc_status === 'Rejected' || user?.kyc_status === 'rejected') ? (
                        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-6 animate-in fade-in duration-700 justify-between max-w-4xl mx-auto">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <div className="h-12 w-12 bg-red-500/20 rounded-full flex items-center justify-center shrink-0">
                                    <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-xl font-bold text-red-500">{t.verificationUnsuccessful}</h2>
                                    <p className="text-gray-500 text-sm leading-relaxed">
                                        {t.verificationUnsuccessfulDesc} <span className="text-gray-900 font-medium ml-1 bg-red-500/20 px-2 py-0.5 rounded-md">{user?.rejection_reason || t.rejectionReasonLabel}</span>
                                    </p>
                                </div>
                            </div>
                            <Link href={`/verify?lang=${lang}`} className="shrink-0 bg-red-500/20 text-red-500 hover:bg-red-500/30 font-bold px-6 py-3 rounded-xl transition-all text-sm">{t.reuploadBtn}</Link>
                        </div>
                    ) : (
                        <div className="bg-gv-gold/5 border border-gv-gold/20 p-8 rounded-[32px] flex flex-col md:flex-row items-center gap-8 animate-in fade-in duration-700 justify-between relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <svg className="h-32 w-32 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 d9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
                                <div className="h-16 w-16 bg-gv-gold/20 rounded-full flex items-center justify-center shrink-0 text-gv-gold">
                                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black uppercase tracking-tighter text-gv-gold">{t.completeProfile}</h2>
                                    <p className="text-gray-500 text-sm leading-relaxed max-w-lg">{t.completeProfileDesc}</p>
                                </div>
                            </div>
                            <Link href={`/verify?lang=${lang}`} className="relative z-10 shrink-0 bg-gv-gold text-black hover:bg-gv-gold/90 font-black uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-[0_10px_20px_rgba(212,175,55,0.15)]">{t.startVerification}</Link>
                        </div>
                    )
                ) : (
                    <>
                        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Total Investment Card */}
                            <div className="bg-white border border-gray-200 p-8 rounded-[32px] shadow-sm hover:shadow-lg hover:border-gv-gold/30 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                                    <svg className="h-32 w-32 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div className="relative z-10">
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4 group-hover:text-gv-gold transition-colors">{t.totalEquity}</p>
                                    <h2 className="text-4xl font-black tracking-tighter text-gray-900 tabular-nums whitespace-nowrap">$ {(user?.total_investment_usd ?? (Number(user?.total_investment || 0) / forexRate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t.lifetimeDeposit}</span>
                                        <span className="text-xs font-black text-gray-900">$ {(user?.total_deposited_usd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Total Dividends Card */}
                            <div className="bg-white border border-gray-200 p-8 rounded-[32px] shadow-sm hover:shadow-lg hover:border-gv-gold/30 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                                    <svg className="h-32 w-32 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                </div>
                                <div className="relative z-10">
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4 group-hover:text-gv-gold transition-colors">{t.totalProfit}</p>
                                    <h2 className="text-4xl font-black tracking-tighter text-emerald-600 tabular-nums whitespace-nowrap">$ {(user?.lifetime_dividends_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                                    <div className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                        ≈ RM {(user?.accumulated_dividend_rm || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{lang === 'en' ? 'Available Dividend' : t.walletBalance}</span>
                                        <div className="text-right">
                                            <span className="block text-xs font-black text-gv-gold tabular-nums">$ {(user?.profit_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-tighter leading-none mt-1">≈ RM {(user?.profit_rm || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-gray-50 border border-gray-200 p-8 rounded-[32px] relative overflow-hidden group">
                                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-4">{t.expectedMonthly}</p>
                                {(() => {
                                    const tier = (user?.tier && user?.tier !== "Standard") 
                                        ? TIERS.find(te => te.name === user.tier) || getTierByAmount(Number(user?.total_investment_usd || 0))
                                        : getTierByAmount(Number(user?.total_investment_usd || 0));
                                    const maxUSD = Number(user?.total_investment_usd || 0) * tier.maxDividend;
                                    return (
                                        <>
                                            <h3 className="text-2xl font-black text-gray-900 tabular-nums whitespace-nowrap"><span className="text-[10px] font-normal normal-case opacity-60 mr-1">up to</span>$ {maxUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h3>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase mt-4">{t.dividendRateDesc} ({t.basedOn} {tier.name})</p>
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="bg-gray-50 border border-gray-200 p-10 rounded-[40px] relative overflow-hidden group">
                                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-4">{t.projectedYearly}</p>
                                {(() => {
                                    const tier = (user?.tier && user?.tier !== "Standard") 
                                        ? TIERS.find(te => te.name === user.tier) || getTierByAmount(Number(user?.total_investment_usd || 0))
                                        : getTierByAmount(Number(user?.total_investment_usd || 0));
                                    const maxUSD = Number(user?.total_investment_usd || 0) * ((tier.maxDividend * 12) + (tier.yearlyBonus || 0));
                                    return (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-2xl font-black text-emerald-500 tabular-nums whitespace-nowrap"><span className="text-[10px] font-normal normal-case opacity-60 mr-1">up to</span>$ {maxUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h3>
                                                {tier.yearlyBonus && (
                                                    <div className="bg-gv-gold/10 border border-gv-gold/30 px-2 py-0.5 rounded-full animate-pulse shrink-0">
                                                        <span className="text-gv-gold text-[8px] font-black uppercase tracking-widest">+{ (tier.yearlyBonus * 100).toFixed(0) }% Bonus Included</span>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase mt-4">{t.dividendRateDesc} ({t.basedOn} {tier.name})</p>
                                        </>
                                    );
                                })()}
                            </div>
                        </section>

                        {Number(user?.total_investment || 0) === 0 && (
                            <div className="bg-gv-gold/5 border border-gv-gold/20 p-10 rounded-[40px] flex flex-col items-center justify-center text-center">
                                <div className="h-14 w-14 bg-gv-gold/20 text-gv-gold rounded-full flex items-center justify-center mb-4 ring-1 ring-gv-gold/30">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                </div>
                                <h2 className="text-2xl font-black tracking-tighter text-gray-900 mb-2 uppercase">{lang === 'en' ? 'Start Investing Now' : '立即开始投资'}</h2>
                                <p className="text-gray-500 text-[10px] font-medium mb-6 max-w-[250px] uppercase tracking-wider">{lang === 'en' ? 'Choose from our tier packages to start earning daily dividends.' : '探索我们专业的理财产品，开启您的财富增长之旅。'}</p>
                                <a href="/dashboard/products" className="bg-gv-gold text-black font-black uppercase tracking-widest text-[10px] px-8 py-3.5 rounded-2xl shadow-xl hover:-translate-y-1 hover:shadow-gv-gold/40 transition-all border border-gv-gold/50">{lang === 'en' ? 'View Products' : '查看产品'}</a>
                            </div>
                        )}

                        {/* User Profile Section */}
                        <section className="bg-white border border-gray-200 rounded-[32px] overflow-hidden shadow-sm">
                            <div 
                                onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                                className="bg-slate-900 px-8 py-5 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <h3 className="text-white text-[10px] font-black uppercase tracking-[0.3em]">{lang === 'en' ? 'User Profile' : '用户资料'}</h3>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="hidden sm:flex items-center gap-2">
                                        <svg className="h-4 w-4 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 d9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                        <span className="text-gv-gold text-[8px] font-black uppercase tracking-widest">{lang === 'en' ? 'Identity Verified' : '身份已验证'}</span>
                                    </div>
                                    <div className={`p-2 rounded-lg bg-white/5 text-white/50 group-hover:text-white transition-all ${isProfileExpanded ? 'rotate-180' : ''}`}>
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>
                            
                            {isProfileExpanded && (
                                <>
                                    <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                        {/* Identity Group */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black uppercase text-gv-gold tracking-widest border-b border-gray-100 pb-2 flex items-center justify-between">
                                                {lang === 'en' ? 'Identity & Contact' : '身份与联系方式'}
                                                <svg className="h-3 w-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            </h4>
                                            <div className="space-y-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{lang === 'en' ? 'Full Name' : '全名'}</span>
                                                    <span className="text-xs font-black text-gray-900 tracking-tight">{user?.kyc_data?.full_name || user?.full_name || '-'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{lang === 'en' ? 'Legal Document' : '法定证件'}</span>
                                                    <span className="text-xs font-mono font-bold text-gray-700">{user?.kyc_data?.id_type || '-'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{lang === 'en' ? 'Verified Phone' : '验证电话'}</span>
                                                    <span className="text-xs font-mono font-bold text-gray-900 tracking-tighter">{user?.kyc_data?.phone || user?.phone || '-'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{lang === 'en' ? 'Primary Address' : '主要地址'}</span>
                                                    <span className="text-[10px] font-bold text-gray-600 leading-tight">{user?.kyc_data?.address || '-'}, {user?.kyc_data?.country || '-'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Financial Group */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black uppercase text-gv-gold tracking-widest border-b border-gray-100 pb-2 flex items-center justify-between">
                                                {lang === 'en' ? 'Financial Profile' : '财务概况'}
                                                <svg className="h-3 w-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </h4>
                                            <div className="space-y-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{lang === 'en' ? 'Employment Status' : '就业状态'}</span>
                                                    <span className="text-xs font-black text-gray-900 tracking-tight">{user?.kyc_data?.employment_status || '-'} ({user?.kyc_data?.industry || '-'})</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{lang === 'en' ? 'Annual Income Range' : '年收入范围'}</span>
                                                    <span className="text-xs font-black text-gray-700 tracking-tight">{user?.kyc_data?.annual_income || '-'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{lang === 'en' ? 'Est. Total Wealth' : '预估总财富'}</span>
                                                    <span className="text-xs font-black text-gray-900 tracking-tight">{user?.kyc_data?.total_wealth || '-'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{lang === 'en' ? 'Source of Wealth' : '财富来源'}</span>
                                                    <span className="text-[10px] font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 mt-1">
                                                        {Array.isArray(user?.kyc_data?.source_of_wealth) ? user.kyc_data.source_of_wealth.join(", ") : (user?.kyc_data?.source_of_wealth || '-')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Banking Group */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black uppercase text-gv-gold tracking-widest border-b border-gray-100 pb-2 flex items-center justify-between">
                                                {lang === 'en' ? 'Institutional Banking' : '机构银行业务'}
                                                <svg className="h-3 w-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 10h18M7 15h1m4 0h1m4 0h1m-7 4h12a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            </h4>
                                            <div className="space-y-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{lang === 'en' ? 'Institution Name' : '机构名称'}</span>
                                                    <span className="text-xs font-black text-gray-900 tracking-tight">{user?.kyc_data?.bank_name || user?.bank_name || '-'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{lang === 'en' ? 'Verified Account Number' : '验证账号'}</span>
                                                    <span className="text-sm font-mono font-black text-gv-gold select-all tracking-tighter">{user?.kyc_data?.account_number || user?.account_number || '-'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{lang === 'en' ? 'Account Purpose' : '账户用途'}</span>
                                                    <span className="text-xs font-black text-gray-900 tracking-tight">{user?.kyc_data?.account_purpose || '-'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{lang === 'en' ? 'Verified Account Holder' : '验证账户持有人'}</span>
                                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-tight">{user?.kyc_data?.bank_account_holder || user?.bank_account_holder || '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 px-8 py-3 border-t border-gray-100 flex items-center justify-between">
                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{lang === 'en' ? 'Security: This information is confidential and visible only to you.' : '安全：此信息属机密，仅限您查看。'}</span>
                                        <div className="flex items-center gap-1">
                                            <div className="h-1 w-1 rounded-full bg-gray-300"></div>
                                            <div className="h-1 w-1 rounded-full bg-gray-300"></div>
                                            <div className="h-1 w-1 rounded-full bg-gray-300"></div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </section>
                        
                        <section className="flex flex-col sm:flex-row gap-6 mt-10">
                            <Link
                                href={`/dashboard/deposit?lang=${lang}`}
                                className="flex-1 bg-gv-gold text-black font-black text-lg py-5 rounded-[24px] hover:bg-gv-gold/90 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 shadow-[0_15px_30px_rgba(212,175,55,0.2)]"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>
                                {t.deposit}
                            </Link>
                            <Link
                                href={`/dashboard/withdraw?lang=${lang}`}
                                className="flex-1 bg-gray-100 text-gray-900 font-black text-lg py-5 rounded-[24px] hover:bg-gray-200 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 border border-gray-300"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                {t.withdraw}
                            </Link>
                        </section>
                    </>
                )}
            </div>

            {/* Action Toast */}
            {actionToast && (
                <div className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 z-[600] bg-gray-50 border border-gv-gold/30 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-5 w-[90%] sm:max-w-sm">
                    <div className="flex flex-col gap-4">
                        <p className="text-gray-900 font-black text-sm uppercase tracking-widest">{actionToast.message}</p>
                        {actionToast.actionUrl && (
                            <button onClick={() => { setActionToast(null); router.push(actionToast.actionUrl!); }} className="bg-gv-gold text-black font-black py-3 rounded-xl uppercase tracking-widest text-xs">{actionToast.actionText}</button>
                        )}
                        <button onClick={() => setActionToast(null)} className="text-gray-400 hover:text-gray-900 text-[10px] font-bold uppercase tracking-widest">Dismiss</button>
                    </div>
                </div>
            )}
        </div>
    );
}
