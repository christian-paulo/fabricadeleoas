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

    // Get onboarding responses
    const { data: onboarding } = await supabase
      .from("onboarding_responses")
      .select("dificuldade, corpo_desejado, motivacao, idade")
      .eq("profile_id", user.id)
      .single();

    const dificuldade = onboarding?.dificuldade || "Suar um pouco";
    const corpoDesejado = onboarding?.corpo_desejado || null;
    const motivacao = onboarding?.motivacao || null;
    const idadeAluna = onboarding?.idade || null;

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

    // Map profile equipment to allowed DB equipment values
    // Always available at home: bodyweight, floor, wall, sofa, chair, pillow
    const BASE_EQUIPMENT = [
      "Peso do Corpo", "peso corporal", "Peso corporal",
      "Solo", "solo",
      "Parede",
      "Sofá", "sófa", "Sofa",
      "Cadeira",
      "Almofada",
      "Joelhos",
    ];

    const getEquipmentFilter = (eq: string | null): string[] | null => {
      if (!eq || /sem|corpo|nenhum/i.test(eq)) return BASE_EQUIPMENT;
      if (/halter|carga|peso/i.test(eq)) {
        return [...BASE_EQUIPMENT, "Carga", "Carga/Cabo", "Cabo/carga", "Cadeira/Carga", "Mochila"];
      }
      if (/cabo|vassoura|elastico|elástico/i.test(eq)) {
        return [...BASE_EQUIPMENT, "Cabo", "Cabo Vassoura", "Cabo de Vassoura", "Cabo/Carga", "Cabo/carga"];
      }
      if (/complet|tudo|todos/i.test(eq)) return null; // null = sem filtro
      return BASE_EQUIPMENT;
    };

    const equipmentFilter = getEquipmentFilter(profile.equipment);

    // Get ONLY exercises with video_url, filtered by available equipment
    let exerciseQuery = supabase
      .from("exercises")
      .select("*")
      .not("video_url", "is", null)
      .neq("video_url", "");

    if (equipmentFilter) {
      exerciseQuery = exerciseQuery.in("equipment", equipmentFilter);
    }

    const { data: exercises } = await exerciseQuery;
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

    // Level-based config
    let seriesCount: number;
    let repsRange: string;
    let restSeconds: number;

    if (effectiveLevel === "iniciante") {
      seriesCount = 2;
      repsRange = "15 a 20";
      restSeconds = 45;
    } else if (effectiveLevel === "intermediario") {
      seriesCount = dificuldade === "Desafiador" ? 4 : 3;
      repsRange = "15 a 30";
      restSeconds = 45;
    } else {
      // avancado
      seriesCount = 6;
      repsRange = "15 a 30";
      restSeconds = 30;
    }

    // Calculate how many exercises fit the duration
    // Formula: each exercise takes ~(series * (avg_rep_time_sec + rest_seconds)) / 60 minutes
    // Avg rep time ~30sec for a set of 15-30 reps
    const avgSetTimeSec = 35; // avg time per set including reps
    const timePerExerciseMin = (seriesCount * (avgSetTimeSec + restSeconds)) / 60;
    const warmupCooldownMin = 3;
    const targetExercises = Math.max(4, Math.min(8, Math.round((effectiveDuration - warmupCooldownMin) / timePerExerciseMin)));

    // Calculate realistic duration
    const calculatedDuration = Math.round(targetExercises * timePerExerciseMin + warmupCooldownMin);
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
1. NÃO use tri-sets. Os exercícios são INDIVIDUAIS, listados um a um.
2. OBRIGATÓRIO: Cada exercício terá EXATAMENTE ${seriesCount} séries de ${repsRange} repetições.
3. Descanso entre séries: EXATAMENTE ${restSeconds} segundos.
4. Selecione EXATAMENTE ${targetExercises} exercícios.
5. O nível da aluna é "${effectiveLevel}" — NÃO mude o nível. Use "${effectiveLevel}" no campo "level".
6. A duração estimada DEVE ser "~${calculatedDuration} min".
${isMedicationRisk ? "7. SEGURANÇA MÁXIMA: A aluna usa medicação e se sente mal. EXCLUA exercícios de salto e impacto. Use APENAS exercícios de nível iniciante." : ""}
${profile.has_pain ? `8. FILTRO TERAPÊUTICO: A aluna tem dor em: ${profile.pain_location}. Priorize exercícios com foco terapêutico correspondente e EVITE exercícios que agravem essas regiões.` : ""}
${profile.goal === "Melhorar Dores" ? "9. OBJETIVO É DORES: Priorize exercícios com therapeutic_focus correspondente." : ""}
${profile.target_area ? `10. FOCO ESTÉTICO OBRIGATÓRIO: A aluna quer trabalhar "${profile.target_area}". Pelo menos ${Math.ceil(targetExercises * 0.6)} dos ${targetExercises} exercícios DEVEM ter aesthetic_tag correspondente a essa área. Distribua os demais em grupos complementares.` : ""}
${corpoDesejado ? `11. CORPO DESEJADO: A aluna quer um corpo "${corpoDesejado}". Escolha exercícios que trabalham especificamente esse resultado estético.` : ""}

