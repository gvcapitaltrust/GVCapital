"use client";

import React, { useState } from "react";
import { useUser } from "@/providers/UserProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { getTierByAmount } from "@/lib/tierUtils";
import { X } from "lucide-react";
import PremiumLoader from "@/components/PremiumLoader";

export default function ReferralsClient({ lang }: { lang: "en" | "zh" }) {
    const { userProfile: user, referredUsers, referredCount, loading } = useUser();
    const { forexRate } = useSettings();
    const [actionToast, setActionToast] = useState<{message: string} | null>(null);

    const t = {
        en: {
            referTitle: "Refer a Friend",
            referSubtitle: "Invite others to join GV Capital and grow the community together.",
            copyCode: "Copy Code",
            copied: "Copied!",
            shareWA: "Share on WhatsApp",
            totalReferred: "Total Friends Referred",
            referredUsersList: "Your Referral Network",
            username: "Username",
            registrationDate: "Registration Date",
            investmentTier: "Investment Tier",
            accountStatus: "Account Status",
            noReferrals: "No referrals yet",
            verified: "Verified",
            unverified: "Unverified",
            noInvestment: "No Investment"
        },
        zh: {
            referTitle: "推荐好友",
            referSubtitle: "邀请他人加�?GV Capital，共同发展社区�?,
            copyCode: "复制代码",
            copied: "已复制！",
            shareWA: "分享�?WhatsApp",
            totalReferred: "推荐好友总数",
            referredUsersList: "您的推荐网络",
            username: "用户�?,
            registrationDate: "注册日期",
            investmentTier: "投资等级",
            accountStatus: "账户状�?,
            noReferrals: "暂无推荐记录",
            verified: "已验�?,
            unverified: "未验�?,
            noInvestment: "暂无投资"
        }
    }[lang];

    const copyToClipboard = () => {
        if (!user?.username) return;
        navigator.clipboard.writeText(user.username);
        setActionToast({ message: t.copied });
        setTimeout(() => setActionToast(null), 3000);
    };

    if (loading) return <div className="flex items-center justify-center p-20"><PremiumLoader /></div>;

    return (
        <div className="space-y-16 pb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header / Share Section */}
            <div className="premium-glass bg-white border border-slate-200 p-10 sm:p-14 rounded-[56px] shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gv-gold/[0.03] blur-[150px] -translate-y-1/2 translate-x-1/4 pointer-events-none group-hover:bg-gv-gold/5 transition-all duration-1000"></div>
                <div className="relative z-10 grid grid-cols-1 xl:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8">
                        <div className="space-y-2">
                             <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">{t.referTitle}</h2>
                             <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] opacity-80 leading-relaxed max-w-md">{t.referSubtitle}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-6">
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex-1 flex items-center justify-between group/code active:scale-95 transition-transform">
                                <span className="text-gv-gold font-black tracking-[0.4em] uppercase text-sm">{user?.username}</span>
                                <button onClick={copyToClipboard} className="text-slate-400 hover:text-slate-900 transition-colors text-[10px] font-black uppercase tracking-[0.3em] pl-6 border-l border-slate-200">{t.copyCode}</button>
                            </div>
                            <button 
                                onClick={() => window.open(`https://wa.me/?text=Join%20GV%20Capital%20using%20my%20code:%20${user?.username}`, '_blank')}
                                className="group/wa relative bg-emerald-500 hover:bg-emerald-400 text-black font-black px-10 py-6 rounded-[24px] flex items-center justify-center gap-4 transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:-translate-y-1 active:scale-95 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 blur-xl opacity-0 group-hover/wa:opacity-100 transition-opacity"></div>
                                <svg className="h-6 w-6 relative z-10" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                <span className="relative z-10">{t.shareWA}</span>
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center bg-gv-gold/10 border border-gv-gold/20 rounded-[40px] p-10 text-center group-hover:border-gv-gold/40 transition-all shadow-[0_0_40px_rgba(212,175,55,0.1)] relative overflow-hidden">
                        <div className="absolute inset-0 bg-gv-gold/5 blur-[20px] animate-pulse"></div>
                        <p className="text-slate-400 font-extrabold uppercase tracking-[0.4em] mb-6 text-[10px] relative z-10">{t.totalReferred}</p>
                        <h3 className="text-7xl font-black tracking-tighter text-slate-900 tabular-nums drop-shadow-[0_0_15px_rgba(212,175,55,0.4)] relative z-10">{referredCount}</h3>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="space-y-8 relative z-10">
                <div className="flex items-center gap-6">
                    <div className="h-0.5 w-12 bg-gv-gold/40 rounded-full"></div>
                    <h3 className="text-2xl font-black uppercase tracking-[0.3em] text-slate-900 underline-offset-8">{t.referredUsersList}</h3>
                </div>
                <div className="premium-glass bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-xl">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left min-w-[800px] border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">
                                    <th className="px-8 py-6">{t.username}</th>
                                    <th className="px-8 py-6">{t.registrationDate}</th>
                                    <th className="px-8 py-6">{t.investmentTier}</th>
                                    <th className="px-8 py-6 text-right">{t.accountStatus}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium tabular-nums text-slate-900">
                                {referredUsers.map((ref, idx) => (
                                    <tr key={idx} className="text-sm border-b border-slate-50 hover:bg-slate-50/50 transition-colors group/row">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-gv-gold/10 border border-gv-gold/30 flex items-center justify-center text-xs font-black text-gv-gold shadow-[0_0_15px_rgba(212,175,55,0.05)] group-hover/row:scale-110 transition-transform">
                                                    {ref.full_name?.[0] || 'U'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-slate-900 font-black uppercase tracking-tight group-hover/row:text-gv-gold transition-colors">{ref.full_name || 'Incognito User'}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-80">@{ref.username}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-slate-400 font-black text-xs uppercase tracking-widest tabular-nums">{new Date(ref.created_at).toLocaleDateString()}</td>
                                        <td className="px-8 py-6">
                                            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-gv-gold/80">
                                                {ref.tier && ref.tier !== "Standard" 
                                                    ? ref.tier 
                                                    : ((ref.balance_usd || ref.balance > 0) ? getTierByAmount(ref.balance_usd || (ref.balance / forexRate)).name : '--')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`px-4 py-2 rounded-xl text-[9px] uppercase font-black tracking-widest ${ref.is_verified ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {ref.is_verified ? t.verified : t.unverified}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {referredUsers.length === 0 && (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest">{t.noReferrals}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Action Toast */}
            {actionToast && (
                <div className="fixed bottom-10 right-10 z-[600] premium-glass bg-white border border-slate-200 rounded-[28px] p-8 shadow-xl animate-in fade-in slide-in-from-bottom-10 max-w-sm group/toast relative overflow-hidden">
                    <div className="absolute inset-0 bg-gv-gold/5 blur-xl pointer-events-none"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="h-10 w-10 rounded-xl bg-gv-gold/20 flex items-center justify-center text-gv-gold border border-gv-gold/40">
                             <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <p className="text-slate-900 font-black text-[11px] uppercase tracking-[0.3em] leading-loose">{actionToast.message}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
