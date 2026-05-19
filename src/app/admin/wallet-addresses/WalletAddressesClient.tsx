"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Wallet, Edit2, UploadCloud, CheckCircle2, AlertTriangle, X, Copy, Clock } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAdmin } from "@/providers/AdminProvider";
import {
    useWalletAddresses,
    walletQrUrl,
} from "@/hooks/useWalletAddresses";
import {
    WALLET_NETWORKS,
    NETWORK_LABELS,
    type WalletNetwork,
    type WalletAddressRow,
} from "@/lib/walletAddresses";

type Lang = "en" | "zh";

const T = {
    en: {
        title: "USDT Receive Addresses",
        subtitle:
            "Edit the receiving wallet address and QR for each USDT network. Every change is logged. Funds will go to the wallet shown here — verify carefully.",
        back: "Back",
        currentAddress: "Current Address",
        notSet: "(not set)",
        qrPreview: "QR Preview",
        edit: "Edit",
        copy: "Copy",
        copied: "Copied",
        history: "History",
        lastUpdated: "Last updated",
        updatedBy: "by",
        editTitle: "Edit Wallet Address",
        editFor: "Editing",
        newAddress: "New Address",
        newAddressHint:
            "Paste the exact receive address. Tron is base58 (starts with T). EVM is hex (starts with 0x).",
        qrUploadLabel: "New QR PNG / JPEG",
        qrUploadHint:
            "Upload a QR image. We will decode it on the server and verify it encodes EXACTLY the address you typed above.",
        chooseFile: "Choose file",
        uploading: "Uploading & decoding…",
        decoded: "Decoded:",
        decodeMatch: "QR matches typed address.",
        decodeMismatch: "QR does NOT match typed address.",
        decodeError: "Decode failed.",
        confirmLabel: "Type the last 6 characters of the new address",
        confirmHint: "Forces a final visual check. Case-sensitive.",
        reason: "Reason for change (optional)",
        cancel: "Cancel",
        save: "Save Change",
        saving: "Saving…",
        savedSuccess: "Wallet address updated.",
        empty: "No wallet rows yet. Run supabase_wallet_addresses_migration.sql.",
        loading: "Loading…",
        historyTitle: "Recent Audit Log",
        noHistory: "No audit entries yet.",
        riskBanner:
            "Production fintech: a wrong character routes client funds to a wallet you don't control. Test with a $1 send before announcing.",
    },
    zh: {
        title: "USDT 收款地址管理",
        subtitle: "编辑各 USDT 网络的收款地址与二维码。每次更改都会被记录。资金将进入此处显示的钱包，请仔细核对。",
        back: "返回",
        currentAddress: "当前地址",
        notSet: "(未设置)",
        qrPreview: "二维码预览",
        edit: "编辑",
        copy: "复制",
        copied: "已复制",
        history: "历史记录",
        lastUpdated: "最近更新",
        updatedBy: "操作人",
        editTitle: "编辑钱包地址",
        editFor: "正在编辑",
        newAddress: "新地址",
        newAddressHint: "粘贴完整收款地址。波场为 base58 (以 T 开头), EVM 为十六进制 (以 0x 开头)。",
        qrUploadLabel: "新二维码 PNG / JPEG",
        qrUploadHint: "上传二维码图片。服务器会解码并验证其内容是否与上方地址完全一致。",
        chooseFile: "选择文件",
        uploading: "上传并解码中…",
        decoded: "解码结果:",
        decodeMatch: "二维码与所输地址一致。",
        decodeMismatch: "二维码与所输地址不一致。",
        decodeError: "解码失败。",
        confirmLabel: "请输入新地址的最后 6 位字符",
        confirmHint: "用于最终人工核对，区分大小写。",
        reason: "变更原因 (可选)",
        cancel: "取消",
        save: "保存变更",
        saving: "保存中…",
        savedSuccess: "钱包地址已更新。",
        empty: "暂无钱包记录，请先执行 supabase_wallet_addresses_migration.sql。",
        loading: "加载中…",
        historyTitle: "最近审计记录",
        noHistory: "暂无审计记录。",
        riskBanner: "生产环境警告: 一个字符错误会让客户资金进入不受控的钱包。先用 1 USDT 测试转账后再正式宣布更换。",
    },
} as const;

interface AuditRow {
    id: string;
    network: string;
    old_address: string | null;
    new_address: string;
    changed_by_email: string | null;
    changed_by_name: string | null;
    changed_at: string;
    change_reason: string | null;
}

