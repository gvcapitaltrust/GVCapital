"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface SettingsContextType {
    forexRate: number;
    monthlyRate: number;
    yearlyRate: number;
    maintenanceMode: boolean;
    loading: boolean;
    refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [forexRate, setForexRate] = useState(4.0); // Safe Default
    const [monthlyRate, setMonthlyRate] = useState(0.08); // 8% Default
    const [yearlyRate, setYearlyRate] = useState(0.96); // 96% Default
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        try {
            // 1. Fetch Forex Rate
            const { data: psRate, error: psError } = await supabase
                .from('platform_settings')
                .select('value')
                .eq('key', 'usd_to_myr_rate')
                .maybeSingle();
            
            if (psRate && !psError) {
                const rateVal = parseFloat(psRate.value);
                setForexRate(rateVal > 0 ? rateVal : 4.4);
            }

            // 2. Fetch Return Rates (if stored in platform_settings)
            const { data: psMonthly, error: mError } = await supabase
                .from('platform_settings')
                .select('value')
                .eq('key', 'monthly_return_rate')
                .maybeSingle();
            
            if (psMonthly && !mError) {
                setMonthlyRate(parseFloat(psMonthly.value) || 0.08);
            }

            const { data: psYearly, error: yError } = await supabase
                .from('platform_settings')
                .select('value')
                .eq('key', 'yearly_return_rate')
                .maybeSingle();
            
            if (psYearly && !yError) {
                setYearlyRate(parseFloat(psYearly.value) || 0.96);
            }

            // 3. Fetch Maintenance Mode
            const { data: psMaint, error: maintError } = await supabase
                .from('platform_settings')
                .select('value')
                .eq('key', 'maintenance_mode')
                .maybeSingle();
            
            if (psMaint && !maintError) {
                setMaintenanceMode(psMaint.value === 'true');
            }
        } catch (err) {
            console.error("[SETTINGS] Fetch failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();

        // Robust Real-time subscription to platform_settings changes
        const channel = supabase
            .channel('platform_settings_changes')
            .on('postgres_changes', { 
                event: '*', // Listen to All events (UPDATE, INSERT, DELETE)
                schema: 'public', 
                table: 'platform_settings' 
            }, (payload: any) => {
                console.log("[SETTINGS] Change detected:", payload.eventType, payload.new?.key || "");
                // Always refresh to ensure state remains in sync with DB
                fetchSettings();
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log("[SETTINGS] Realtime subscription established.");
                } else if (status === 'CHANNEL_ERROR') {
                    console.error("[SETTINGS] Realtime connection failed. Check if Realtime is enabled in Supabase.");
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <SettingsContext.Provider value={{ forexRate, monthlyRate, yearlyRate, maintenanceMode, loading, refresh: fetchSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
};
