import { supabase } from '@/integrations/supabase/client';

/**
 * Sends a post-workout push notification based on trial day.
 * Called after workout completion.
 */
export async function sendPostWorkoutPush(profileId: string) {
  try {
    const { data: profile } = await supabase.from('profiles')
      .select('full_name, trial_start_date, workout_days')
      .eq('id', profileId)
      .single();

    if (!profile?.trial_start_date) return;

    const now = new Date();
    const brazilOffset = -3;
    const brazilNow = new Date(now.getTime() + brazilOffset * 60 * 60 * 1000);
    const trialStart = new Date(profile.trial_start_date);
    const diffMs = brazilNow.getTime() - trialStart.getTime();
    const trialDay = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

    if (trialDay < 1 || trialDay > 7) return;

    const weekTarget = profile.workout_days || 4;

    // Total completed workouts for protocol %
    const { count: totalWorkouts } = await supabase.from('workouts')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('completed', true);

    const protocolPercent = Math.min(Math.round(((totalWorkouts || 0) / (weekTarget * 4)) * 100), 100);

    let body = '';
    let messageKey = '';

    switch (trialDay) {
      case 2:
        body = 'Dia 2 concluído! Seu corpo já está respondendo, mesmo que você ainda não sinta.';
        messageKey = 'd2_after_workout';
        break;
      case 3:
        body = 'Dia 3 completo. Você já está no grupo das que não desistem.';
        messageKey = 'd3_after_workout';
        break;
      case 4:
        body = `Mais um dia construído. ${protocolPercent}% do protocolo concluído 🔥`;
        messageKey = 'd4_after_workout';
        break;
      case 7:
        // After subscribing - handled separately
        break;
      default:
        return;
    }

    if (!body) return;

    await supabase.functions.invoke('send-push', {
      body: {
        profile_id: profileId,
        title: 'Fábrica de Leoas 🦁',
        body,
        message_key: messageKey,
        trial_day: trialDay,
      },
    });
  } catch (err) {
    console.error('Post-workout push error:', err);
  }
}

/**
 * Sends post-subscription push notification on day 7.
 */
export async function sendPostSubscriptionPush(profileId: string) {
  try {
    await supabase.functions.invoke('send-push', {
      body: {
        profile_id: profileId,
        title: 'Fábrica de Leoas 🦁',
        body: 'Bem-vinda à Alcateia! Seu protocolo continua. Nada muda — só que agora é pra sempre.',
        message_key: 'd7_after_subscribe',
        trial_day: 7,
      },
    });
  } catch (err) {
    console.error('Post-subscription push error:', err);
  }
}
