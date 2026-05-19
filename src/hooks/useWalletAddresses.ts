"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    WALLET_NETWORKS,
    type WalletAddressMap,
    type WalletAddressRow,
    type WalletNetwork,
} from "@/lib/walletAddresses";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

interface State {
    map: WalletAddressMap;
    loading: boolean;
    error: string | null;
}

/**
 * Public URL for a QR object in the wallet-qr bucket. The bucket is public,
 * so this resolves directly without a signed URL roundtrip. Falls back to
 * the legacy /usdt-*.png assets if no row has been seeded yet.
 */
export function walletQrUrl(row: WalletAddressRow | undefined, network: WalletNetwork): string {
    if (row?.qr_path && SUPABASE_URL) {
        return `${SUPABASE_URL}/storage/v1/object/public/wallet-qr/${row.qr_path}`;
    }
    // Legacy fallbacks bundled in /public — kept so the UI never breaks on
    // a freshly-migrated database before the first admin upload.
    if (network === "tron") return "/usdt-qr.png";
    if (network === "bep20") return "/usdt-bep20-qr.png";
    if (network === "erc20") return "/usdt-erc20-qr.png";
    return "/usdt-sol-qr.png";
}

export function useWalletAddresses(): State {
    const [state, setState] = useState<State>({ map: {}, loading: true, error: null });

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const { data, error } = await supabase
                    .from("wallet_addresses")
                    .select("*")
                    .eq("is_active", true);

                if (cancelled) return;
                if (error) {
                    setState({ map: {}, loading: false, error: error.message });
                    return;
                }

                const map: WalletAddressMap = {};
                (data as WalletAddressRow[] | null)?.forEach((row) => {
                    if (WALLET_NETWORKS.includes(row.network)) {
                        map[row.network] = row;
                    }
                });
                setState({ map, loading: false, error: null });
            } catch (err: any) {
                if (cancelled) return;
                setState({ map: {}, loading: false, error: err?.message || "Failed to load wallets." });
            }
        };

        load();

        const channel = supabase
            .channel("wallet-addresses-sync")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "wallet_addresses" },
                () => load()
            )
            .subscribe();

        return () => {
            cancelled = true;
            supabase.removeChannel(channel);
        };
    }, []);

    return state;
}

/**
 * Resolve the address + QR for a given network. Convenience for the deposit
 * pages, which only care about one network at a time.
 */
export function useWalletForNetwork(network: WalletNetwork) {
    const { map, loading, error } = useWalletAddresses();
    return useMemo(
        () => ({
            row: map[network],
            address: map[network]?.address ?? "",
            qrUrl: walletQrUrl(map[network], network),
            loading,
            error,
        }),
        [map, network, loading, error]
    );
}
