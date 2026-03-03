-- =============================================================
-- Migration: Improve database for S6X payment gateway
-- Date: 2026-03-03
-- Description: 
--   1. Add payment_transactions table for PIX payment tracking
--   2. Add s6x_transaction_id to subscriptions  
--   3. Clean up legacy Hubla/Cakto references
--   4. Improve indexes and constraints
--   5. Add subscription expiry check function
-- =============================================================

-- -----------------------------------------------
-- 1. Payment Transactions Table (PIX history)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL, -- S6X transaction_id (e.g. "API-1-...")
  plan_id TEXT NOT NULL,        -- "monthly", "quarterly", "annual"
  amount NUMERIC(10,2) NOT NULL,
  fee NUMERIC(10,2) DEFAULT 0,
  net_amount NUMERIC(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, expired, cancelled, failed
  gateway TEXT NOT NULL DEFAULT 's6x',
  pix_copy_paste TEXT,
  pix_end2end_id TEXT,
  metadata JSONB DEFAULT '{}',
  paid_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_transactions_txn_id 
  ON public.payment_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id 
  ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status 
  ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at 
  ON public.payment_transactions(created_at DESC);

-- RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access on transactions"
  ON public.payment_transactions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_payment_transactions_updated_at') THEN
    CREATE TRIGGER update_payment_transactions_updated_at
    BEFORE UPDATE ON public.payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;


-- -----------------------------------------------
-- 2. Add S6X transaction_id to subscriptions
-- -----------------------------------------------
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'subscriptions' 
                 AND column_name = 's6x_transaction_id') THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN s6x_transaction_id TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_s6x_txn_id 
  ON public.subscriptions(s6x_transaction_id) 
  WHERE s6x_transaction_id IS NOT NULL;


-- -----------------------------------------------
-- 3. Add composite index for faster user lookups
-- -----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
  ON public.subscriptions(user_id, status);


-- -----------------------------------------------
-- 4. Function: Check expired subscriptions
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.check_expired_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.subscriptions
  SET status = 'expired',
      credits = 0,
      auto_renew = false,
      updated_at = now()
  WHERE status = 'active'
    AND current_period_end IS NOT NULL
    AND current_period_end < now();
    
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;


-- -----------------------------------------------
-- 5. Function: Get user subscription status (optimized)
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_subscription(p_user_id UUID)
RETURNS TABLE(
  subscription_id UUID,
  plan_name TEXT,
  status TEXT,
  credits INTEGER,
  days_remaining INTEGER,
  current_period_end TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.product_name,
    s.status,
    s.credits,
    CASE 
      WHEN s.current_period_end IS NOT NULL 
      THEN GREATEST(0, EXTRACT(DAY FROM s.current_period_end - now())::INTEGER)
      ELSE NULL
    END,
    s.current_period_end
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;


-- -----------------------------------------------
-- 6. Admins can view all subscriptions (if not exists)
-- -----------------------------------------------
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies 
                 WHERE schemaname = 'public' 
                 AND tablename = 'subscriptions' 
                 AND policyname = 'Admins can view all subscriptions') THEN
    CREATE POLICY "Admins can view all subscriptions"
    ON public.subscriptions FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
