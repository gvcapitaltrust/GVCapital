"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import GlobalFooter from "@/components/GlobalFooter";
import { supabase } from "@/lib/supabaseClient";

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

        // Use onAuthStateChange for more stable session detection
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                const user = session.user;
                const isAdmin = user.user_metadata?.role === "Admin" || user.email === "admin@gvcapital.trust";
                const redirectPath = isAdmin ? "/admin" : `/dashboard?lang=${urlLang || lang}`;

                // Only redirect if we are authenticated and NOT on the target page
                if (window.location.pathname === "/login") {
                    window.location.href = redirectPath;
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [searchParams, router]);

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

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");

        // Check Maintenance Mode
        const { data: maintenance } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'maintenance_mode')
            .single();

        if (maintenance?.value === 'true' && email !== "admin@gvcapital.trust") {
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
                const user = data.session.user;
                const isAdmin = user.user_metadata?.role === "Admin" || user.email === "admin@gvcapital.trust";
                window.location.href = isAdmin ? "/admin" : `/dashboard?lang=${lang}`;
            }
        } catch (error: any) {
            setErrorMsg(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-white flex flex-col items-center p-6 selection:bg-gv-gold selection:text-black font-body">
            <title>{`Login | GV Capital Trust`}</title>

            <div className="absolute top-8 right-8">
                <button
                    onClick={() => setLang(lang === "en" ? "zh" : "en")}
                    className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10 transition-all uppercase tracking-widest text-white/50"
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
                            className="h-[80px] w-auto object-contain mix-blend-screen drop-shadow-[0_4px_10px_rgba(212,175,55,0.4)]"
                        />
                    </Link>
                    <h1 className="text-4xl font-heading font-light uppercase tracking-tighter mb-2">{t.title}</h1>
                    <p className="text-zinc-500 font-body font-light">{t.subtitle}</p>
                </div>

                {errorMsg && <div className="w-full bg-red-500/20 border border-red-500/50 p-4 rounded-xl text-red-500 text-sm mb-6">{errorMsg}</div>}

                <form onSubmit={handleLogin} className="w-full space-y-6">
                    <div className="space-y-2">
                        <label className="text-zinc-500 text-[10px] font-heading font-light uppercase tracking-widest px-1">{t.emailLabel}</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[var(--bg-card)] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-gv-gold/50 transition-all font-body font-light"
                            placeholder={t.placeholder_email}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-zinc-500 text-[10px] font-heading font-light uppercase tracking-widest px-1">{t.passwordLabel}</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[var(--bg-card)] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-gv-gold/50 transition-all font-body font-light"
                            placeholder={t.placeholder_pass}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gv-gold text-black font-heading font-light text-lg py-5 rounded-xl hover:bg-gv-gold/90 transition-all shadow-xl uppercase tracking-widest flex items-center justify-center gap-3"
                    >
                        {isLoading ? <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : t.button}
                    </button>
                </form>

                <p className="text-center mt-8 text-zinc-500 text-sm font-body font-light">
                    {t.footer}
                    <Link href={`/register?lang=${lang}`} className="text-gv-gold hover:underline font-heading font-light ml-2">
                        {t.link}
                    </Link>
                </p>
            </div>

            <GlobalFooter />
        </div>
    );
}
