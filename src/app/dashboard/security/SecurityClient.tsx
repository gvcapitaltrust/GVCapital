"use client";

import React, { useState } from "react";
import { useUser } from "@/providers/UserProvider";
import { supabase } from "@/lib/supabaseClient";
import PremiumLoader from "@/components/PremiumLoader";

export default function SecurityClient({ lang }: { lang: "en" | "zh" }) {
    const { userProfile: user } = useUser();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const t = {
        en: {
            securityTitle: "Security Settings",
            securitySubtitle: "Maintain the highest level of security for your institutional account by regularly updating your access credentials.",
            currentPass: "Current Password",
            newPass: "New Password",
            confirmPass: "Confirm New Password",
            updateBtn: "Update Credentials",
            passwordSuccess: "Password updated successfully.",
            passwordError: "Incorrect current password or mismatch in new passwords.",
        },
        zh: {
            securityTitle: "安全设置",
            securitySubtitle: "通过定期更新您的访问凭据，为您的机构账户提供最高级别的安全保护。",
            currentPass: "当前密码",
            newPass: "新密码",
            confirmPass: "确认新密码",
            updateBtn: "更新凭据",
            passwordSuccess: "密码更新成功。",
            passwordError: "当前密码不正确或新密码不匹配。",
        }
    }[lang];

    const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const currentPassword = formData.get("currentPassword") as string;
        const newPassword = formData.get("newPassword") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (newPassword !== confirmPassword) {
            alert(t.passwordError);
            return;
        }

        setIsSubmitting(true);
        // Supabase update password logic
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) alert(error.message);
        else alert(t.passwordSuccess);
        setIsSubmitting(false);
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
            <div className="premium-glass bg-black/40 border-white/10 p-10 md:p-14 rounded-[48px] shadow-2xl relative overflow-hidden group max-w-2xl border border-gv-gold/5">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gv-gold/[0.03] blur-[120px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/[0.05] transition-all duration-1000 pointer-events-none"></div>
                <div className="relative z-10 space-y-12">
                    <div className="mb-12 p-8 bg-gv-gold/10 border border-gv-gold/20 rounded-[32px] backdrop-blur-3xl relative overflow-hidden group/alert">
                        <div className="absolute inset-0 bg-gv-gold/[0.03] animate-pulse"></div>
                        <h4 className="text-gv-gold font-black uppercase text-[10px] tracking-[0.4em] mb-4 flex items-center gap-3 relative z-10 transition-transform group-hover/alert:translate-x-1">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A3.323 3.323 0 0010.605 7.88a3.323 3.323 0 01-4.651 4.651 3.323 3.323 0 00-4.651 4.651 3.323 3.323 0 01-4.651 4.651 3.323 3.323 0 00-4.651 4.651 3.323 3.323 0 01-4.651 4.651" /></svg>
                            Active Protection
                        </h4>
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.15em] leading-loose opacity-80 relative z-10">
                            {lang === 'en' 
                                ? "Withdrawals are secured by your unique 6-digit Security PIN established during account registration."
                                : "提款由您在开户时设置的唯一 6 位安全密码保护。"}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-white underline decoration-gv-gold decoration-4 underline-offset-8 decoration-gv-gold/20">{t.securityTitle}</h2>
                        <p className="text-gray-500 text-[10px] uppercase font-black tracking-[0.25em] opacity-60 leading-relaxed max-w-lg">{t.securitySubtitle}</p>
                    </div>

                    <form onSubmit={handlePasswordUpdate} className="grid gap-6">
                        {[
                            { label: t.currentPass, name: "currentPassword" },
                            { label: t.newPass, name: "newPassword" },
                            { label: t.confirmPass, name: "confirmPassword" },
                        ].map((field, i) => (
                            <div key={i} className="space-y-2">
                                <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{field.label}</label>
                                <input
                                    name={field.name}
                                    type="password"
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-base font-bold focus:outline-none focus:border-gv-gold/50 focus:bg-black/60 transition-all text-white placeholder:text-white/10 shadow-inner"
                                    placeholder="••••••••"
                                />
                            </div>
                        ))}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-gv-gold text-black font-black py-6 rounded-[24px] uppercase tracking-[0.3em] text-xs shadow-[0_20px_40px_rgba(212,175,55,0.2)] hover:shadow-[0_25px_50px_rgba(212,175,55,0.3)] hover:-translate-y-1 transition-all flex items-center justify-center gap-4 mt-12 active:scale-95 group"
                        >
                            <div className="absolute inset-0 bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                            {isSubmitting ? <PremiumLoader size="sm" color="black" /> : <span className="relative z-10">{t.updateBtn}</span>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
