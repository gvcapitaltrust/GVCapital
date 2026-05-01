-- ============================================================
-- Fix: infinite recursion in profiles RLS policies
--
-- The previous policies inlined `EXISTS (SELECT 1 FROM profiles
-- WHERE id = auth.uid() AND role = 'admin')`. Because that
-- subquery reads from profiles, Postgres re-applies the same
-- policy, recurses, and aborts every read.
--
-- The fix is a SECURITY DEFINER helper that bypasses RLS while
-- doing the admin check, then policies that call the helper.
--
-- Idempotent. Run in the Supabase SQL Editor.
-- ============================================================

-- 1. Helper: returns true if the current auth.uid() is an admin.
--    SECURITY DEFINER bypasses RLS inside the function body.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- 2. Replace recursive profiles policies
DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
CREATE POLICY "profiles_self_read" ON public.profiles
    FOR SELECT USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles
    FOR UPDATE USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
CREATE POLICY "profiles_self_insert" ON public.profiles
    FOR INSERT WITH CHECK (id = auth.uid() OR public.is_admin());

-- 3. Replace the same pattern on other tables for consistency.
--    (These weren't recursive — they only read from profiles —
--     but using is_admin() is cleaner and safer.)

-- transactions
DROP POLICY IF EXISTS "transactions_self_read" ON public.transactions;
CREATE POLICY "transactions_self_read" ON public.transactions
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "transactions_self_insert" ON public.transactions;
CREATE POLICY "transactions_self_insert" ON public.transactions
    FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "transactions_admin_update" ON public.transactions;
CREATE POLICY "transactions_admin_update" ON public.transactions
    FOR UPDATE USING (public.is_admin());

-- platform_settings
DROP POLICY IF EXISTS "platform_settings_admin_write" ON public.platform_settings;
CREATE POLICY "platform_settings_admin_write" ON public.platform_settings
    FOR ALL USING (public.is_admin());

-- verification_logs
DROP POLICY IF EXISTS "verification_logs_admin_only" ON public.verification_logs;
CREATE POLICY "verification_logs_admin_only" ON public.verification_logs
    FOR ALL USING (public.is_admin());

-- withdrawal_methods
DROP POLICY IF EXISTS "withdrawal_methods_owner" ON public.withdrawal_methods;
CREATE POLICY "withdrawal_methods_owner" ON public.withdrawal_methods
    FOR ALL USING (user_id = auth.uid() OR public.is_admin());

-- forex_history
DROP POLICY IF EXISTS "forex_history_admin_only" ON public.forex_history;
CREATE POLICY "forex_history_admin_only" ON public.forex_history
    FOR ALL USING (public.is_admin());

-- notifications
DROP POLICY IF EXISTS "notifications_owner" ON public.notifications;
CREATE POLICY "notifications_owner" ON public.notifications
    FOR ALL USING (user_id = auth.uid() OR public.is_admin());

-- agreements storage bucket
DROP POLICY IF EXISTS "agreements_owner_upload" ON storage.objects;
CREATE POLICY "agreements_owner_upload" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'agreements'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR position(auth.uid()::text in name) = 1
            OR public.is_admin()
        )
    );

DROP POLICY IF EXISTS "agreements_owner_read" ON storage.objects;
CREATE POLICY "agreements_owner_read" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'agreements'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR position(auth.uid()::text in name) = 1
            OR public.is_admin()
        )
    );

DROP POLICY IF EXISTS "agreements_admin_all" ON storage.objects;
CREATE POLICY "agreements_admin_all" ON storage.objects
    FOR ALL USING (bucket_id = 'agreements' AND public.is_admin());

-- fund_transactions
DROP POLICY IF EXISTS "fund_transactions_admin_only" ON public.fund_transactions;
CREATE POLICY "fund_transactions_admin_only" ON public.fund_transactions
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================
-- Verify (run this after the migration to sanity-check):
--   SELECT * FROM public.profiles WHERE id = auth.uid();
-- Should return your row, not an error.
-- ============================================================
