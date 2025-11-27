-- Supabase table creation for payouts persistence
-- Run this in the SQL editor in Supabase.
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled')),
  fee numeric(12,2) NOT NULL DEFAULT 0,
  method_type text NOT NULL CHECK (method_type IN ('paypal','bank','legacy')),
  method_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL
);

CREATE INDEX payouts_user_id_idx ON public.payouts(user_id);
CREATE INDEX payouts_status_idx ON public.payouts(status);

-- RLS policies (enable RLS first)
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own payout records
CREATE POLICY "payouts_select_own" ON public.payouts
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert payout requests for themselves
CREATE POLICY "payouts_insert_own" ON public.payouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow service role / admins to update status
-- (Replace 'service_role' with an appropriate role or manage via Supabase dashboard)
CREATE POLICY "payouts_update_admin" ON public.payouts
  FOR UPDATE USING (auth.role() = 'service_role');

-- Optionally prevent deletes except by service role
CREATE POLICY "payouts_delete_admin" ON public.payouts
  FOR DELETE USING (auth.role() = 'service_role');
