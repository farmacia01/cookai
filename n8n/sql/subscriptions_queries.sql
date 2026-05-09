-- 0) Migração de compatibilidade (rode 1x no Supabase SQL Editor)
alter table public.push_subscriptions
  add column if not exists active boolean default true;

alter table public.push_subscriptions
  add column if not exists updated_at timestamptz default now();

-- 1) Buscar inscritos ativos
select
  id,
  user_id,
  endpoint,
  p256dh,
  auth,
  coalesce(meal_settings, '[]'::jsonb) as meal_settings,
  coalesce(active, true) as active,
  updated_at
from public.push_subscriptions
where coalesce(active, true) = true;

-- 2) Desativar endpoint inválido (404/410)
update public.push_subscriptions
set active = false,
    updated_at = now()
where endpoint = $1;
