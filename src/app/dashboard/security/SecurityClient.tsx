"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/providers/UserProvider";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft } from "lucide-react";

export default function SecurityClient({ lang }: { lang: "en" | "zh" }) {
    const router = useRouter();
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
        <div className="space-y-12 animate-in fade-in duration-700 pb-20">
            {/* Standard Header */}
            <div className="flex items-center gap-6">
                <button 
                    onClick={() => router.push(`/dashboard?lang=${lang}`)}
                    className="h-12 w-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gv-gold transition-all shadow-sm hover:shadow-md"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">{t.securityTitle}</h1>
                    <p className="text-gray-400 text-sm font-medium">{t.securitySubtitle}</p>
                </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-8 rounded-3xl shadow-2xl relative overflow-hidden group max-w-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gv-gold/5 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-gv-gold/10 transition-all duration-1000"></div>
                <div className="relative z-10 space-y-10">

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
                                    className="w-full bg-white border border-gray-200 rounded-xl p-4 text-base font-bold focus:outline-none focus:border-gv-gold transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        ))}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-gv-gold text-black font-black py-5 rounded-2xl uppercase tracking-widest text-lg shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-4 mt-8"
                        >
                            {isSubmitting ? <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : t.updateBtn}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
