-- Add meal settings column to push_subscriptions
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS meal_settings JSONB DEFAULT '[]'::jsonb;
