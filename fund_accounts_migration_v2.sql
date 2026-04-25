-- ============================================================
-- GV Capital Trust — Fund Account Monitoring v2
-- Migration: Alter existing tables with institutional columns
-- Run AFTER fund_accounts_migration.sql
-- ============================================================

-- 1. Add institutional columns to fund_accounts
ALTER TABLE public.fund_accounts
    ADD COLUMN IF NOT EXISTS fund_start_date DATE,
    ADD COLUMN IF NOT EXISTS base_currency TEXT DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Add audit + soft-delete columns to fund_account_performance
ALTER TABLE public.fund_account_performance
    ADD COLUMN IF NOT EXISTS entered_by_id UUID,
    ADD COLUMN IF NOT EXISTS entered_by_name TEXT,
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_by TEXT,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS edited_by TEXT,
    ADD COLUMN IF NOT EXISTS original_opening_capital NUMERIC(18,2),
    ADD COLUMN IF NOT EXISTS original_closing_capital NUMERIC(18,2);

-- 3. Index for soft-delete filtering
CREATE INDEX IF NOT EXISTS idx_fund_perf_not_deleted ON public.fund_account_performance(fund_account_id, snapshot_date) WHERE is_deleted = FALSE;

-- 4. Update RLS on fund_account_performance to filter soft-deleted rows from users
-- (Admins can still see is_deleted = TRUE rows)
DROP POLICY IF EXISTS "fund_account_performance_user_read" ON public.fund_account_performance;
CREATE POLICY "fund_account_performance_user_read" ON public.fund_account_performance
    FOR SELECT USING (
        is_deleted = FALSE
        AND (
            auth.uid() IN (
                SELECT user_id FROM public.fund_account_members
                WHERE fund_account_id = fund_account_performance.fund_account_id
            )
            OR EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

-- 5. Filter soft-deleted fund_accounts from user view
DROP POLICY IF EXISTS "fund_accounts_user_read" ON public.fund_accounts;
CREATE POLICY "fund_accounts_user_read" ON public.fund_accounts
    FOR SELECT USING (
        deleted_at IS NULL
        AND (
            auth.uid() IN (
                SELECT user_id FROM public.fund_account_members
                WHERE fund_account_id = id
            )
            OR EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );
