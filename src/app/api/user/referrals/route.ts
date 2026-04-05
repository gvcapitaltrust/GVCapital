import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
    if (!supabaseUrl || !supabaseServiceKey) return null;
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
}

// Support GET for easy debugging and as a more reliable fallback
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const username = searchParams.get('username');

        // If no username provided, return diagnostics report
        if (!username) {
            return NextResponse.json({
                url_status: supabaseUrl ? 'OK' : 'MISSING',
                service_key_status: supabaseServiceKey ? 'OK' : 'MISSING',
                key_length: supabaseServiceKey?.length || 0,
                message: 'To query referrals, add ?username=YOUR_USERNAME to the URL.'
            });
        }

        const supabaseAdmin = getAdminClient();
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Config missing' }, { status: 500 });
        }

        // Query referrals by username (case-insensitive)
        const { data: referrals, error } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, username, balance, balance_usd, is_verified, created_at, referred_by_username')
            .ilike('referred_by_username', username.trim());

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true,
            referrals: referrals || [],
            count: referrals?.length || 0
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Keep POST for backward compatibility just in case
export async function POST(req: Request) {
    try {
        const { username } = await req.json();
        if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 });

        const supabaseAdmin = getAdminClient();
        if (!supabaseAdmin) return NextResponse.json({ error: 'Config missing' }, { status: 500 });

        const { data: referrals, error } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, username, balance, balance_usd, is_verified, created_at, referred_by_username')
            .ilike('referred_by_username', username.trim());

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({ success: true, referrals: referrals || [], count: referrals?.length || 0 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
