-- Daily metrics aggregated per producer (plays, followers, etc.)
-- Run this in your Supabase SQL editor.

create table if not exists public.producer_metrics_daily (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid references auth.users(id) on delete cascade,
  metric text not null, -- e.g. 'plays', 'followers'
  day date not null,
  value integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists producer_metrics_daily_metric_day_idx
  on public.producer_metrics_daily(metric, day);

create unique index if not exists producer_metrics_daily_unique
  on public.producer_metrics_daily(producer_id, metric, day);

alter table public.producer_metrics_daily enable row level security;

-- Public read for global charts (AdminAnalytics aggregates per day).
create policy if not exists "producer_metrics_daily_select_all"
  on public.producer_metrics_daily for select
  using (true);

-- Allow inserts/updates from any session; in production you can tighten this
-- and rely on the backend (service role) to write metrics.
create policy if not exists "producer_metrics_daily_insert_all"
  on public.producer_metrics_daily for insert
  with check (true);

create policy if not exists "producer_metrics_daily_update_all"
  on public.producer_metrics_daily for update
  using (true);

