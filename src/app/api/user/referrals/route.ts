import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient() {
    if (!supabaseUrl || !supabaseServiceKey) return null;
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
}

export async function POST(req: Request) {
    try {
        const supabaseAdmin = getAdminClient();
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Service role key missing' }, { status: 500 });
        }

        const { userId, username, email } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        // Build all possible inviter code variants
        const codes = new Set<string>();
        if (username) codes.add(username.toLowerCase());
        if (email) codes.add(email.toLowerCase());
        const inviterCodes = Array.from(codes);

        // Query 1: referred by UUID
        const { data: refsByUuid, error: e1 } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, username, balance, balance_usd, is_verified, created_at, tier')
            .eq('referred_by', userId);

        if (e1) console.error('[referrals-api] refsByUuid error:', e1.message);

        // Query 2: referred by username/email string (case-insensitive)
        let refsByUsername: any[] = [];
        if (inviterCodes.length > 0) {
            const { data, error: e2 } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, username, balance, balance_usd, is_verified, created_at, tier')
                .or(inviterCodes.map(code => `referred_by_username.ilike.${code}`).join(','));

            if (e2) console.error('[referrals-api] refsByUsername error:', e2.message);
            if (data) refsByUsername = data;
        }

        // Merge, deduplicate, exclude self
        const combined = [...(refsByUuid || []), ...refsByUsername];
        const uniqueRefs = Array.from(
            new Map(combined.map(item => [item.id, item])).values()
        ).filter(r => r.id !== userId);

        return NextResponse.json({ referrals: uniqueRefs });
    } catch (error: any) {
        console.error('[referrals-api] Unhandled error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
