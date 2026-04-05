"use client";

import React, { useState } from "react";
import { useUser } from "@/providers/UserProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { getTierByAmount } from "@/lib/tierUtils";
import { X } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";

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
            noInvestment: "No Investment",
            teamAssets: "Team Assets (USD)",
            capital: "Capital (USD)"
        },
        zh: {
            referTitle: "推荐好友",
            referSubtitle: "邀请他人加入 GV Capital，共同发展社区。",
            copyCode: "复制代码",
            copied: "已复制！",
            shareWA: "分享到 WhatsApp",
            totalReferred: "推荐好友总数",
            referredUsersList: "您的推荐网络",
            username: "用户名",
            registrationDate: "注册日期",
            investmentTier: "投资等级",
            accountStatus: "账户状态",
            noReferrals: "暂无推荐记录",
            verified: "已验证",
            unverified: "未验证",
            noInvestment: "暂无投资",
            teamAssets: "团队资产 (USD)",
            capital: "资本金额 (USD)"
        }
    }[lang];

    const copyToClipboard = () => {
        if (!user?.username) return;
        navigator.clipboard.writeText(user.username);
        setActionToast({ message: t.copied });
        setTimeout(() => setActionToast(null), 3000);
    };

    if (loading) return <div className="flex items-center justify-center p-20"><div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>;

    const totalTeamAssetsUSD = (referredUsers || []).reduce((acc, ref) => acc + Number(ref.balance_usd || (ref.balance / forexRate)), 0);


    return (
        <div className="space-y-12 pb-20">
            {/* Header / Share Section */}
            <div className="bg-gray-50 border border-gray-200 p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/5 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-1000"></div>
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold uppercase tracking-tight text-gray-900">{t.referTitle}</h2>
                        <p className="text-gray-400 font-medium text-sm leading-relaxed">{t.referSubtitle}</p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="bg-white border border-gray-200 rounded-2xl p-4 flex-1 flex items-center justify-between">
                                <span className="text-gv-gold font-black tracking-widest uppercase">{user?.username}</span>
                                <button onClick={copyToClipboard} className="text-gray-900 hover:text-gv-gold transition-colors text-xs font-black uppercase tracking-widest pl-4 border-l border-gray-200">{t.copyCode}</button>
                            </div>
                            <button 
                                onClick={() => window.open(`https://wa.me/?text=Join%20GV%20Capital%20using%20my%20code:%20${user?.username}`, '_blank')}
                                className="bg-emerald-500 hover:bg-emerald-600 text-gray-900 font-black px-8 py-5 rounded-2xl flex items-center justify-center gap-3 transition-all"
                            >
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                {t.shareWA}
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col items-center justify-center bg-white border border-gray-200 rounded-3xl p-6 text-center group-hover:bg-gray-100 transition-all">
                            <p className="text-gray-400 font-black uppercase tracking-[0.3em] mb-4 text-[10px]">{t.totalReferred}</p>
                            <h3 className="text-4xl font-bold tracking-tight text-gv-gold tabular-nums">{referredCount}</h3>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-white border border-gray-200 rounded-3xl p-6 text-center group-hover:bg-gray-100 transition-all">
                            <p className="text-gray-400 font-black uppercase tracking-[0.3em] mb-4 text-[10px]">{t.teamAssets}</p>
                            <h3 className="text-4xl font-bold tracking-tight text-slate-900 tabular-nums">
                                $ {totalTeamAssetsUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="space-y-6">
                <h3 className="text-lg font-bold uppercase tracking-tight">{t.referredUsersList}</h3>
                <div className="border border-gray-200 rounded-3xl overflow-hidden bg-white backdrop-blur-md shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-white border-b border-gray-200 text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
                                <tr>
                                    <th className="px-6 py-4">{t.username}</th>
                                    <th className="px-6 py-4">{t.registrationDate}</th>
                                    <th className="px-6 py-4">{t.capital}</th>
                                    <th className="px-6 py-4">{t.investmentTier}</th>
                                    <th className="px-6 py-4 text-right">{t.accountStatus}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {referredUsers.map((ref, idx) => (
                                    <tr key={idx} className="text-sm font-bold group hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-xs font-black text-gv-gold">{ref.full_name?.[0] || 'U'}</div>
                                                <div className="flex flex-col">
                                                    <span className="text-gray-900">{ref.full_name || 'Incognito User'}</span>
                                                    <span className="text-[10px] text-gray-500">@{ref.username}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 font-mono text-xs">{formatDate(ref.created_at)}</td>
                                        <td className="px-6 py-4 text-gray-900 font-black tabular-nums">
                                            $ {Number(ref.balance_usd || (ref.balance / forexRate)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4">
                                                {ref.tier && ref.tier !== "Standard" 
                                                    ? ref.tier 
                                                    : ((ref.balance_usd || ref.balance > 0) ? getTierByAmount(ref.balance_usd || (ref.balance / forexRate)).name : t.noInvestment)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`px-4 py-2 rounded-xl text-[9px] uppercase font-black tracking-widest ${ref.is_verified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500'}`}>
                                                {ref.is_verified ? t.verified : t.unverified}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {referredUsers.length === 0 && (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-bold uppercase tracking-widest">{t.noReferrals}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Action Toast */}
            {actionToast && (
                <div className="fixed bottom-6 right-6 z-[600] bg-gray-50 border border-gv-gold/30 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-5 max-w-sm">
                    <p className="text-gray-900 font-black text-sm uppercase tracking-widest leading-relaxed">{actionToast.message}</p>
                </div>
            )}
        </div>
    );
}
