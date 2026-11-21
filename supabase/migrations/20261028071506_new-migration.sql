-- Add split transactions JSONB array support to public.transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS splits jsonb;
