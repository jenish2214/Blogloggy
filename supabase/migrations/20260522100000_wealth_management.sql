-- Wealth management: advisor clients + multi-book portfolios
-- See frontend/lib/wealth/booksServer.ts for server helpers

CREATE TABLE IF NOT EXISTS public.wealth_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_code text NOT NULL,
  display_name text NOT NULL,
  email text,
  tier text NOT NULL DEFAULT 'private',
  risk_profile text NOT NULL DEFAULT 'moderate',
  status text NOT NULL DEFAULT 'active',
  initial_capital numeric NOT NULL DEFAULT 500000,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (advisor_id, client_code)
);

ALTER TABLE public.portfolios
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.wealth_clients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS account_label text NOT NULL DEFAULT 'Personal Account',
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'personal';

ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.wealth_clients(id) ON DELETE SET NULL;
