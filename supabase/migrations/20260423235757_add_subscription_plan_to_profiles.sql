alter table profiles
  add column if not exists subscription_plan text,
  add column if not exists trial_end_date timestamptz;
