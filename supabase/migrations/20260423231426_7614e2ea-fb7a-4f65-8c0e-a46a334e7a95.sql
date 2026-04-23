CREATE TABLE public.quiz_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  first_click_at timestamptz NOT NULL DEFAULT now(),
  email text,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quiz_leads_email ON public.quiz_leads(email);
CREATE INDEX idx_quiz_leads_profile_id ON public.quiz_leads(profile_id);
CREATE INDEX idx_quiz_leads_first_click_at ON public.quiz_leads(first_click_at DESC);

ALTER TABLE public.quiz_leads ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can insert their first click
CREATE POLICY "Anyone can insert quiz lead"
ON public.quiz_leads FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Anyone can update by session_id (to fill in email / profile_id later)
CREATE POLICY "Anyone can update quiz lead"
ON public.quiz_leads FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Admins can read all
CREATE POLICY "Admins can read all quiz leads"
ON public.quiz_leads FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_quiz_leads_updated_at
BEFORE UPDATE ON public.quiz_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();