-- Social feature tables for likes, favorites, follows, messages
-- Run these in Supabase SQL editor

-- Likes (one per user per beat)
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  beat_id text not null,
  created_at timestamptz default now(),
  unique(user_id, beat_id)
);

-- Favorites (collection style)
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  beat_id text not null,
  created_at timestamptz default now(),
  unique(user_id, beat_id)
);

-- Follows (user follows producer)
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references auth.users(id) on delete cascade,
  producer_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(follower_id, producer_id)
);

-- Direct messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete cascade,
  recipient_id uuid references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- Reposts (user shares a beat into their followers' feeds)
create table if not exists public.reposts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  beat_id text not null,
  created_at timestamptz default now(),
  unique(user_id, beat_id)
);

-- Indexes
create index if not exists idx_likes_beat on public.likes(beat_id);
create index if not exists idx_favorites_beat on public.favorites(beat_id);
create index if not exists idx_follows_producer on public.follows(producer_id);
create index if not exists idx_messages_pair on public.messages(sender_id, recipient_id);
create index if not exists idx_reposts_beat on public.reposts(beat_id);
create index if not exists idx_reposts_user on public.reposts(user_id);

-- Row Level Security
alter table public.likes enable row level security;
alter table public.favorites enable row level security;
alter table public.follows enable row level security;
alter table public.messages enable row level security;
alter table public.reposts enable row level security;

-- Policies: basic read for all, write for authenticated users
create policy if not exists "likes_select" on public.likes for select using (true);
create policy if not exists "likes_insert" on public.likes for insert with check (auth.uid() = user_id);
create policy if not exists "likes_delete" on public.likes for delete using (auth.uid() = user_id);

create policy if not exists "favorites_select" on public.favorites for select using (true);
create policy if not exists "favorites_insert" on public.favorites for insert with check (auth.uid() = user_id);
create policy if not exists "favorites_delete" on public.favorites for delete using (auth.uid() = user_id);

create policy if not exists "follows_select" on public.follows for select using (true);
create policy if not exists "follows_insert" on public.follows for insert with check (auth.uid() = follower_id);
create policy if not exists "follows_delete" on public.follows for delete using (auth.uid() = follower_id);

create policy if not exists "messages_select" on public.messages for select using (
  auth.uid() = sender_id or auth.uid() = recipient_id
);
create policy if not exists "messages_insert" on public.messages for insert with check (
  auth.uid() = sender_id
);

create policy if not exists "reposts_select" on public.reposts for select using (true);
create policy if not exists "reposts_insert" on public.reposts for insert with check (auth.uid() = user_id);
create policy if not exists "reposts_delete" on public.reposts for delete using (auth.uid() = user_id);
