"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import GlobalFooter from "@/components/GlobalFooter";
import { supabase } from "@/lib/supabaseClient";
import { useSettings } from "@/providers/SettingsProvider";

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [lang, setLang] = useState<"en" | "zh">("en");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const urlLang = searchParams?.get("lang");
        if (urlLang === "zh") setLang("zh");
        else if (urlLang === "en") setLang("en");

        const error = searchParams?.get('error');
        if (error === 'multiple_devices') {
            setErrorMsg(lang === 'en' 
                ? "You have been logged out because another device has signed in to this account." 
                : "由于另一台设备已登录此账号，您已被登出。");
        } else if (error === 'account_deleted') {
            setErrorMsg(lang === 'en'
                ? "This account no longer exists. Please contact support if you believe this is an error."
                : "此账号已不存在。如果您认为这是错误，请联系支持人员。");
        }

        // Use onAuthStateChange for more stable session detection
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            // Break the flashing loop: Don't auto-redirect if there's an account error in the URL
            const hasError = searchParams?.get('error') === 'account_deleted' || searchParams?.get('error') === 'multiple_devices';
            
            if (session && !hasError) {
                // Sync session to cookie so Next.js middleware can read it before redirecting
                document.cookie = `gv-auth-v1=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=31536000; SameSite=Lax;`;
                const user = session.user;
                const isAdmin = user.user_metadata?.role?.toLowerCase() === "admin" || user.email === "thenja96@gmail.com";
                const redirectPath = isAdmin ? "/admin" : `/dashboard?lang=${urlLang || lang}`;

                // Only redirect if we are authenticated and NOT on the target page
                if (window.location.pathname === "/login") {
                    window.location.href = redirectPath;
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [searchParams, router, lang]);

    const content = {
        en: {
            title: "Client Login",
            subtitle: "Access your private portal",
            emailLabel: "Email Address",
            passwordLabel: "Password",
            button: "Sign In",
            footer: "New to GV Capital? ",
            link: "Create an account",
            placeholder_email: "name@example.com",
            placeholder_pass: "••••••••",
        },
        zh: {
            title: "客户登录",
            subtitle: "访问您的私人门户",
            emailLabel: "电子邮件地址",
            passwordLabel: "密码",
            button: "登 录",
            footer: "初次使用 GV 资本吗？",
            link: "创建一个帐户",
            placeholder_email: "name@example.com",
            placeholder_pass: "••••••••",
        },
    };

    const t = content[lang];


    const { maintenanceMode } = useSettings();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");

        // Check Maintenance Mode (Standardized from useSettings)
        if (maintenanceMode && email.toLowerCase() !== "thenja96@gmail.com") {
            setIsLoading(false);
            router.push('/maintenance');
            return;
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                // Helpful tip for the "Email not confirmed" error (likely older accounts)
                if (error.message.includes("Email not confirmed")) {
                    setErrorMsg("Your account exists but the email is not confirmed. Please contact the administrator or check your inbox.");
                    return;
                }
                throw error;
            }

            if (data.session) {
                // Device ID Management for multi-session enforcement (Limit 2)
                let deviceId = localStorage.getItem("gv_device_session_id");
                if (!deviceId) {
                    deviceId = crypto.randomUUID();
                    localStorage.setItem("gv_device_session_id", deviceId);
                }

                // Fetch current active sessions to update the list
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('active_sessions')
                    .eq('id', data.session.user.id)
                    .single();

                let activeSessions: string[] = Array.isArray(profile?.active_sessions) ? profile.active_sessions : [];
                
                // Add current device if not present, and enforce limit of 2
                if (!activeSessions.includes(deviceId)) {
                    activeSessions.push(deviceId);
                    while (activeSessions.length > 2) {
                        activeSessions.shift(); // Remove oldest sessions until only 2 remain
                    }
                    await supabase
                        .from('profiles')
                        .update({ active_sessions: activeSessions })
                        .eq('id', data.session.user.id);
                }

                document.cookie = `gv-auth-v1=${encodeURIComponent(JSON.stringify(data.session))}; path=/; max-age=31536000; SameSite=Lax;`;
                const user = data.session.user;
                const isAdmin = user.user_metadata?.role?.toLowerCase() === "admin" || user.email === "thenja96@gmail.com";
                window.location.href = isAdmin ? "/admin" : `/dashboard?lang=${lang}`;
            }
        } catch (error: any) {
            setErrorMsg(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center p-6 selection:bg-gv-gold selection:text-black">
            <title>{`Login | GV Capital Trust`}</title>

            <div className="absolute top-8 right-8">
                <button
                    onClick={() => setLang(lang === "en" ? "zh" : "en")}
                    className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-gray-100 transition-all uppercase tracking-widest text-gray-900/50"
                >
                    {lang === "en" ? "简体中文" : "English"}
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md py-20">
                <div className="text-center mb-10">
                    <Link href={`/?lang=${lang}`} className="inline-flex items-center justify-center mb-6">
                        <img
                            src="/logo.png"
                            alt="GV Capital Trust Logo"
                            className="h-[100px] w-auto object-contain  drop-shadow-[0_4px_10px_rgba(212,175,55,0.4)]"
                        />
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2 text-gray-900">{t.title}</h1>
                    <p className="text-gray-400 font-medium">{t.subtitle}</p>
                </div>

                {errorMsg && <div className="w-full bg-red-500/20 border border-red-500/50 p-4 rounded-xl text-red-500 text-sm mb-6">{errorMsg}</div>}

                <form onSubmit={handleLogin} className="w-full space-y-6">
                    <div className="space-y-2">
                        <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.emailLabel}</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gv-gold/50 transition-all font-medium"
                            placeholder={t.placeholder_email}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.passwordLabel}</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gv-gold/50 transition-all font-medium"
                            placeholder={t.placeholder_pass}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gv-gold text-black font-black text-lg py-5 rounded-2xl hover:bg-gv-gold/90 transition-all shadow-[0_10px_30px_rgba(212,175,55,0.2)] uppercase tracking-widest flex items-center justify-center gap-3"
                    >
                        {isLoading ? <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : t.button}
                    </button>
                </form>

                <p className="text-center mt-8 text-gray-400 text-sm font-medium">
                    {t.footer}
                    <Link href={`/register?lang=${lang}`} className="text-gv-gold hover:underline font-bold ml-1">
                        {t.link}
                    </Link>
                </p>
            </div>

            <GlobalFooter />
        </div>
    );
}
