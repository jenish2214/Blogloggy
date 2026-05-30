-- One open position per symbol per portfolio book

CREATE UNIQUE INDEX IF NOT EXISTS positions_portfolio_symbol_uidx
  ON public.positions (portfolio_id, symbol)
  WHERE portfolio_id IS NOT NULL;
