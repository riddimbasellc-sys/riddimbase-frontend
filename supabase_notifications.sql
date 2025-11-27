-- Notifications table schema (create in Supabase SQL editor)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null check (char_length(type) < 50),
  data jsonb default '{}'::jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at);

-- Row Level Security
alter table public.notifications enable row level security;

-- Policies
create policy "Notifications owners can read" on public.notifications
for select using ( auth.uid() = user_id );

create policy "Owners can update read flag" on public.notifications
for update using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );

create policy "Anyone can insert for recipient" on public.notifications
for insert with check ( auth.uid() = actor_id OR auth.uid() = user_id );

-- Optional: allow service role broader access for backend jobs.
-- Grant minimal privileges to authenticated users
grant select, insert, update on public.notifications to authenticated;

-- To mark notifications read in bulk
-- update public.notifications set read = true where user_id = auth.uid() and read = false;
