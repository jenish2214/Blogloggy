-- QuantDesk paper trading schema (reference migration)
-- Tables: portfolios, positions, orders, watchlist, messages, price_alerts
-- RLS: each table uses auth.uid() = user_id policies

-- Portfolios (one per user)
create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  cash numeric default 100000,
  starting_capital numeric default 100000,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Open positions
create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  name text,
  asset_class text not null default 'stock',
  qty numeric not null default 0,
  avg_price numeric not null default 0,
  current_price numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, symbol)
);

-- Order history
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  asset_class text not null default 'stock',
  side text not null check (side in ('buy', 'sell')),
  qty numeric not null,
  order_type text not null check (order_type in ('market', 'limit')),
  limit_price numeric,
  filled_price numeric not null,
  total_value numeric not null,
  status text not null default 'filled',
  created_at timestamptz default now()
);

-- User watchlist
create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  name text,
  asset_class text default 'stock',
  added_at timestamptz default now(),
  unique (user_id, symbol)
);

-- In-app notifications (trades, alerts, system)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'trade' check (type in ('trade', 'alert', 'system', 'info')),
  title text not null,
  body text,
  metadata jsonb default '{}',
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.portfolios enable row level security;
alter table public.positions enable row level security;
alter table public.orders enable row level security;
alter table public.watchlist enable row level security;
alter table public.messages enable row level security;

create policy portfolios_self on public.portfolios for all using (auth.uid() = user_id);
create policy positions_self on public.positions for all using (auth.uid() = user_id);
create policy orders_self on public.orders for all using (auth.uid() = user_id);
create policy watchlist_self on public.watchlist for all using (auth.uid() = user_id);
create policy messages_self on public.messages for all using (auth.uid() = user_id);
