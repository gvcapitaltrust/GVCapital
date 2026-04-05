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
            console.error('[referrals-api] SUPABASE_SERVICE_ROLE_KEY is not configured');
            return NextResponse.json({ error: 'Service role key missing' }, { status: 500 });
        }

        const { username, userId } = await req.json();

        if (!username && !userId) {
            return NextResponse.json({ error: 'username or userId is required' }, { status: 400 });
        }

        console.log('[referrals-api] Fetching referrals for username:', username, 'userId:', userId);

        // Fetch ALL profiles with service role (bypasses RLS), then filter in-memory
        // This mirrors AdminProvider logic exactly (lines 173-176 of AdminProvider.tsx)
        const { data: allProfiles, error } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, username, balance, balance_usd, is_verified, created_at, tier, referred_by, referred_by_username');

        if (error) {
            console.error('[referrals-api] query error:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Match by referred_by_username (primary) OR referred_by UUID (fallback)
        const referrals = (allProfiles || []).filter((u: any) => {
            if (userId && u.referred_by === userId) return true;
            if (username && u.referred_by_username?.toLowerCase() === username.toLowerCase()) return true;
            return false;
        });

        console.log('[referrals-api] Found', referrals.length, 'referrals. All profiles count:', allProfiles?.length);

        return NextResponse.json({ referrals });
    } catch (error: any) {
        console.error('[referrals-api] Unhandled error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