${phaseInstructions}

RESPONDA APENAS com um JSON válido no seguinte formato (sem markdown, sem explicação):
{
  "title": "Título do treino",
  "description": "Breve descrição",
  "level": "${effectiveLevel}",
  "estimated_duration": "~${calculatedDuration} min",
  "series_count": ${seriesCount},
  "reps_range": "${repsRange}",
  "rest_seconds": ${restSeconds},
  "workout_number": ${nextWorkoutNumber},
  "phase": "${isMonthlyPhase ? "monthly" : "initial"}",
  "exercises": [
    { "exercise_id": "uuid_da_lista", "name": "nome_exato_da_lista", "series": ${seriesCount}, "reps": "${repsRange}", "rest_seconds": ${restSeconds}, "video_url": "url_da_lista", "muscle_group": "grupo_muscular" }
  ]
}`;

    const userPrompt = `Perfil da aluna:
- Nome: ${profile.full_name}
- Objetivo: ${profile.goal}
- Áreas alvo: ${profile.target_area}
- Corpo desejado: ${corpoDesejado || "Não informado"}
- Motivação: ${motivacao || "Não informado"}
- Idade: ${idadeAluna ? idadeAluna + " anos" : "Não informado"}
- Experiência: ${profile.training_experience}
- Dias/semana: ${profile.workout_days}
- Duração: ${effectiveDuration} min
- Equipamento disponível: ${profile.equipment || "Sem equipamento (apenas peso do corpo)"}
- Tem dor: ${profile.has_pain ? "Sim - " + profile.pain_location : "Não"}
- Usa medicação: ${profile.uses_medication ? "Sim - " + profile.medication_feeling : "Não"}
- Dificuldade desejada: ${dificuldade}

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
            return { ...ex, exercise_id: match.id, name: match.name, video_url: match.video_url, muscle_group: match.muscle_group, series: seriesCount, reps: repsRange, rest_seconds: restSeconds };
          }
          // Fallback: exact name match
          const exName = normalize(ex.name || "");
          const match = exercises.find(e => normalize(e.name) === exName);
          if (match) {
            return { ...ex, exercise_id: match.id, name: match.name, video_url: match.video_url, muscle_group: match.muscle_group, series: seriesCount, reps: repsRange, rest_seconds: restSeconds };
          }
          // Contained match
          const partial = exercises.find(e => normalize(e.name).includes(exName) || exName.includes(normalize(e.name)));
          if (partial) {
            return { ...ex, exercise_id: partial.id, name: partial.name, video_url: partial.video_url, muscle_group: partial.muscle_group, series: seriesCount, reps: repsRange, rest_seconds: restSeconds };
          }
          return null;
        })
        .filter((ex: any) => ex !== null);
    }

    // Migrate legacy tri_sets format if present (shouldn't happen for new workouts)
    if (workoutJson.tri_sets && !workoutJson.exercises) {
      const flatExercises: any[] = [];
      for (const ts of workoutJson.tri_sets) {
        if (ts.exercises) {
          for (const ex of ts.exercises) {
            flatExercises.push({ ...ex, series: seriesCount, reps: repsRange, rest_seconds: restSeconds });
          }
        }
      }
      workoutJson.exercises = flatExercises;
      delete workoutJson.tri_sets;
    }

    // Force correct metadata regardless of what AI returned
    workoutJson.level = effectiveLevel;
    workoutJson.series_count = seriesCount;
    workoutJson.reps_range = repsRange;
    workoutJson.rest_seconds = restSeconds;
    // Recalculate duration based on actual exercises
    const actualExCount = workoutJson.exercises?.length || targetExercises;
    const actualDuration = Math.round(actualExCount * timePerExerciseMin + warmupCooldownMin);
    workoutJson.estimated_duration = `~${actualDuration} min`;

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
