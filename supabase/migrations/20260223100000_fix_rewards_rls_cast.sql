-- ============================================
-- Fix: RLS policies on referral_rewards were passing 'admin' as TEXT
-- but has_role() expects an app_role ENUM. Cast to fix the error:
-- "operator does not exist: app_role = text"
-- ============================================

-- Drop the broken policies
DROP POLICY IF EXISTS "Admins can manage rewards" ON public.referral_rewards;
DROP POLICY IF EXISTS "Users can view active rewards" ON public.referral_rewards;

-- Re-create with explicit cast to app_role enum
CREATE POLICY "Users can view active rewards"
  ON public.referral_rewards FOR SELECT TO authenticated
  USING (active = true);

CREATE POLICY "Admins can manage rewards"
  ON public.referral_rewards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Also fix referral_redemptions policies for the same issue
DROP POLICY IF EXISTS "Admins can manage redemptions" ON public.referral_redemptions;
CREATE POLICY "Admins can manage redemptions"
  ON public.referral_redemptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
