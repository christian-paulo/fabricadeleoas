ALTER TABLE public.quiz_leads ADD COLUMN IF NOT EXISTS variant TEXT;
CREATE INDEX IF NOT EXISTS idx_quiz_leads_variant ON public.quiz_leads(variant);