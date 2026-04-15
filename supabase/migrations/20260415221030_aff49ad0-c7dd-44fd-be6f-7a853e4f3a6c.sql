
-- Push subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own push subscription"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can read own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = profile_id);

CREATE POLICY "Service role can read all push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (true);

-- Notification log table
CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trial_day integer NOT NULL,
  message_key text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  date date DEFAULT CURRENT_DATE
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notification log"
  ON public.notification_log FOR SELECT
  USING (auth.uid() = profile_id);

-- Index for efficient querying
CREATE INDEX idx_notification_log_profile_date ON public.notification_log(profile_id, date);
CREATE INDEX idx_push_subscriptions_profile ON public.push_subscriptions(profile_id);
