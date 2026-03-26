import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export async function POST(req: Request) {
    try {
        if (!supabaseServiceKey) {
            return NextResponse.json({ error: 'Service role key missing' }, { status: 500 });
        }

        const { userId, isDeactivated, adminId, adminName } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Update ban status using ban_duration (876000h = 100 years for banned, 'none' for active)
        const { data, error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            ban_duration: isDeactivated ? '876000h' : 'none'
        });

        if (authError) {
            console.error('Error updating user auth status:', authError);
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        // Also update a status field in the profiles table to reflect this if you use it in the UI
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ kyc_status: isDeactivated ? 'Suspended' : 'Pending' }) // Fallback to updating KYC status if no specific field exists
            .eq('id', userId);

        if (profileError) {
            console.error('Error updating profile status:', profileError);
        }

        // Log the status change
        if (adminId) {
            await supabaseAdmin.from('transactions').insert({
                user_id: userId,
                type: 'Audit',
                amount: 0,
                status: 'Approved',
                ref_id: `${isDeactivated ? 'BAN' : 'UNB'}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                metadata: {
                    is_audit: true,
                    action: isDeactivated ? 'User Deactivated' : 'User Reactivated',
                    description: `Admin ${isDeactivated ? 'deactivated' : 'reactivated'} user ${userId}`,
                    processed_by_name: adminName || "Admin",
                    processed_by_id: adminId,
                }
            });
        }

        return NextResponse.json({ success: true, message: `User ${isDeactivated ? 'deactivated' : 'reactivated'} successfully` });
    } catch (error: any) {
        console.error('Toggle status error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
