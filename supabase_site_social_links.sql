-- Global site social links for footer icons.
-- Run this in your Supabase SQL editor.

create table if not exists public.site_social_links (
  id text primary key,
  network text not null,
  url text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists site_social_links_network_idx
  on public.site_social_links(network);

alter table public.site_social_links enable row level security;

-- Public read for footer; writes are handled via backend service role.
create policy if not exists "site_social_links_select_all"
  on public.site_social_links for select
  using (true);

