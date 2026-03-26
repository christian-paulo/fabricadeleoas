
CREATE TABLE public.onboarding_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  motivacao text,
  corpo_atual text,
  corpo_desejado text,
  altura numeric,
  peso_atual numeric,
  meta_peso numeric,
  biotipo text,
  idade integer,
  local_treino text,
  dificuldade text,
  rotina text,
  flexibilidade text,
  psicologico text[],
  celebracao text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own responses" ON public.onboarding_responses
  FOR INSERT TO public WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can read own responses" ON public.onboarding_responses
  FOR SELECT TO public USING (auth.uid() = profile_id);

CREATE POLICY "Users can update own responses" ON public.onboarding_responses
  FOR UPDATE TO public USING (auth.uid() = profile_id);

CREATE POLICY "Admins can read all responses" ON public.onboarding_responses
  FOR SELECT TO public USING (has_role(auth.uid(), 'admin'));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipment text;
