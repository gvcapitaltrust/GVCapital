"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import GlobalFooter from "@/components/GlobalFooter";
import Navigation from "@/components/Navigation";
import { Mail, Clock, ShieldCheck, HeadphonesIcon } from "lucide-react";

function ContactClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialLang = searchParams?.get("lang") === "zh" ? "zh" : "en";
    const [lang, setLang] = useState<"en" | "zh">(initialLang);

    useEffect(() => {
        const currentUrlLang = searchParams?.get("lang");
        if (currentUrlLang !== lang) {
            router.replace(`?lang=${lang}`, { scroll: false });
        }
    }, [lang, router, searchParams]);

    const content = {
        en: {
            hero: {
                title: "Global Support",
                subtitle: "Exclusive VIP assistance available around the clock. Connect with our dedicated trust management team."
            },
            channels: [
                {
                    icon: <HeadphonesIcon className="h-6 w-6" />,
                    title: "WhatsApp VIP Concierge",
                    desc: "Immediate support routing for active portfolio inquiries, emergency withdrawals, and account assistance.",
                    action: "Chat Now",
                    link: "https://wa.me/?text=Hi%20GV%20Capital,%20I%20need%20VIP%20assistance."
                },
                {
                    icon: <Mail className="h-6 w-6" />,
                    title: "General Inquiries",
                    desc: "For corporate partnerships, media inquiries, or technical support regarding the dashboard infrastructure.",
                    action: "Email Support",
                    link: "mailto:support@gvcapitaltrust.com"
                }
            ],
            info: {
                title: "Operational Logistics",
                items: [
                    { label: "Trading Desk", value: "24 Hours / 5 Days (Mon-Fri)" },
                    { label: "VIP Support", value: "24/7 Priority Access" },
                    { label: "Compliance & KYC", value: "Available 9:00 AM - 6:00 PM (GMT+8)" }
                ]
            },
            securityNote: "For your security, GV Capital Trust personnel will NEVER ask for your password, 6-digit withdrawal PIN, or seed phrases. All official communication is strictly routed through our verified channels."
        },
        zh: {
            hero: {
                title: "全球支持",
                subtitle: "全天候提供专属 VIP 协助。与我们专门的信托管理团队取得联系。"
            },
            channels: [
                {
                    icon: <HeadphonesIcon className="h-6 w-6" />,
                    title: "WhatsApp VIP 礼宾服务",
                    desc: "为活跃的投资组合查询、紧急提款和账户协助提供即时支持路由。",
                    action: "立即聊天",
                    link: "https://wa.me/?text=Hi%20GV%20Capital,%20I%20need%20VIP%20assistance."
                },
                {
                    icon: <Mail className="h-6 w-6" />,
                    title: "一般查询",
                    desc: "用于企业合作、媒体咨询或有关仪表盘技术基础设施的支持。",
                    action: "发送电子邮件",
                    link: "mailto:support@gvcapitaltrust.com"
                }
            ],
            info: {
                title: "运营详情",
                items: [
                    { label: "交易台", value: "24 小时 / 5 天 (周一至周五)" },
                    { label: "VIP 支持", value: "24/7 优先访问" },
                    { label: "合规与 KYC", value: "上午 9:00 - 下午 6:00 (GMT+8)" }
                ]
            },
            securityNote: "为了您的安全，GV 资本信托的工作人员绝不会询问您的密码、6 位数提款验证码或助记词。所有官方通信均严格通过我们经过验证的渠道进行。"
        }
    };

    const t = content[lang];

    return (
        <div className="min-h-screen bg-[#FAFAF8] flex flex-col font-sans text-gray-900 selection:bg-gv-gold selection:text-white overflow-x-hidden">
            <Navigation lang={lang} setLang={setLang} />

            <main className="flex-1 w-full pt-32 pb-20">
                {/* Hero */}
                <div className="max-w-4xl mx-auto px-6 sm:px-12 text-center mb-20 relative z-10">
                    <div className="mx-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 mb-8 backdrop-blur-md shadow-sm">
                        <span className="h-2 w-2 rounded-full bg-gv-gold animate-pulse"></span>
                        <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-gray-700">CONTACT US</h2>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900 mb-6">{t.hero.title}</h1>
                    <p className="text-lg md:text-xl text-gray-500 font-medium tracking-wide leading-relaxed max-w-2xl mx-auto">{t.hero.subtitle}</p>
                </div>

                <div className="max-w-6xl mx-auto px-6 lg:px-12 grid md:grid-cols-2 gap-8 mb-20 relative z-10">
                    {/* Decor Blur */}
                    <div className="absolute top-1/2 left-1/2 -z-10 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gv-gold/10 blur-[100px]"></div>

                    {/* Contact Channels */}
                    {t.channels.map((ch, idx) => (
                        <div key={idx} className="bg-white border border-gray-100 p-8 md:p-10 rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.02)] flex flex-col h-full hover:border-gv-gold/30 hover:shadow-[0_20px_60px_rgba(212,175,55,0.1)] transition-all duration-300">
                            <div className="h-14 w-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gv-gold mb-6 border border-gray-100">
                                {ch.icon}
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight text-gray-900 mb-4">{ch.title}</h3>
                            <p className="text-gray-500 leading-relaxed font-medium mb-8 flex-grow">{ch.desc}</p>
                            <a 
                                href={ch.link} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex w-full md:w-auto items-center justify-center bg-gray-900 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gv-gold hover:text-black transition-colors"
                            >
                                {ch.action}
                            </a>
                        </div>
                    ))}
                </div>

                {/* Logistics & Security */}
                <div className="max-w-4xl mx-auto px-6 lg:px-12 space-y-8">
                    <div className="bg-white border border-gray-100 p-8 md:p-10 rounded-[2rem] shadow-sm flex flex-col md:flex-row gap-12 justify-between items-center">
                        <div className="w-full md:w-1/2">
                            <div className="flex items-center gap-3 mb-6">
                                <Clock className="h-6 w-6 text-gv-gold" />
                                <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">{t.info.title}</h3>
                            </div>
                            <ul className="space-y-4">
                                {t.info.items.map((item, idx) => (
                                    <li key={idx} className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                                        <span className="text-sm font-bold text-gray-500">{item.label}</span>
                                        <span className="text-sm font-black text-gray-900 text-right">{item.value}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="w-full md:w-1/2 bg-gray-50 p-6 rounded-2xl border border-red-500/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <ShieldCheck className="h-32 w-32 text-red-500" />
                            </div>
                            <div className="flex items-start gap-3 relative z-10">
                                <ShieldCheck className="h-6 w-6 text-red-500 shrink-0 mt-1" />
                                <p className="text-sm font-bold text-gray-600 leading-relaxed">
                                    {t.securityNote}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <GlobalFooter />
        </div>
    );
}

export default function ContactPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-gv-gold border-t-transparent rounded-full"></div></div>}>
            <ContactClient />
        </Suspense>
    );
}
