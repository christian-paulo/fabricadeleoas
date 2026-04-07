import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("*").eq("id", user.id).single();
    if (profileError || !profile) throw new Error("Profile not found");

    // Get onboarding responses for challenge preference
    const { data: onboarding } = await supabase
      .from("onboarding_responses")
      .select("*")
      .eq("profile_id", user.id)
      .single();

    // Get ALL workouts for this user, ordered by creation
    const { data: allWorkouts } = await supabase
      .from("workouts")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: true });

    const workouts = allWorkouts || [];
    const completedCount = workouts.filter(w => w.completed).length;
    const lastWorkout = workouts[workouts.length - 1];

    if (lastWorkout && !lastWorkout.completed) {
      return new Response(JSON.stringify({ 
        workout: lastWorkout,
        phase: completedCount < 3 ? "initial" : "monthly",
        workoutNumber: workouts.length,
        completedCount,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nextWorkoutNumber = workouts.length + 1;
    const isMonthlyPhase = completedCount >= 3;

    // Get ONLY exercises that have a video_url
    const { data: exercises } = await supabase
      .from("exercises")
      .select("*")
      .not("video_url", "is", null)
      .neq("video_url", "");
    if (!exercises || exercises.length === 0) {
      throw new Error("No exercises with video available in the database");
    }

    // Gather feedback history
    const feedbackHistory = workouts
      .filter(w => w.completed && w.feedback_effort)
      .map((w, i) => `Treino ${i + 1}: feedback "${w.feedback_effort}"`)
      .join("\n");

    // Determine safety overrides
    const isMedicationRisk = profile.uses_medication &&
      profile.medication_feeling &&
      /enjoa|fraca|mal|tontura|náusea/i.test(profile.medication_feeling);

    const effectiveLevel = isMedicationRisk ? "iniciante" : (
      profile.training_experience === "Nunca treinei" ? "iniciante" :
      profile.training_experience === "Até 6 meses" ? "iniciante" :
      profile.training_experience === "1 a 2 anos" ? "intermediario" : "avancado"
    );

    const effectiveDuration = isMedicationRisk ? 10 : (profile.workout_duration || 30);

    // Determine series and reps based on level
    // Check if user wants maximum challenge (from onboarding)
    const wantsMaxChallenge = onboarding?.dificuldade === "Desafio máximo" || onboarding?.dificuldade === "maximo";

    let seriesConfig = "";
    let restTime = "";
    if (effectiveLevel === "iniciante") {
      seriesConfig = "2 séries, 15 a 20 repetições por exercício";
      restTime = "45 segundos";
    } else if (effectiveLevel === "intermediario") {
      const series = wantsMaxChallenge ? 4 : 3;
      seriesConfig = `${series} séries, 15 a 30 repetições por exercício`;
      restTime = "45 segundos";
    } else {
      seriesConfig = "até 6 séries, 15 a 30 repetições por exercício";
      restTime = "30 segundos";
    }

    // Build different prompts based on phase
    let phaseInstructions = "";
    if (isMonthlyPhase) {
      const allWorkoutData = workouts.map((w, i) => ({
        number: i + 1,
        feedback: w.feedback_effort,
        workout: w.workout_json,
      }));
      phaseInstructions = `
FASE MENSAL: A aluna já completou ${completedCount} treinos iniciais. 
Analise TODO o histórico de feedbacks abaixo e gere um treino otimizado baseado na progressão dela:
${feedbackHistory}

Histórico completo dos treinos anteriores:
${JSON.stringify(allWorkoutData, null, 2)}

Considere a progressão geral: se ela achou fácil na maioria, aumente; se achou difícil, ajuste para baixo; se ideal, mantenha mas varie os exercícios.
Este é o treino número ${nextWorkoutNumber} do programa mensal.`;
    } else {
      const lastFeedback = workouts.length > 0 
        ? workouts[workouts.length - 1]?.feedback_effort 
        : null;

      if (nextWorkoutNumber === 1) {
        phaseInstructions = `
FASE INICIAL - TREINO 1 (Avaliação):
Este é o PRIMEIRO treino da aluna. Gere um treino equilibrado de avaliação para entender o nível dela.
Use exercícios variados que cubram diferentes grupos musculares para mapear a capacidade dela.`;
      } else if (nextWorkoutNumber === 2) {
        phaseInstructions = `
FASE INICIAL - TREINO 2 (Ajuste):
Este é o SEGUNDO treino. O feedback do treino 1 foi: "${lastFeedback}".
${feedbackHistory}
${lastFeedback === "facil" ? "A aluna achou fácil. Aumente levemente a intensidade e complexidade dos exercícios." :
  lastFeedback === "dificil" ? "A aluna achou difícil. Reduza a intensidade, use exercícios mais acessíveis." :
  "A aluna achou ideal. Mantenha o nível mas varie os exercícios para testar outros grupos."}`;
      } else {
        phaseInstructions = `
FASE INICIAL - TREINO 3 (Calibração Final):
Este é o TERCEIRO e último treino de avaliação. Após este, o programa mensal será gerado.
Feedbacks anteriores:
${feedbackHistory}
${lastFeedback === "facil" ? "Aumente a intensidade novamente." :
  lastFeedback === "dificil" ? "Reduza um pouco mais." :
  "Mantenha e refine a seleção de exercícios."}
Use este treino para confirmar o nível ideal da aluna.`;
      }
    }

    const systemPrompt = `Você é o "Guia das Leoas", a inteligência de treino da Fábrica de Leoas, uma consultoria fitness feminina premium do Personal Gilvan.

REGRA MAIS IMPORTANTE:
- Você SÓ pode usar exercícios que estão na lista fornecida. NÃO invente nomes de exercícios.
- Use EXATAMENTE o "name" e "id" de cada exercício da lista. Não modifique o nome.
- Se não encontrar exercícios suficientes na lista, use menos exercícios, mas NUNCA invente.

REGRAS DE MONTAGEM:
1. Gere exercícios INDIVIDUAIS (NÃO use tri-sets). Cada exercício é independente.
2. Configuração de séries e repetições: ${seriesConfig}.
3. Descanso entre séries: ${restTime}.
4. Para duração ${effectiveDuration}min: selecione de 4 a 8 exercícios.
5. Nível efetivo da aluna: ${effectiveLevel}.
${isMedicationRisk ? "6. SEGURANÇA MÁXIMA: A aluna usa medicação e se sente mal. EXCLUA exercícios de salto e impacto. Use APENAS exercícios de nível iniciante." : ""}
${profile.has_pain ? `7. FILTRO TERAPÊUTICO: A aluna tem dor em: ${profile.pain_location}. Priorize exercícios com foco terapêutico correspondente e EVITE exercícios que agravem essas regiões.` : ""}
${profile.goal === "Melhorar Dores" ? "8. OBJETIVO É DORES: Priorize exercícios com therapeutic_focus correspondente." : ""}

${phaseInstructions}

RESPONDA APENAS com um JSON válido no seguinte formato (sem markdown, sem explicação):
{
  "title": "Título do treino",
  "description": "Breve descrição",
  "level": "${effectiveLevel}",
  "rest_seconds": ${restTime === "30 segundos" ? 30 : 45},
  "workout_number": ${nextWorkoutNumber},
  "phase": "${isMonthlyPhase ? "monthly" : "initial"}",
  "exercises": [
    {
      "exercise_id": "uuid_da_lista",
      "name": "nome_exato_da_lista",
      "sets": number,
      "reps": "15 a 20" ou "15 a 30",
      "video_url": "url_da_lista",
      "muscle_group": "grupo_muscular"
    }
  ]
}`;

    const userPrompt = `Perfil da aluna:
- Nome: ${profile.full_name}
- Objetivo: ${profile.goal}
- Áreas alvo: ${profile.target_area}
- Experiência: ${profile.training_experience}
- Dias/semana: ${profile.workout_days}
- Duração: ${effectiveDuration} min
- Tem dor: ${profile.has_pain ? "Sim - " + profile.pain_location : "Não"}
- Usa medicação: ${profile.uses_medication ? "Sim - " + profile.medication_feeling : "Não"}

Exercícios disponíveis no banco:
${JSON.stringify(exercises.map(e => ({
  id: e.id, name: e.name, muscle_group: e.muscle_group,
  equipment: e.equipment, level: e.internal_level,
  aesthetic_tag: e.target_aesthetic_tag,
  therapeutic: e.therapeutic_focus,
  video_url: e.video_url
})), null, 2)}

Gere o treino número ${nextWorkoutNumber}.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status} ${errText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response
    let workoutJson;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      workoutJson = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      throw new Error("Failed to parse AI workout response");
    }

    // Post-process: validate exercises against DB, remove any that don't match
    if (workoutJson.exercises && exercises) {
      const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const exerciseIds = new Set(exercises.map(e => e.id));

      workoutJson.exercises = workoutJson.exercises
        .map((ex: any) => {
          // First check by ID
          if (ex.exercise_id && exerciseIds.has(ex.exercise_id)) {
            const match = exercises.find(e => e.id === ex.exercise_id)!;
            return { ...ex, exercise_id: match.id, name: match.name, video_url: match.video_url, muscle_group: match.muscle_group };
          }
          // Fallback: exact name match
          const exName = normalize(ex.name || "");
          const match = exercises.find(e => normalize(e.name) === exName);
          if (match) {
            return { ...ex, exercise_id: match.id, name: match.name, video_url: match.video_url, muscle_group: match.muscle_group };
          }
          // Contained match
          const partial = exercises.find(e => normalize(e.name).includes(exName) || exName.includes(normalize(e.name)));
          if (partial) {
            return { ...ex, exercise_id: partial.id, name: partial.name, video_url: partial.video_url, muscle_group: partial.muscle_group };
          }
          return null;
        })
        .filter((ex: any) => ex !== null);
    }

    const today = new Date().toISOString().split("T")[0];

    // Save workout
    const { data: workout, error: workoutError } = await supabase
      .from("workouts")
      .insert({
        profile_id: user.id,
        date: today,
        workout_json: workoutJson,
        completed: false,
      })
      .select()
      .single();

    if (workoutError) throw new Error(`Failed to save workout: ${workoutError.message}`);

    return new Response(JSON.stringify({ 
      workout,
      phase: isMonthlyPhase ? "monthly" : "initial",
      workoutNumber: nextWorkoutNumber,
      completedCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-workout error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
