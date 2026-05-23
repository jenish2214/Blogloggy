-- Security: RLS for wealth_clients (was missing)
ALTER TABLE public.wealth_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wealth_clients_advisor ON public.wealth_clients;
CREATE POLICY wealth_clients_advisor ON public.wealth_clients
  FOR ALL
  USING (auth.uid() = advisor_id)
  WITH CHECK (auth.uid() = advisor_id);
