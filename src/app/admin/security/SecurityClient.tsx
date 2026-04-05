"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/providers/AdminProvider";
import { useAuth } from "@/providers/AuthProvider";
import { ArrowLeft } from "lucide-react";

export default function SecurityClient({ lang }: { lang: "en" | "zh" }) {
    const router = useRouter();
    const { handleUpdatePassword } = useAdmin();
    const { user: authUser } = useAuth();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    const t = {
        en: {
            title: "Administrative Security",
            subtitle: "Manage your administrative access credentials and security protocols.",
            emailLabel: "Admin Identifier (Email)",
            passwordLabel: "New Secure Password",
            confirmLabel: "Confirm New Password",
            updateBtn: "Update Credentials",
            updatingBtn: "Securing Account...",
            mismatch: "Passwords do not match.",
            success: "Security credentials updated."
        },
        zh: {
            title: "管理安全",
            subtitle: "管理您的管理访问凭据和安全协议。",
            emailLabel: "管理员标识 (邮箱)",
            passwordLabel: "新安全密码",
            confirmLabel: "确认新密码",
            updateBtn: "更新凭据",
            updatingBtn: "正在保护账户...",
            mismatch: "密码不匹配。",
            success: "安全凭据已更新。"
        }
    }[lang];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert(t.mismatch);
            return;
        }
        setIsUpdating(true);
        await handleUpdatePassword(password);
        setPassword("");
        setConfirmPassword("");
        setIsUpdating(false);
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
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

            <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-[40px] p-10 space-y-10 shadow-2xl relative overflow-hidden">
                <div className="text-center space-y-4">
                    <div className="h-20 w-20 bg-gv-gold/10 border border-gv-gold/20 rounded-[30px] flex items-center justify-center mx-auto shadow-2xl">
                        <svg className="h-10 w-10 text-gv-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-2 opacity-50">
                        <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest px-1">{t.emailLabel}</label>
                        <input
                            type="email"
                            readOnly
                            value={authUser?.email || ""}
                            className="w-full bg-gray-100 border border-gray-200 rounded-2xl p-4 text-xs font-bold text-gray-400 outline-none cursor-not-allowed"
                        />
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest px-1">{t.passwordLabel}</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-100 border border-gray-200 rounded-2xl p-5 text-xl font-bold text-gray-900 focus:outline-none focus:border-gv-gold transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest px-1">{t.confirmLabel}</label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-gray-100 border border-gray-200 rounded-2xl p-5 text-xl font-bold text-gray-900 focus:outline-none focus:border-gv-gold transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isUpdating || !password}
                        className="w-full bg-gv-gold text-black font-black py-6 rounded-3xl uppercase tracking-widest text-xs shadow-2xl shadow-gv-gold/20 hover:-translate-y-1 transition-all disabled:opacity-50"
                    >
                        {isUpdating ? t.updatingBtn : t.updateBtn}
                    </button>
                </form>
            </div>
        </div>
    );
}
