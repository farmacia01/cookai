-- Migration: Maintenance Notifications System
-- Date: 2026-03-14

-- 1. Ensure clients table exists with proxima_manutencao
CREATE TABLE IF NOT EXISTS public.clients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    proxima_manutencao date,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS for clients (Blocked direct access pattern as per request)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- No direct RLS policies for authenticated users, use functions instead.
-- (We only allow service_role or specific functions to access it)
DROP POLICY IF EXISTS "Service role full access on clients" ON public.clients;
CREATE POLICY "Service role full access on clients"
ON public.clients
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 2. Update push_subscriptions table
DO $$ 
BEGIN
    -- Add user_agent if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'push_subscriptions' AND column_name = 'user_agent') THEN
        ALTER TABLE public.push_subscriptions ADD COLUMN user_agent text;
    END IF;

    -- Add updated_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'push_subscriptions' AND column_name = 'updated_at') THEN
        ALTER TABLE public.push_subscriptions ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;

    -- Add active if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'push_subscriptions' AND column_name = 'active') THEN
        ALTER TABLE public.push_subscriptions ADD COLUMN active boolean DEFAULT true;
    END IF;
END $$;

-- RLS for push_subscriptions: Block direct access, use functions
-- Remove existing policies if they allow direct access
DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Admins can view all push subscriptions" ON public.push_subscriptions;

-- Policy for functions (security definer) and service role
DROP POLICY IF EXISTS "Service role bypass on push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Service role bypass on push_subscriptions"
ON public.push_subscriptions
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 3. Create maintenance_notification_logs table for deduplication
CREATE TABLE IF NOT EXISTS public.maintenance_notification_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id uuid REFERENCES public.push_subscriptions(id) ON DELETE CASCADE NOT NULL,
    notification_date date NOT NULL,
    window_type text NOT NULL, -- 'before_1d' or 'after_1d'
    payload_hash text,
    sent_at timestamptz DEFAULT now(),
    status text DEFAULT 'success',
    error_message text
);

-- Index for deduplication check
CREATE INDEX IF NOT EXISTS idx_maint_logs_dedupe 
ON public.maintenance_notification_logs (subscription_id, notification_date, window_type);

-- RLS for logs
ALTER TABLE public.maintenance_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on maintenance_logs"
ON public.maintenance_notification_logs
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 4. Function to register/remove subscription (push-subscriptions endpoint equivalent)
CREATE OR REPLACE FUNCTION public.manage_push_subscription(
    p_user_id uuid,
    p_endpoint text,
    p_p256dh text,
    p_auth text,
    p_user_agent text DEFAULT NULL,
    p_action text DEFAULT 'register' -- 'register' or 'unregister'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_action = 'unregister' THEN
        UPDATE public.push_subscriptions
        SET active = false, updated_at = now()
        WHERE user_id = p_user_id AND endpoint = p_endpoint;
        
        RETURN json_build_object('success', true, 'message', 'Subscription deactivated');
    ELSE
        INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, active)
        VALUES (p_user_id, p_endpoint, p_p256dh, p_auth, p_user_agent, true)
        ON CONFLICT (endpoint) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            p256dh = EXCLUDED.p256dh,
            auth = EXCLUDED.auth,
            user_agent = COALESCE(EXCLUDED.user_agent, push_subscriptions.user_agent),
            active = true,
            updated_at = now();
            
        RETURN json_build_object('success', true, 'message', 'Subscription registered');
    END IF;
END;
$$;
