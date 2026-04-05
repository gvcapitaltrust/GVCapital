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
        
        // Debug info to confirm if the key is actually loaded in Vercel
        const diagnostics = {
            hasUrl: !!supabaseUrl,
            hasServiceKey: !!supabaseServiceKey,
            serviceKeyPrefix: supabaseServiceKey ? supabaseServiceKey.substring(0, 10) + '...' : 'NONE',
            envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
        };

        if (!supabaseAdmin) {
            console.error('[referrals-api] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing!', diagnostics);
            return NextResponse.json({ 
                error: 'Service role key missing in environment', 
                diagnostics 
            }, { status: 500 });
        }

        const { username } = await req.json();

        if (!username) {
            return NextResponse.json({ error: 'username is required' }, { status: 400 });
        }

        console.log(`[referrals-api] Querying for: "${username}"`);

        const { data: referrals, error } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, username, balance, balance_usd, is_verified, created_at, tier, referred_by_username')
            .ilike('referred_by_username', username.trim());

        if (error) {
            console.error('[referrals-api] Supabase error:', error.message);
            return NextResponse.json({ error: error.message, diagnostics }, { status: 500 });
        }

        console.log(`[referrals-api] Success! Found ${referrals?.length || 0} for ${username}`);

        return NextResponse.json({ 
            success: true,
            referrals: referrals || [],
            count: referrals?.length || 0,
            debug_username_queried: username,
            diagnostics
        });
    } catch (error: any) {
        console.error('[referrals-api] Unhandled error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
