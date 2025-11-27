-- Subscriptions table for membership plans and recurring billing
-- Run this in your Supabase SQL editor or migrations pipeline.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null,
  status text not null default 'active', -- active | past_due | canceled | trialing
  provider text not null default 'paypal', -- paypal | stripe | manual
  provider_subscription_id text, -- PayPal subscription ID or equivalent
  auto_renew boolean not null default true,
  started_at timestamptz not null default now(),
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  last_payment_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user
  on public.subscriptions (user_id);

create index if not exists idx_subscriptions_status
  on public.subscriptions (status);

comment on table public.subscriptions is 'User membership subscriptions (plans, renewals, billing provider).';

