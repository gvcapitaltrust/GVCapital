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
            console.error('[referrals-api] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing in the environment!');
            return NextResponse.json({ error: 'Service role key missing' }, { status: 500 });
        }

        const { username } = await req.json();

        if (!username) {
            console.error('[referrals-api] username is missing in request body');
            return NextResponse.json({ error: 'username is required' }, { status: 400 });
        }

        console.log(`[referrals-api] Querying referrals for username: "${username}"`);

        // To perfectly match the Sales Leaderboard logic, we ONLY check referred_by_username.
        // This avoids inconsistencies caused by manually edited UUID fields.
        const { data: referrals, error, status } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, username, balance, balance_usd, is_verified, created_at, tier')
            .ilike('referred_by_username', username);

        if (error) {
            console.error('[referrals-api] Supabase error:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`[referrals-api] Found ${referrals?.length || 0} referrals for "${username}" (Status: ${status})`);

        return NextResponse.json({ 
            success: true,
            referrals: referrals || [],
            count: referrals?.length || 0
        });
    } catch (error: any) {
        console.error('[referrals-api] Unhandled error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
