CREATE TABLE IF NOT EXISTS public.pending_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  plan text NOT NULL,
  abacate_subscription_id text,
  abacate_customer_id text,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_subs_email ON public.pending_subscriptions (lower(email));
CREATE INDEX IF NOT EXISTS idx_pending_subs_abacate_sub ON public.pending_subscriptions (abacate_subscription_id);

ALTER TABLE public.pending_subscriptions ENABLE ROW LEVEL SECURITY;

-- No client policies: only service role (edge functions) can read/write.

CREATE TRIGGER trg_pending_subs_updated_at
BEFORE UPDATE ON public.pending_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();