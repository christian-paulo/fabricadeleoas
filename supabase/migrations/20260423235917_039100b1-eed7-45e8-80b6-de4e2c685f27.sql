-- Delete test accounts and all associated data
-- Keeping: christianpaulodev (admin), roberta, mariavid71, choqueidabet, mariamilenaalmeida26
-- Deleting: mateusvn1188, gilvanpersonal01, christian.paulo54, gilvanfilho19fg, imperiodotrade

DO $$
DECLARE
  test_ids uuid[] := ARRAY[
    'ffee2e33-10be-4707-9492-bf2701a82b80', -- mateusvn1188
    '21af6f91-3bce-43cf-8915-1c0d03da96d2', -- gilvanpersonal01
    'd1997793-8e84-4217-81fe-523d68e45299', -- christian.paulo54
    'b6f7be95-e493-4602-bec9-29434fe2fd31', -- gilvanfilho19fg
    'cd048b26-f84a-4951-a4bd-aa3f4adceb18'  -- imperiodotrade
  ]::uuid[];
BEGIN
  DELETE FROM public.workouts WHERE profile_id = ANY(test_ids);
  DELETE FROM public.measurements WHERE profile_id = ANY(test_ids);
  DELETE FROM public.onboarding_responses WHERE profile_id = ANY(test_ids);
  DELETE FROM public.notification_log WHERE profile_id = ANY(test_ids);
  DELETE FROM public.push_subscriptions WHERE profile_id = ANY(test_ids);
  DELETE FROM public.user_badges WHERE profile_id = ANY(test_ids);
  DELETE FROM public.post_likes WHERE profile_id = ANY(test_ids);
  DELETE FROM public.posts WHERE profile_id = ANY(test_ids);
  DELETE FROM public.quiz_leads WHERE profile_id = ANY(test_ids);
  DELETE FROM public.user_roles WHERE user_id = ANY(test_ids);
  DELETE FROM public.profiles WHERE id = ANY(test_ids);
  DELETE FROM auth.users WHERE id = ANY(test_ids);
END $$;