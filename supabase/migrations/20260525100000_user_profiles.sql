-- User onboarding profile (details + per-page feature access)

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  years_experience numeric check (years_experience >= 0 and years_experience <= 80),
  experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced', 'professional')),
  primary_interest text,
  feature_access jsonb not null default '{}'::jsonb,
  terms_accepted_at timestamptz,
  profile_completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_profiles enable row level security;

create policy user_profiles_self_select on public.user_profiles
  for select using (auth.uid() = id);

create policy user_profiles_self_insert on public.user_profiles
  for insert with check (auth.uid() = id);

create policy user_profiles_self_update on public.user_profiles
  for update using (auth.uid() = id);
