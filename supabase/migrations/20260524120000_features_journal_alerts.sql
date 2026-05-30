-- Trade journal + price alerts (per-user, RLS)

create table if not exists public.trade_journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  name text,
  side text not null check (side in ('buy', 'sell')),
  qty numeric not null,
  filled_price numeric not null,
  pnl numeric,
  notes text,
  tag text,
  mood text,
  order_id uuid,
  created_at timestamptz default now()
);

create index if not exists trade_journal_user_created on public.trade_journal (user_id, created_at desc);

create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  condition text not null check (condition in ('above', 'below', 'crosses_above', 'crosses_below')),
  target_price numeric not null,
  active boolean default true,
  fired_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists price_alerts_user_active on public.price_alerts (user_id, active);

alter table public.trade_journal enable row level security;
alter table public.price_alerts enable row level security;

create policy trade_journal_self on public.trade_journal for all using (auth.uid() = user_id);
create policy price_alerts_self on public.price_alerts for all using (auth.uid() = user_id);
