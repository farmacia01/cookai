-- Habilitar as extensões necessárias (se ainda não estiverem ativas no seu Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remover o job antigo se existir (para não duplicar)
SELECT cron.unschedule('daily-meal-reminders-job');

-- Criar o Job Cron que vai rodar de HORA EM HORA no minuto zero (ex: 08:00, 09:00, etc)
-- ATENÇÃO: Substitua "COLOQUE_SUA_CHAVE_SERVICE_ROLE_AQUI" pela sua chave secreta Service Role Key
SELECT cron.schedule(
  'daily-meal-reminders-job',
  '0 * * * *',  -- Roda a cada hora exata
  $$
    SELECT net.http_post(
      url:='https://enfkbhqiryqwqlcsjwnl.supabase.co/functions/v1/daily-meal-reminders',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer COLOQUE_SUA_CHAVE_SERVICE_ROLE_AQUI'
      )
    );
  $$
);
