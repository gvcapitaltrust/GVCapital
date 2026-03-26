import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    const { data: users, error: userError } = await supabase.from('profiles').select('id').limit(1);
    const userId = users?.[0]?.id;
    
    if (userId) {
        const { error, data } = await supabase.from('transactions').insert({
            user_id: userId,
            type: 'Audit',
            amount: 0,
            status: 'Approved',
            ref_id: `TEST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        }).select();
        
        if (error) {
            console.error("Insert error:", error);
        } else {
            console.log("Insert success:", data);
        }
    } else {
        console.log("No user found");
    }
}

test();
