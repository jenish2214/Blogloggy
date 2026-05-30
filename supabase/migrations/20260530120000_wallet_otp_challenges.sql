-- OTP challenges for secure wallet withdrawals (paper trading)

CREATE TABLE IF NOT EXISTS public.wallet_otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_otp_portfolio_active
  ON public.wallet_otp_challenges (portfolio_id, created_at DESC)
  WHERE used_at IS NULL;

ALTER TABLE public.wallet_otp_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wallet_otp_self ON public.wallet_otp_challenges;
CREATE POLICY wallet_otp_self ON public.wallet_otp_challenges
  FOR ALL USING (auth.uid() = user_id);
