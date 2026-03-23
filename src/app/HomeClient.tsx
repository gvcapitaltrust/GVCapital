"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import GlobalFooter from "@/components/GlobalFooter";
import Navigation from "@/components/Navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";
import { TIERS, formatUSD } from "@/lib/tierUtils";
import { ShieldCheck, TrendingUp, BarChart3, Clock, Lock, ArrowRight, CheckCircle2, Globe, Briefcase, ChevronRight, Wallet, Activity } from "lucide-react";

export default function HomeClient() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [lang, setLang] = useState<"en" | "zh">("en");

    useEffect(() => {
        const l = searchParams?.get("lang");
        if (l === "zh") setLang("zh");
        else if (l === "en") setLang("en");

        const checkMaintenance = async () => {
            try {
                const { data } = await supabase.from('platform_settings').select('value').eq('key', 'maintenance_mode').single();
                if (data?.value === 'true') {
                    router.push('/maintenance');
                }
            } catch (err) {
                console.error("Maintenance check failed", err);
            }
        };
        checkMaintenance();
    }, [searchParams, router]);

    const content = {
        en: {
            hero: {
                slogan: "Trusty. Integrity. Freedom.",
                title: "GV Capital Trust",
                desc: "Your partner in wealth management and financial freedom. We provide bespoke trust services with a commitment to integrity and excellence.",
                btnStart: "Get Started",
                btnExplore: "Explore Our Services",
            },
            about: {
                title: "What We Do",
                subtitle: "Empowering Financial and Time Freedom",
                desc1: "At GV Capital Trust, we specialize in professional capital allocation and structured wealth management.",
                desc2: "Our core mission is to provide secure, transparent, and profitable investment strategies driven by advanced market analysis. We handle the complexities of the market so you can enjoy stable, automated monthly dividends.",
                stats: { clients: "Global Clients", volume: "Managed Volume", uptime: "System Uptime" }
            },
            services: {
                title: "Our Core Offerings",
                items: [
                    { title: "Capital Management", desc: "Professional fund allocation in high-yield markets managed by expert managers." },
                    { title: "Monthly Dividends", desc: "Automated monthly profit distribution based on your verifiable investment tier." },
                    { title: "Market Strategies", desc: "Leveraging advanced proprietary fund management algorithms for reliable returns." },
                    { title: "Secure Trust Vault", desc: "Bank-grade security, end-to-end encryption, and strict KYC protocols." }
                ]
            },
            process: {
                title: "How It Works",
                steps: [
                    { title: "Register & Verify", desc: "Create your account and complete our secure KYC verification process." },
                    { title: "Deposit Capital", desc: "Fund your account using our supported seamless payment gateways." },
                    { title: "Select Allocation", desc: "Choose your investment tier and let our experts handle the fund management." },
                    { title: "Earn Dividends", desc: "Profits are automatically credited to your wallet, available for you to withdraw anytime." }
                ]
            },
            tiers: {
                title: "Tiered Investment System",
                subtitle: "Unlock higher monthly returns as you upgrade your portfolio tier.",
                levels: ["Silver", "Gold", "Platinum", "Diamond"],
                return: "Monthly Dividends",
                upTo: "Up to"
            },
            cta: {
                join: "Join GV Capital Trust Today",
                desc: "Step into the future of automated wealth management.",
                btn: "Create Free Account"
            }
        },
        zh: {
            hero: {
                slogan: "信任 · 诚信 · 自由",
                title: "GV 资本信托",
                desc: "您在财富管理和财务自由方面的合作伙伴。我们致力于以诚信和卓越提供定制的信托服务。",
                btnStart: "立即开始",
                btnExplore: "探索我们的服务",
            },
            about: {
                title: "我们的业务",
                subtitle: "赋能财务与时间的自由",
                desc1: "在 GV 资本信托，我们专注于专业的资金配置和结构化的财富管理。",
                desc2: "我们的核心使命是提供安全、透明、高收益的专业投资策略。我们处理复杂的市场运作，让您尽享稳定、自动化的每月分红。",
                stats: { clients: "全球客户", volume: "管理资金量", uptime: "系统运行时长" }
            },
            services: {
                title: "核心服务",
                items: [
                    { title: "资金管理", desc: "由具备丰富经验的管理专家在稳健市场进行专业的资金配置。" },
                    { title: "每月分红", desc: "基于您所选择的投资等级，系统自动分配每月利润。" },
                    { title: "市场策略", desc: "利用先进的市场策略和独家基金管理算法获取可靠的回报。" },
                    { title: "安全信托金库", desc: "银行级安全标准、端到端数据加密以及严格的 KYC 身份认证审核。" }
                ]
            },
            process: {
                title: "运作流程",
                steps: [
                    { title: "注册与验证", desc: "创建您的账户并完成我们安全可靠的 KYC 验证流程。" },
                    { title: "存入资金", desc: "使用我们支持的无缝支付渠道为您的账户注入资金。" },
                    { title: "选择配置", desc: "选择您的投资等级，让我们的专家团队负责接下来的基金管理。" },
                    { title: "获取分红", desc: "利润将自动存入您的钱包，随时可供您自由提取。" }
                ]
            },
            tiers: {
                title: "阶梯式投资系统",
                subtitle: "升级您的投资组合等级，解锁更高的每月回报率。",
                levels: ["白银级", "黄金级", "铂金级", "钻石级"],
                return: "每月分红",
                upTo: "高达"
            },
            cta: {
                join: "今天就加入 GV 资本信托",
                desc: "迈向自动化财富管理的未来。",
                btn: "免费创建账户"
            }
        }
    };

    const t = content[lang];
    const targetLink = user ? `/dashboard?lang=${lang}` : `/register?lang=${lang}`;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-gv-gold selection:text-black flex flex-col overflow-x-hidden font-sans">
            <Navigation lang={lang} setLang={setLang} />

            {/* --- HERO SECTION --- */}
            <section className="relative flex flex-col items-center justify-center min-h-[90vh] pt-32 pb-20 px-6 text-center">
                {/* Background Decor */}
                <div className="absolute top-1/2 left-1/2 -z-10 h-[400px] w-[400px] sm:h-[600px] sm:w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gv-gold/10 blur-[100px] sm:blur-[150px]"></div>
                <div className="absolute top-1/4 right-1/4 -z-10 h-[300px] w-[300px] rounded-full bg-blue-500/5 blur-[100px]"></div>

                <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-5xl mx-auto z-10">
                    <div className="mx-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
                        <span className="h-2 w-2 rounded-full bg-gv-gold animate-pulse"></span>
                        <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-zinc-300">
                            {t.hero.slogan}
                        </h2>
                    </div>

                    <h1 className="mb-6 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl leading-tight">
                        <span className="block text-white uppercase">{t.hero.title}</span>
                    </h1>
                    
                    <p className="mx-auto mb-10 max-w-2xl text-base sm:text-lg leading-relaxed text-zinc-400 font-medium">
                        {t.hero.desc}
                    </p>

                    <div className="flex flex-col gap-4 sm:flex-row justify-center items-center px-4">
                        <Link
                            href={targetLink}
                            style={{ opacity: authLoading ? 0.5 : 1 }}
                            className="group w-full sm:w-auto relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gv-gold px-10 py-4 text-sm font-black text-black transition-all hover:pr-14 active:scale-95 shadow-[0_0_40px_rgba(212,175,55,0.3)] hover:shadow-[0_0_60px_rgba(212,175,55,0.5)]"
                        >
                            <span className="relative z-10 uppercase tracking-widest">{t.hero.btnStart}</span>
                            <ArrowRight className="absolute right-5 h-5 w-5 -translate-x-4 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                        </Link>
                        
                        <a href="#about" className="w-full sm:w-auto rounded-full border border-white/10 bg-white/5 px-10 py-4 text-sm font-black text-white hover:bg-white/10 transition-all active:scale-95 uppercase tracking-widest group flex items-center justify-center gap-2">
                            {t.hero.btnExplore}
                        </a>
                    </div>
                </div>
            </section>

            {/* --- ABOUT / WHAT WE DO --- */}
            <section id="about" className="py-24 relative z-10 bg-[#121212] border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h3 className="text-gv-gold text-[10px] font-black uppercase tracking-[0.2em] mb-3">{t.about.title}</h3>
                        <h2 className="text-2xl sm:text-3xl font-black mb-4 leading-tight">{t.about.subtitle}</h2>
                        <p className="text-zinc-400 text-lg mb-6 leading-relaxed">
                            {t.about.desc1}
                        </p>
                        <p className="text-zinc-400 text-lg leading-relaxed mb-10">
                            {t.about.desc2}
                        </p>
                        
                        {/* Stats mini-grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-8 border-t border-white/10">
                            <div>
                                <div className="text-xl font-black text-white mb-0.5">10k+</div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{t.about.stats.clients}</div>
                            </div>
                            <div>
                                <div className="text-xl font-black text-white mb-0.5">$50M+</div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{t.about.stats.volume}</div>
                            </div>
                            <div className="hidden sm:block">
                                <div className="text-xl font-black text-white mb-0.5">99.9%</div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{t.about.stats.uptime}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="relative">
                        <div className="aspect-square rounded-[3rem] bg-gradient-to-br from-zinc-900 to-[#121212] border border-white/10 p-2 relative overflow-hidden flex items-center justify-center">
                            {/* Decorative Central Element */}
                            <div className="relative h-64 w-64 rounded-full border border-gv-gold/30 flex items-center justify-center animate-[spin_60s_linear_infinite]">
                                <div className="absolute h-full w-full rounded-full border-t-2 border-gv-gold/80 animate-[spin_10s_linear_infinite]"></div>
                                <div className="h-48 w-48 rounded-full bg-gv-gold/5 border border-gv-gold/20 flex items-center justify-center backdrop-blur-md">
                                    <Globe className="h-24 w-24 text-gv-gold opacity-80" strokeWidth={1} />
                                </div>
                            </div>
                            
                            {/* Floating cards */}
                            <div className="absolute top-10 left-10 bg-[#1a1a1a]/80 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4 animate-[bounce_4s_infinite]">
                                <div className="bg-green-500/20 p-2 rounded-lg text-green-400"><TrendingUp size={24} /></div>
                                <div><div className="text-sm font-bold text-white">Consistent</div><div className="text-xs text-zinc-500">Growth</div></div>
                            </div>
                            <div className="absolute bottom-10 right-10 bg-[#1a1a1a]/80 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4 animate-[bounce_5s_infinite_reverse]">
                                <div className="bg-gv-gold/20 p-2 rounded-lg text-gv-gold"><ShieldCheck size={24} /></div>
                                <div><div className="text-sm font-bold text-white">Secured</div><div className="text-xs text-zinc-500">Bank-Grade</div></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- CORE OFFERINGS --- */}
            <section className="py-24 relative z-10">
                <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center">
                    <h2 className="text-2xl sm:text-3xl font-black mb-12">{t.services.title}</h2>
                    
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {t.services.items.map((item, idx) => {
                            const icons = [<Briefcase key={0} />, <BarChart3 key={1} />, <Activity key={2} />, <Lock key={3} />];
                            return (
                                <div key={idx} className="group rounded-[2rem] border border-white/5 bg-[#121212] p-8 text-left transition-all hover:bg-[#1a1a1a] hover:border-gv-gold/30 hover:-translate-y-2 duration-500">
                                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-gv-gold group-hover:bg-gv-gold/20 group-hover:scale-110 transition-all">
                                        {icons[idx]}
                                    </div>
                                    <h3 className="mb-3 text-xl font-bold text-white">{item.title}</h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">
                                        {item.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* --- HOW IT WORKS (Process Timeline) --- */}
            <section className="py-24 relative z-10 bg-[#121212] border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6 lg:px-12">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <h2 className="text-2xl sm:text-3xl font-black mb-4">{t.process.title}</h2>
                    </div>
                    
                    <div className="grid md:grid-cols-4 gap-8 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-[28px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-gv-gold/0 via-gv-gold/30 to-gv-gold/0 z-0"></div>

                        {t.process.steps.map((step, idx) => (
                            <div key={idx} className="relative z-10 flex flex-col items-center text-center">
                                <div className="h-14 w-14 rounded-full bg-[#1a1a1a] border-2 border-gv-gold/50 flex items-center justify-center text-xl font-black text-gv-gold mb-6 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                                    {idx + 1}
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                                <p className="text-zinc-400 text-sm leading-relaxed px-4">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- TIERS PREVIEW --- */}
            <section className="py-24 relative z-10">
                <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center">
                    <h2 className="text-2xl sm:text-3xl font-black mb-3">{t.tiers.title}</h2>
                    <p className="text-zinc-400 text-base mb-12 max-w-2xl mx-auto">{t.tiers.subtitle}</p>

                    <div className="flex flex-wrap justify-center gap-6">
                        {TIERS.map((tierData, idx) => {
                            const colors = ['border-zinc-400/50 text-zinc-300', 'border-slate-400/50 text-slate-300', 'border-yellow-500/50 text-yellow-500', 'border-amber-500/50 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]'];
                            const gradients = ['from-zinc-400/10', 'from-slate-400/10', 'from-yellow-500/10', 'from-amber-500/10'];
                            const isFixed = tierData.minDividend === tierData.maxDividend;
                            return (
                                <div key={tierData.id} className={`w-full sm:w-[280px] rounded-3xl border border-white/5 bg-gradient-to-b ${gradients[idx]} to-transparent p-6 text-left relative overflow-hidden transition-all hover:scale-105 hover:border-white/20 hover:bg-[#1a1a1a]`}>
                                    <div className="mb-8">
                                        <span className={`inline-block px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${colors[idx]}`}>
                                            {t.tiers.levels[idx]}
                                        </span>
                                    </div>
                                    <div className="flex items-end gap-1 mb-2">
                                        <span className="text-sm font-bold text-zinc-400 mb-2 mr-1">{t.tiers.upTo as string}</span>
                                        <span className="text-4xl font-black text-white">
                                            {(tierData.maxDividend * 100).toFixed(0)}
                                        </span>
                                        <span className="text-gv-gold font-bold mb-1">%</span>
                                    </div>
                                    <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">{t.tiers.return}</div>
                                    <div className="text-zinc-500 text-[11px] font-bold">
                                        {tierData.id === 'silver' ? 'Up to $999' : `${formatUSD(tierData.minAmount)} - ${formatUSD(tierData.maxAmount)}`}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* --- CTA BOTTOM --- */}
            <section className="py-32 relative z-10 border-t border-white/10 overflow-hidden">
                <div className="absolute inset-0 bg-gv-gold/5"></div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-64 bg-gv-gold/10 blur-[100px] rounded-full"></div>
                
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <h2 className="text-3xl sm:text-4xl font-black mb-4 uppercase tracking-tight">{t.cta.join}</h2>
                    <p className="text-lg text-zinc-400 mb-8">{t.cta.desc}</p>
                    <Link
                        href={targetLink}
                        style={{ opacity: authLoading ? 0.5 : 1 }}
                        className="inline-flex items-center justify-center rounded-full bg-gv-gold px-12 py-5 text-sm font-black uppercase tracking-widest text-black transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(212,175,55,0.4)]"
                    >
                        {t.cta.btn}
                    </Link>
                </div>
            </section>

            <GlobalFooter />
        </div>
    );
}

