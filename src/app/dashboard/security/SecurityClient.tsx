"use client";

import React, { useState } from "react";
import { useUser } from "@/providers/UserProvider";
import { supabase } from "@/lib/supabaseClient";

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
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
            <div className="bg-[#1a1a1a] border border-white/5 p-8 rounded-3xl shadow-2xl relative overflow-hidden group max-w-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/5 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-1000"></div>
                <div className="relative z-10 space-y-10">
                    <div className="mb-10 p-6 bg-gv-gold/10 border border-gv-gold/20 rounded-3xl">
                        <h4 className="text-gv-gold font-black uppercase text-xs tracking-widest mb-2 flex items-center gap-2">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A3.323 3.323 0 0010.605 7.88a3.323 3.323 0 01-4.651 4.651 3.323 3.323 0 00-4.651 4.651 3.323 3.323 0 01-4.651 4.651 3.323 3.323 0 00-4.651 4.651 3.323 3.323 0 01-4.651 4.651" /></svg>
                            Active Protection
                        </h4>
                        <p className="text-zinc-400 text-xs font-medium leading-relaxed">
                            {lang === 'en' 
                                ? "Withdrawals are secured by your unique 6-digit Security PIN established during account registration."
                                : "提款由您在开户时设置的唯一 6 位安全密码保护。"}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold uppercase tracking-tight text-white">{t.securityTitle}</h2>
                        <p className="text-zinc-500 font-medium leading-relaxed max-w-lg">{t.securitySubtitle}</p>
                    </div>

                    <form onSubmit={handlePasswordUpdate} className="grid gap-6">
                        {[
                            { label: t.currentPass, name: "currentPassword" },
                            { label: t.newPass, name: "newPassword" },
                            { label: t.confirmPass, name: "confirmPassword" },
                        ].map((field, i) => (
                            <div key={i} className="space-y-2">
                                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">{field.label}</label>
                                <input
                                    name={field.name}
                                    type="password"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-base font-bold focus:outline-none focus:border-gv-gold transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        ))}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-gv-gold text-black font-black py-4 rounded-xl uppercase tracking-widest text-sm shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-4 mt-8"
                        >
                            {isSubmitting ? <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : t.updateBtn}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
