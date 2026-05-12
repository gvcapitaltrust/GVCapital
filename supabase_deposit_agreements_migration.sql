-- ============================================================
-- GV Capital Trust — Deposit Agreements Migration
-- Records the per-user, version-stamped sign-off of the deposit
-- terms & conditions, captured the first time a user has an
-- approved/completed deposit.
--
-- Run this in the Supabase SQL Editor.
-- Idempotent: safe to re-run.
-- ============================================================

-- ============================================================
-- 1. deposit_agreements table
-- One row per (user_id, agreement_version). Append-only by design:
-- no UPDATE or DELETE policy exists, preserving audit integrity.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deposit_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    agreement_version TEXT NOT NULL,
    signed_name TEXT NOT NULL,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    signature_certificate_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, agreement_version)
);

-- Idempotent in case the table existed without the certificate column
ALTER TABLE public.deposit_agreements
    ADD COLUMN IF NOT EXISTS signature_certificate_path TEXT;

CREATE INDEX IF NOT EXISTS idx_deposit_agreements_user_id
    ON public.deposit_agreements(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_agreements_version
    ON public.deposit_agreements(agreement_version);

ALTER TABLE public.deposit_agreements ENABLE ROW LEVEL SECURITY;

-- User can read their own signing records; admins can read all
DROP POLICY IF EXISTS "deposit_agreements_self_read" ON public.deposit_agreements;
CREATE POLICY "deposit_agreements_self_read" ON public.deposit_agreements
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- User can insert only their own row. No UPDATE/DELETE policies → immutable.
DROP POLICY IF EXISTS "deposit_agreements_self_insert" ON public.deposit_agreements;
CREATE POLICY "deposit_agreements_self_insert" ON public.deposit_agreements
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

-- Realtime so the client unlocks the moment a row is inserted
DO $$
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_agreements;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ============================================================
-- 2. Grandfather existing users with prior approved/completed deposits.
-- A single 'grandfathered_v0' row marks them as "already signed", so
-- they will never see the new prompt. Users with zero prior deposits
-- are NOT grandfathered — they will sign on their first deposit.
-- ============================================================
INSERT INTO public.deposit_agreements (user_id, agreement_version, signed_name, signed_at)
SELECT
    DISTINCT t.user_id,
    'grandfathered_v0' AS agreement_version,
    'GRANDFATHERED'    AS signed_name,
    NOW()              AS signed_at
FROM public.transactions t
WHERE t.type = 'Deposit'
  AND t.status IN ('Approved', 'Completed')
  AND t.user_id IS NOT NULL
ON CONFLICT (user_id, agreement_version) DO NOTHING;
