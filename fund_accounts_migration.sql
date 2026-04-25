-- ============================================================
-- GV Capital Trust — Fund Account Monitoring
-- Migration: Create fund_accounts, fund_account_performance,
--            fund_account_members tables
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. fund_accounts
CREATE TABLE IF NOT EXISTS public.fund_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name TEXT NOT NULL,
    account_code TEXT NOT NULL UNIQUE,
    platform_name TEXT,
    description TEXT,
    initial_capital NUMERIC(18, 2) DEFAULT 0,
    current_capital NUMERIC(18, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. fund_account_performance
CREATE TABLE IF NOT EXISTS public.fund_account_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_account_id UUID NOT NULL REFERENCES public.fund_accounts(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('daily', 'monthly')),
    opening_capital NUMERIC(18, 2) DEFAULT 0,
    closing_capital NUMERIC(18, 2) DEFAULT 0,
    gain_loss_amount NUMERIC(18, 2) DEFAULT 0,
    gain_loss_percent NUMERIC(10, 4) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. fund_account_members
CREATE TABLE IF NOT EXISTS public.fund_account_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_account_id UUID NOT NULL REFERENCES public.fund_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    allocated_amount_usd NUMERIC(18, 2) DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fund_account_id, user_id)
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.fund_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_account_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_account_members ENABLE ROW LEVEL SECURITY;

-- fund_accounts: users can read accounts they are a member of, admins full access
CREATE POLICY "fund_accounts_user_read" ON public.fund_accounts
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.fund_account_members
            WHERE fund_account_id = id
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "fund_accounts_admin_write" ON public.fund_accounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- fund_account_performance: users can read performance of accounts they are members of
CREATE POLICY "fund_account_performance_user_read" ON public.fund_account_performance
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.fund_account_members
            WHERE fund_account_id = fund_account_performance.fund_account_id
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "fund_account_performance_admin_write" ON public.fund_account_performance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- fund_account_members: users can read their own membership, admins full access
CREATE POLICY "fund_account_members_user_read" ON public.fund_account_members
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "fund_account_members_admin_write" ON public.fund_account_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================
-- Auto-update updated_at on fund_accounts
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fund_accounts_updated_at
    BEFORE UPDATE ON public.fund_accounts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
