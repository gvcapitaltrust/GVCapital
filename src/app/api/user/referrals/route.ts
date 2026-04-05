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
        // Log environment status for Vercel logs
        console.log('[referrals-api] Starting request...');
        
        const diagnostics = {
            url: supabaseUrl ? 'FOUND' : 'MISSING',
            key: supabaseServiceKey ? 'FOUND' : 'MISSING',
            keyLength: supabaseServiceKey?.length || 0,
            nodeVersion: process.version
        };

        const supabaseAdmin = getAdminClient();

        if (!supabaseAdmin) {
            console.error('[referrals-api] Missing configuration:', diagnostics);
            return NextResponse.json({ 
                error: 'Configuration Error: SUPABASE_SERVICE_ROLE_KEY is not defined in Vercel environment variables.', 
                diagnostics 
            }, { status: 500 });
        }

        const body = await req.json();
        const username = body.username;

        if (!username) {
            return NextResponse.json({ error: 'Username is required', diagnostics }, { status: 400 });
        }

        // Direct query with service role (bypasses RLS)
        const { data: referrals, error } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, username, balance, balance_usd, is_verified, created_at, tier, referred_by_username')
            .ilike('referred_by_username', username.trim());

        if (error) {
            console.error('[referrals-api] Database Error:', error.message);
            return NextResponse.json({ error: `Database Error: ${error.message}`, diagnostics }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true,
            referrals: referrals || [],
            count: referrals?.length || 0,
            diagnostics
        });
    } catch (error: any) {
        console.error('[referrals-api] Crash:', error.message);
        return NextResponse.json({ error: `Server Crash: ${error.message}` }, { status: 500 });
    }
}
