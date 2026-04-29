ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS abacate_customer_id text,
ADD COLUMN IF NOT EXISTS abacate_subscription_id text,
ADD COLUMN IF NOT EXISTS payment_provider text;

CREATE INDEX IF NOT EXISTS idx_profiles_abacate_subscription_id
  ON public.profiles (abacate_subscription_id);

CREATE INDEX IF NOT EXISTS idx_profiles_abacate_customer_id
  ON public.profiles (abacate_customer_id);