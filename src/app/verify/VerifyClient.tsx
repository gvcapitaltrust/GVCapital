"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import GlobalFooter from "@/components/GlobalFooter";
import { supabase } from "@/lib/supabaseClient";

export default function VerifyPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [lang, setLang] = useState<"en" | "zh">("en");

    const content = {
        en: {
            identityVerification: "Identity Verification",
            investorPortal: "Investor Onboarding Portal",
            saveClose: "Save & Close",
            nextStep: "Next Step",
            back: "Back",
            submitDocument: "Submit Document",
            verificationStarted: "Verification Started",
            complianceReview: "Compliance review in progress.",
            step1Title: "Personal Information",
            step1Desc: "Please provide your details exactly as they appear on your legal ID.",
            firstName: "First Name",
            lastName: "Last Name",
            dob: "Date of Birth",
            gender: "Gender",
            selectGender: "Select Gender",
            male: "Male",
            female: "Female",
            other: "Other",
            address: "Residential Address",
            streetPlaceholder: "Street name, building, unit number",
            city: "City",
            cityPlaceholder: "Enter city",
            phone: "Phone Number",
            taxId: "Tax Identification Number (TIN)",
            taxIdPlaceholder: "Optional for individual investors",
            localityCheck: "My place of birth and nationality are the same as my country of residence.",
            step2Title: "Profile Information",
            step2Desc: "To provide a secure service, we need to understand your investment profile.",
            purpose: "Purpose of Account",
            employment: "Employment Status",
            industry: "Industry",
            wealthSource: "Primary Source of Wealth (Select all that apply)",
            netWorth: "Total Net Worth",
            netIncome: "Annual Net Income",
            expectedDeposit: "Expected Yearly Deposit",
            accuracyTitle: "Information Accuracy",
            accuracyDesc: "I hereby confirm that all the information provided above is true and correct.",
            riskTitle: "Risk Acknowledgement",
            riskDesc: "I understand and acknowledge the risks associated with high-yield investments.",
            pepTitle: "PEP Declaration",
            pepDesc: "I confirm that I am not a Politically Exposed Person (PEP) or a close associate of one.",
            step3Title: "Verify Your Identity",
            step3Desc: "Finalize your profile by uploading a valid government ID.",
            country: "Country",
            docTypeTitle: "Select Document Type",
            frontDoc: "Front of Document",
            backDoc: "Back of Document",
            uploadPrompt: "Upload IC / Image",
            industries: ["Finance", "Tech", "Healthcare", "Manufacturing", "Education", "Real Estate", "Law", "Media", "Travel", "Energy", "Retail", "Other"],
            wealthSources: ["Salary", "Business Profits", "Savings", "Inheritance", "Investments"],
            purposes: ["Investment", "Hedging", "Speculation"],
            employments: ["Full-time", "Part-time", "Freelancer", "Business Owner", "Retired", "Unemployed", "Student"],
            docTypes: ["ID Card", "Driver's License", "Passport", "Military ID", "Residence Permit"],
            bankDetails: "Bank Information",
            bankName: "Bank Name",
            accNumber: "Account Number",
            accHolder: "Account Holder Name",
            bankStatement: "Bank Statement",
            uploadStatement: "Upload Bank Statement (PDF/Image)",
            footerNote: "By providing your identity document, you authorize GV Capital Trust to perform security and compliance screenings in accordance with global AML/KYC regulations."
        },
        zh: {
            identityVerification: "身份验证",
            investorPortal: "投资者入驻门户",
            saveClose: "保存并关闭",
            nextStep: "下一步",
            back: "返回",
            submitDocument: "提交文件",
            verificationStarted: "验证已开始",
            complianceReview: "合规审核正在进行中。",
            step1Title: "个人信息",
            step1Desc: "请提供与您的法定身份证件完全一致的详细信息。",
            firstName: "名字",
            lastName: "姓氏",
            dob: "出生日期",
            gender: "性别",
            selectGender: "选择性别",
            male: "男",
            female: "女",
            other: "其他",
            address: "居住地址",
            streetPlaceholder: "街道名称、建筑物、单位编号",
            city: "城市",
            cityPlaceholder: "输入城市",
            phone: "电话号码",
            taxId: "税务识别号 (TIN)",
            taxIdPlaceholder: "个人投资者可选",
            localityCheck: "我的出生地和国籍与我的居住国家相同。",
            step2Title: "个人资料信息",
            step2Desc: "为了提供安全的投资服务，我们需要了解您的投资概况。",
            purpose: "账户用途",
            employment: "就业状态",
            industry: "行业",
            wealthSource: "主要财富来源（选择所有适用项）",
            netWorth: "总资产净值",
            netIncome: "年净收入",
            expectedDeposit: "预计年度存款",
            accuracyTitle: "信息准确性",
            accuracyDesc: "我特此确认以上提供的所有信息均真实准确。",
            riskTitle: "风险确认",
            riskDesc: "我了解并确认与高收益投资相关的风险。",
            pepTitle: "PEP 声明",
            pepDesc: "我确认我不是政治公众人物 (PEP) 或其亲密助手。",
            step3Title: "验证您的身份",
            step3Desc: "通过上传有效的政府身份证件来完成您的个人资料。",
            country: "国家",
            docTypeTitle: "选择证件类型",
            frontDoc: "证件正面",
            backDoc: "证件背面",
            uploadPrompt: "上传身份证 / 图片",
            industries: ["金融", "科技", "医疗保健", "制造", "教育", "房地产", "法律", "媒体", "旅游", "能源", "零售", "其他"],
            wealthSources: ["薪资", "核心业务利润", "个人储蓄", "遗产", "投资收益"],
            purposes: ["投资", "对冲", "投机"],
            employments: ["全职", "兼职", "自由职业者", "企业主", "已退休", "失业", "学生"],
            docTypes: ["身份证", "驾驶执照", "护照", "军工卡", "居留证"],
            bankDetails: "银行信息",
            bankName: "银行名称",
            accNumber: "银行账号",
            accHolder: "账户持有人姓名",
            bankStatement: "银行账单",
            uploadStatement: "上传银行账单 (PDF/图片)",
            footerNote: "通过提供您的身份证件，您授权 GV 资本信托根据全球 AML/KYC 法规进行安全和合规筛选。"
        }
    };

    const t = content[lang];

    interface User {
        id: string;
        email?: string;
    }

    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    interface KYCFormData {
        first_name: string;
        last_name: string;
        dob: string;
        gender: string;
        address: string;
        city: string;
        phone: string;
        tax_id: string;
        nationality_match: boolean;
        account_purpose: string;
        employment_status: string;
        industry: string;
        source_of_wealth: string[];
        total_wealth: string;
        annual_income: string;
        yearly_deposit: string;
        accuracy_confirmed: boolean;
        risk_acknowledged: boolean;
        is_not_pep: boolean;
        id_type: string;
        country: string;
        bank_name: string;
        account_number: string;
        bank_account_holder: string;
    }

    // Form State
    const [formData, setFormData] = useState<KYCFormData>({
        first_name: "",
        last_name: "",
        dob: "",
        gender: "",
        address: "",
        city: "",
        phone: "",
        tax_id: "",
        nationality_match: true,
        account_purpose: "Investment",
        employment_status: "Full-time",
        industry: "Finance",
        source_of_wealth: [],
        total_wealth: "$10k-$50k",
        annual_income: "$10k-$50k",
        yearly_deposit: "$10k-$50k",
        accuracy_confirmed: false,
        risk_acknowledged: false,
        is_not_pep: false,
        id_type: "Passport",
        country: "Malaysia", // Default
        bank_name: "",
        account_number: "",
        bank_account_holder: ""
    });

    const [idFront, setIdFront] = useState<File | null>(null);
    const [idBack, setIdBack] = useState<File | null>(null);
    const [bankStatement, setBankStatement] = useState<File | null>(null);
    const [idFrontRef, setIdFrontRef] = useState<string | null>(null);
    const [idBackRef, setIdBackRef] = useState<string | null>(null);
    const [bankStatementRef, setBankStatementRef] = useState<string | null>(null);

    useEffect(() => {
        const l = searchParams?.get("lang") || "en";
        setLang(l as "en" | "zh");

        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push(`/register?lang=${l}`);
            } else {
                setUser(session.user);
                // Pre-fetch profile for Resume Logic
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                if (profile) {
                    // Resume Logic: Jump to saved step and fill data
                    if (profile.kyc_step !== undefined && profile.kyc_step !== null) {
                        setCurrentStep(Math.min(profile.kyc_step + 1, 3));
                    }
                    
                    if (profile.kyc_data) {
                        setFormData((prev: KYCFormData) => ({
                            ...prev,
                            ...profile.kyc_data
                        }));
                    } else {
                        setFormData((prev: KYCFormData) => ({
                            ...prev,
                            first_name: profile.first_name || "",
                            last_name: profile.last_name || "",
                            country: profile.country || "Malaysia"
                        }));
                    }
                    
                    if (profile.kyc_id_front) setIdFrontRef(profile.kyc_id_front);
                    if (profile.kyc_id_back) setIdBackRef(profile.kyc_id_back);
                    if (profile.bank_statement_url) setBankStatementRef(profile.bank_statement_url);
                }
            }
        };
        fetchUser();
    }, [searchParams, router]);

    const handleUpload = async (file: File, side: 'front' | 'back' | 'statement') => {
        if (!user) return null;
        const fileName = `${side}_${Date.now()}_${file.name}`;
        const filePath = `${user.id}/${fileName}`;
        const { data, error } = await supabase.storage
            .from('agreements')
            .upload(filePath, file);
        if (error) throw error;
        return data.path;
    };

    const syncProgress = async (step: number, data: KYCFormData) => {
        if (!user) return;
        try {
            await supabase
                .from('profiles')
                .update({
                    kyc_step: step,
                    kyc_data: data,
                    kyc_status: 'Draft' // Ensure dashboard knows it's a draft
                })
                .eq('id', user.id);
        } catch (err) {
            console.error("Error syncing progress:", err);
        }
    };

    const handleFinalSubmit = async (status: 'Pending' | 'Draft') => {
        if (!user) return;

        if (status === 'Pending') {
            if (!idFront && !idFrontRef) {
                alert("Please upload the front of your ID document.");
                return;
            }
            if (!idBack && !idBackRef && formData.id_type !== 'Passport') {
                alert("Please upload the back of your ID document.");
                return;
            }
            if (!formData.accuracy_confirmed || !formData.risk_acknowledged || !formData.is_not_pep) {
                alert("Please acknowledge all compliance requirements.");
                return;
            }
            if (!formData.bank_name || !formData.account_number || !formData.bank_account_holder) {
                alert("Please complete all bank information fields.");
                return;
            }
            if (!bankStatement && !bankStatementRef) {
                alert("Please upload your bank statement for verification.");
                return;
            }
        }

        setIsLoading(true);
        try {
            let frontPath = idFrontRef;
            let backPath = idBackRef;

            if (idFront) frontPath = await handleUpload(idFront, 'front');
            if (idBack) backPath = await handleUpload(idBack, 'back');
            
            let statementPath = bankStatementRef;
            if (bankStatement) statementPath = await handleUpload(bankStatement, 'statement');

            const payload = {
                ...formData,
                kyc_id_front: frontPath,
                kyc_id_back: backPath,
                bank_statement_url: statementPath,
                bank_name: formData.bank_name,
                account_number: formData.account_number,
                bank_account_holder: formData.bank_account_holder,
                kyc_status: status,
                kyc_completed: status === 'Pending',
                full_name: `${formData.first_name} ${formData.last_name}`,
                kyc_step: status === 'Pending' ? 3 : Math.max(0, currentStep - 1),
                kyc_data: formData
            };

            const { error: updateError } = await supabase
                .from('profiles')
                .update(payload)
                .eq('id', user.id);

            if (updateError) throw updateError;

            if (status === 'Pending') {
                setShowSuccess(true);
                setTimeout(() => router.push(`/dashboard?lang=${lang}`), 3000);
            } else {
                router.push(`/dashboard?lang=${lang}`);
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const nextStep = async () => {
        await syncProgress(currentStep, formData);
        const next = Math.min(currentStep + 1, 3);
        setCurrentStep(next);
    };
    const prevStep = () => setCurrentStep((prev: number) => Math.max(prev - 1, 1));

    const industries = t.industries;
    const wealthSources = t.wealthSources;
    const financialTiers = ["<$10k", "$10k-$50k", "$50k-$100k", "$100k-$500k", "$500k+"];

    const toggleWealthSource = (source: string) => {
        setFormData((prev: KYCFormData) => ({
            ...prev,
            source_of_wealth: prev.source_of_wealth.includes(source)
                ? prev.source_of_wealth.filter((s: string) => s !== source)
                : [...prev.source_of_wealth, source]
        }));
    };

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-zinc-300 flex flex-col items-center selection:bg-gv-gold selection:text-black">
            <title>{`KYC Verification | GV Capital Trust`}</title>

            <div className="w-full max-w-3xl px-6 py-12 space-y-12">
                <header className="flex flex-col items-center text-center space-y-6">
                    <Link href={`/dashboard?lang=${lang}`}>
                        <img src="/logo.png" className="h-[60px] w-auto mix-blend-screen brightness-110" />
                    </Link>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">{t.identityVerification}</h1>
                        <p className="text-[10px] text-gv-gold font-black tracking-[0.2em] uppercase">{t.investorPortal}</p>
                    </div>

                    {/* Step Indicator */}
                    <div className="flex items-center gap-4 pt-4 w-full justify-center">
                        {[1, 2, 3].map((s: number) => (
                            <div key={s} className="flex items-center gap-2">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${currentStep >= s ? 'bg-gv-gold text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-white/5 text-zinc-600 border border-white/10'}`}>
                                    {s}
                                </div>
                                {s < 3 && <div className={`h-[1px] w-8 md:w-16 ${currentStep > s ? 'bg-gv-gold' : 'bg-white/10'}`} />}
                            </div>
                        ))}
                    </div>
                </header>

                <main className="bg-[#141414] border border-white/5 rounded-[48px] p-8 md:p-12 shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Step 1: Personal Information */}
                    {currentStep === 1 && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold text-white tracking-tight">{t.step1Title}</h2>
                                <p className="text-xs text-zinc-500 font-medium">{t.step1Desc}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">{t.firstName}</label>
                                    <input type="text" value={formData.first_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, first_name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-gv-gold/50 focus:ring-1 focus:ring-gv-gold/20 transition-all" placeholder={t.firstName} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">{t.lastName}</label>
                                    <input type="text" value={formData.last_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, last_name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-gv-gold/50 focus:ring-1 focus:ring-gv-gold/20 transition-all" placeholder={t.lastName} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">{t.dob}</label>
                                    <input type="date" value={formData.dob} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, dob: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-gv-gold/50 transition-all [color-scheme:dark]" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">{t.gender}</label>
                                    <select value={formData.gender} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, gender: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-gv-gold/50 transition-all">
                                        <option value="">{t.selectGender}</option>
                                        <option value="Male">{t.male}</option>
                                        <option value="Female">{t.female}</option>
                                        <option value="Other">{t.other}</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">{t.address}</label>
                                    <input type="text" value={formData.address} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, address: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-gv-gold/50 transition-all" placeholder={t.streetPlaceholder} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">{t.city}</label>
                                    <input type="text" value={formData.city} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, city: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-gv-gold/50 transition-all" placeholder={t.cityPlaceholder} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">{t.phone}</label>
                                    <input type="tel" value={formData.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-gv-gold/50 transition-all" placeholder="+60 12345678" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">{t.taxId}</label>
                                    <input type="text" value={formData.tax_id} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, tax_id: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-gv-gold/50 transition-all" placeholder={t.taxIdPlaceholder} />
                                </div>
                            </div>

                            <label className="flex items-center gap-3 p-5 bg-white/[0.02] border border-white/5 rounded-3xl cursor-pointer group hover:bg-white/[0.04] transition-all">
                                <input type="checkbox" checked={formData.nationality_match} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, nationality_match: e.target.checked})} className="h-5 w-5 rounded border-white/20 bg-transparent text-gv-gold focus:ring-gv-gold/50 cursor-pointer" />
                                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-tight">{t.localityCheck}</span>
                            </label>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    onClick={() => handleFinalSubmit('Draft')} 
                                    className="flex-1 bg-white/5 border border-white/10 text-white font-black py-5 rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest text-[11px]"
                                >
                                    {t.saveClose}
                                </button>
                                <button 
                                    onClick={nextStep} 
                                    className="flex-[2] bg-white/5 border border-white/10 text-white font-black py-5 rounded-2xl hover:bg-gv-gold hover:text-black transition-all uppercase tracking-[0.2em] text-[11px] shadow-lg"
                                >
                                    {t.nextStep}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Profile Information */}
                    {currentStep === 2 && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold text-white tracking-tight">{t.step2Title}</h2>
                                <p className="text-xs text-zinc-500 font-medium">{t.step2Desc}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">{t.purpose}</label>
                                    <select value={formData.account_purpose} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, account_purpose: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none transition-all">
                                        {t.purposes.map((p: string, i: number) => (
                                            <option key={p} value={content.en.purposes[i]}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">{t.employment}</label>
                                    <select value={formData.employment_status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, employment_status: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none transition-all">
                                        {t.employments.map((e_stat: string, i: number) => (
                                            <option key={e_stat} value={content.en.employments[i]}>{e_stat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">{t.industry}</label>
                                    <select value={formData.industry} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, industry: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none transition-all">
                                        {industries.map((ind: string, i: number) => <option key={ind} value={content.en.industries[i]}>{ind}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">{t.wealthSource}</label>
                                <div className="flex flex-wrap gap-2">
                                    {wealthSources.map((source, i) => (
                                        <button key={source} onClick={() => toggleWealthSource(content.en.wealthSources[i])} className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${formData.source_of_wealth.includes(content.en.wealthSources[i]) ? 'bg-gv-gold text-black' : 'bg-white/5 text-zinc-500 border border-white/10'}`}>
                                            {source}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">{t.netWorth}</label>
                                    <select value={formData.total_wealth} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, total_wealth: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[11px] font-black transition-all">
                                        {financialTiers.map((tier: string) => <option key={tier} value={tier}>{tier}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">{t.netIncome}</label>
                                    <select value={formData.annual_income} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, annual_income: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[11px] font-black transition-all">
                                        {financialTiers.map((tier: string) => <option key={tier} value={tier}>{tier}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">{t.expectedDeposit}</label>
                                    <select value={formData.yearly_deposit} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, yearly_deposit: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[11px] font-black transition-all">
                                        {financialTiers.map((tier: string) => <option key={tier} value={tier}>{tier}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4">
                                <label className="flex items-start gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-[28px] cursor-pointer group hover:bg-white/[0.04] transition-all">
                                    <input type="checkbox" checked={formData.accuracy_confirmed} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, accuracy_confirmed: e.target.checked})} className="mt-1 h-5 w-5 rounded border-white/20 bg-transparent text-gv-gold focus:ring-gv-gold/50 cursor-pointer" />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-white uppercase tracking-tighter">{t.accuracyTitle}</p>
                                        <p className="text-[9px] text-zinc-500 font-bold leading-normal">{t.accuracyDesc}</p>
                                    </div>
                                </label>
                                <label className="flex items-start gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-[28px] cursor-pointer group hover:bg-white/[0.04] transition-all">
                                    <input type="checkbox" checked={formData.risk_acknowledged} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, risk_acknowledged: e.target.checked})} className="mt-1 h-5 w-5 rounded border-white/20 bg-transparent text-gv-gold focus:ring-gv-gold/50 cursor-pointer" />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-white uppercase tracking-tighter">{t.riskTitle}</p>
                                        <p className="text-[9px] text-zinc-500 font-bold leading-normal">{t.riskDesc}</p>
                                    </div>
                                </label>
                                <label className="flex items-start gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-[28px] cursor-pointer group hover:bg-white/[0.04] transition-all">
                                    <input type="checkbox" checked={formData.is_not_pep} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, is_not_pep: e.target.checked})} className="mt-1 h-5 w-5 rounded border-white/20 bg-transparent text-gv-gold focus:ring-gv-gold/50 cursor-pointer" />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-white uppercase tracking-tighter">{t.pepTitle}</p>
                                        <p className="text-[9px] text-zinc-500 font-bold leading-normal">{t.pepDesc}</p>
                                    </div>
                                </label>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button onClick={prevStep} className="flex-1 bg-white/5 border border-white/10 text-white font-black py-5 rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest text-[11px]">{t.back}</button>
                                <button 
                                    onClick={() => handleFinalSubmit('Draft')} 
                                    className="flex-1 bg-white/5 border border-white/10 text-white font-black py-5 rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest text-[11px]"
                                >
                                    {t.saveClose}
                                </button>
                                <button onClick={nextStep} className="flex-[2] bg-gv-gold text-black font-black py-5 rounded-2xl transition-all uppercase tracking-widest text-[11px] shadow-lg shadow-gv-gold/20">{t.nextStep}</button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Verify Your Identity */}
                    {currentStep === 3 && (
                        <div className="space-y-10 animate-in fade-in duration-300">
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold text-white tracking-tight">{t.step3Title}</h2>
                                <p className="text-xs text-zinc-500 font-medium">{t.step3Desc}</p>
                            </div>

                            <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">{t.country}</p>
                                        <p className="text-sm font-black text-white uppercase">{formData.country}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">{t.firstName}</p>
                                        <p className="text-sm font-black text-white uppercase">{formData.first_name || "N/A"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">{t.lastName}</p>
                                        <p className="text-sm font-black text-white uppercase">{formData.last_name || "N/A"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 text-center">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 inline-block">{t.docTypeTitle}</label>
                                <div className="flex flex-wrap justify-center gap-3">
                                    {t.docTypes.map((type: string, i: number) => (
                                        <button key={type} onClick={() => setFormData({...formData, id_type: content.en.docTypes[i]})} className={`px-6 py-3 rounded-2xl text-[10px] font-black tracking-widest border transition-all ${formData.id_type === content.en.docTypes[i] ? 'bg-gv-gold border-gv-gold text-black' : 'bg-[#1a1a1a] border-white/10 text-zinc-500 hover:border-white/20'}`}>
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">{t.frontDoc}</label>
                                    <div className="relative group border-2 border-white/5 border-dashed rounded-[32px] overflow-hidden bg-white/[0.02] aspect-[3/2] flex flex-col items-center justify-center hover:bg-white/[0.04] transition-all border-dashed-2">
                                        {idFront ? (
                                            <div className="absolute inset-0 p-4">
                                                <img src={URL.createObjectURL(idFront)} className="w-full h-full object-cover rounded-2xl opacity-50" />
                                                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
                                                    <svg className="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                    <span className="text-[9px] font-black uppercase text-white tracking-widest">{idFront.name}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center space-y-4">
                                                <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-gv-gold group-hover:text-black transition-all">
                                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{t.uploadPrompt}</span>
                                            </div>
                                        )}
                                        <input type="file" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIdFront(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">{t.backDoc}</label>
                                    <div className="relative group border-2 border-white/5 border-dashed rounded-[32px] overflow-hidden bg-white/[0.02] aspect-[3/2] flex flex-col items-center justify-center hover:bg-white/[0.04] transition-all border-dashed-2">
                                        {idBack ? (
                                            <div className="absolute inset-0 p-4">
                                                <img src={URL.createObjectURL(idBack)} className="w-full h-full object-cover rounded-2xl opacity-50" />
                                                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
                                                    <svg className="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                    <span className="text-[9px] font-black uppercase text-white tracking-widest">{idBack.name}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center space-y-4">
                                                <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-gv-gold group-hover:text-black transition-all">
                                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{t.uploadPrompt}</span>
                                            </div>
                                        )}
                                        <input type="file" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIdBack(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">{t.bankStatement}</label>
                                <div className="relative group border-2 border-white/5 border-dashed rounded-[32px] overflow-hidden bg-white/[0.02] min-h-[160px] flex flex-col items-center justify-center hover:bg-white/[0.04] transition-all border-dashed-2">
                                    {bankStatement ? (
                                        <div className="flex flex-col items-center justify-center space-y-2 p-6">
                                            <svg className="h-12 w-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            <span className="text-[10px] font-black uppercase text-white tracking-widest">{bankStatement.name}</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center space-y-4 p-6">
                                            <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-gv-gold group-hover:text-black transition-all">
                                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{t.uploadStatement}</span>
                                        </div>
                                    )}
                                    <input type="file" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBankStatement(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 pt-10">
                                <button onClick={prevStep} className="flex-1 bg-white/5 border border-white/10 text-white font-black py-5 rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest text-[11px]">{t.back}</button>
                                <button 
                                    onClick={() => handleFinalSubmit('Draft')} 
                                    disabled={isLoading}
                                    className="flex-1 bg-white/5 border border-white/10 text-white font-black py-5 rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest text-[11px]"
                                >
                                    {isLoading ? <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div> : t.saveClose}
                                </button>
                                <button onClick={() => handleFinalSubmit('Pending')} disabled={isLoading} className="flex-[2] bg-gv-gold text-black font-black py-5 rounded-2xl transition-all uppercase tracking-[0.2em] text-[11px] shadow-[0_20px_40px_rgba(212,175,55,0.2)] flex items-center justify-center gap-3">
                                    {isLoading ? <div className="h-4 w-4 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : t.submitDocument}
                                </button>
                            </div>
                        </div>
                    )}

                </main>
                
                <footer className="text-center space-y-6">
                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-[0.2em] max-w-xl mx-auto leading-loose">
                        {t.footerNote}
                    </p>
                </footer>
            </div>

            <GlobalFooter />

            {showSuccess && (
                <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-700">
                    <div className="bg-[#1a1a1a] border border-gv-gold/30 rounded-[40px] p-10 max-w-md w-full text-center space-y-8 shadow-2xl animate-in zoom-in-95 duration-500">
                        <div className="h-20 w-20 bg-gv-gold rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(212,175,55,0.2)] animate-bounce-subtle">
                            <svg className="h-10 w-10 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-white">{t.verificationStarted}</h2>
                            <p className="text-gv-gold/60 text-base font-black uppercase tracking-widest">{t.complianceReview}</p>
                        </div>
                        <button onClick={() => router.push(`/dashboard?lang=${lang}`)} className="w-full bg-gv-gold text-black font-black py-4 rounded-2xl uppercase tracking-widest text-sm shadow-xl hover:-translate-y-1 transition-all">
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
