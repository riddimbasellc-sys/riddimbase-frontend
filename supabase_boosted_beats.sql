-- Boosted beats table for sponsored placements
-- Run this in your Supabase SQL editor or migration pipeline.

create table if not exists public.boosted_beats (
  id uuid primary key default gen_random_uuid(),
  beat_id uuid not null,
  producer_id uuid not null,
  tier integer not null check (tier between 1 and 3),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  priority_score integer not null,
  paypal_order_id text,
  created_at timestamptz not null default now()
);

-- Optional indexes to speed up queries
create index if not exists idx_boosted_beats_active
  on public.boosted_beats (expires_at desc, priority_score desc);

create index if not exists idx_boosted_beats_beat
  on public.boosted_beats (beat_id);

create index if not exists idx_boosted_beats_producer
  on public.boosted_beats (producer_id);
