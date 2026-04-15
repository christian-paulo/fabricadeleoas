import { supabase } from '@/integrations/supabase/client';

export interface BadgeDefinition {
  key: string;
  emoji: string;
  name: string;
  message: string;
  triggerDescription: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    key: 'primeira_leoa',
    emoji: '🦁',
    name: 'Primeira Leoa',
    message: 'Você deu o primeiro passo. A maioria nunca dá.',
    triggerDescription: 'Conclua seu 1º treino',
  },
  {
    key: 'fogo_aceso',
    emoji: '🔥',
    name: 'Fogo Aceso',
    message: '3 treinos concluídos. Seu corpo já está respondendo.',
    triggerDescription: 'Conclua 3 treinos',
  },
  {
    key: 'sem_desculpa',
    emoji: '💪',
    name: 'Sem Desculpa',
    message: '5 treinos. Você provou pra você mesma que consegue.',
    triggerDescription: 'Conclua 5 treinos',
  },
  {
    key: 'leoa_da_semana',
    emoji: '⚡',
    name: 'Leoa da Semana',
    message: 'Meta da semana batida! Isso é consistência de verdade.',
    triggerDescription: 'Cumpra sua meta semanal de treinos',
  },
  {
    key: 'alcateia',
    emoji: '👑',
    name: 'Alcateia',
    message: '7 dias. Você não é mais iniciante — você é uma Leoa.',
    triggerDescription: '7 dias desde o início do trial',
  },
];

export interface EarnedBadge {
  badge_key: string;
  earned_at: string;
}

/**
 * Check and award badges after a workout completion.
 * Returns newly earned badge keys.
 */
export async function checkAndAwardBadges(
  profileId: string,
  totalCompletedWorkouts: number,
  weeklyCompletedWorkouts: number,
  weekTarget: number,
  trialStartDate: string | null,
): Promise<string[]> {
  // Get already earned badges
  const { data: existingBadges } = await supabase
    .from('user_badges')
    .select('badge_key')
    .eq('profile_id', profileId);

  const earned = new Set((existingBadges || []).map(b => b.badge_key));
  const newBadges: string[] = [];

  // 1. Primeira Leoa — 1st workout
  if (!earned.has('primeira_leoa') && totalCompletedWorkouts >= 1) {
    newBadges.push('primeira_leoa');
  }

  // 2. Fogo Aceso — 3 workouts
  if (!earned.has('fogo_aceso') && totalCompletedWorkouts >= 3) {
    newBadges.push('fogo_aceso');
  }

  // 3. Sem Desculpa — 5 workouts
  if (!earned.has('sem_desculpa') && totalCompletedWorkouts >= 5) {
    newBadges.push('sem_desculpa');
  }

  // 4. Leoa da Semana — weekly goal met
  if (!earned.has('leoa_da_semana') && weeklyCompletedWorkouts >= weekTarget) {
    newBadges.push('leoa_da_semana');
  }

  // 5. Alcateia — 7 days since trial start
  if (!earned.has('alcateia') && trialStartDate) {
    const trialStart = new Date(trialStartDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 7) {
      newBadges.push('alcateia');
    }
  }

  // Insert new badges
  if (newBadges.length > 0) {
    const inserts = newBadges.map(key => ({
      profile_id: profileId,
      badge_key: key,
    }));
    await supabase.from('user_badges').insert(inserts);
  }

  return newBadges;
}
