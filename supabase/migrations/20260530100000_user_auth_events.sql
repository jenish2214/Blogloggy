-- Track login/logout events for admin analytics

create table if not exists public.user_auth_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('login', 'logout')),
  source text not null default 'platform' check (source in ('platform', 'admin', 'oauth')),
  created_at timestamptz not null default now()
);

create index if not exists user_auth_events_user_id_idx
  on public.user_auth_events (user_id, created_at desc);

create index if not exists user_auth_events_created_at_idx
  on public.user_auth_events (created_at desc);

alter table public.user_auth_events enable row level security;

-- Users may record their own auth events only
create policy user_auth_events_self_insert on public.user_auth_events
  for insert to authenticated
  with check (auth.uid() = user_id);

grant insert on public.user_auth_events to authenticated;

-- Aggregated counts (service role / admin APIs read via bypass RLS)
create or replace view public.user_auth_event_counts as
select
  user_id,
  count(*) filter (where event_type = 'login')::int as login_count,
  count(*) filter (where event_type = 'logout')::int as logout_count,
  max(created_at) filter (where event_type = 'login') as last_login_at,
  max(created_at) filter (where event_type = 'logout') as last_logout_at
from public.user_auth_events
group by user_id;

-- Admin APIs read this view via service role only (no grant to authenticated).
