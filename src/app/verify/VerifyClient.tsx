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
        country: "Malaysia" // Default
    });

    const [idFront, setIdFront] = useState<File | null>(null);
    const [idBack, setIdBack] = useState<File | null>(null);
    const [idFrontRef, setIdFrontRef] = useState<string | null>(null);
    const [idBackRef, setIdBackRef] = useState<string | null>(null);

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
                    if (profile.kyc_step && profile.kyc_step > 1) {
                        setCurrentStep(profile.kyc_step);
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
                }
            }
        };
        fetchUser();
    }, [searchParams, router]);

    const handleUpload = async (file: File, side: 'front' | 'back') => {
        if (!user) return null;
        const fileName = `${user.id}_${side}_${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
            .from('agreements')
            .upload(fileName, file);
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
        }

        setIsLoading(true);
        try {
            let frontPath = idFrontRef;
            let backPath = idBackRef;

            if (idFront) frontPath = await handleUpload(idFront, 'front');
            if (idBack) backPath = await handleUpload(idBack, 'back');

            const payload = {
                ...formData,
                kyc_id_front: frontPath,
                kyc_id_back: backPath,
                kyc_status: status,
                kyc_completed: status === 'Pending',
                full_name: `${formData.first_name} ${formData.last_name}`,
                kyc_step: currentStep,
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
        const next = Math.min(currentStep + 1, 3);
        setCurrentStep(next);
        await syncProgress(next, formData);
    };
    const prevStep = () => setCurrentStep((prev: number) => Math.max(prev - 1, 1));

    const industries = ["Finance", "Tech", "Healthcare", "Manufacturing", "Education", "Real Estate", "Law", "Media", "Travel", "Energy", "Retail", "Other"];
    const wealthSources = ["Salary", "Business Profits", "Savings", "Inheritance", "Investments"];
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
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Identity Verification</h1>
                        <p className="text-[10px] text-gv-gold font-black tracking-[0.2em] uppercase">Investor Onboarding Portal</p>
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
                                <h2 className="text-xl font-bold text-white tracking-tight">Personal Information</h2>
                                <p className="text-xs text-zinc-500 font-medium">Please provide your details exactly as they appear on your legal ID.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">First Name</label>
                                    <input type="text" value={formData.first_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, first_name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-gv-gold/50 focus:ring-1 focus:ring-gv-gold/20 transition-all" placeholder="Enter first name" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Last Name</label>
                                    <input type="text" value={formData.last_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, last_name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-gv-gold/50 focus:ring-1 focus:ring-gv-gold/20 transition-all" placeholder="Enter last name" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Date of Birth</label>
                                    <input type="date" value={formData.dob} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, dob: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-gv-gold/50 transition-all [color-scheme:dark]" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Gender</label>
                                    <select value={formData.gender} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, gender: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-gv-gold/50 transition-all">
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Residential Address</label>
                                    <input type="text" value={formData.address} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, address: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-gv-gold/50 transition-all" placeholder="Street name, building, unit number" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">City</label>
                                    <input type="text" value={formData.city} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, city: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-gv-gold/50 transition-all" placeholder="Enter city" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Phone Number</label>
                                    <input type="tel" value={formData.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-gv-gold/50 transition-all" placeholder="+60 12345678" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Tax Identification Number (TIN)</label>
                                    <input type="text" value={formData.tax_id} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, tax_id: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-gv-gold/50 transition-all" placeholder="Optional for individual investors" />
                                </div>
                            </div>

                            <label className="flex items-center gap-3 p-5 bg-white/[0.02] border border-white/5 rounded-3xl cursor-pointer group hover:bg-white/[0.04] transition-all">
                                <input type="checkbox" checked={formData.nationality_match} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, nationality_match: e.target.checked})} className="h-5 w-5 rounded border-white/20 bg-transparent text-gv-gold focus:ring-gv-gold/50 cursor-pointer" />
                                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-tight">My place of birth and nationality are the same as my country of residence.</span>
                            </label>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    onClick={() => handleFinalSubmit('Draft')} 
                                    className="flex-1 bg-white/5 border border-white/10 text-white font-black py-5 rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest text-[11px]"
                                >
                                    Save & Close
                                </button>
                                <button 
                                    onClick={nextStep} 
                                    className="flex-[2] bg-white/5 border border-white/10 text-white font-black py-5 rounded-2xl hover:bg-gv-gold hover:text-black transition-all uppercase tracking-[0.2em] text-[11px] shadow-lg"
                                >
                                    Next Step
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Profile Information */}
                    {currentStep === 2 && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold text-white tracking-tight">Profile Information</h2>
                                <p className="text-xs text-zinc-500 font-medium">To provide a secure service, we need to understand your investment profile.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Purpose of Account</label>
                                    <select value={formData.account_purpose} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, account_purpose: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none transition-all">
                                        <option value="Investment">Investment</option>
                                        <option value="Hedging">Hedging</option>
                                        <option value="Speculation">Speculation</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Employment Status</label>
                                    <select value={formData.employment_status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, employment_status: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none transition-all">
                                        <option value="Full-time">Full-time</option>
                                        <option value="Part-time">Part-time</option>
                                        <option value="Freelancer">Freelancer</option>
                                        <option value="Business Owner">Business Owner</option>
                                        <option value="Retired">Retired</option>
                                        <option value="Unemployed">Unemployed</option>
                                        <option value="Student">Student</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Industry</label>
                                    <select value={formData.industry} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, industry: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none transition-all">
                                        {industries.map((ind: string) => <option key={ind} value={ind}>{ind}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Primary Source of Wealth (Select all that apply)</label>
                                <div className="flex flex-wrap gap-2">
                                    {wealthSources.map(source => (
                                        <button key={source} onClick={() => toggleWealthSource(source)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${formData.source_of_wealth.includes(source) ? 'bg-gv-gold text-black' : 'bg-white/5 text-zinc-500 border border-white/10'}`}>
                                            {source}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Total Net Worth</label>
                                    <select value={formData.total_wealth} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, total_wealth: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[11px] font-black transition-all">
                                        {financialTiers.map((t: string) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Annual Net Income</label>
                                    <select value={formData.annual_income} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, annual_income: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[11px] font-black transition-all">
                                        {financialTiers.map((t: string) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Expected Yearly Deposit</label>
                                    <select value={formData.yearly_deposit} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, yearly_deposit: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[11px] font-black transition-all">
                                        {financialTiers.map((t: string) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4">
                                <label className="flex items-start gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-[28px] cursor-pointer group hover:bg-white/[0.04] transition-all">
                                    <input type="checkbox" checked={formData.accuracy_confirmed} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, accuracy_confirmed: e.target.checked})} className="mt-1 h-5 w-5 rounded border-white/20 bg-transparent text-gv-gold focus:ring-gv-gold/50 cursor-pointer" />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-white uppercase tracking-tighter">Information Accuracy</p>
                                        <p className="text-[9px] text-zinc-500 font-bold leading-normal">I hereby confirm that all the information provided above is true and correct.</p>
                                    </div>
                                </label>
                                <label className="flex items-start gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-[28px] cursor-pointer group hover:bg-white/[0.04] transition-all">
                                    <input type="checkbox" checked={formData.risk_acknowledged} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, risk_acknowledged: e.target.checked})} className="mt-1 h-5 w-5 rounded border-white/20 bg-transparent text-gv-gold focus:ring-gv-gold/50 cursor-pointer" />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-white uppercase tracking-tighter">Risk Acknowledgement</p>
                                        <p className="text-[9px] text-zinc-500 font-bold leading-normal">I understand and acknowledge the risks associated with high-yield investments.</p>
                                    </div>
                                </label>
                                <label className="flex items-start gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-[28px] cursor-pointer group hover:bg-white/[0.04] transition-all">
                                    <input type="checkbox" checked={formData.is_not_pep} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, is_not_pep: e.target.checked})} className="mt-1 h-5 w-5 rounded border-white/20 bg-transparent text-gv-gold focus:ring-gv-gold/50 cursor-pointer" />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-white uppercase tracking-tighter">PEP Declaration</p>
                                        <p className="text-[9px] text-zinc-500 font-bold leading-normal">I confirm that I am not a Politically Exposed Person (PEP) or a close associate of one.</p>
                                    </div>
                                </label>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button onClick={prevStep} className="flex-1 bg-white/5 border border-white/10 text-white font-black py-5 rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest text-[11px]">Back</button>
                                <button 
                                    onClick={() => handleFinalSubmit('Draft')} 
                                    className="flex-1 bg-white/5 border border-white/10 text-white font-black py-5 rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest text-[11px]"
                                >
                                    Save & Close
                                </button>
                                <button onClick={nextStep} className="flex-[2] bg-gv-gold text-black font-black py-5 rounded-2xl transition-all uppercase tracking-widest text-[11px] shadow-lg shadow-gv-gold/20">Next Step</button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Verify Your Identity */}
                    {currentStep === 3 && (
                        <div className="space-y-10 animate-in fade-in duration-300">
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold text-white tracking-tight">Verify Your Identity</h2>
                                <p className="text-xs text-zinc-500 font-medium">Finalize your profile by uploading a valid government ID.</p>
                            </div>

                            <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Country</p>
                                        <p className="text-sm font-black text-white uppercase">{formData.country}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">First Name</p>
                                        <p className="text-sm font-black text-white uppercase">{formData.first_name || "N/A"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Last Name</p>
                                        <p className="text-sm font-black text-white uppercase">{formData.last_name || "N/A"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 text-center">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 inline-block">Select Document Type</label>
                                <div className="flex flex-wrap justify-center gap-3">
                                    {["ID Card", "Driver's License", "Passport", "Military ID", "Residence Permit"].map((type: string) => (
                                        <button key={type} onClick={() => setFormData({...formData, id_type: type})} className={`px-6 py-3 rounded-2xl text-[10px] font-black tracking-widest border transition-all ${formData.id_type === type ? 'bg-gv-gold border-gv-gold text-black' : 'bg-[#1a1a1a] border-white/10 text-zinc-500 hover:border-white/20'}`}>
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Front of Document</label>
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
                                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Upload IC / Image</span>
                                            </div>
                                        )}
                                        <input type="file" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIdFront(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Back of Document</label>
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
                                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Upload IC / Image</span>
                                            </div>
                                        )}
                                        <input type="file" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIdBack(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 pt-10">
                                <button onClick={prevStep} className="flex-1 bg-white/5 border border-white/10 text-white font-black py-5 rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest text-[11px]">Back</button>
                                <button 
                                    onClick={() => handleFinalSubmit('Draft')} 
                                    disabled={isLoading}
                                    className="flex-1 bg-white/5 border border-white/10 text-white font-black py-5 rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest text-[11px]"
                                >
                                    {isLoading ? <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div> : 'Save & Close'}
                                </button>
                                <button onClick={() => handleFinalSubmit('Pending')} disabled={isLoading} className="flex-[2] bg-gv-gold text-black font-black py-5 rounded-2xl transition-all uppercase tracking-[0.2em] text-[11px] shadow-[0_20px_40px_rgba(212,175,55,0.2)] flex items-center justify-center gap-3">
                                    {isLoading ? <div className="h-4 w-4 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : 'Submit Document'}
                                </button>
                            </div>
                        </div>
                    )}

                </main>
                
                <footer className="text-center space-y-6">
                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-[0.2em] max-w-xl mx-auto leading-loose">
                        By providing your identity document, you authorize GV Capital Trust to perform security and compliance screenings in accordance with global AML/KYC regulations.
                    </p>
                </footer>
            </div>

            <GlobalFooter />

            {showSuccess && (
                <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center animate-in fade-in duration-700 text-center px-10">
                    <div className="h-32 w-32 bg-gv-gold rounded-full flex items-center justify-center mb-10 shadow-[0_0_80px_rgba(212,175,55,0.3)] animate-bounce">
                        <svg className="h-16 w-16 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-5xl font-black mb-4 uppercase tracking-tighter text-white">Verification Started</h2>
                    <p className="text-gv-gold/60 text-lg max-w-md font-black uppercase tracking-widest">Compliance review in progress.</p>
                </div>
            )}
        </div>
    );
}
