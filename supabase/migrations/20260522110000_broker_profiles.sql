CREATE TABLE IF NOT EXISTS public.broker_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_name text NOT NULL DEFAULT 'QuantDesk Securities',
  rep_name text,
  license_id text,
  desk_code text,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.broker_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY broker_profiles_advisor ON public.broker_profiles
  FOR ALL USING (auth.uid() = advisor_id) WITH CHECK (auth.uid() = advisor_id);
