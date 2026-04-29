-- Unique constraint for upserts
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_subs_abacate_sub
  ON public.pending_subscriptions (abacate_subscription_id)
  WHERE abacate_subscription_id IS NOT NULL;

-- Update handle_new_user to auto-link pending AbacatePay payments
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_record record;
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Look for any paid pending subscription matching this email
  SELECT * INTO pending_record
  FROM public.pending_subscriptions
  WHERE lower(email) = lower(NEW.email)
    AND status = 'paid'
  ORDER BY paid_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.profiles SET
      is_subscriber = true,
      subscription_plan = pending_record.plan,
      payment_provider = 'abacate',
      abacate_subscription_id = pending_record.abacate_subscription_id,
      abacate_customer_id = pending_record.abacate_customer_id,
      canceled_at = NULL
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;