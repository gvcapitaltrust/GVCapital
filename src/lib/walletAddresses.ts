/**
 * Wallet address helpers — defines the supported networks and a typed shape
 * for the wallet_addresses Supabase rows. Used by the deposit pages, the
 * admin UI, and the API routes.
 */

export const WALLET_NETWORKS = ["tron", "sol", "bep20", "erc20"] as const;
export type WalletNetwork = (typeof WALLET_NETWORKS)[number];

export interface WalletAddressRow {
    id: string;
    network: WalletNetwork;
    address: string;
    qr_path: string | null;
    label: string | null;
    is_active: boolean;
    updated_at: string;
    updated_by: string | null;
    updated_by_email: string | null;
}

export type WalletAddressMap = Partial<Record<WalletNetwork, WalletAddressRow>>;

export const NETWORK_LABELS: Record<WalletNetwork, { en: string; zh: string }> = {
    tron: { en: "TRON (TRC20)", zh: "波场 (TRC20)" },
    sol: { en: "Solana", zh: "Solana" },
    bep20: { en: "BSC (BEP20)", zh: "币安智能链 (BEP20)" },
    erc20: { en: "Ethereum (ERC20)", zh: "以太坊 (ERC20)" },
};

export function isWalletNetwork(s: unknown): s is WalletNetwork {
    return typeof s === "string" && (WALLET_NETWORKS as readonly string[]).includes(s);
}

/**
 * Build a deterministic storage key for a wallet QR upload. Each upload is
 * timestamped so old QRs are preserved in the bucket for audit/recovery.
 */
export function buildQrStoragePath(network: WalletNetwork, ts = Date.now()): string {
    return `${network}/${ts}.png`;
}
