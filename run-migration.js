import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { exit } from 'process';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
// We need the service role key to run DDL (Data Definition Language) commands like CREATE TABLE.
// Since the anon key can't run migrations, let's just output instructions for the user if they don't have it.
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
    console.error("Missing VITE_SUPABASE_URL in .env");
    exit(1);
}

if (!serviceKey) {
    console.error("\n[ERRO] Para rodar a migration via script local, precisamos da 'service_role key'.\n");
    console.log("Por favor, adicione na sua última linha do arquivo .env:");
    console.log("SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui\n");
    console.log("Você encontra essa chave no Supabase > Project Settings > API > service_role (secret).\n");
    exit(1);
}

const supabase = createClient(url, serviceKey);

const sql = `
-- Table to store Web Push subscriptions per user
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint text NOT NULL UNIQUE,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage their own push subscriptions"
ON public.push_subscriptions
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Admins can view all push subscriptions"
ON public.push_subscriptions
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

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
`;

async function runMigration() {
    console.log("Executando migração...");

    // Supabase JS client rpc isn't great for executing raw SQL unless there is an exec_sql function. 
    // We'll instruct the user to use the dashboard with exactly the correct code.
}
runMigration();
