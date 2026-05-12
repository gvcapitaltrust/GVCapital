import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CURRENT_DEPOSIT_AGREEMENT_VERSION } from "@/lib/depositAgreement";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Path convention for the canonical master agreement PDF. Upload each version
// at `_master/{VERSION}.pdf` in the `agreements` bucket. Past versions stay
// accessible so users can revisit any agreement they previously signed.
const masterPdfPath = (version: string) => `_master/${version}.pdf`;

// Version tokens are restricted to a safe character set; reject anything that
// could escape the `_master/` prefix.
const VALID_VERSION = /^[A-Za-z0-9._-]+$/;

// 5 minutes is plenty for a "click → open new tab" flow.
const SIGNED_URL_TTL_SECONDS = 300;

function getAdminClient() {
    if (!supabaseUrl || !supabaseServiceKey) return null;
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

export async function GET(req: Request) {
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
            return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const tokenClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { autoRefreshToken: false, persistSession: false },
            global: { headers: { Authorization: `Bearer ${accessToken}` } },
        });
        const { data: userData, error: userErr } = await tokenClient.auth.getUser();
        if (userErr || !userData?.user?.id) {
            return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        const userId = userData.user.id;

        const { searchParams } = new URL(req.url);
        const kind = (searchParams.get("type") || "master").toLowerCase();
        const versionParam = searchParams.get("version")?.trim();
        const version = versionParam || CURRENT_DEPOSIT_AGREEMENT_VERSION;

        if (!VALID_VERSION.test(version)) {
            return NextResponse.json({ error: "Invalid version." }, { status: 400 });
        }

        let path: string;

        if (kind === "master") {
            path = masterPdfPath(version);
        } else if (kind === "certificate") {
            // Returns the user's most recent signature certificate for the
            // requested version (defaults to current).
            const { data: row, error: rowErr } = await admin
                .from("deposit_agreements")
                .select("signature_certificate_path")
                .eq("user_id", userId)
                .eq("agreement_version", version)
                .order("signed_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (rowErr || !row?.signature_certificate_path) {
                return NextResponse.json(
                    { error: "No signature certificate found." },
                    { status: 404 }
                );
            }
            path = row.signature_certificate_path;
        } else {
            return NextResponse.json(
                { error: "Invalid type. Expected 'master' or 'certificate'." },
                { status: 400 }
            );
        }

        const { data: signed, error: signedErr } = await admin.storage
            .from("agreements")
            .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

        if (signedErr || !signed?.signedUrl) {
            console.error("[pdf-url] sign error:", signedErr);
            return NextResponse.json(
                { error: kind === "master" ? "Master agreement PDF has not been uploaded yet." : "Could not sign URL." },
                { status: 404 }
            );
        }

        return NextResponse.json({ url: signed.signedUrl, path });
    } catch (err: any) {
        console.error("[pdf-url] fatal:", err);
        return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
    }
}
