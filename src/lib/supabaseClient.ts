import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** Master admin email — change only here, referenced everywhere else */
export const MASTER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL ?? 'support@gvcapital.asia'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'gv-auth-v1',
    }
})
