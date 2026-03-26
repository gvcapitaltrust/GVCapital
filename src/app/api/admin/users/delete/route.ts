import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient() {
    if (!supabaseUrl || !supabaseServiceKey) {
        return null;
    }
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

export async function POST(req: Request) {
    try {
        const supabaseAdmin = getAdminClient();
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Service role key missing' }, { status: 500 });
        }

        const { userId, adminId, adminName } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Optional: First delete the profile manually if no cascading delete exists
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (profileError) {
            console.error('Error deleting profile:', profileError);
            // Non-fatal, might have been deleted already or cascading exist
        }

        // Delete user auth account
        const { data, error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authError) {
            console.error('Error deleting user auth:', authError);
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        // Optional: Log the deletion
        if (adminId) {
            await supabaseAdmin.from('transactions').insert({
                user_id: userId, // Keep reference or use 000-000 for deleted user
                type: 'Audit',
                amount: 0,
                status: 'Approved',
                ref_id: `DEL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                metadata: {
                    is_audit: true,
                    action: 'User Deleted',
                    description: `Admin deleted user ${userId}`,
                    processed_by_name: adminName || "Admin",
                    processed_by_id: adminId,
                }
            });
        }

        return NextResponse.json({ success: true, message: 'User deleted successfully' });
    } catch (error: any) {
        console.error('Delete user error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
