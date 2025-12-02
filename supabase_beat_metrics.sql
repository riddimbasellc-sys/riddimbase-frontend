-- Daily metrics for beats and producers (plays, likes, etc.)
-- Run this in your Supabase SQL editor.

create table if not exists public.beat_metrics_daily (
  id uuid primary key default gen_random_uuid(),
  beat_id uuid not null references public.beats(id) on delete cascade,
  metric text not null, -- e.g. 'plays'
  day date not null,
  value integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists beat_metrics_daily_unique
  on public.beat_metrics_daily(beat_id, metric, day);

alter table public.beat_metrics_daily enable row level security;

-- Public read (for charts, etc.)
create policy if not exists "beat_metrics_daily_select_all"
  on public.beat_metrics_daily for select
  using (true);

-- Allow inserts/updates from anon users; in practice, writes should normally come
-- from the backend using the service role key, but this keeps the table usable
-- from client-side if needed.
create policy if not exists "beat_metrics_daily_insert_all"
  on public.beat_metrics_daily for insert
  with check (true);

create policy if not exists "beat_metrics_daily_update_all"
  on public.beat_metrics_daily for update
  using (true);

