-- ============================================================
-- GV Capital Trust — Critical Schema Migration
-- Creates the core tables, columns, RPC, storage bucket, and
-- seed rows that the application code already references.
--
-- Run this in the Supabase SQL Editor.
-- Idempotent: safe to re-run.
-- ============================================================

-- ============================================================
-- 1. profiles (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    username TEXT UNIQUE,
    role TEXT DEFAULT 'User',
    balance NUMERIC(18, 2) DEFAULT 0,
    balance_usd NUMERIC(18, 2) DEFAULT 0,
    profit NUMERIC(18, 2) DEFAULT 0,
    kyc_status TEXT DEFAULT 'Draft',
    kyc_step INT DEFAULT 0,
    kyc_completed BOOLEAN DEFAULT FALSE,
    kyc_data JSONB DEFAULT '{}'::jsonb,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    referred_by UUID,
    referred_by_username TEXT,
    security_pin TEXT,
    gender TEXT,
    dob DATE,
    active_sessions JSONB DEFAULT '[]'::jsonb,
    bank_name TEXT,
    account_number TEXT,
    bank_account_holder TEXT,
    bank_statement_url TEXT,
    portfolio_platform_name TEXT,
    portfolio_account_id TEXT,
    portfolio_account_password TEXT,
    internal_remarks TEXT,
    is_deactivated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns idempotently in case the table already existed with a smaller shape
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS full_name TEXT,
    ADD COLUMN IF NOT EXISTS username TEXT,
    ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'User',
    ADD COLUMN IF NOT EXISTS balance NUMERIC(18, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS balance_usd NUMERIC(18, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS profit NUMERIC(18, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'Draft',
    ADD COLUMN IF NOT EXISTS kyc_step INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS kyc_completed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS kyc_data JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS referred_by UUID,
    ADD COLUMN IF NOT EXISTS referred_by_username TEXT,
    ADD COLUMN IF NOT EXISTS security_pin TEXT,
    ADD COLUMN IF NOT EXISTS gender TEXT,
    ADD COLUMN IF NOT EXISTS dob DATE,
    ADD COLUMN IF NOT EXISTS active_sessions JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS bank_name TEXT,
    ADD COLUMN IF NOT EXISTS account_number TEXT,
    ADD COLUMN IF NOT EXISTS bank_account_holder TEXT,
    ADD COLUMN IF NOT EXISTS bank_statement_url TEXT,
    ADD COLUMN IF NOT EXISTS portfolio_platform_name TEXT,
    ADD COLUMN IF NOT EXISTS portfolio_account_id TEXT,
    ADD COLUMN IF NOT EXISTS portfolio_account_password TEXT,
    ADD COLUMN IF NOT EXISTS internal_remarks TEXT,
    ADD COLUMN IF NOT EXISTS is_deactivated BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by_username ON public.profiles(referred_by_username);
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_status ON public.profiles(kyc_status);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
CREATE POLICY "profiles_self_read" ON public.profiles
    FOR SELECT USING (
        id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles
    FOR UPDATE USING (
        id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
CREATE POLICY "profiles_self_insert" ON public.profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- ============================================================
-- 2. transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    amount_usd NUMERIC(18, 2),
    original_currency TEXT,
    original_currency_amount NUMERIC(18, 2),
    ref_id TEXT,
    receipt_url TEXT,
    transfer_date TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON public.transactions(type, status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_self_read" ON public.transactions;
CREATE POLICY "transactions_self_read" ON public.transactions
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

DROP POLICY IF EXISTS "transactions_self_insert" ON public.transactions;
CREATE POLICY "transactions_self_insert" ON public.transactions
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

DROP POLICY IF EXISTS "transactions_admin_update" ON public.transactions;
CREATE POLICY "transactions_admin_update" ON public.transactions
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- ============================================================
-- 3. platform_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_settings_public_read" ON public.platform_settings;
CREATE POLICY "platform_settings_public_read" ON public.platform_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "platform_settings_admin_write" ON public.platform_settings;
CREATE POLICY "platform_settings_admin_write" ON public.platform_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- Seed defaults (only inserts if missing)
INSERT INTO public.platform_settings (key, value) VALUES
    ('usd_to_myr_rate', '4.4'),
    ('forex_spread_rm', '0.20'),
    ('monthly_return_rate', '0.08'),
    ('yearly_return_rate', '0.96'),
    ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 4. verification_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email TEXT,
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    admin_username TEXT,
    action_taken TEXT NOT NULL,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_logs_user_id ON public.verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_created_at ON public.verification_logs(created_at DESC);

ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verification_logs_admin_only" ON public.verification_logs;
CREATE POLICY "verification_logs_admin_only" ON public.verification_logs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- ============================================================
-- 5. withdrawal_methods
-- ============================================================
CREATE TABLE IF NOT EXISTS public.withdrawal_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('BANK', 'USDT')),
    bank_name TEXT,
    account_number TEXT,
    account_holder TEXT,
    usdt_address TEXT,
    usdt_network TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_methods_user_id ON public.withdrawal_methods(user_id);

ALTER TABLE public.withdrawal_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "withdrawal_methods_owner" ON public.withdrawal_methods;
CREATE POLICY "withdrawal_methods_owner" ON public.withdrawal_methods
    FOR ALL USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- ============================================================
-- 6. sales_leaderboard
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sales_leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_username TEXT NOT NULL UNIQUE,
    agent_full_name TEXT,
    total_referred_capital NUMERIC(18, 2) DEFAULT 0,
    total_referred_capital_usd NUMERIC(18, 2) DEFAULT 0,
    referred_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sales_leaderboard ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_leaderboard_authenticated_read" ON public.sales_leaderboard;
CREATE POLICY "sales_leaderboard_authenticated_read" ON public.sales_leaderboard
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "sales_leaderboard_admin_write" ON public.sales_leaderboard;
CREATE POLICY "sales_leaderboard_admin_write" ON public.sales_leaderboard
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- ============================================================
-- 7. forex_history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.forex_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    old_rate NUMERIC(10, 4) NOT NULL,
    new_rate NUMERIC(10, 4) NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forex_history_created_at ON public.forex_history(created_at DESC);

ALTER TABLE public.forex_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forex_history_admin_only" ON public.forex_history;
CREATE POLICY "forex_history_admin_only" ON public.forex_history
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- ============================================================
-- 8. notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_owner" ON public.notifications;
CREATE POLICY "notifications_owner" ON public.notifications
    FOR ALL USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_settings;

-- ============================================================
-- 9. RPC: approve_deposit
-- Sets the transaction status to Approved atomically.
-- Called by AdminProvider.handleApproveDeposit; the follow-up
-- balance update is done client-side.
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_deposit(
    p_tx_id UUID,
    p_user_id UUID,
    p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Caller must be an admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'unauthorized: admin role required';
    END IF;

    UPDATE public.transactions
    SET status = 'Approved'
    WHERE id = p_tx_id
      AND user_id = p_user_id
      AND type = 'Deposit'
      AND status = 'Pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'transaction % not found, not pending, or not a deposit', p_tx_id;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_deposit(UUID, UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_deposit(UUID, UUID, NUMERIC) TO authenticated;

-- ============================================================
-- 10. Storage bucket: agreements (KYC docs + deposit receipts)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('agreements', 'agreements', false)
ON CONFLICT (id) DO NOTHING;

-- Owners can upload their own files (path begins with their user id)
DROP POLICY IF EXISTS "agreements_owner_upload" ON storage.objects;
CREATE POLICY "agreements_owner_upload" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'agreements'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR position(auth.uid()::text in name) = 1
            OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        )
    );

DROP POLICY IF EXISTS "agreements_owner_read" ON storage.objects;
CREATE POLICY "agreements_owner_read" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'agreements'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR position(auth.uid()::text in name) = 1
            OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        )
    );

DROP POLICY IF EXISTS "agreements_admin_all" ON storage.objects;
CREATE POLICY "agreements_admin_all" ON storage.objects
    FOR ALL USING (
        bucket_id = 'agreements'
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- ============================================================
-- 11. Tighten fund_transactions RLS (was WITH CHECK (true))
-- ============================================================
DROP POLICY IF EXISTS "Admins can do everything on fund_transactions" ON public.fund_transactions;

CREATE POLICY "fund_transactions_admin_only" ON public.fund_transactions
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- ============================================================
-- 12. Auto-update updated_at trigger for profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at_profiles()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_profiles();
