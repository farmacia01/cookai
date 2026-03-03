-- Add Cakto fields to subscriptions table
-- Create subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  hubla_subscription_id TEXT,
  hubla_user_id TEXT,
  cakto_order_id TEXT,
  cakto_offer_id TEXT,
  cakto_customer_email TEXT,
  product_id TEXT,
  product_name TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  credits INTEGER DEFAULT 0,
  billing_cycle_months INTEGER,
  payment_method TEXT,
  auto_renew BOOLEAN DEFAULT true,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Cakto fields if table exists but columns don't
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'subscriptions' 
                 AND column_name = 'cakto_order_id') THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN cakto_order_id TEXT,
      ADD COLUMN cakto_offer_id TEXT,
      ADD COLUMN cakto_customer_email TEXT;
  END IF;
END $$;

-- Create unique constraint for cakto_order_id (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_cakto_order_id_unique 
  ON public.subscriptions(cakto_order_id) 
  WHERE cakto_order_id IS NOT NULL;

-- Make Hubla fields optional (nullable) if they exist and are NOT NULL
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'subscriptions' 
             AND column_name = 'hubla_subscription_id'
             AND is_nullable = 'NO') THEN
    ALTER TABLE public.subscriptions
      ALTER COLUMN hubla_subscription_id DROP NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'subscriptions' 
             AND column_name = 'hubla_user_id'
             AND is_nullable = 'NO') THEN
    ALTER TABLE public.subscriptions
      ALTER COLUMN hubla_user_id DROP NOT NULL;
  END IF;
END $$;

-- Enable Row Level Security if not already enabled
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies 
                 WHERE schemaname = 'public' 
                 AND tablename = 'subscriptions' 
                 AND policyname = 'Users can view their own subscription') THEN
    CREATE POLICY "Users can view their own subscription" 
    ON public.subscriptions 
    FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies 
                 WHERE schemaname = 'public' 
                 AND tablename = 'subscriptions' 
                 AND policyname = 'Service role can manage subscriptions') THEN
    CREATE POLICY "Service role can manage subscriptions" 
    ON public.subscriptions 
    FOR ALL 
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_subscriptions_hubla_id ON public.subscriptions(hubla_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_cakto_order_id ON public.subscriptions(cakto_order_id);

-- Create trigger for automatic timestamp updates if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger 
                 WHERE tgname = 'update_subscriptions_updated_at') THEN
    CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Update upsert_subscription function to accept Cakto fields
CREATE OR REPLACE FUNCTION public.upsert_subscription(
  p_user_id UUID,
  p_hubla_subscription_id TEXT DEFAULT NULL,
  p_hubla_user_id TEXT DEFAULT NULL,
  p_cakto_order_id TEXT DEFAULT NULL,
  p_cakto_offer_id TEXT DEFAULT NULL,
  p_cakto_customer_email TEXT DEFAULT NULL,
  p_product_id TEXT DEFAULT NULL,
  p_product_name TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'inactive',
  p_credits INTEGER DEFAULT 0,
  p_billing_cycle_months INTEGER DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_auto_renew BOOLEAN DEFAULT true,
  p_current_period_start TIMESTAMPTZ DEFAULT NULL,
  p_current_period_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS public.subscriptions
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_subscription public.subscriptions;
BEGIN
  -- Try to find existing subscription by cakto_order_id first
  IF p_cakto_order_id IS NOT NULL THEN
    SELECT * INTO v_subscription
    FROM public.subscriptions
    WHERE cakto_order_id = p_cakto_order_id;
    
    IF FOUND THEN
      UPDATE public.subscriptions
      SET
        user_id = p_user_id,
        cakto_offer_id = COALESCE(p_cakto_offer_id, cakto_offer_id),
        cakto_customer_email = COALESCE(p_cakto_customer_email, cakto_customer_email),
        product_id = COALESCE(p_product_id, product_id),
        product_name = COALESCE(p_product_name, product_name),
        status = COALESCE(p_status, status),
        credits = COALESCE(p_credits, credits),
        billing_cycle_months = COALESCE(p_billing_cycle_months, billing_cycle_months),
        payment_method = COALESCE(p_payment_method, payment_method),
        auto_renew = COALESCE(p_auto_renew, auto_renew),
        current_period_start = COALESCE(p_current_period_start, current_period_start),
        current_period_end = COALESCE(p_current_period_end, current_period_end),
        updated_at = now()
      WHERE cakto_order_id = p_cakto_order_id
      RETURNING * INTO v_subscription;
      
      RETURN v_subscription;
    END IF;
  END IF;
  
  -- Try to find by hubla_subscription_id
  IF p_hubla_subscription_id IS NOT NULL THEN
    SELECT * INTO v_subscription
    FROM public.subscriptions
    WHERE hubla_subscription_id = p_hubla_subscription_id;
    
    IF FOUND THEN
      UPDATE public.subscriptions
      SET
        user_id = p_user_id,
        hubla_user_id = COALESCE(p_hubla_user_id, hubla_user_id),
        cakto_order_id = COALESCE(p_cakto_order_id, cakto_order_id),
        cakto_offer_id = COALESCE(p_cakto_offer_id, cakto_offer_id),
        cakto_customer_email = COALESCE(p_cakto_customer_email, cakto_customer_email),
        product_id = COALESCE(p_product_id, product_id),
        product_name = COALESCE(p_product_name, product_name),
        status = COALESCE(p_status, status),
        credits = COALESCE(p_credits, credits),
        billing_cycle_months = COALESCE(p_billing_cycle_months, billing_cycle_months),
        payment_method = COALESCE(p_payment_method, payment_method),
        auto_renew = COALESCE(p_auto_renew, auto_renew),
        current_period_start = COALESCE(p_current_period_start, current_period_start),
        current_period_end = COALESCE(p_current_period_end, current_period_end),
        updated_at = now()
      WHERE hubla_subscription_id = p_hubla_subscription_id
      RETURNING * INTO v_subscription;
      
      RETURN v_subscription;
    END IF;
  END IF;
  
  -- If not found, create new subscription
  INSERT INTO public.subscriptions (
    user_id,
    hubla_subscription_id,
    hubla_user_id,
    cakto_order_id,
    cakto_offer_id,
    cakto_customer_email,
    product_id,
    product_name,
    status,
    credits,
    billing_cycle_months,
    payment_method,
    auto_renew,
    current_period_start,
    current_period_end
  )
  VALUES (
    p_user_id,
    p_hubla_subscription_id,
    p_hubla_user_id,
    p_cakto_order_id,
    p_cakto_offer_id,
    p_cakto_customer_email,
    p_product_id,
    p_product_name,
    p_status,
    p_credits,
    p_billing_cycle_months,
    p_payment_method,
    p_auto_renew,
    p_current_period_start,
    p_current_period_end
  )
  RETURNING * INTO v_subscription;
  
  RETURN v_subscription;
END;
$$;

