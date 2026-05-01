-- ============================================================
-- Definitive fix for: "infinite recursion detected in policy
-- for relation profiles" causing 500s on every authenticated
-- read.
--
-- Run this in the Supabase SQL Editor. Idempotent.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Drop ALL existing policies that touch profiles or call
--    the recursive admin EXISTS pattern. We rebuild cleanly
--    below.
-- ------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT polname, polrelid::regclass AS tbl
        FROM pg_policy
        WHERE polrelid IN (
            'public.profiles'::regclass,
            'public.transactions'::regclass,
            'public.platform_settings'::regclass,
            'public.verification_logs'::regclass,
            'public.withdrawal_methods'::regclass,
            'public.forex_history'::regclass,
            'public.notifications'::regclass,
            'public.fund_transactions'::regclass
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %s', r.polname, r.tbl);
    END LOOP;
END $$;

-- ------------------------------------------------------------
-- 2. Helper function. SECURITY DEFINER + owned by postgres
--    means the body bypasses RLS (postgres has BYPASSRLS in
--    Supabase), so reading profiles inside the function does
--    NOT re-enter the policy.
-- ------------------------------------------------------------
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

ALTER FUNCTION public.is_admin() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- ------------------------------------------------------------
-- 3. profiles — split into two simple policies that OR together
-- ------------------------------------------------------------
CREATE POLICY "profiles_self_read" ON public.profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_admin_read" ON public.profiles
    FOR SELECT USING (public.is_admin());

CREATE POLICY "profiles_self_update" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_admin_update" ON public.profiles
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "profiles_self_insert" ON public.profiles
    FOR INSERT WITH CHECK (id = auth.uid() OR public.is_admin());

-- ------------------------------------------------------------
-- 4. transactions
-- ------------------------------------------------------------
CREATE POLICY "transactions_self_read" ON public.transactions
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "transactions_self_insert" ON public.transactions
    FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "transactions_admin_update" ON public.transactions
    FOR UPDATE USING (public.is_admin());

-- ------------------------------------------------------------
-- 5. platform_settings — public read, admin write
-- ------------------------------------------------------------
CREATE POLICY "platform_settings_public_read" ON public.platform_settings
    FOR SELECT USING (true);

CREATE POLICY "platform_settings_admin_write" ON public.platform_settings
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "platform_settings_admin_update" ON public.platform_settings
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "platform_settings_admin_delete" ON public.platform_settings
    FOR DELETE USING (public.is_admin());

-- ------------------------------------------------------------
-- 6. Other tables
-- ------------------------------------------------------------
CREATE POLICY "verification_logs_admin_only" ON public.verification_logs
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "withdrawal_methods_owner" ON public.withdrawal_methods
    FOR ALL
    USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "forex_history_admin_only" ON public.forex_history
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "notifications_owner" ON public.notifications
    FOR ALL
    USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "fund_transactions_admin_only" ON public.fund_transactions
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ------------------------------------------------------------
-- 7. Storage: agreements bucket
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "agreements_owner_upload" ON storage.objects;
DROP POLICY IF EXISTS "agreements_owner_read" ON storage.objects;
DROP POLICY IF EXISTS "agreements_admin_all" ON storage.objects;

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

CREATE POLICY "agreements_owner_read" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'agreements'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR position(auth.uid()::text in name) = 1
            OR public.is_admin()
        )
    );

CREATE POLICY "agreements_admin_all" ON storage.objects
    FOR ALL
    USING (bucket_id = 'agreements' AND public.is_admin())
    WITH CHECK (bucket_id = 'agreements' AND public.is_admin());

-- ============================================================
-- SMOKE TEST — run these and check the results
-- ============================================================

-- A. Confirm the helper is non-recursive (should return a bool, not error)
SELECT public.is_admin() AS is_admin_test;

-- B. List the live policies on profiles (should show 5 rows, none with
--    inline EXISTS on profiles — only is_admin() calls or auth.uid())
SELECT polname, pg_get_expr(polqual, polrelid) AS using_clause
FROM pg_policy
WHERE polrelid = 'public.profiles'::regclass
ORDER BY polname;
