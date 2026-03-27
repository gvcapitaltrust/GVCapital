"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabaseClient";

/**
 * Updates the global forex rate for the platform.
 * Ensures only an authenticated user can perform this action via the Next.js Server Action.
 * 
 * @param newRate - The target USD to MYR rate to be applied globally.
 */
export async function updateGlobalForexRate(newRate: number) {
    try {
        // Auth Check: Uses the Supabase server client logic to ensure only 
        // an authenticated user can run the function.
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return {
                success: false,
                error: "Unauthorized access: You must be logged in as an admin to perform this action."
            };
        }

        // Get Old Rate: Fetches the current usd_to_myr_rate from the 
        // platform_settings table (where key = 'usd_to_myr_rate').
        const { data: currentSettings, error: fetchError } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'usd_to_myr_rate')
            .single();

        // Handle fallback rate if current_rates doesn't exist yet
        const oldRateValue = currentSettings?.value ? parseFloat(currentSettings.value) : 4.0;

        // Update Rate: Performs an upsert on platform_settings with the new rate 
        // and the current user's ID in the updated_by column.
        const { error: updateError } = await supabase
            .from('platform_settings')
            .upsert({
                key: 'usd_to_myr_rate',
                value: String(newRate),
                updated_by: user.id
            }, { onConflict: 'key' });

        if (updateError) {
            console.error("Supabase Upsert Error:", updateError);
            throw new Error("Failed to update platform settings in the database.");
        }

        // Audit Log: Automatically inserts a new row into the forex_history table 
        // containing the old_rate, new_rate, and changed_by.
        const { error: historyError } = await supabase
            .from('forex_history')
            .insert([{
                old_rate: oldRateValue,
                new_rate: newRate,
                changed_by: user.id
            }]);

        if (historyError) {
            console.error("Supabase History Log Error:", historyError);
            // We don't necessarily throw here if the rate already updated, 
            // but for safety in this enterprise context, we will treat it as a failure.
            throw new Error("Failed to create audit log for the rate change.");
        }

        // Sync: Uses revalidatePath('/admin') to ensure the dashboard reflects the new rate immediately.
        revalidatePath('/admin');

        return {
            success: true,
            message: "Global forex rate updated successfully across all platform systems.",
            data: {
                previous: oldRateValue.toFixed(4),
                current: newRate.toFixed(4),
                updatedBy: user.email
            }
        };

    } catch (err: any) {
        console.error("Forex Action Error:", err);
        return {
            success: false,
            error: err.message || "An unexpected error occurred during the rate update."
        };
    }
}
