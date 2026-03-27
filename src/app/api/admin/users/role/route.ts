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
            return NextResponse.json({ error: 'Critical Configuration Missing: SUPABASE_SERVICE_ROLE_KEY is not defined in .env.local. Admin features are disabled until resolved.' }, { status: 500 });
        }

        const { userId, role, adminId, adminName } = await req.json();

        if (!userId || !role) {
            return NextResponse.json({ error: 'User ID and role are required' }, { status: 400 });
        }

        // 1. Update Auth Metadata (This is what the middleware reads)
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { role: role }
        });

        if (authError) {
            console.error('Error updating user auth metadata:', authError);
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        // 2. Update Profiles Table (This is what the UI reads)
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ role: role })
            .eq('id', userId);

        if (profileError) {
            console.error('Error updating profile role:', profileError);
            return NextResponse.json({ error: profileError.message }, { status: 400 });
        }

        // 3. Log the action
        if (adminId) {
            await supabaseAdmin.from('verification_logs').insert({
                user_id: userId,
                admin_id: adminId,
                admin_username: adminName || "Admin",
                action_taken: `Role updated to ${role}`
            });
        }

        return NextResponse.json({ success: true, message: `User role updated to ${role} successfully` });
    } catch (error: any) {
        console.error('Role update error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
