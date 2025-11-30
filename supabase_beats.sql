-- Supabase table for beats uploaded from the frontend
-- Run this in the SQL editor in your Supabase project.

create table if not exists public.beats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  genre text,
  bpm integer,
  price numeric(10,2),
  producer text,
  audio_url text,
  untagged_url text,
  cover_url text,
  bundle_url text,
  bundle_name text,
  license_prices jsonb,
  free_download boolean default false,
  hidden boolean default false,
  flagged boolean default false,
  created_at timestamptz not null default now()
);

create index if not exists beats_user_id_idx on public.beats(user_id);
create index if not exists beats_created_at_idx on public.beats(created_at desc);

alter table public.beats enable row level security;

-- Everyone can read beats (public marketplace)
create policy if not exists "beats_select_all"
  on public.beats for select
  using (true);

-- Only the owner can insert / update / delete their beats
create policy if not exists "beats_insert_own"
  on public.beats for insert
  with check (auth.uid() = user_id);

create policy if not exists "beats_update_own"
  on public.beats for update
  using (auth.uid() = user_id);

create policy if not exists "beats_delete_own"
  on public.beats for delete
  using (auth.uid() = user_id);

