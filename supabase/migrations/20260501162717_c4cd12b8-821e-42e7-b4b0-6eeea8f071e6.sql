ALTER TABLE public.quiz_leads
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS last_step text,
  ADD COLUMN IF NOT EXISTS responses jsonb DEFAULT '{}'::jsonb;