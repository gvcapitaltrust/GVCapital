// Debug script to check referral data in Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://prmeppkidipenldrrpis.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBybWVwcGtpZGlwZW5sZHJycGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgxMTY5OCwiZXhwIjoyMDg4Mzg3Njk4fQ.cwFsugA7AvS4dIZjGUiS-NmFbczgaX2fq-81jhkJ7p8';

const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
    console.log('\n=== STEP 1: Find thenja96 profile ===');
    const { data: thenja, error: e1 } = await supabase
        .from('profiles')
        .select('id, username, email, referred_by, referred_by_username')
        .ilike('username', 'thenja96')
        .maybeSingle();

    if (e1) { console.error('Error fetching thenja96:', e1.message); return; }
    if (!thenja) { console.log('USER thenja96 NOT FOUND in profiles!'); return; }
    console.log('thenja96 profile:', JSON.stringify(thenja, null, 2));

    console.log('\n=== STEP 2: All profiles - show referred_by_username column ===');
    const { data: allProfiles, error: e2 } = await supabase
        .from('profiles')
        .select('id, username, referred_by, referred_by_username')
        .order('created_at', { ascending: false });

    if (e2) { console.error('Error fetching all profiles:', e2.message); return; }
    console.log('All profiles (username | referred_by_username):');
    allProfiles?.forEach(p => {
        console.log(`  ${p.username || '(no username)'} | referred_by_username: "${p.referred_by_username}" | referred_by: "${p.referred_by}"`);
    });

    console.log('\n=== STEP 3: Direct ilike query for referred_by_username = thenja96 ===');
    const { data: refs, error: e3 } = await supabase
        .from('profiles')
        .select('id, username, referred_by_username')
        .ilike('referred_by_username', 'thenja96');

    if (e3) { console.error('Error in ilike query:', e3.message); return; }
    console.log('Referrals found via ilike:', refs?.length || 0);
    console.log(JSON.stringify(refs, null, 2));

    console.log('\n=== STEP 4: Try eq query (exact match) ===');
    const { data: refs2, error: e4 } = await supabase
        .from('profiles')
        .select('id, username, referred_by_username')
        .eq('referred_by_username', 'thenja96');

    if (e4) { console.error('Error in eq query:', e4.message); return; }
    console.log('Referrals found via eq:', refs2?.length || 0);
    console.log(JSON.stringify(refs2, null, 2));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
