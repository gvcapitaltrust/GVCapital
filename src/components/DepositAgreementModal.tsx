"use client";

import React, { useEffect, useRef, useState } from "react";
import { ShieldCheck, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
    CURRENT_DEPOSIT_AGREEMENT_VERSION,
    DEPOSIT_AGREEMENT_TITLE,
    DEPOSIT_AGREEMENT_SUBTITLE,
    DEPOSIT_AGREEMENT_BODY,
} from "@/lib/depositAgreement";

interface DepositAgreementModalProps {
    open: boolean;
    lang: "en" | "zh";
    fullName: string;
    onSigned: () => void;
    onClose?: () => void;
}

export default function DepositAgreementModal({
    open,
    lang,
    fullName,
    onSigned,
    onClose,
}: DepositAgreementModalProps) {
    const [scrolledToBottom, setScrolledToBottom] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [signedName, setSignedName] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const bodyRef = useRef<HTMLDivElement | null>(null);

    const t = {
        en: {
            mustScroll: "Please scroll to the bottom of the agreement to continue.",
            agreeLabel: "I have read, understood, and unconditionally accept the terms above.",
            nameLabel: "Type your full legal name (must match the name on your account)",
            namePlaceholder: "e.g. John Tan Wei Ming",
            sign: "Sign & Continue",
            submitting: "Recording signature…",
            mandatoryNotice:
                "This agreement is required because your first deposit has been credited. Deposit and withdrawal actions are paused until you sign.",
            successTitle: "Agreement Signed",
            successDesc: "Thank you. Your deposit and withdrawal access has been restored.",
            close: "Close",
            errorGeneric: "Could not record signature. Please try again.",
            errorNoSession: "Your session has expired. Please log in again.",
        },
        zh: {
            mustScroll: "请滚动至协议底部以继续。",
            agreeLabel: "本人已阅读、理解并无条件接受上述全部条款。",
            nameLabel: "请输入您的法定全名（须与账户登记名称一致）",
            namePlaceholder: "例如：陈伟明",
            sign: "签署并继续",
            submitting: "正在记录签名…",
            mandatoryNotice: "您的首笔入金已到账，须签署本协议方可继续。在签署前，入金及提款功能已暂停。",
            successTitle: "签署成功",
            successDesc: "感谢您。入金与提款权限已恢复。",
            close: "关闭",
            errorGeneric: "无法记录签名，请重试。",
            errorNoSession: "登录状态已过期，请重新登录。",
        },
    }[lang];

    useEffect(() => {
        if (!open) {
            setScrolledToBottom(false);
            setAgreed(false);
            setSignedName("");
            setError(null);
        }
    }, [open]);

    if (!open) return null;

    const handleScroll = () => {
        const el = bodyRef.current;
        if (!el) return;
        const reachedEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 12;
        if (reachedEnd && !scrolledToBottom) setScrolledToBottom(true);
    };

    const normalizedSigned = signedName.trim().replace(/\s+/g, " ").toLowerCase();
    const normalizedExpected = (fullName || "").trim().replace(/\s+/g, " ").toLowerCase();
    const nameMatches = normalizedSigned.length > 0 && normalizedSigned === normalizedExpected;

    const canSubmit = scrolledToBottom && agreed && nameMatches && !submitting;

    const handleSign = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setError(null);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token;
            if (!accessToken) {
                setError(t.errorNoSession);
                setSubmitting(false);
                return;
            }

            const res = await fetch("/api/agreements/sign-deposit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    signedName: signedName.trim(),
                    agreementVersion: CURRENT_DEPOSIT_AGREEMENT_VERSION,
                }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || !json?.success) {
                setError(json?.error || t.errorGeneric);
                setSubmitting(false);
                return;
            }
            onSigned();
        } catch (err: any) {
            setError(err?.message || t.errorGeneric);
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white border border-gray-200 rounded-[2rem] max-w-3xl w-full max-h-[92vh] overflow-hidden shadow-2xl relative flex flex-col">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 z-10 p-2 rounded-full border border-gray-200 hover:bg-gray-100 transition-all text-gray-500"
                        aria-label={t.close}
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}

                <div className="px-6 sm:px-10 pt-8 pb-5 border-b border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-9 w-9 rounded-xl bg-gv-gold/10 flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5 text-gv-gold" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-black text-gray-900 uppercase tracking-tight">
                                {DEPOSIT_AGREEMENT_TITLE[lang]}
                            </h2>
                            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
                                {DEPOSIT_AGREEMENT_SUBTITLE[lang]}
                            </p>
                        </div>
                    </div>

                    <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-[11px] sm:text-xs text-amber-800 font-medium leading-relaxed">
                            {t.mandatoryNotice}
                        </p>
                    </div>
                </div>

                <div
                    ref={bodyRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-6 sm:px-10 py-6 text-[12px] sm:text-[13px] text-gray-700 leading-relaxed whitespace-pre-line font-serif"
                >
                    {DEPOSIT_AGREEMENT_BODY[lang]}
                </div>

                <div className="border-t border-gray-200 bg-gray-50 px-6 sm:px-10 py-5 space-y-4">
                    {!scrolledToBottom && (
                        <p className="text-[11px] text-gray-500 italic">{t.mustScroll}</p>
                    )}

                    <label
                        className={`flex items-start gap-3 text-[12px] sm:text-[13px] font-medium ${
                            scrolledToBottom ? "text-gray-900 cursor-pointer" : "text-gray-400 cursor-not-allowed"
                        }`}
                    >
                        <input
                            type="checkbox"
                            disabled={!scrolledToBottom}
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="mt-0.5 h-4 w-4 accent-gv-gold disabled:opacity-50"
                        />
                        <span>{t.agreeLabel}</span>
                    </label>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
                            {t.nameLabel}
                        </label>
                        <input
                            type="text"
                            value={signedName}
                            onChange={(e) => setSignedName(e.target.value)}
                            disabled={!scrolledToBottom || !agreed}
                            placeholder={t.namePlaceholder}
                            className={`w-full px-4 py-3 rounded-xl border bg-white text-sm font-serif italic tracking-wide text-gray-900 placeholder:text-gray-300 placeholder:not-italic placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-gv-gold/40 transition-all ${
                                signedName.length > 0 && !nameMatches
                                    ? "border-red-300"
                                    : nameMatches
                                      ? "border-emerald-400"
                                      : "border-gray-200"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            autoComplete="off"
                            spellCheck={false}
                        />
                        {signedName.length > 0 && !nameMatches && (
                            <p className="mt-1 text-[10px] text-red-500 font-medium">
                                {lang === "en"
                                    ? "Name does not match the legal name on your account."
                                    : "签名与账户登记之法定姓名不符。"}
                            </p>
                        )}
                    </div>

                    {error && (
                        <p className="text-[11px] text-red-500 font-medium">{error}</p>
                    )}

                    <button
                        onClick={handleSign}
                        disabled={!canSubmit}
                        className="w-full bg-slate-900 text-gv-gold font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-sm shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-40 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <div className="h-4 w-4 border-2 border-gv-gold/30 border-t-gv-gold animate-spin rounded-full" />
                                {t.submitting}
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4" />
                                {t.sign}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
