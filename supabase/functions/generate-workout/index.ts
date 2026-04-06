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

    // Get ALL workouts for this user, ordered by creation
    const { data: allWorkouts } = await supabase
      .from("workouts")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: true });

    const workouts = allWorkouts || [];
    const completedCount = workouts.filter(w => w.completed).length;
    const lastWorkout = workouts[workouts.length - 1];

    // FLOW LOGIC:
    // 1. If there's an incomplete workout → return it (don't generate new)
    // 2. If all workouts are completed (or none exist) → generate next one
    // 3. Track phase: workout 1, 2, 3 = initial phase. After 3 completed = monthly phase.

    if (lastWorkout && !lastWorkout.completed) {
      // There's a pending workout - return it
      return new Response(JSON.stringify({ 
        workout: lastWorkout,
        phase: completedCount < 3 ? "initial" : "monthly",
        workoutNumber: workouts.length,
        completedCount,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All completed (or no workouts) → generate next
    const nextWorkoutNumber = workouts.length + 1;
    const isMonthlyPhase = completedCount >= 3;

    // Get exercises
    const { data: exercises } = await supabase.from("exercises").select("*");
    if (!exercises || exercises.length === 0) {
      throw new Error("No exercises available in the database");
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

    // Build different prompts based on phase
    let phaseInstructions = "";
    if (isMonthlyPhase) {
      // After 3 initial workouts: interpret all feedback and generate monthly-quality workout
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
      // Initial phase (workouts 1-3): evaluate and adapt
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

REGRAS ABSOLUTAS:
1. SEMPRE agrupe exercícios em TRI-SETS (blocos de 3 exercícios consecutivos).
2. Todas as repetições são "15 a 30 repetições".
3. Para duração ${effectiveDuration}min: ${effectiveDuration === 10 ? "2 a 3 séries totais" : "5 a 6 séries totais"}.
4. Nível efetivo da aluna: ${effectiveLevel}.
${isMedicationRisk ? "5. SEGURANÇA MÁXIMA: A aluna usa medicação e se sente mal. EXCLUA exercícios de salto e impacto. Use APENAS exercícios de nível iniciante." : ""}
${profile.has_pain ? `6. FILTRO TERAPÊUTICO: A aluna tem dor em: ${profile.pain_location}. Priorize exercícios com foco terapêutico correspondente e EVITE exercícios que agravem essas regiões.` : ""}
${profile.goal === "Melhorar Dores" ? "7. OBJETIVO É DORES: Priorize exercícios com therapeutic_focus correspondente." : ""}

${phaseInstructions}

RESPONDA APENAS com um JSON válido no seguinte formato (sem markdown, sem explicação):
{
  "title": "Título do treino",
  "description": "Breve descrição",
  "total_series": number,
  "workout_number": ${nextWorkoutNumber},
  "phase": "${isMonthlyPhase ? "monthly" : "initial"}",
  "tri_sets": [
    {
      "label": "Tri-set A",
      "exercises": [
        { "exercise_id": "uuid", "name": "nome", "reps": "15 a 30 reps", "video_url": "url" },
        { "exercise_id": "uuid", "name": "nome", "reps": "15 a 30 reps", "video_url": "url" },
        { "exercise_id": "uuid", "name": "nome", "reps": "15 a 30 reps", "video_url": "url" }
      ]
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