function shortAddress(a: string) {
    if (!a) return "";
    if (a.length <= 14) return a;
    return `${a.slice(0, 8)}…${a.slice(-6)}`;
}

export default function WalletAddressesClient({ lang }: { lang: Lang }) {
    const t = T[lang];
    const router = useRouter();
    const { showToast } = useAdmin();
    const { map, loading } = useWalletAddresses();
    const [editingNetwork, setEditingNetwork] = useState<WalletNetwork | null>(null);
    const [audit, setAudit] = useState<AuditRow[]>([]);
    const [copiedNetwork, setCopiedNetwork] = useState<string | null>(null);

    const rowList: Array<{ network: WalletNetwork; row: WalletAddressRow | undefined }> = useMemo(
        () => WALLET_NETWORKS.map((n) => ({ network: n, row: map[n] })),
        [map]
    );

    useEffect(() => {
        const loadAudit = async () => {
            const { data } = await supabase
                .from("wallet_address_audit")
                .select(
                    "id, network, old_address, new_address, changed_by_email, changed_by_name, changed_at, change_reason"
                )
                .order("changed_at", { ascending: false })
                .limit(20);
            if (data) setAudit(data as AuditRow[]);
        };
        loadAudit();

        const channel = supabase
            .channel("wallet-audit-sync")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "wallet_address_audit" },
                () => loadAudit()
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleCopy = (network: string, address: string) => {
        if (!address) return;
        navigator.clipboard.writeText(address);
        setCopiedNetwork(network);
        setTimeout(() => setCopiedNetwork((c) => (c === network ? null : c)), 1500);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-20">
            <div className="flex items-center gap-6">
                <button
                    onClick={() => router.push(`/admin?lang=${lang}`)}
                    className="h-12 w-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gv-gold transition-all shadow-sm hover:shadow-md"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3">
                        <Wallet className="h-6 w-6 text-gv-gold" />
                        {t.title}
                    </h1>
                    <p className="text-gray-400 text-sm font-medium max-w-2xl">{t.subtitle}</p>
                </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[12px] text-amber-800 font-medium leading-relaxed">{t.riskBanner}</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-16">
                    <div className="h-10 w-10 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div>
                </div>
            ) : rowList.every((r) => !r.row) ? (
                <div className="p-10 bg-white border border-gray-200 rounded-3xl text-center text-gray-400 font-medium">
                    {t.empty}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {rowList.map(({ network, row }) => {
                        const label = NETWORK_LABELS[network][lang];
                        const qrUrl = walletQrUrl(row, network);
                        return (
                            <div
                                key={network}
                                className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            {network.toUpperCase()}
                                        </p>
                                        <h3 className="text-lg font-black tracking-tight text-gray-900">{label}</h3>
                                    </div>
                                    <button
                                        onClick={() => setEditingNetwork(network)}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-gv-gold text-[10px] font-black uppercase tracking-widest hover:-translate-y-0.5 active:scale-95 transition-all"
                                    >
                                        <Edit2 className="h-3.5 w-3.5" />
                                        {t.edit}
                                    </button>
                                </div>

                                <div className="flex gap-4">
                                    <div className="h-28 w-28 shrink-0 bg-white rounded-2xl p-2 border border-gray-100 flex items-center justify-center overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={qrUrl}
                                            alt={`${label} QR`}
                                            className="h-full w-full object-contain"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                            {t.currentAddress}
                                        </p>
                                        <p className="text-[12px] font-mono font-bold text-gray-900 break-all leading-tight">
                                            {row?.address || t.notSet}
                                        </p>
                                        {row?.address && (
                                            <button
                                                onClick={() => handleCopy(network, row.address)}
                                                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gv-gold transition-colors"
                                            >
                                                <Copy className="h-3 w-3" />
                                                {copiedNetwork === network ? t.copied : t.copy}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {row?.updated_at && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 text-[10px] text-gray-400 font-medium flex items-center gap-2">
                                        <Clock className="h-3 w-3" />
                                        {t.lastUpdated}: {new Date(row.updated_at).toLocaleString()}
                                        {row.updated_by_email && (
                                            <>
                                                <span>·</span>
                                                <span>
                                                    {t.updatedBy} {row.updated_by_email}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Audit log */}
            <div className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gv-gold" />
                    {t.historyTitle}
                </h3>
                {audit.length === 0 ? (
                    <p className="text-[12px] text-gray-400 font-medium">{t.noHistory}</p>
                ) : (
                    <div className="space-y-2">
                        {audit.map((a) => (
                            <div
                                key={a.id}
                                className="grid grid-cols-1 md:grid-cols-[100px_1fr_1fr_180px] gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 text-[11px]"
                            >
                                <div className="font-black uppercase tracking-widest text-gv-gold">{a.network}</div>
                                <div className="font-mono text-gray-400 line-through break-all">
                                    {a.old_address ? shortAddress(a.old_address) : "—"}
                                </div>
                                <div className="font-mono font-bold text-gray-900 break-all">
                                    {shortAddress(a.new_address)}
                                </div>
                                <div className="text-gray-500">
                                    <div className="font-medium">{a.changed_by_name || a.changed_by_email || "—"}</div>
                                    <div className="text-[10px] text-gray-400">
                                        {new Date(a.changed_at).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {editingNetwork && (
                <EditWalletModal
                    lang={lang}
                    network={editingNetwork}
                    currentRow={map[editingNetwork]}
                    onClose={() => setEditingNetwork(null)}
                    onSaved={() => {
                        showToast(t.savedSuccess);
                        setEditingNetwork(null);
                    }}
                />
            )}
        </div>
    );
}

function EditWalletModal({
    lang,
    network,
    currentRow,
    onClose,
    onSaved,
}: {
    lang: Lang;
    network: WalletNetwork;
    currentRow: WalletAddressRow | undefined;
    onClose: () => void;
    onSaved: () => void;
}) {
    const t = T[lang];
    const [address, setAddress] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [uploadState, setUploadState] = useState<
        | { kind: "idle" }
        | { kind: "uploading" }
        | { kind: "decoded"; path: string; decoded: string }
        | { kind: "error"; message: string }
    >({ kind: "idle" });
    const [confirmCode, setConfirmCode] = useState("");
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const decodedMatches =
        uploadState.kind === "decoded" && address.trim().length > 0 && uploadState.decoded.trim() === address.trim();
    const lastSix = address.trim().slice(-6);
    const confirmMatches = address.trim().length > 0 && confirmCode === lastSix;

    const canSubmit =
        address.trim().length > 0 &&
        confirmMatches &&
        // If a new file is staged, it must have decoded and matched. If no
        // file (admin only changing the address text), allow it but the
        // server still requires confirmCode. The /update endpoint accepts
        // qrPath=null in which case it keeps the existing QR.
        (uploadState.kind === "idle" ||
            (uploadState.kind === "decoded" && decodedMatches)) &&
        !submitting;

    const handleFileChange = async (f: File | null) => {
        setFile(f);
        setUploadState({ kind: "idle" });
        if (!f) return;

        setUploadState({ kind: "uploading" });
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token;
            if (!accessToken) {
                setUploadState({ kind: "error", message: "Session expired." });
                return;
            }
            const fd = new FormData();
            fd.append("network", network);
            fd.append("file", f);
            const res = await fetch("/api/admin/wallet-addresses/upload-qr", {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` },
                body: fd,
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || !json?.path) {
                setUploadState({ kind: "error", message: json?.error || t.decodeError });
                return;
            }
            setUploadState({ kind: "decoded", path: json.path, decoded: json.decoded });
        } catch (err: any) {
            setUploadState({ kind: "error", message: err?.message || t.decodeError });
        }
    };

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setError(null);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token;
            if (!accessToken) {
                setError("Session expired. Please log in again.");
                setSubmitting(false);
                return;
            }
            const res = await fetch("/api/admin/wallet-addresses/update", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    network,
                    address: address.trim(),
                    qrPath: uploadState.kind === "decoded" ? uploadState.path : null,
                    confirmCode,
                    changeReason: reason.trim() || null,
                }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || !json?.success) {
                setError(json?.error || "Failed to update wallet address.");
                setSubmitting(false);
                return;
            }
            onSaved();
        } catch (err: any) {
            setError(err?.message || "Failed to update wallet address.");
            setSubmitting(false);
        }
    };

    const networkLabel = NETWORK_LABELS[network][lang];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white border border-gray-200 rounded-[2rem] max-w-2xl w-full max-h-[95vh] overflow-y-auto shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full border border-gray-200 bg-white hover:bg-gray-100 transition-all text-gray-500"
                    aria-label="Close"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="px-6 sm:px-10 pt-8 pb-4 border-b border-gray-200">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gv-gold mb-1">
                        {t.editFor} · {network.toUpperCase()}
                    </p>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">
                        {t.editTitle} — {networkLabel}
                    </h2>
                    {currentRow?.address && (
                        <p className="mt-2 text-[11px] text-gray-400 font-mono break-all">
                            {t.currentAddress}: {currentRow.address}
                        </p>
                    )}
                </div>

                <div className="px-6 sm:px-10 py-6 space-y-6">
                    {/* Address input */}
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">
                            {t.newAddress}
                        </label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => {
                                setAddress(e.target.value);
                                setConfirmCode("");
                            }}
                            placeholder="T... or 0x..."
                            spellCheck={false}
                            autoComplete="off"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-mono font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gv-gold/40"
                        />
                        <p className="text-[10px] text-gray-400 font-medium">{t.newAddressHint}</p>
                    </div>

                    {/* QR upload */}
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">
                            {t.qrUploadLabel}
                        </label>
                        <label
                            className={`flex items-center justify-center gap-2 w-full px-4 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                                uploadState.kind === "decoded"
                                    ? decodedMatches
                                        ? "border-emerald-300 bg-emerald-50"
                                        : "border-red-300 bg-red-50"
                                    : uploadState.kind === "error"
                                      ? "border-red-300 bg-red-50"
                                      : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                            }`}
                        >
                            <UploadCloud className="h-5 w-5 text-gv-gold" />
                            <span className="text-[12px] font-bold text-gray-700">
                                {file ? file.name : t.chooseFile}
                            </span>
                            <input
                                type="file"
                                accept="image/png,image/jpeg"
                                className="hidden"
                                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                            />
                        </label>
                        <p className="text-[10px] text-gray-400 font-medium">{t.qrUploadHint}</p>

                        {uploadState.kind === "uploading" && (
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                                <div className="h-3 w-3 border-2 border-gv-gold/30 border-t-gv-gold animate-spin rounded-full" />
                                {t.uploading}
                            </div>
                        )}
                        {uploadState.kind === "error" && (
                            <p className="text-[11px] text-red-600 font-medium">{uploadState.message}</p>
                        )}
                        {uploadState.kind === "decoded" && (
                            <div
                                className={`p-3 rounded-xl border text-[11px] space-y-1 font-mono break-all ${
                                    decodedMatches
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                        : "border-red-200 bg-red-50 text-red-800"
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    {decodedMatches ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                    ) : (
                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                    )}
                                    <span className="font-black uppercase tracking-widest">
                                        {decodedMatches ? t.decodeMatch : t.decodeMismatch}
                                    </span>
                                </div>
                                <div>
                                    <span className="font-bold">{t.decoded}</span> {uploadState.decoded}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Confirm code */}
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">
                            {t.confirmLabel}{" "}
                            {address.trim().length > 0 && (
                                <span className="text-gv-gold font-black">→ {lastSix}</span>
                            )}
                        </label>
                        <input
                            type="text"
                            value={confirmCode}
                            onChange={(e) => setConfirmCode(e.target.value)}
                            placeholder={lastSix || "------"}
                            spellCheck={false}
                            autoComplete="off"
                            className={`w-full px-4 py-3 rounded-xl border bg-white text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-gv-gold/40 ${
                                confirmCode.length === 0
                                    ? "border-gray-200"
                                    : confirmMatches
                                      ? "border-emerald-400 text-emerald-700"
                                      : "border-red-300 text-red-700"
                            }`}
                        />
                        <p className="text-[10px] text-gray-400 font-medium">{t.confirmHint}</p>
                    </div>

                    {/* Reason */}
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">
                            {t.reason}
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={2}
                            maxLength={500}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gv-gold/40"
                            placeholder="e.g. Rotated wallet after Q1 ops review."
                        />
                    </div>

                    {error && <p className="text-[12px] text-red-600 font-medium">{error}</p>}

                    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-2xl border border-gray-200 bg-white text-gray-700 font-black uppercase tracking-widest text-[11px] hover:bg-gray-50 transition-all"
                        >
                            {t.cancel}
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className="flex-1 py-3 rounded-2xl bg-slate-900 text-gv-gold font-black uppercase tracking-widest text-[11px] shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-40 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <div className="h-3.5 w-3.5 border-2 border-gv-gold/30 border-t-gv-gold animate-spin rounded-full" />
                                    {t.saving}
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {t.save}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
