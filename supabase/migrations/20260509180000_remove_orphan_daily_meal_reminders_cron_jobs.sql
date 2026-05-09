-- Remove broken/orphan cron jobs that call a non-existent Edge Function.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT jobid
    FROM cron.job
    WHERE jobname IN ('lembretes-diarios', 'daily-meal-reminders-job')
  LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;
END $$;
