-- Premium alert fields (optional metadata + snooze/expiry)

alter table public.price_alerts
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists expires_at timestamptz,
  add column if not exists snoozed_until timestamptz,
  add column if not exists start_price numeric;
