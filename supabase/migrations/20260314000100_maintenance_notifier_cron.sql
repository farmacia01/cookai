-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove old job if exists
SELECT cron.unschedule('maintenance-notifier-job');

-- Create Cron Job for 09:00 Brasília (12:00 UTC)
-- Note: Replace placeholders with real values in Supabase Dashboard
SELECT cron.schedule(
  'maintenance-notifier-job',
  '0 12 * * *',  -- Runs every day at 12:00 UTC (09:00 BRT)
  $$
    SELECT net.http_post(
      url:=(SELECT value FROM (SELECT current_setting('app.settings.supabase_url', true) as value) s WHERE value IS NOT NULL) || '/functions/v1/maintenance-notifier',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM (SELECT current_setting('app.settings.service_role_key', true) as value) s WHERE value IS NOT NULL)
      )
    );
  $$
);

-- Note: In Supabase, you usually need to set these custom settings or hardcode the values
-- since pg_cron might not have access to environment variables directly.
-- For the migration to be portable, we use placeholders or expect keys to be set.
