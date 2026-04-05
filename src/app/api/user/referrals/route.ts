import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use local variables to ensure we can debug if they are missing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
    if (!supabaseUrl || !supabaseServiceKey) return null;
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
}

// Support GET for easy browser debugging
export async function GET() {
    const diagnostics = {
        url_status: supabaseUrl ? 'OK' : 'MISSING',
        service_key_status: supabaseServiceKey ? 'OK' : 'MISSING',
        key_length: supabaseServiceKey?.length || 0,
        message: 'This endpoint is working. Use POST with { "username": "..." } to query referrals.'
    };
    
    return NextResponse.json(diagnostics);
}

export async function POST(req: Request) {
    try {
        const diagnostics = {
            url_status: supabaseUrl ? 'OK' : 'MISSING',
            service_key_status: supabaseServiceKey ? 'OK' : 'MISSING',
        };

        const supabaseAdmin = getAdminClient();

        if (!supabaseAdmin) {
            return NextResponse.json({ 
                error: 'Configuration Error: Missing Environment Variables', 
                diagnostics,
                hint: 'Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Vercel.'
            }, { status: 500 });
        }

        let body;
        try {
            body = await req.json();
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const username = body?.username;
        if (!username) {
            return NextResponse.json({ error: 'username property is required' }, { status: 400 });
        }

        const { data: referrals, error } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, username, balance, balance_usd, is_verified, created_at, tier, referred_by_username')
            .ilike('referred_by_username', username.trim());

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true,
            referrals: referrals || [],
            count: referrals?.length || 0
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
