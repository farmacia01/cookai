-- Security improvements migration
-- Fixes critical vulnerabilities identified in security audit

-- ============================================
-- 1. FIX: RLS da tabela subscriptions
-- A policy "Service role can manage subscriptions" estava com FOR ALL USING(true) sem TO service_role
-- Qualquer usuário autenticado podia ler/escrever assinaturas de outros
-- ============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

-- Recreate properly scoped to service_role only
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure users can only view their own subscriptions (may already exist, use IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname = 'public'
                 AND tablename = 'subscriptions'
                 AND policyname = 'Users can view their own subscription') THEN
    CREATE POLICY "Users can view their own subscription"
    ON public.subscriptions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;


-- ============================================
-- 2. FIX: RPC atômico para incrementar uso de receitas
-- Elimina race condition do read-then-write no frontend
-- ============================================

CREATE OR REPLACE FUNCTION public.increment_recipe_usage(
  p_user_id UUID,
  p_month_year TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  INSERT INTO public.user_usage (user_id, month_year, recipes_generated)
  VALUES (p_user_id, p_month_year, 1)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET recipes_generated = user_usage.recipes_generated + 1
  RETURNING recipes_generated INTO v_new_count;

  RETURN v_new_count;
END;
$$;


-- ============================================
-- 3. FIX: RPC para lookup seguro de telefone → email
-- Evita expor toda a tabela leads ao frontend
-- ============================================

CREATE OR REPLACE FUNCTION public.lookup_email_by_phone(
  p_phone TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_clean_phone TEXT;
BEGIN
  -- Clean the phone number (remove formatting)
  v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');

  -- Try exact match first
  SELECT email INTO v_email
  FROM public.leads
  WHERE telefone = p_phone
  LIMIT 1;

  -- If not found, try matching by cleaned phone number
  IF v_email IS NULL THEN
    SELECT email INTO v_email
    FROM public.leads
    WHERE regexp_replace(telefone, '[^0-9]', '', 'g') = v_clean_phone
    LIMIT 1;
  END IF;

  RETURN v_email;
END;
$$;

-- Grant execute on new functions to authenticated and anon
GRANT EXECUTE ON FUNCTION public.increment_recipe_usage(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_email_by_phone(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_email_by_phone(TEXT) TO anon;


-- ============================================
-- 4. Ensure user_usage table has proper unique constraint for upsert
-- ============================================

-- Create unique index if it doesn't exist (needed for ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes
                 WHERE schemaname = 'public'
                 AND tablename = 'user_usage'
                 AND indexname = 'user_usage_user_id_month_year_unique') THEN
    -- Check if a unique constraint already exists
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conrelid = 'public.user_usage'::regclass
                   AND contype = 'u') THEN
      ALTER TABLE public.user_usage
        ADD CONSTRAINT user_usage_user_id_month_year_unique UNIQUE (user_id, month_year);
    END IF;
  END IF;
END $$;


-- ============================================
-- 5. Add index on leads.telefone for phone lookup performance
-- ============================================

CREATE INDEX IF NOT EXISTS leads_telefone_idx ON public.leads(telefone);
