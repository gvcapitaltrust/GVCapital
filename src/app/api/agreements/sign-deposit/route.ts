import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";
import { CURRENT_DEPOSIT_AGREEMENT_VERSION } from "@/lib/depositAgreement";

// Node runtime: jspdf depends on Node APIs (Buffer-like ArrayBuffer) and the
// service-role client must run server-side only.
export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient() {
    if (!supabaseUrl || !supabaseServiceKey) return null;
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

function normalizeName(s: string) {
    return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function getClientIp(req: Request): string | null {
    const fwd = req.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]!.trim();
    const real = req.headers.get("x-real-ip");
    if (real) return real.trim();
    return null;
}

/**
 * Builds a one-page Signature Certificate PDF embedding the audit fields.
 * The original agreement text is intentionally not duplicated — the master PDF
 * is the canonical document; this certificate proves that THIS user, on THIS
 * date, from THIS network endpoint, signed agreement version X.
 */
function buildSignatureCertificate(opts: {
    userId: string;
    fullName: string;
    signedName: string;
    version: string;
    signedAt: Date;
    ip: string | null;
    userAgent: string | null;
}): Uint8Array {
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 20;
    const contentWidth = pageWidth - marginX * 2;
    let y = 25;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("GV CAPITAL TRUST", marginX, y);
    y += 8;

    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.text("Signature Certificate — Discretionary Investment Mandate Agreement", marginX, y);
    y += 12;

    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.6);
    doc.line(marginX, y, marginX + contentWidth, y);
    y += 10;

    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const intro =
        "This certificate constitutes durable evidence that the individual identified " +
        "below has electronically executed the GV Capital Client Agreement " +
        "(Discretionary Investment Mandate Agreement). The signing record is also " +
        "preserved in the deposit_agreements ledger under the same identifiers.";
    doc.text(doc.splitTextToSize(intro, contentWidth), marginX, y);
    y += 22;

    const rows: Array<[string, string]> = [
        ["Agreement Version", opts.version],
        ["Account ID (UUID)", opts.userId],
        ["Account Holder (on file)", opts.fullName || "—"],
        ["Signed Name (typed)", opts.signedName],
        ["Signed At (UTC)", opts.signedAt.toISOString()],
        ["IP Address", opts.ip || "—"],
        ["User Agent", opts.userAgent || "—"],
    ];

    const labelWidth = 55;
    doc.setFontSize(9.5);
    rows.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(90, 90, 90);
        doc.text(label, marginX, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(20, 20, 20);
        const valueLines = doc.splitTextToSize(value, contentWidth - labelWidth);
        doc.text(valueLines, marginX + labelWidth, y);
        y += Math.max(7, valueLines.length * 5);
    });

    y += 6;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(marginX, y, marginX + contentWidth, y);
    y += 8;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 120);
    const footer =
        "Electronic signature recorded under the Electronic Commerce Act 2006 " +
        "(Malaysia) and equivalent international statutes. The canonical agreement " +
        "text is the GV Capital Client Agreement PDF (version " +
        opts.version +
        ") referenced at the time of signing. This certificate is immutable; any " +
        "modification voids its evidentiary value.";
    doc.text(doc.splitTextToSize(footer, contentWidth), marginX, y);

    const arrayBuffer = doc.output("arraybuffer");
    return new Uint8Array(arrayBuffer);
}

export async function POST(req: Request) {
    try {
        const admin = getAdminClient();
        if (!admin) {
            return NextResponse.json(
                { error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY missing." },
                { status: 500 }
            );
        }

        const authHeader = req.headers.get("authorization") || "";
        const accessToken = authHeader.startsWith("Bearer ")
            ? authHeader.slice("Bearer ".length).trim()
            : "";

        if (!accessToken) {
            return NextResponse.json({ error: "Unauthorized: missing bearer token." }, { status: 401 });
        }

        const tokenClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { autoRefreshToken: false, persistSession: false },
            global: { headers: { Authorization: `Bearer ${accessToken}` } },
        });

        const { data: userData, error: userErr } = await tokenClient.auth.getUser();
        if (userErr || !userData?.user?.id) {
            return NextResponse.json({ error: "Unauthorized: invalid session." }, { status: 401 });
        }
        const userId = userData.user.id;

        const body = await req.json().catch(() => ({}));
        const signedName = typeof body?.signedName === "string" ? body.signedName.trim() : "";
        const version = typeof body?.agreementVersion === "string" ? body.agreementVersion.trim() : "";

        if (!signedName) {
            return NextResponse.json({ error: "Signature name is required." }, { status: 400 });
        }
        if (version !== CURRENT_DEPOSIT_AGREEMENT_VERSION) {
            return NextResponse.json(
                { error: `Agreement version mismatch. Expected ${CURRENT_DEPOSIT_AGREEMENT_VERSION}.` },
                { status: 400 }
            );
        }

        // Verify the signed name matches the profile's full_name (case + whitespace-insensitive).
        const { data: profile, error: profileErr } = await admin
            .from("profiles")
            .select("full_name")
            .eq("id", userId)
            .maybeSingle();

        if (profileErr || !profile?.full_name) {
            return NextResponse.json(
                { error: "Profile not found or missing full name. Please contact support." },
                { status: 400 }
            );
        }

        if (normalizeName(signedName) !== normalizeName(profile.full_name)) {
            return NextResponse.json(
                { error: "Signature does not match the legal name on your account." },
                { status: 400 }
            );
        }

        const ip = getClientIp(req);
        const ua = req.headers.get("user-agent");
        const signedAt = new Date();

        const { data: inserted, error: insertErr } = await admin
            .from("deposit_agreements")
            .insert({
                user_id: userId,
                agreement_version: version,
                signed_name: signedName,
                signed_at: signedAt.toISOString(),
                ip_address: ip,
                user_agent: ua,
            })
            .select("id")
            .single();

        if (insertErr) {
            // Unique violation = already signed this version; treat as success.
            if ((insertErr as any).code === "23505") {
                return NextResponse.json({ success: true, alreadySigned: true });
            }
            console.error("[sign-deposit] insert error:", insertErr);
            return NextResponse.json({ error: "Failed to record signature." }, { status: 500 });
        }

        // Generate + upload signature certificate PDF. Best-effort: a failure
        // here does not invalidate the signature itself, which is already
        // recorded above and is the canonical legal record.
        try {
            const pdfBytes = buildSignatureCertificate({
                userId,
                fullName: profile.full_name,
                signedName,
                version,
                signedAt,
                ip,
                userAgent: ua,
            });

            const certPath = `${userId}/signature_certificate_${version}_${signedAt.getTime()}.pdf`;

            const { error: uploadErr } = await admin.storage
                .from("agreements")
                .upload(certPath, pdfBytes, {
                    contentType: "application/pdf",
                    upsert: false,
                });

            if (uploadErr) {
                console.error("[sign-deposit] certificate upload error:", uploadErr);
            } else if (inserted?.id) {
                const { error: updateErr } = await admin
                    .from("deposit_agreements")
                    .update({ signature_certificate_path: certPath })
                    .eq("id", inserted.id);
                if (updateErr) {
                    console.error("[sign-deposit] certificate path update error:", updateErr);
                }
            }
        } catch (pdfErr: any) {
            console.error("[sign-deposit] certificate generation failed:", pdfErr);
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[sign-deposit] fatal:", err);
        return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
    }
}
