"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/providers/UserProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { getTierByAmount } from "@/lib/tierUtils";
import { CheckCircle2, Copy, Share2, ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import TierMedal from "@/components/TierMedal";

export default function ReferralsClient({ lang }: { lang: "en" | "zh" }) {
    const router = useRouter();
    const { userProfile: user, referredUsers, referredCount, referredTotalCapital, loading } = useUser();
    const { forexRate } = useSettings();
    const [actionToast, setActionToast] = useState<{message: string} | null>(null);

    const t = {
        en: {
            referTitle: "Refer a Friend",
            referSubtitle: "Invite others to join GV Capital and grow the community together.",
            copyCode: "Copy Code",
            copyLink: "Copy Link",
            copied: "Copied!",
            linkCopied: "Link Copied!",
            shareWA: "Share on WhatsApp",
            totalReferred: "Total Friends",
            referredUsersList: "Your Referral Network",
            username: "User Details",
            registrationDate: "Joined Date",
            noReferrals: "No referrals yet",
            teamAssets: "Team Assets",
            capital: "Capital (USD)"
        },
        zh: {
            referTitle: "推荐好友",
            referSubtitle: "邀请他人加入 GV Capital，共同发展社区。",
            copyCode: "复制代码",
            copyLink: "复制链接",
            copied: "已复制！",
            linkCopied: "链接已复制！",
            shareWA: "分享到 WhatsApp",
            totalReferred: "推荐人数",
            referredUsersList: "您的推荐网络",
            username: "用户信息",
            registrationDate: "加入日期",
            noReferrals: "暂无推荐记录",
            teamAssets: "团队资产",
            capital: "资本金额 (USD)"
        }
    }[lang];

    const copyToClipboard = () => {
        if (!user?.username) return;
        navigator.clipboard.writeText(user.username);
        setActionToast({ message: t.copied });
        setTimeout(() => setActionToast(null), 3000);
    };

    const copyLinkToClipboard = () => {
        if (!user?.username) return;
        const link = `${window.location.origin}/register?ref=${user.username}`;
        navigator.clipboard.writeText(link);
        setActionToast({ message: t.linkCopied });
        setTimeout(() => setActionToast(null), 3000);
    };

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;

    return (
        <div className="space-y-8 pb-20">
            {/* Standard Header */}
            <div className="flex items-center gap-6">
                <button 
                    onClick={() => router.push(`/dashboard?lang=${lang}`)}
                    className="h-12 w-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gv-gold transition-all shadow-sm hover:shadow-md"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">{t.referTitle}</h1>
                    <p className="text-gray-400 text-sm font-medium">{t.referSubtitle}</p>
                </div>
            </div>

            {/* Header / Share Section - Simplified & Professional */}
            <div className="bg-white border border-gray-100 p-8 rounded-[32px] shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/5 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-1000"></div>
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
                    <div className="space-y-2 max-w-xl">
                        <h2 className="text-xl font-bold uppercase tracking-tight text-gray-900">{t.referTitle}</h2>
                        <p className="text-gray-400 font-medium text-sm leading-relaxed">{t.referSubtitle}</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-6 min-w-[200px]">
                            <div className="flex flex-col">
                                <span className="text-gray-400 text-[9px] font-black uppercase tracking-widest leading-none mb-1">{lang === 'en' ? 'Your Referral Code' : '您的推荐码'}</span>
                                <span className="text-gv-gold font-black tracking-widest uppercase text-sm leading-none">{user?.username}</span>
                            </div>
                            <button onClick={copyToClipboard} className="text-gray-400 hover:text-gv-gold transition-colors flex items-center gap-2" title={t.copyCode}>
                                <Copy className="h-4 w-4" />
                            </button>
                        </div>
                        <button 
                            onClick={copyLinkToClipboard}
                            className="bg-white border border-gray-200 hover:border-gv-gold text-gray-900 font-bold px-6 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-sm"
                        >
                            <Copy className="h-5 w-5 text-gv-gold" />
                            <span className="text-sm uppercase tracking-wider">{t.copyLink}</span>
                        </button>
                        <button 
                            onClick={() => {
                                const link = `${window.location.origin}/register?ref=${user?.username}`;
                                window.open(`https://wa.me/?text=Join%20GV%20Capital%20Trust%20using%20my%20link:%20${encodeURIComponent(link)}`, '_blank');
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-500/20"
                        >
                            <Share2 className="h-5 w-5" />
                            <span className="text-sm uppercase tracking-wider">{t.shareWA}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Network Section Header with Integrated Metrics */}
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-gray-900">{t.referredUsersList}</h3>
                    <div className="flex items-center gap-3">
                        <div className="bg-gv-gold/5 border border-gv-gold/20 rounded-full px-4 py-2 flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t.totalReferred}:</span>
                            <span className="text-sm font-black text-gv-gold">{referredCount}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-full px-4 py-2 flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t.teamAssets}:</span>
                            <span className="text-sm font-black text-slate-900">$ {referredTotalCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                <div className="border border-gray-200 rounded-[32px] overflow-hidden bg-white shadow-xl shadow-gray-200/20">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left hidden md:table">
                            <thead className="bg-gray-50/50 border-b border-gray-200 text-[10px] text-gray-400 font-extrabold uppercase tracking-[0.2em]">
                                <tr>
                                    <th className="px-6 py-4">{t.username}</th>
                                    <th className="px-6 py-4">{t.registrationDate}</th>
                                    <th className="px-6 py-4 text-right font-black">{t.capital}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {referredUsers.map((ref, idx) => {
                                    const tierId = (ref.tier && ref.tier !== "Standard") 
                                        ? ref.tier.toLowerCase() 
                                        : ((ref.balance_usd > 0 || ref.balance > 0) ? getTierByAmount(ref.balance_usd || (ref.balance / forexRate)).id : "none");

                                    return (
                                        <tr key={idx} className="text-sm font-medium group hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-5">
                                                    <div className="relative">
                                                        <TierMedal tierId={tierId} size="md" className="group-hover:scale-110 transition-transform" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-900 font-black text-[15px] tracking-tight">{ref.full_name || 'Anonymous Investor'}</span>
                                                            {ref.is_verified && (
                                                                <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/10" strokeWidth={2.5} />
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">@{ref.username}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-400 tabular-nums">
                                                {formatDate(ref.created_at)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-gray-900 font-black text-[15px] tabular-nums">
                                                    $ {Number(ref.balance_usd || (ref.balance / forexRate)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {referredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-30">
                                                <div className="h-16 w-16 rounded-full border-2 border-dashed border-gray-400" />
                                                <span className="text-xs font-black uppercase tracking-widest text-gray-500">{t.noReferrals}</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                    {/* Mobile View (Cards) */}
                    <div className="md:hidden divide-y divide-slate-50">
                        {referredUsers.map((ref, idx) => {
                            const tierId = (ref.tier && ref.tier !== "Standard") 
                                ? ref.tier.toLowerCase() 
                                : ((ref.balance_usd > 0 || ref.balance > 0) ? getTierByAmount(ref.balance_usd || (ref.balance / forexRate)).id : "none");

                            return (
                                <div key={idx} className="p-3 space-y-3 hover:bg-slate-50 transition-all flex flex-col group">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <TierMedal tierId={tierId} size="sm" className="group-hover:scale-110 transition-transform" />
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-900 font-black text-[13px] tracking-tight">{ref.full_name || 'Anonymous Investor'}</span>
                                                    {ref.is_verified && (
                                                        <CheckCircle2 className="h-3 w-3 text-emerald-500 fill-emerald-500/10" strokeWidth={3} />
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">@{ref.username}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-gray-900 font-black text-[13px] tabular-nums">
                                                $ {Number(ref.balance_usd || (ref.balance / forexRate)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                            <div className="mt-1 flex justify-end">
                                                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none">
                                                    Joined: {formatDate(ref.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {referredUsers.length === 0 && (
                            <div className="p-20 text-center flex flex-col items-center gap-4 opacity-30">
                                <div className="h-16 w-16 rounded-full border-2 border-dashed border-gray-400" />
                                <span className="text-xs font-black uppercase tracking-widest text-gray-500">{t.noReferrals}</span>
                            </div>
                        )}
                    </div>
                    </div>
                </div>
            </div>

            {/* Action Toast */}
            {actionToast && (
                <div className="fixed bottom-6 right-6 z-[600] bg-slate-900 text-white rounded-2xl px-6 py-4 shadow-2xl animate-in fade-in slide-in-from-bottom-5">
                    <p className="font-black text-xs uppercase tracking-widest">{actionToast.message}</p>
                </div>
            )}
        </div>
    );
}
