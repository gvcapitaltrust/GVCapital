import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function cleanupStorage() {
    console.log("Cleaning up 'agreements' storage bucket...");
    
    // 1. List files in 'agreements'
    const { data: files, error: listError } = await supabase
        .storage
        .from('agreements')
        .list();

    if (listError) {
        console.error("Error listing files:", listError.message);
        return;
    }

    if (!files || files.length === 0) {
        console.log("No files found in 'agreements' bucket.");
        return;
    }

    console.log(`Found ${files.length} files. Deleting...`);

    // 2. Delete files
    const fileNames = files.map(f => f.name);
    const { data, error: deleteError } = await supabase
        .storage
        .from('agreements')
        .remove(fileNames);

    if (deleteError) {
        console.error("Error deleting files:", deleteError.message);
    } else {
        console.log("Successfully deleted all files in 'agreements' bucket.");
    }
}

cleanupStorage();
