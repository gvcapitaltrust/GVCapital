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

        const { username } = await req.json();

        if (!username) {
            return NextResponse.json({ error: 'username is required' }, { status: 400 });
        }

        console.log('[referrals-api] Fetching referrals for username:', username);

        // Simple direct query: find all profiles where referred_by_username matches 
        // This is the only referral mechanism used during registration
        const { data: referrals, error } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, username, balance, balance_usd, is_verified, created_at, tier')
            .ilike('referred_by_username', username);

        if (error) {
            console.error('[referrals-api] query error:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('[referrals-api] Found', referrals?.length || 0, 'referrals for', username);

        return NextResponse.json({ referrals: referrals || [] });
    } catch (error: any) {
        console.error('[referrals-api] Unhandled error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
