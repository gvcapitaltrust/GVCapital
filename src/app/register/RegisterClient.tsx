"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import GlobalFooter from "@/components/GlobalFooter";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [lang, setLang] = useState<"en" | "zh">("en");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isAgreed, setIsAgreed] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [referralCode, setReferralCode] = useState("");
    const [isRefReadOnly, setIsRefReadOnly] = useState(false);
    const [inviterUsername, setInviterUsername] = useState("");
    const [isReferralValid, setIsReferralValid] = useState(false); // Default to false as it's required
    const [isValidatingReferral, setIsValidatingReferral] = useState(false);
    const [referralCheckMsg, setReferralCheckMsg] = useState("");
    const [ownUsername, setOwnUsername] = useState("");
    const [isUsernameValid, setIsUsernameValid] = useState(false);
    const [isValidatingUsername, setIsValidatingUsername] = useState(false);
    const [usernameCheckMsg, setUsernameCheckMsg] = useState("");

    useEffect(() => {
        const l = searchParams?.get("lang");
        if (l === "zh") setLang("zh");

        const ref = searchParams?.get("ref");
        if (ref) {
            setReferralCode(ref);
            setIsRefReadOnly(true);
            validateReferral(ref);
        }
    }, [searchParams]);

    const validateReferral = async (code: string) => {
        const cleanCode = code.trim().toLowerCase();
        if (!cleanCode) {
            setIsReferralValid(false);
            setInviterUsername("");
            setReferralCheckMsg(lang === "en" ? "Referral code is required for access." : "访问需要推荐码。");
            return;
        }

        setIsValidatingReferral(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('username')
                .eq('username', cleanCode)
                .single();

            if (error || !data) {
                setIsReferralValid(false);
                setInviterUsername("");
                setReferralCheckMsg(lang === "en" ? "Invalid Referral Code. Access to GV Capital is by invitation only." : "无效的推荐码。GV资本的访问仅限受邀。");
            } else {
                setIsReferralValid(true);
                setInviterUsername(data.username);
                setReferralCheckMsg(lang === "en" ? `You have been successfully invited by ${data.username}.` : `您已成功受 ${data.username} 邀请。`);
            }
        } catch (err) {
            setIsReferralValid(false);
        } finally {
            setIsValidatingReferral(false);
        }
    };

    const validateOwnUsername = async (username: string) => {
        if (!username || username.length < 3) {
            setIsUsernameValid(false);
            setUsernameCheckMsg("");
            return;
        }

        setIsValidatingUsername(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('username')
                .eq('username', username)
                .single();

            if (data) {
                setIsUsernameValid(false);
                setUsernameCheckMsg(lang === "en" ? "Username already taken." : "用户名已被占用。");
            } else {
                setIsUsernameValid(true);
                setUsernameCheckMsg("");
            }
        } catch (err) {
            setIsUsernameValid(true); // Assume ok if error
        } finally {
            setIsValidatingUsername(false);
        }
    };

    useEffect(() => {
        if (!isRefReadOnly) {
            const timer = setTimeout(() => validateReferral(referralCode), 500);
            return () => clearTimeout(timer);
        }
    }, [referralCode, isRefReadOnly]);

    useEffect(() => {
        const timer = setTimeout(() => validateOwnUsername(ownUsername), 500);
        return () => clearTimeout(timer);
    }, [ownUsername]);

    interface ContentItem {
        title: string;
        subtitle: string;
        name: string;
        emailLabel: string;
        passwordLabel: string;
        usernameLabel: string;
        usernamePlaceholder: string;
        agreementPrefix: string;
        agreementLink: string;
        button: string;
        footer: string;
        link: string;
        placeholder_name: string;
        placeholder_email: string;
        placeholder_pass: string;
        modalTitle: string;
        modalAgree: string;
        modalReject: string;
        referralLabel: string;
        referralNote: string;
        referralInvalid: string;
        pdpaNote: string;
        agreementBody: string;
    }

    const content: Record<"en" | "zh", ContentItem> = {
        en: {
            title: "Open Account",
            subtitle: "Join GV Capital Trust network",
            name: "Full Name",
            emailLabel: "Email Address",
            passwordLabel: "Password",
            usernameLabel: "Create Your Unique Username",
            usernamePlaceholder: "This will be your referral code",
            agreementPrefix: "I agree to the ",
            agreementLink: "Private Investment Agreement",
            button: "Create Account",
            footer: "Already have an account? ",
            link: "Sign In",
            placeholder_name: "John Doe",
            placeholder_email: "name@example.com",
            placeholder_pass: "Minimum 8 characters",
            modalTitle: "Private Investment Agreement",
            modalAgree: "I Agree",
            modalReject: "I Reject",
            referralLabel: "Referral Code (Required)",
            referralNote: "GV Capital Group is an exclusive network. Access is by invitation only.",
            referralInvalid: "Invalid Referral Code. Please check again.",
            pdpaNote: "By submitting, you consent to GV Capital Trust processing your personal data in accordance with the Personal Data Protection Act 2010 (PDPA) for the purposes of identity verification and investment management.",
            agreementBody: `
                GV CAPITAL TRUST
                PRIVATE INVESTMENT AGREEMENT (V.2024.01)

                1. INVESTMENT NATURE: The Client acknowledges that investments managed by the Trust involve private equity and high-yield instruments which carry inherent market risks. Past performance does not guarantee future results.

                2. CONFIDENTIALITY: The Client agrees to maintain strict confidentiality regarding the Trust's investment strategies, portfolio compositions, and internal financial data. Any disclosure without written consent is prohibited.

                3. REPRESENTATIONS: The Client represents that they are an accredited investor with the financial knowledge to evaluate the risks and merits of private investments. 

                4. ASSET PROTECTION: GV Capital Trust employs rigorous risk management protocols and global diversification to mitigate asset volatility. 
            `
        },
        zh: {
            title: "开通账户",
            subtitle: "加入 GV 资本信托网络",
            name: "全名",
            emailLabel: "电子邮件地址",
            passwordLabel: "密码",
            usernameLabel: "创建您的唯一用户名",
            usernamePlaceholder: "这将是您的推荐码",
            agreementPrefix: "我同意 ",
            agreementLink: "私人投资协议",
            button: "创建账户",
            footer: "已经有账户了？ ",
            link: "登录",
            placeholder_name: "张三",
            placeholder_email: "name@example.com",
            placeholder_pass: "最少 8 个字符",
            modalTitle: "私人投资协议",
            modalAgree: "我同意",
            modalReject: "我拒绝",
            referralLabel: "推荐码 (必填)",
            referralNote: "GV资本集团是一个专属网络。访问仅限受邀。",
            referralInvalid: "推荐码无效。请再次检查。",
            pdpaNote: "提交即表示您同意 GV 资本信托根据 2010 年个人数据保护法 (PDPA) 处理您的个人数据，用于身份验证和投资管理目的。",
            agreementBody: `
                GV 资本信托
                私人投资协议 (V.2024.01)

                1. 投资性质：客户承认，由信托管理的投资涉及私募股权和高收益工具，这些工具具有固有的市场风险。过往业绩不保证未来结果。

                2. 保密性：客户同意对信托的投资策略、投资组合构成和内部财务数据严格保密。未经书面同意，禁止进行任何披露。

                3. 陈述：客户陈述并保证他们是合格投资者，具备评估私人投资风险和优点的财务知识。

                4. 资产保护：GV 资本信托采用严格的风险管理协议和全球化多元配置，以减轻资产波动。
            `
        },
    };

    const t = content[lang];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAgreed || !isReferralValid || !isUsernameValid) return;
        setIsLoading(true);
        setErrorMsg("");

        try {
            const { data: { user }, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        kyc_completed: false,
                        role: 'User'
                    }
                }
            });

            if (error) throw error;

            if (user) {
                // Initialize profile in public.profiles table
                const profileData: any = {
                    id: user.id,
                    full_name: fullName,
                    username: ownUsername.toLowerCase(),
                    balance: 0,
                    balance_usd: 0,
                    investment: 0,
                    profit: 0,
                    kyc_completed: false,
                    referred_by_username: inviterUsername || null
                };

                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([profileData]);

                if (profileError) console.error("Profile creation failed", profileError);

                // Immediate redirect to dashboard
                router.push(`/dashboard?lang=${lang}`);
            }

        } catch (error: any) {
            setErrorMsg(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center p-6 selection:bg-gv-gold selection:text-black">
            <title>{`Register | GV Capital Trust`}</title>

            <div className="absolute top-8 right-8">
                <button
                    onClick={() => setLang(lang === "en" ? "zh" : "en")}
                    className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/50 hover:bg-white/10 transition-all uppercase tracking-widest"
                >
                    {lang === "en" ? "简体中文" : "English"}
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md py-12">
                <div className="text-center mb-10">
                    <Link href={`/?lang=${lang}`} className="inline-flex items-center justify-center mb-6">
                        <img
                            src="/logo.png"
                            alt="GV Capital Trust Logo"
                            className="h-[80px] w-auto object-contain mix-blend-screen drop-shadow-[0_4px_10px_rgba(212,175,55,0.4)]"
                        />
                    </Link>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">{t.title}</h1>
                    <p className="text-zinc-500 font-medium tracking-wide">{t.subtitle}</p>
                </div>

                {errorMsg && <div className="w-full bg-red-500/20 border border-red-500/50 p-4 rounded-xl text-red-500 text-sm mb-6">{errorMsg}</div>}

                <form onSubmit={handleSubmit} className="w-full space-y-6">
                    <div className="space-y-2">
                        <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">{t.name}</label>
                        <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gv-gold/50 transition-all font-medium"
                            placeholder={t.placeholder_name}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">{t.emailLabel}</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gv-gold/50 transition-all font-medium"
                            placeholder={t.placeholder_email}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">{t.passwordLabel}</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gv-gold/50 transition-all font-medium"
                            placeholder={t.placeholder_pass}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">{t.usernameLabel}</label>
                        <input
                            type="text"
                            required
                            value={ownUsername}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOwnUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                            className={`w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 transition-all font-medium ${!isUsernameValid ? 'border-red-500/50 ring-red-500/20' : 'focus:ring-gv-gold/50'}`}
                            placeholder={t.usernamePlaceholder}
                        />
                        {usernameCheckMsg && <p className="text-[10px] text-red-500 font-bold px-1 uppercase tracking-widest">{usernameCheckMsg}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">{t.referralLabel}</label>
                        <input
                            type="text"
                            required
                            value={referralCode}
                            readOnly={isRefReadOnly}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReferralCode(e.target.value)}
                            className={`w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 transition-all font-medium ${isRefReadOnly ? 'opacity-50 cursor-not-allowed border-gv-gold/30 ring-1 ring-gv-gold/20' : (isReferralValid ? 'focus:ring-emerald-500/50' : 'focus:ring-red-500/50')}`}
                            placeholder="Code Required"
                        />
                        <p className="text-[10px] text-zinc-600 font-bold px-1 italic">
                            {t.referralNote}
                        </p>
                        {referralCheckMsg && (
                            <p className={`text-[10px] font-black uppercase tracking-widest px-1 mt-1 ${isReferralValid ? 'text-emerald-500' : 'text-red-500'}`}>
                                {referralCheckMsg}
                            </p>
                        )}
                    </div>

                    <div className="space-y-4 pt-2">
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={isAgreed}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsAgreed(e.target.checked)}
                                className="mt-1 h-5 w-5 rounded border-white/10 bg-[#1a1a1a] text-gv-gold focus:ring-gv-gold/50"
                            />
                            <span className="text-xs text-zinc-400 leading-relaxed font-medium">
                                {t.agreementPrefix}
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(true)}
                                    className="text-gv-gold hover:underline font-bold"
                                >
                                    {t.agreementLink}
                                </button>
                            </span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !isAgreed || !isReferralValid || isValidatingReferral || !isUsernameValid || isValidatingUsername || !ownUsername}
                        className="w-full bg-gv-gold-gradient metallic-shine text-black font-black text-lg py-5 rounded-2xl hover:brightness-110 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                        {isLoading || isValidatingReferral || isValidatingUsername ? <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : t.button}
                    </button>
                </form>

                <p className="text-center mt-8 text-zinc-500 text-sm font-medium">
                    {t.footer}
                    <Link href={`/login?lang=${lang}`} className="text-gv-gold hover:underline font-bold ml-1 transition-all">
                        {t.link}
                    </Link>
                </p>

                <p className="mt-10 text-[10px] text-zinc-600 text-center leading-relaxed font-bold uppercase tracking-widest">
                    {t.pdpaNote}
                </p>
            </div>

            <GlobalFooter />

            {/* Agreement Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-[32px] p-8 max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
                        <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">{t.modalTitle}</h2>
                        <div className="overflow-y-auto pr-4 text-zinc-400 text-sm leading-relaxed mb-6 font-medium whitespace-pre-line">
                            {t.agreementBody}
                        </div>
                        <div className="flex gap-4 pt-4 mt-auto">
                            <button
                                onClick={() => { setIsAgreed(false); setIsModalOpen(false); }}
                                className="flex-1 py-4 text-zinc-500 font-bold hover:text-white transition-colors uppercase tracking-widest text-xs"
                            >
                                {t.modalReject}
                            </button>
                            <button
                                onClick={() => { setIsAgreed(true); setIsModalOpen(false); }}
                                className="flex-1 bg-gv-gold text-black font-black py-4 rounded-xl shadow-[0_10px_30px_rgba(212,175,55,0.2)] uppercase tracking-widest text-xs"
                            >
                                {t.modalAgree}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
