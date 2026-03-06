-- Table to store Web Push subscriptions per user
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint text NOT NULL UNIQUE,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage their own push subscriptions"
ON public.push_subscriptions
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can view all subscriptions (needed for broadcast)
DROP POLICY IF EXISTS "Admins can view all push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Admins can view all push subscriptions"
ON public.push_subscriptions
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert subscriptions (from edge functions)
DROP POLICY IF EXISTS "Service role bypass" ON public.push_subscriptions;
CREATE POLICY "Service role bypass"
ON public.push_subscriptions
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Table to log sent broadcast notifications for history
CREATE TABLE IF NOT EXISTS public.broadcast_notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    body text NOT NULL,
    icon text DEFAULT '/icon.png',
    sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    recipients_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.broadcast_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage broadcast notifications" ON public.broadcast_notifications;
CREATE POLICY "Admins can manage broadcast notifications"
ON public.broadcast_notifications
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
