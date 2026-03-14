-- Migration: Fix push_subscriptions meal_settings saving
-- Date: 2026-03-14

-- Update the function to accept and save meal_settings
CREATE OR REPLACE FUNCTION public.manage_push_subscription(
    p_user_id uuid,
    p_endpoint text,
    p_p256dh text,
    p_auth text,
    p_user_agent text DEFAULT NULL,
    p_action text DEFAULT 'register', -- 'register' or 'unregister'
    p_meal_settings jsonb DEFAULT '[]'::jsonb
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
        INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, active, meal_settings)
        VALUES (p_user_id, p_endpoint, p_p256dh, p_auth, p_user_agent, true, p_meal_settings)
        ON CONFLICT (endpoint) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            p256dh = CASE WHEN EXCLUDED.p256dh <> '' THEN EXCLUDED.p256dh ELSE push_subscriptions.p256dh END,
            auth = CASE WHEN EXCLUDED.auth <> '' THEN EXCLUDED.auth ELSE push_subscriptions.auth END,
            user_agent = COALESCE(EXCLUDED.user_agent, push_subscriptions.user_agent),
            meal_settings = EXCLUDED.meal_settings,
            active = true,
            updated_at = now();
            
        RETURN json_build_object('success', true, 'message', 'Subscription registered');
    END IF;
END;
$$;
