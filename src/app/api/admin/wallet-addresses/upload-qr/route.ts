/**
 * POST /api/admin/wallet-addresses/upload-qr
 *
 * Multipart form: { network: string, file: File }
 *
 * Admin-only. Decodes the uploaded PNG server-side and returns:
 *   { path: string, decoded: string, size: number, mime: string }
 *
 * The returned `path` is a draft storage key inside the `wallet-qr` bucket.
 * Nothing in `wallet_addresses` is updated yet — the admin still has to
 * confirm and POST to /update, which re-decodes the same path to make sure
 * the decoded contents match the typed address. Two decodes (here for UI
 * preview, and again at /update for the commit check) is intentional —
 * each call re-reads the bytes from storage, so a swap between the two
 * requests would be caught.
 */

import { NextResponse } from "next/server";
import { requireAdmin, isAdminAuthFailure } from "@/lib/adminAuth";
import { decodeQrFromBytes } from "@/lib/qrDecode";
import {
    buildQrStoragePath,
    isWalletNetwork,
    type WalletNetwork,
} from "@/lib/walletAddresses";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB — QR PNGs are tiny

export async function POST(req: Request) {
    try {
        const auth = await requireAdmin(req);
        if (isAdminAuthFailure(auth)) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const formData = await req.formData().catch(() => null);
        if (!formData) {
            return NextResponse.json(
                { error: "Multipart form data required." },
                { status: 400 }
            );
        }

        const networkRaw = formData.get("network");
        if (!isWalletNetwork(networkRaw)) {
            return NextResponse.json(
                { error: "Invalid or missing network." },
                { status: 400 }
            );
        }
        const network: WalletNetwork = networkRaw;

        const file = formData.get("file");
        if (!(file instanceof File)) {
            return NextResponse.json({ error: "QR file is required." }, { status: 400 });
        }
        if (file.size === 0) {
            return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
        }
        if (file.size > MAX_FILE_BYTES) {
            return NextResponse.json(
                { error: `File too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB).` },
                { status: 400 }
            );
        }

        const mime = file.type || "image/png";
        if (!/image\/(png|jpe?g)/i.test(mime)) {
            return NextResponse.json(
                { error: "Only PNG/JPEG images are supported." },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        // Decode the QR before persisting, so a non-QR upload never lands in
        // the bucket.
        const decoded = await decodeQrFromBytes(bytes);
        if (!decoded.ok) {
            return NextResponse.json({ error: decoded.error }, { status: 400 });
        }

        const path = buildQrStoragePath(network);

        const { error: uploadErr } = await auth.service.storage
            .from("wallet-qr")
            .upload(path, bytes, {
                contentType: mime,
                upsert: false,
            });

        if (uploadErr) {
            console.error("[wallet upload-qr] upload error:", uploadErr);
            return NextResponse.json(
                { error: "Failed to upload QR image." },
                { status: 500 }
            );
        }

        return NextResponse.json({
            path,
            decoded: decoded.text,
            size: bytes.byteLength,
            mime,
        });
    } catch (err: any) {
        console.error("[wallet upload-qr] fatal:", err);
        return NextResponse.json(
            { error: err?.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
