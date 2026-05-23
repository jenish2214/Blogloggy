-- Client / book wallet: deposits & withdrawals (advisor-managed)

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.wealth_clients(id) ON DELETE SET NULL,
  tx_type text NOT NULL CHECK (tx_type IN ('deposit', 'withdrawal')),
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'rejected')),
  note text,
  balance_after numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_portfolio_created
  ON public.wallet_transactions (portfolio_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_created
  ON public.wallet_transactions (user_id, created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wallet_tx_self ON public.wallet_transactions;
CREATE POLICY wallet_tx_self ON public.wallet_transactions
  FOR ALL USING (auth.uid() = user_id);
