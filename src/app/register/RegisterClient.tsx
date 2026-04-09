"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import GlobalFooter from "@/components/GlobalFooter";
import { supabase } from "@/lib/supabaseClient";
import { generateUUID, safeStorage } from "@/lib/authUtils";

export default function RegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [lang, setLang] = useState<"en" | "zh">("en");
    const [fullName, setFullName] = useState("");
    const [gender, setGender] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [dob, setDob] = useState("");
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
    const [inviterId, setInviterId] = useState<string | null>(null);
    const [securityPin, setSecurityPin] = useState("");
    const [securityPin, setSecurityPin] = useState("");

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
                .select('id, username')
                .eq('username', cleanCode)
                .single();

            if (error || !data) {
                setIsReferralValid(false);
                setInviterUsername("");
                setInviterId(null);
                setReferralCheckMsg(lang === "en" ? "Invalid Referral Code. Access to GV Capital is by invitation only." : "无效的推荐码。GV资本的访问仅限受邀。");
            } else {
                setIsReferralValid(true);
                setInviterUsername(data.username);
                setInviterId(data.id);
                setReferralCheckMsg(lang === "en" ? `You have been successfully invited by ${data.username}.` : `您已成功受 ${data.username} 邀请。`);
            }
        } catch (err) {
            setIsReferralValid(false);
        } finally {
            setIsValidatingReferral(false);
        }
    };


    useEffect(() => {
        if (!isRefReadOnly) {
            const timer = setTimeout(() => validateReferral(referralCode), 500);
            return () => clearTimeout(timer);
        }
    }, [referralCode, isRefReadOnly]);


    interface ContentItem {
        title: string;
        subtitle: string;
        name: string;
        genderLabel: string;
        male: string;
        female: string;
        emailLabel: string;
        passwordLabel: string;
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
        securityPinLabel: string;
        securityPinPlaceholder: string;
        dobLabel: string;
        confirmPasswordLabel: string;
        passMismatch: string;
    }

    const content: Record<"en" | "zh", ContentItem> = {
        en: {
            title: "Open Account",
            subtitle: "Join the GV Capital Trust Network",
            name: "Full Name",
            genderLabel: "Gender",
            male: "Male",
            female: "Female",
            emailLabel: "Email Address",
            passwordLabel: "Password",
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
                MASTER PRIVATE WEALTH & INVESTMENT AGREEMENT (V.2026.02)

                This Master Private Wealth & Investment Agreement ("Agreement") governs the relationship between GV Capital Trust ("The Trust") and the registered user ("The Client"). By acknowledging this agreement, The Client enters into a binding fiduciary arrangement under the following distinct terms:

                1. SCOPE OF WEALTH MANAGEMENT
                The Client acknowledges that The Trust actively manages capital through global high-yield instruments, private equity distributions, and strategic forex positioning. The Trust targets specified monthly dividend benchmarks but does not legally guarantee absolute, fixed-rate yields against global market volatility.

                2. CAPITAL LOCK-IN & WITHDRAWAL PROTOCOLS
                To maintain systemic liquidity and secure high-yield global positions, all deposits are subject to a mandatory 6-month capital lock-in period from the date of respective deposit clearance, or 12-months for VVIP Tier clients. Any emergency premature withdrawal requests submitted prior to the completion of the respective lock-in period will incur an automatic forty percent (40%) liquidation penalty against the principal amount. Profits and dividends are excluded from this lock-in and remain eligible for regular withdrawal.

                3. CONFIDENTIALITY & NON-DISCLOSURE
                The Trust operates an exclusive, invitation-only architecture. The Client agrees to maintain strict confidentiality regarding The Trust's proprietary investment strategies, internal financial data, client dashboards, and tiered privileges. Unauthorized external disclosure, publishing, or syndication of The Trust's materials is strictly prohibited and grounds for immediate account termination without prejudice.

                4. REPRESENTATIONS & WARRANTIES
                The Client represents that they are acting as a principal and not as an agent on behalf of any third party. The Client affirms they possess adequate financial resources and understanding to engage in private wealth management. Furthermore, The Client certifies that all funds deposited derive from legitimate sources strictly compliant with international Anti-Money Laundering (AML) regulations.

                5. SECURITY & KYC COMPLIANCE
                The Client is solely responsible for maintaining the absolute security of their account credentials and 6-digit Security PIN. The Trust reserves the right to suspend or lock accounts pending mandatory Know Your Customer (KYC) verification procedures to protect the integrity of the platform ecosystem.

                By clicking "I Agree", The Client executes this binding digital contract, acknowledging full comprehension and unconditional acceptance of all terms herein.
            `,
            securityPinLabel: "Security PIN (6 Digits)",
            securityPinPlaceholder: "Used for withdrawals",
            dobLabel: "Date of Birth",
            confirmPasswordLabel: "Confirm Password",
            passMismatch: "Passwords do not match."
        },
        zh: {
            title: "开通账户",
            subtitle: "加入 GV 资本信托网络",
            name: "全名",
            genderLabel: "性别",
            male: "男",
            female: "女",
            emailLabel: "电子邮件地址",
            passwordLabel: "密码",
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
                主私人财富与投资协议 (V.2026.02)

                本主私人财富与投资协议（“协议”）约束 GV 资本信托（“信托”）与注册用户（“客户”）之间的关系。通过确认本协议，客户将在以下明确条款下签订具有约束力的受托安排：

                1. 财富管理范围
                客户了解，信托通过全球高收益工具、私募股权分配及战略外汇定位进行主动的资本管理。信托以特定的月度派息作为基准目标，但在面临全球市场波动时，不构成对绝对固定收益的法律保证。

                2. 资本锁定期与提款协议
                为维持系统的流动性并保障高收益的全球头寸，所有入金笔数自清算之日起，自动受到 6 个月（或 VVIP 客户的 12 个月）的强制资本锁定期限制。若在相应的锁定期完成前提交紧急提前提款申请，将对提取本金自动扣除百分之四十（40%）的清算违约金。账户利润及派息分红不受此锁定期限制，可随时进行常规提款。

                3. 保密规定与反披露
                信托实行专属的仅限受邀访问架构。客户同意对信托的专有投资策略、内部财务数据、客户终端以及等级特权保持绝对的保密。严禁未经授权向外部披露、发布或分发信托材料，违者将导致账户立即终止而无法追溯。

                4. 声明与保证
                客户声明，其作为本金所有人行事，而非任何第三方的代理。客户确认其拥有足够的财务资源和认知来参与私人财富管理。此外，客户保证所有入金资金均来源合法，并严格遵守国际反洗钱（AML）法规。

                5. 安全与 KYC 合规
                客户对维护其账户凭证及 6 位数安全免密验证码的绝对安全负全责。为了保护平台生态系统的完整性，信托保留在等待强制性的了解您的客户（KYC）验证程序完成期间暂停或锁定账户的权利。

                点击“我同意”，即表示客户签署此具有约束力的数字合同，确认全面理解并无条件接受此处的全部条款。
            `,
            securityPinLabel: "安全密码 (6 位数字)",
            securityPinPlaceholder: "用于提款验证",
            dobLabel: "出生日期",
            confirmPasswordLabel: "确认密码",
            passMismatch: "两次输入的密码不一致。"
        },
    };

    const t = content[lang];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAgreed || !isReferralValid || !gender || !dob || !fullName) {
            setErrorMsg(lang === 'en' ? "Please complete all required fields including Full Name and Date of Birth." : "请填写所有必填字段，包括全名和出生日期。");
            return;
        }
        if (password !== confirmPassword) {
            setErrorMsg(t.passMismatch);
            return;
        }
        setIsLoading(true);
        setErrorMsg("");

        try {
            // Generate system username: First word + initials of others + last 2 digits of YOB
            const generateBaseUsername = () => {
                const parts = fullName.trim().split(/\s+/);
                if (parts.length === 0) return "user";
                const first = parts[0].toLowerCase();
                const initials = parts.slice(1).map(p => p.charAt(0).toLowerCase()).join("");
                const year = new Date(dob).getFullYear().toString().slice(-2);
                return `${first}${initials}${year}`;
            };

            const baseUsername = generateBaseUsername();
            
            // Ensure uniqueness
            let finalUsername = baseUsername;
            let counter = 1;
            let isUnique = false;
            
            while (!isUnique) {
                const { data } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('username', finalUsername)
                    .maybeSingle();
                
                if (!data) {
                    isUnique = true;
                } else {
                    counter++;
                    finalUsername = `${baseUsername}${counter}`;
                }
            }

            const { data: { user }, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        username: finalUsername,
                        kyc_completed: false,
                        role: 'User'
                    }
                }
            });

            if (error) throw error;

            if (user) {
                // Safely resolve referral ID if exists
                let resolvedReferralId = inviterId || null;

                // Device ID Management for single-session enforcement
                let deviceId = null;
                if (typeof window !== "undefined") {
                    deviceId = safeStorage.getItem("gv_device_session_id");
                    if (!deviceId) {
                        deviceId = generateUUID();
                        safeStorage.setItem("gv_device_session_id", deviceId);
                    }
                }

                const profileData: any = {
                    id: user.id,
                    email: email,
                    full_name: fullName,
                    username: finalUsername,
                    balance: 0,
                    profit: 0,
                    kyc_completed: false,
                    referred_by: resolvedReferralId,
                    referred_by_username: inviterUsername || null,
                    security_pin: securityPin,
                    gender: gender,
                    dob: dob,
                    active_sessions: deviceId ? [deviceId] : []
                };

                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert([profileData], { onConflict: 'id' });

                if (profileError) {
                    console.error("UPSERT ERROR:", profileError);
                    throw new Error(profileError.message || "Failed to create user profile.");
                }

                // Immediate redirect to dashboard
                router.push(`/dashboard?lang=${lang}`);
            }

        } catch (error: any) {
            console.error("REGISTRATION ERROR:", error);
            setErrorMsg(error.error_description || error.message || "An unexpected error occurred during registration.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center p-6 selection:bg-gv-gold selection:text-black">
            <title>{`Register | GV Capital Trust`}</title>

            <div className="absolute top-8 right-8">
                <button
                    onClick={() => setLang(lang === "en" ? "zh" : "en")}
                    className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-gray-900/50 hover:bg-gray-100 transition-all uppercase tracking-widest"
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
                            className="h-[80px] w-auto object-contain  drop-shadow-[0_4px_10px_rgba(212,175,55,0.4)]"
                        />
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter mb-2">{t.title}</h1>
                    <p className="text-gray-400 font-medium tracking-wide">{t.subtitle}</p>
                </div>

                {errorMsg && <div className="w-full bg-red-500/20 border border-red-500/50 p-4 rounded-xl text-red-500 text-sm mb-6">{errorMsg}</div>}

                <form onSubmit={handleSubmit} className="w-full space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="full_name" className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.name}</label>
                        <input
                            id="full_name"
                            name="full_name"
                            type="text"
                            required
                            value={fullName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gv-gold/50 transition-all font-medium"
                            placeholder={t.placeholder_name}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.genderLabel}</label>
                        <div className="flex gap-4">
                            <label className={`flex-1 flex items-center justify-center gap-2 border px-4 py-3 rounded-xl cursor-pointer transition-all ${gender === "Male" ? "border-gv-gold bg-gv-gold/10 text-gv-gold" : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
                                <input type="radio" name="gender" value="Male" required onChange={(e) => setGender(e.target.value)} className="hidden" />
                                <span className="font-bold text-sm">{t.male}</span>
                            </label>
                            <label className={`flex-1 flex items-center justify-center gap-2 border px-4 py-3 rounded-xl cursor-pointer transition-all ${gender === "Female" ? "border-gv-gold bg-gv-gold/10 text-gv-gold" : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
                                <input type="radio" name="gender" value="Female" required onChange={(e) => setGender(e.target.value)} className="hidden" />
                                <span className="font-bold text-sm">{t.female}</span>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="dob" className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.dobLabel}</label>
                        <input
                            id="dob"
                            name="dob"
                            type="date"
                            required
                            value={dob}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDob(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gv-gold/50 transition-all font-medium [color-scheme:light]"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="email" className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.emailLabel}</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gv-gold/50 transition-all font-medium"
                            placeholder={t.placeholder_email}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.passwordLabel}</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gv-gold/50 transition-all font-medium"
                            placeholder={t.placeholder_pass}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="confirm_password" className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.confirmPasswordLabel}</label>
                        <input
                            id="confirm_password"
                            name="confirm_password"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                            className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 transition-all font-medium ${confirmPassword && password !== confirmPassword ? 'border-red-500/50 ring-red-500/20' : 'focus:ring-gv-gold/50'}`}
                            placeholder={t.placeholder_pass}
                        />
                    </div>


                    <div className="space-y-2">
                        <label htmlFor="security_pin" className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.securityPinLabel}</label>
                        <input
                            id="security_pin"
                            name="security_pin"
                            type="password"
                            required
                            maxLength={6}
                            value={securityPin}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSecurityPin(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gv-gold/50 transition-all font-medium"
                            placeholder={t.securityPinPlaceholder}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="referral_code" className="text-gray-400 text-[10px] font-black uppercase tracking-widest px-1">{t.referralLabel}</label>
                        <input
                            id="referral_code"
                            name="referral_code"
                            type="text"
                            required
                            value={referralCode}
                            readOnly={isRefReadOnly}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReferralCode(e.target.value)}
                            className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 transition-all font-medium ${isRefReadOnly ? 'opacity-50 cursor-not-allowed border-gv-gold/30 ring-1 ring-gv-gold/20' : (isReferralValid ? 'focus:ring-emerald-500/50' : 'focus:ring-red-500/50')}`}
                            placeholder="Code Required"
                        />
                        <p className="text-[10px] text-gray-500 font-bold px-1 italic">
                            {t.referralNote}
                        </p>
                        {referralCheckMsg && (
                            <p className={`text-[10px] font-black uppercase tracking-widest px-1 mt-1 ${isReferralValid ? 'text-emerald-500' : 'text-red-500'}`}>
                                {referralCheckMsg}
                            </p>
                        )}
                    </div>

                    <div className="space-y-4 pt-2">
                        <label htmlFor="agreement" className="flex items-start gap-3 cursor-pointer group">
                            <input
                                id="agreement"
                                name="agreement"
                                type="checkbox"
                                checked={isAgreed}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsAgreed(e.target.checked)}
                                className="mt-1 h-5 w-5 rounded border-gray-200 bg-gray-50 text-gv-gold focus:ring-gv-gold/50"
                            />
                            <span className="text-xs text-gray-500 leading-relaxed font-medium">
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
                        disabled={isLoading || !isAgreed || !isReferralValid || isValidatingReferral || password !== confirmPassword || !dob || !fullName}
                        className="w-full bg-gv-gold text-black font-black text-lg py-5 rounded-2xl hover:bg-gv-gold/90 transition-all shadow-[0_10px_30px_rgba(212,175,55,0.2)] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                        {isLoading || isValidatingReferral ? <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : t.button}
                    </button>
                </form>

                <p className="text-center mt-8 text-gray-400 text-sm font-medium">
                    {t.footer}
                    <Link href={`/login?lang=${lang}`} className="text-gv-gold hover:underline font-bold ml-1 transition-all">
                        {t.link}
                    </Link>
                </p>

                <p className="mt-10 text-[10px] text-gray-500 text-center leading-relaxed font-bold uppercase tracking-widest">
                    {t.pdpaNote}
                </p>
            </div>

            <GlobalFooter />

            {/* Agreement Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-gray-50 border border-gray-200 rounded-[32px] p-8 max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
                        <h2 className="text-2xl font-black text-gray-900 mb-6 uppercase tracking-tighter">{t.modalTitle}</h2>
                        <div className="overflow-y-auto pr-4 text-gray-500 text-sm leading-relaxed mb-6 font-medium whitespace-pre-line">
                            {t.agreementBody}
                        </div>
                        <div className="flex gap-4 pt-4 mt-auto">
                            <button
                                onClick={() => { setIsAgreed(false); setIsModalOpen(false); }}
                                className="flex-1 py-4 text-gray-400 font-bold hover:text-gray-900 transition-colors uppercase tracking-widest text-xs"
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
