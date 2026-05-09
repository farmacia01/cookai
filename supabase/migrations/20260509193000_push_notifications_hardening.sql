-- Push notifications hardening: schema, RLS and logging

create extension if not exists pgcrypto;

alter table if exists public.push_subscriptions
  add column if not exists session_id text,
  add column if not exists user_agent text,
  add column if not exists is_active boolean default true,
  add column if not exists updated_at timestamptz default now();

update public.push_subscriptions
set is_active = coalesce(is_active, active, true)
where true;

alter table if exists public.push_subscriptions
  alter column user_id drop not null;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete cascade,
  session_id text null,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  user_agent text null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.push_logs (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid null references public.push_subscriptions(id) on delete set null,
  title text,
  body text,
  url text,
  status text,
  error text null,
  created_at timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;
alter table public.push_logs enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
on public.push_subscriptions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
on public.push_subscriptions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
on public.push_subscriptions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_service_role_all" on public.push_subscriptions;
create policy "push_subscriptions_service_role_all"
on public.push_subscriptions
for all
to service_role
using (true)
with check (true);

drop policy if exists "push_logs_service_role_insert" on public.push_logs;
create policy "push_logs_service_role_insert"
on public.push_logs
for insert
to service_role
with check (true);

drop policy if exists "push_logs_service_role_select" on public.push_logs;
create policy "push_logs_service_role_select"
on public.push_logs
for select
to service_role
using (true);
