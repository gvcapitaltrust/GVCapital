/**
 * Server-side admin auth helper. Verifies the request bearer token belongs
 * to a user with role='admin' in the profiles table. Returns the userId and
 * profile on success; throws a Response-shaped error otherwise.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function getServiceClient(): SupabaseClient | null {
    if (!supabaseUrl || !supabaseServiceKey) return null;
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

export interface AdminContext {
    userId: string;
    email: string | null;
    fullName: string | null;
    service: SupabaseClient;
}

export type AdminAuthFailure = { status: number; error: string };

export async function requireAdmin(req: Request): Promise<AdminContext | AdminAuthFailure> {
    const service = getServiceClient();
    if (!service) {
        return { status: 500, error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY missing." };
    }

    const authHeader = req.headers.get("authorization") || "";
    const accessToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length).trim()
        : "";
    if (!accessToken) {
        return { status: 401, error: "Unauthorized: missing bearer token." };
    }

    const tokenClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: userData, error: userErr } = await tokenClient.auth.getUser();
    if (userErr || !userData?.user?.id) {
        return { status: 401, error: "Unauthorized: invalid session." };
    }
    const userId = userData.user.id;

    const { data: profile, error: profileErr } = await service
        .from("profiles")
        .select("role, email, full_name")
        .eq("id", userId)
        .maybeSingle();

    if (profileErr || !profile) {
        return { status: 403, error: "Forbidden: profile not found." };
    }
    if (profile.role !== "admin") {
        return { status: 403, error: "Forbidden: admin role required." };
    }

    return {
        userId,
        email: profile.email ?? userData.user.email ?? null,
        fullName: profile.full_name ?? null,
        service,
    };
}

export function getClientIp(req: Request): string | null {
    const fwd = req.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]!.trim();
    const real = req.headers.get("x-real-ip");
    if (real) return real.trim();
    return null;
}

export function isAdminAuthFailure(x: unknown): x is AdminAuthFailure {
    return (
        typeof x === "object" &&
        x !== null &&
        "status" in x &&
        "error" in x &&
        typeof (x as any).status === "number"
    );
}
