-- ============================================================
-- GV Capital Trust — Wallet Addresses Migration
-- Replaces hardcoded USDT deposit addresses with editable rows
-- managed by admins. Every change writes an audit row.
--
-- Run this in the Supabase SQL Editor.
-- Idempotent: safe to re-run.
-- ============================================================

-- ============================================================
-- 1. wallet_addresses — one active row per network
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wallet_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network TEXT NOT NULL UNIQUE
        CHECK (network IN ('tron', 'sol', 'bep20', 'erc20')),
    address TEXT NOT NULL,
    qr_path TEXT,
    label TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by_email TEXT
);

ALTER TABLE public.wallet_addresses ENABLE ROW LEVEL SECURITY;

-- Authenticated users (clients) can read active addresses — they are public
-- receive addresses meant to be shown on the deposit page anyway.
DROP POLICY IF EXISTS "wallet_addresses_authed_read" ON public.wallet_addresses;
CREATE POLICY "wallet_addresses_authed_read" ON public.wallet_addresses
    FOR SELECT USING (auth.role() = 'authenticated');

-- No INSERT/UPDATE/DELETE policies → writes only via service-role key from
-- the admin API route, which enforces admin role itself. This is intentional:
-- we never want a client-side bug to allow a logged-in user to mutate the
-- platform's receive addresses.

-- Realtime so admin pages refresh after a save.
DO $$
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_addresses;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ============================================================
-- 2. wallet_address_audit — append-only history
-- Records every change to wallet_addresses. Required for fintech
-- compliance and to detect malicious changes to the receive address.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wallet_address_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallet_addresses(id) ON DELETE CASCADE,
    network TEXT NOT NULL,
    old_address TEXT,
    new_address TEXT NOT NULL,
    old_qr_path TEXT,
    new_qr_path TEXT,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    changed_by_email TEXT,
    changed_by_name TEXT,
    change_reason TEXT,
    ip_address TEXT,
    user_agent TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_audit_wallet_id
    ON public.wallet_address_audit(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_audit_network
    ON public.wallet_address_audit(network);
CREATE INDEX IF NOT EXISTS idx_wallet_audit_changed_at
    ON public.wallet_address_audit(changed_at DESC);

ALTER TABLE public.wallet_address_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can read the audit log.
DROP POLICY IF EXISTS "wallet_audit_admin_read" ON public.wallet_address_audit;
CREATE POLICY "wallet_audit_admin_read" ON public.wallet_address_audit
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- No INSERT/UPDATE/DELETE policies → writes only via service-role.
-- Append-only by design.

-- ============================================================
-- 3. Seed initial rows from current hardcoded values
-- ============================================================
-- Seed values mirror what is currently displayed in src/app/admin/deposits/DepositsClient.tsx
-- as of this migration. The admin can edit any of them through the
-- /admin/wallet-addresses page after running this script.
INSERT INTO public.wallet_addresses (network, address, qr_path, label)
VALUES
    ('tron',  'TQonQePMsP5yWAdDKJKFpt7NciiSAN8Bc2',           NULL, 'USDT — TRON (TRC20)'),
    ('sol',   'BkR8i2ckroRMejUbA5B6zctAn5ZKTDotE9zgAoJdGVX2', NULL, 'USDT — Solana'),
    ('bep20', '0x2d323ec311d87283e23e919cd3288e013e84ebbb',   NULL, 'USDT — BSC (BEP20)'),
    ('erc20', '0x2d323ec311d87283e23e919cd3288e013e84ebbb',   NULL, 'USDT — Ethereum (ERC20)')
ON CONFLICT (network) DO NOTHING;

-- ============================================================
-- 4. Storage bucket: wallet-qr
-- Public read (QR images are meant to be shown to clients).
-- Writes only via service-role from the admin API route.
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('wallet-qr', 'wallet-qr', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

-- Public read policy for the bucket
DROP POLICY IF EXISTS "wallet_qr_public_read" ON storage.objects;
CREATE POLICY "wallet_qr_public_read" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'wallet-qr');

-- No INSERT/UPDATE/DELETE policies for non-service-role → admin API
-- route writes with service-role key, which bypasses RLS.

-- ============================================================
-- 5. Trigger to keep updated_at fresh
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_wallet_addresses_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wallet_addresses_touch_updated_at ON public.wallet_addresses;
CREATE TRIGGER wallet_addresses_touch_updated_at
    BEFORE UPDATE ON public.wallet_addresses
    FOR EACH ROW EXECUTE FUNCTION public.tg_wallet_addresses_touch_updated_at();
