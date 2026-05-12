import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CURRENT_DEPOSIT_AGREEMENT_VERSION } from "@/lib/depositAgreement";

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

        const { error: insertErr } = await admin.from("deposit_agreements").insert({
            user_id: userId,
            agreement_version: version,
            signed_name: signedName,
            ip_address: ip,
            user_agent: ua,
        });

        if (insertErr) {
            // Unique violation = already signed this version; treat as success.
            if ((insertErr as any).code === "23505") {
                return NextResponse.json({ success: true, alreadySigned: true });
            }
            console.error("[sign-deposit] insert error:", insertErr);
            return NextResponse.json({ error: "Failed to record signature." }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[sign-deposit] fatal:", err);
        return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
    }
}
