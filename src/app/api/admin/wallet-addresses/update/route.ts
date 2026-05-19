/**
 * POST /api/admin/wallet-addresses/update
 *
 * Body: {
 *   network: 'tron' | 'sol' | 'bep20' | 'erc20',
 *   address: string,                  // new receive address
 *   qrPath?: string,                  // storage key returned by /upload-qr
 *   confirmCode: string,              // last 6 chars of new address, typed by admin
 *   changeReason?: string,
 * }
 *
 * Admin-only. Performs a hard re-check that the QR at `qrPath` decodes to
 * exactly `address` before committing. Writes an audit row before updating
 * the active wallet_addresses row — if anything fails after the audit write,
 * the change is still traceable in the audit log.
 */

import { NextResponse } from "next/server";
import { requireAdmin, isAdminAuthFailure, getClientIp } from "@/lib/adminAuth";
import { decodeQrFromBytes } from "@/lib/qrDecode";
import { isWalletNetwork, type WalletNetwork } from "@/lib/walletAddresses";

export const runtime = "nodejs";

function normalize(s: string): string {
    return s.trim();
}

export async function POST(req: Request) {
    try {
        const auth = await requireAdmin(req);
        if (isAdminAuthFailure(auth)) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const body = await req.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
        }

        const networkRaw = (body as any).network;
        if (!isWalletNetwork(networkRaw)) {
            return NextResponse.json(
                { error: "Invalid or missing network." },
                { status: 400 }
            );
        }
        const network: WalletNetwork = networkRaw;

        const address = normalize(String((body as any).address ?? ""));
        const qrPath = (body as any).qrPath ? String((body as any).qrPath) : null;
        const confirmCode = normalize(String((body as any).confirmCode ?? ""));
        const changeReason = (body as any).changeReason
            ? String((body as any).changeReason).slice(0, 500)
            : null;

        if (!address) {
            return NextResponse.json({ error: "Address is required." }, { status: 400 });
        }
        if (address.length > 128) {
            return NextResponse.json({ error: "Address looks invalid (>128 chars)." }, { status: 400 });
        }

        // Confirm code = last 6 chars of address, case-sensitive. Forces the
        // admin's eye to verify the trailing characters of the new value.
        const expected = address.slice(-6);
        if (confirmCode !== expected) {
            return NextResponse.json(
                { error: "Confirmation code does not match the last 6 characters of the address." },
                { status: 400 }
            );
        }

        // Fetch the current row (if any) so we can write the old values into
        // the audit log.
        const { data: currentRow, error: fetchErr } = await auth.service
            .from("wallet_addresses")
            .select("*")
            .eq("network", network)
            .maybeSingle();
        if (fetchErr) {
            console.error("[wallet update] fetch error:", fetchErr);
            return NextResponse.json(
                { error: "Failed to load current wallet row." },
                { status: 500 }
            );
        }

        // If the admin provided a new qrPath, hard-verify it decodes to exactly
        // the typed address — never trust the client's claim from /upload-qr.
        let nextQrPath: string | null = currentRow?.qr_path ?? null;
        if (qrPath) {
            const { data: dl, error: dlErr } = await auth.service.storage
                .from("wallet-qr")
                .download(qrPath);
            if (dlErr || !dl) {
                console.error("[wallet update] qr download error:", dlErr);
                return NextResponse.json(
                    { error: "Uploaded QR could not be re-read for verification." },
                    { status: 400 }
                );
            }
            const buf = Buffer.from(await dl.arrayBuffer());
            const decoded = await decodeQrFromBytes(buf);
            if (!decoded.ok) {
                return NextResponse.json({ error: decoded.error }, { status: 400 });
            }
            if (decoded.text.trim() !== address) {
                return NextResponse.json(
                    {
                        error: "QR contents do not match the typed address. Upload a QR that encodes the exact same string.",
                        decoded: decoded.text,
                    },
                    { status: 400 }
                );
            }
            nextQrPath = qrPath;
        }

        // Upsert the wallet_addresses row.
        const now = new Date().toISOString();
        let walletId: string;
        if (currentRow) {
            const { data: updated, error: upErr } = await auth.service
                .from("wallet_addresses")
                .update({
                    address,
                    qr_path: nextQrPath,
                    is_active: true,
                    updated_at: now,
                    updated_by: auth.userId,
                    updated_by_email: auth.email,
                })
                .eq("id", currentRow.id)
                .select("id")
                .single();
            if (upErr || !updated) {
                console.error("[wallet update] update error:", upErr);
                return NextResponse.json(
                    { error: "Failed to update wallet address." },
                    { status: 500 }
                );
            }
            walletId = updated.id;
        } else {
            const { data: inserted, error: insErr } = await auth.service
                .from("wallet_addresses")
                .insert({
                    network,
                    address,
                    qr_path: nextQrPath,
                    is_active: true,
                    updated_by: auth.userId,
                    updated_by_email: auth.email,
                })
                .select("id")
                .single();
            if (insErr || !inserted) {
                console.error("[wallet update] insert error:", insErr);
                return NextResponse.json(
                    { error: "Failed to create wallet address." },
                    { status: 500 }
                );
            }
            walletId = inserted.id;
        }

        // Audit row — best-effort. A failure here is logged but does not
        // roll back the change; the new row already carries updated_by /
        // updated_at, so worst case we just lose the structured history line.
        const { error: auditErr } = await auth.service
            .from("wallet_address_audit")
            .insert({
                wallet_id: walletId,
                network,
                old_address: currentRow?.address ?? null,
                new_address: address,
                old_qr_path: currentRow?.qr_path ?? null,
                new_qr_path: nextQrPath,
                changed_by: auth.userId,
                changed_by_email: auth.email,
                changed_by_name: auth.fullName,
                change_reason: changeReason,
                ip_address: getClientIp(req),
                user_agent: req.headers.get("user-agent"),
            });
        if (auditErr) {
            console.error("[wallet update] audit insert error:", auditErr);
        }

        return NextResponse.json({
            success: true,
            wallet: {
                id: walletId,
                network,
                address,
                qr_path: nextQrPath,
                updated_at: now,
            },
        });
    } catch (err: any) {
        console.error("[wallet update] fatal:", err);
        return NextResponse.json(
            { error: err?.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
