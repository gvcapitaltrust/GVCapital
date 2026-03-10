"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import GlobalFooter from "@/components/GlobalFooter";
import { supabase } from "@/lib/supabaseClient";

export default function VerifyPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [lang, setLang] = useState<"en" | "zh">("en");
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [signature, setSignature] = useState("");
    const [idPhoto, setIdPhoto] = useState<File | null>(null);

    // Compliance Fields
    const [occupation, setOccupation] = useState("");
    const [employer, setEmployer] = useState("");
    const [sourceOfWealth, setSourceOfWealth] = useState("Salary");
    const [riskProfile, setRiskProfile] = useState("Balanced");
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [swiftBic, setSwiftBic] = useState("");

    useEffect(() => {
        const l = searchParams?.get("lang") || "en";
        setLang(l as "en" | "zh");

        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push(`/register?lang=${l}`);
            } else {
                setUser(session.user);
            }
        };
        fetchUser();
    }, [searchParams, router]);

    const handleConfirm = async () => {
        if (!idPhoto || !signature || !occupation || !bankName || !accountNumber) {
            alert("Please complete all required fields and upload your ID.");
            return;
        }

        setIsLoading(true);

        try {
            // 1. Upload ID Photo to Supabase Storage (agreements bucket)
            const fileName = `${user.id}_IC_${Date.now()}_${idPhoto.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('agreements')
                .upload(fileName, idPhoto);

            if (uploadError) throw uploadError;

            // 2. Update Profile in Supabase
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    occupation,
                    employer,
                    source_of_wealth: sourceOfWealth,
                    risk_profile: riskProfile,
                    bank_name: bankName,
                    account_number: accountNumber,
                    swift_bic: swiftBic,
                    kyc_document_url: uploadData.path,
                    kyc_status: 'Pending',
                    is_verified: 'Pending',
                    signed_agreement: true,
                    full_name: signature // Update full name to match signature
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // 3. Show Success
            setShowSuccess(true);
            setTimeout(() => {
                router.push(`/dashboard?lang=${lang}`);
            }, 3000);

        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const content = {
        en: {
            title: "Identity Verification & Legal Agreement",
            subtitle: "Complete these steps to activate your investment portfolio.",
            kycHeader: "1. Identity Document Upload",
            kycDesc: "Please upload a clear photo of your Passport or National ID card.",
            uploadPlaceholder: "Upload Document (JPG/PNG)",
            signaturePlaceholder: "Type your full name here...",
            button: "Confirm & Sign Agreement",
            complianceHeader: "2. Financial & Employment Profile",
            bankHeader: "3. Payout Bank Details",
            agreementHeader: "4. Private Investment Agreement",
            digitalSignature: "5. Digital Signature",
            pdpaNote: "By submitting this form, you consent to GV Capital Trust processing your personal data in accordance with the Personal Data Protection Act 2010 (PDPA) for the purposes of identity verification and investment management.",
            logout: "Log Out",
            completeLater: "Complete Later",
            successTitle: "Submission Successful",
            successDesc: "Our team will review your request within 24 hours."
        },
        zh: {
            title: "身份验证与法律协议",
            subtitle: "完成以下步骤以激活您的投资组合。",
            kycHeader: "1. 身份证明文件上传",
            kycDesc: "请上传护照或国民身份证的清晰照片。",
            uploadPlaceholder: "上传文件 (JPG/PNG)",
            signaturePlaceholder: "在此输入您的全名...",
            button: "确认并签署协议",
            complianceHeader: "2. 财务与职业概况",
            bankHeader: "3. 提款银行详情",
            agreementHeader: "4. 私人投资协议",
            digitalSignature: "5. 数字签名",
            pdpaNote: "提交此表格即表示您同意 GV 资本信托根据 2010 年个人数据保护法 (PDPA) 处理您的个人数据，用于身份验证和投资管理目的。",
            logout: "退出登录",
            completeLater: "稍后完成",
            successTitle: "提交成功",
            successDesc: "我们的团队将在 24 小时内审核您的申请。"
        }
    };

    const t = content[lang];

    return (
        <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center p-8 selection:bg-gv-gold selection:text-black">
            <title>{`Verification | GV Capital Trust`}</title>

            <div className="max-w-4xl w-full space-y-12 py-10">
                <header className="text-center space-y-4">
                    <Link href={`/?lang=${lang}`} className="inline-block mb-6">
                        <img src="/logo.png" className="h-20 w-auto mix-blend-screen" />
                    </Link>
                    <h1 className="text-4xl font-black uppercase tracking-tighter">{t.title}</h1>
                    <p className="text-zinc-500 font-medium">{t.subtitle}</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Left: Document Upload & Profile */}
                    <div className="space-y-10">
                        <section className="bg-[#1a1a1a] p-8 rounded-[40px] border border-white/5 shadow-xl space-y-6">
                            <h2 className="text-lg font-black uppercase tracking-widest text-gv-gold">{t.kycHeader}</h2>
                            <p className="text-xs text-zinc-500 leading-relaxed font-medium">{t.kycDesc}</p>
                            <div className="border border-white/10 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-colors cursor-pointer relative group">
                                <svg className="h-12 w-12 text-zinc-600 mb-4 group-hover:text-gv-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{idPhoto ? idPhoto.name : t.uploadPlaceholder}</span>
                                <input type="file" onChange={(e) => setIdPhoto(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                        </section>

                        <section className="bg-[#1a1a1a] p-8 rounded-[40px] border border-white/5 shadow-xl space-y-6">
                            <h2 className="text-lg font-black uppercase tracking-widest text-gv-gold">{t.complianceHeader}</h2>
                            <div className="space-y-4">
                                <input type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold" placeholder="Occupation" />
                                <input type="text" value={employer} onChange={(e) => setEmployer(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold" placeholder="Employer Name" />
                                <select value={sourceOfWealth} onChange={(e) => setSourceOfWealth(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold appearance-none">
                                    <option>Salary</option><option>Business</option><option>Investment</option><option>Inheritance</option>
                                </select>
                            </div>
                        </section>
                    </div>

                    {/* Right: Bank Details & Signature */}
                    <div className="space-y-10">
                        <section className="bg-[#1a1a1a] p-8 rounded-[40px] border border-white/5 shadow-xl space-y-6">
                            <h2 className="text-lg font-black uppercase tracking-widest text-gv-gold">{t.bankHeader}</h2>
                            <div className="space-y-4">
                                <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold" placeholder="Bank Name" />
                                <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold" placeholder="Account Number" />
                            </div>
                        </section>

                        <section className="bg-[#1a1a1a] p-8 rounded-[40px] border border-white/5 shadow-xl space-y-6">
                            <h2 className="text-lg font-black uppercase tracking-widest text-gv-gold">{t.digitalSignature}</h2>
                            <div className="space-y-4">
                                <input type="text" value={signature} onChange={(e) => setSignature(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xl font-black italic tracking-wider text-gv-gold placeholder:text-zinc-600 placeholder:italic" placeholder={t.signaturePlaceholder} />
                            </div>
                        </section>
                    </div>
                </div>

                <div className="pt-10 space-y-8">
                    <button onClick={handleConfirm} disabled={isLoading} className="w-full bg-gv-gold text-black font-black text-xl py-6 rounded-[28px] hover:bg-gv-gold/90 transition-all shadow-[0_20px_40px_rgba(212,175,55,0.2)] uppercase tracking-widest flex items-center justify-center gap-3">
                        {isLoading ? <div className="h-6 w-6 border-4 border-black border-t-transparent animate-spin rounded-full"></div> : t.button}
                    </button>
                    <p className="text-[10px] text-zinc-600 text-center font-bold uppercase tracking-widest max-w-2xl mx-auto leading-relaxed">
                        {t.pdpaNote}
                    </p>
                </div>
            </div>

            <GlobalFooter />

            {showSuccess && (
                <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-500 text-center px-10">
                    <div className="h-32 w-32 bg-emerald-500 rounded-full flex items-center justify-center mb-10 shadow-[0_0_60px_rgba(16,185,129,0.3)]">
                        <svg className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-5xl font-black mb-4 uppercase tracking-tighter">{t.successTitle}</h2>
                    <p className="text-zinc-400 text-lg max-w-md font-medium">{t.successDesc}</p>
                </div>
            )}
        </div>
    );
}
