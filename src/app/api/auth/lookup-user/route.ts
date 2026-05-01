import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Public endpoint used during registration:
//   - validate that a referral code (= an existing username) is real
//   - check whether a candidate username is already taken
// Returns only id + username (no balances, no PII) so it's safe to expose to anon.
//
// Uses the service role to bypass RLS, since the caller is unauthenticated.
export async function GET(req: NextRequest) {
    const username = req.nextUrl.searchParams.get('username')?.trim().toLowerCase();
    if (!username) {
        return NextResponse.json({ error: 'username required' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        return NextResponse.json({ error: 'server misconfigured' }, { status: 500 });
    }

    const admin = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await admin
        .from('profiles')
        .select('id, username')
        .ilike('username', username)
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
        return NextResponse.json({ found: false });
    }

    return NextResponse.json({ found: true, id: data.id, username: data.username });
}
