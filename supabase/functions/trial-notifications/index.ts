import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get all users in trial (trial_start_date set, within 7 days)
    const now = new Date()
    const brazilOffset = -3
    const brazilNow = new Date(now.getTime() + brazilOffset * 60 * 60 * 1000)
    const currentHour = brazilNow.getHours()
    const todayStr = brazilNow.toISOString().split('T')[0]

    const sevenDaysAgo = new Date(brazilNow)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: profiles } = await supabase.from('profiles')
      .select('id, full_name, trial_start_date, is_subscriber, workout_days, created_at')
      .not('trial_start_date', 'is', null)
      .gte('trial_start_date', sevenDaysAgo.toISOString())

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: 'No trial users' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const results: any[] = []

    for (const profile of profiles) {
      const trialStart = new Date(profile.trial_start_date)
      const diffMs = brazilNow.getTime() - trialStart.getTime()
      const trialDay = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1 // 1-indexed

      if (trialDay < 1 || trialDay > 7) continue

      const firstName = (profile.full_name || 'Leoa').split(' ')[0]
      const weekTarget = profile.workout_days || 4

      // Get completed workouts count for this week (Mon-Sun)
      const day = brazilNow.getDay()
      const diffToMonday = day === 0 ? 6 : day - 1
      const weekStart = new Date(brazilNow)
      weekStart.setDate(brazilNow.getDate() - diffToMonday)
      const weekStartStr = weekStart.toISOString().split('T')[0]

      const { count: weekWorkouts } = await supabase.from('workouts')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profile.id)
        .eq('completed', true)
        .gte('date', weekStartStr)

      // Total completed workouts for protocol %
      const { count: totalWorkouts } = await supabase.from('workouts')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profile.id)
        .eq('completed', true)

      const protocolTotal = weekTarget * 4
      const protocolPercent = protocolTotal > 0 ? Math.min(Math.round(((totalWorkouts || 0) / protocolTotal) * 100), 100) : 0
      const remainingPercent = 100 - protocolPercent

      // Check if trained today
      const { count: todayWorkouts } = await supabase.from('workouts')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profile.id)
        .eq('completed', true)
        .eq('date', todayStr)

      const trainedToday = (todayWorkouts || 0) > 0

      // Get D1 workout timestamp for D2 timing
      let d1Hour: number | null = null
      if (trialDay === 2) {
        const d1Date = new Date(trialStart)
        d1Date.setDate(d1Date.getDate())
        const d1Str = d1Date.toISOString().split('T')[0]
        const { data: d1Workouts } = await supabase.from('workouts')
          .select('created_at')
          .eq('profile_id', profile.id)
          .eq('completed', true)
          .eq('date', d1Str)
          .order('created_at', { ascending: true })
          .limit(1)
        if (d1Workouts && d1Workouts.length > 0) {
          const d1Time = new Date(d1Workouts[0].created_at)
          d1Hour = new Date(d1Time.getTime() + brazilOffset * 60 * 60 * 1000).getHours()
        }
      }

      // Define notifications per day
      const notifications: Array<{ key: string; hour: number; condition: boolean; title: string; body: string }> = []

      switch (trialDay) {
        case 1:
          // 30min after install handled separately (needs install timestamp)
          // For now, approximate: if created less than 1h ago and currentHour matches
          const createdAt = new Date(profile.created_at)
          const minutesSinceCreation = (brazilNow.getTime() - createdAt.getTime()) / (1000 * 60)
          if (minutesSinceCreation >= 30 && minutesSinceCreation <= 90 && !trainedToday) {
            notifications.push({
              key: 'd1_30min',
              hour: currentHour,
              condition: true,
              title: 'Fábrica de Leoas 🦁',
              body: 'Seu protocolo personalizado está pronto. Leva 10 minutos. Começa agora?',
            })
          }
          notifications.push({
            key: 'd1_19h',
            hour: 19,
            condition: !trainedToday,
            title: 'Fábrica de Leoas 🦁',
            body: `Hoje é o dia 1, ${firstName}. Sua primeira sessão te espera — são só 10 minutinhos.`,
          })
          break

        case 2:
          if (d1Hour !== null) {
            notifications.push({
              key: 'd2_d1hour',
              hour: d1Hour,
              condition: !trainedToday,
              title: 'Fábrica de Leoas 🦁',
              body: 'Ontem você conseguiu. Hoje também consegue.',
            })
          }
          // "Após treinar" handled by post-workout trigger
          break

        case 3:
          notifications.push({
            key: 'd3_12h',
            hour: 12,
            condition: !trainedToday,
            title: 'Fábrica de Leoas 🦁',
            body: 'A maioria desiste antes do dia 3. Você chegou até aqui — não para agora.',
          })
          // "Após treinar" handled by post-workout trigger
          break

        case 4:
          notifications.push({
            key: 'd4_19h',
            hour: 19,
            condition: !trainedToday,
            title: 'Fábrica de Leoas 🦁',
            body: 'Faltam 3 dias pro seu acesso gratuito encerrar. Cada treino agora conta dobrado.',
          })
          // "Após treinar" handled by post-workout trigger
          break

        case 5:
          notifications.push({
            key: 'd5_10h',
            hour: 10,
            condition: true, // qualquer condição
            title: 'Fábrica de Leoas 🦁',
            body: 'Em 2 dias você desbloqueia o Protocolo Seca Bumbum. Ele foi montado pra quem completou a primeira semana.',
          })
          notifications.push({
            key: 'd5_19h',
            hour: 19,
            condition: !trainedToday,
            title: 'Fábrica de Leoas 🦁',
            body: 'Sua meta semanal ainda está aberta. Fecha ela hoje?',
          })
          break

        case 6:
          notifications.push({
            key: 'd6_10h',
            hour: 10,
            condition: true,
            title: 'Fábrica de Leoas 🦁',
            body: `Amanhã é o último dia do seu acesso gratuito. Você treinou ${weekWorkouts || 0} vezes essa semana — isso já mostra que você é diferente.`,
          })
          notifications.push({
            key: 'd6_19h',
            hour: 19,
            condition: !trainedToday,
            title: 'Fábrica de Leoas 🦁',
            body: 'Último dia completo antes do encerramento do trial. Termina forte.',
          })
          break

        case 7:
          notifications.push({
            key: 'd7_9h',
            hour: 9,
            condition: true,
            title: 'Fábrica de Leoas 🦁',
            body: `Hoje é o dia 7. Você começou algo aqui — seu protocolo tem ainda ${remainingPercent}% pela frente.`,
          })
          notifications.push({
            key: 'd7_14h',
            hour: 14,
            condition: !profile.is_subscriber,
            title: 'Fábrica de Leoas 🦁',
            body: 'Seu acesso gratuito encerra hoje. Continuar custa menos que um café por dia.',
          })
          break
      }

      // Send notifications that match current hour
      for (const notif of notifications) {
        if (currentHour === notif.hour && notif.condition) {
          try {
            const sendRes = await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({
                  profile_id: profile.id,
                  title: notif.title,
                  body: notif.body,
                  message_key: notif.key,
                  trial_day: trialDay,
                }),
              }
            )
            const sendResult = await sendRes.json()
            results.push({ profile_id: profile.id, key: notif.key, result: sendResult })
          } catch (err) {
            results.push({ profile_id: profile.id, key: notif.key, error: err.message })
          }
        }
      }
    }

    return new Response(JSON.stringify({ processed: profiles.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('trial-notifications error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
