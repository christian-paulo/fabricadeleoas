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

    const { date } = await req.json();
    const targetDate = date || new Date().toISOString().split("T")[0];

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("*").eq("id", user.id).single();
    if (profileError || !profile) throw new Error("Profile not found");

    // Check existing workout for today
    const { data: existingWorkout } = await supabase
      .from("workouts").select("*").eq("profile_id", user.id).eq("date", targetDate).maybeSingle();
    if (existingWorkout?.workout_json) {
      return new Response(JSON.stringify({ workout: existingWorkout }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get exercises
    const { data: exercises } = await supabase.from("exercises").select("*");
    if (!exercises || exercises.length === 0) {
      throw new Error("No exercises available in the database");
    }

    // Get previous workout feedback for progression
    const { data: prevWorkouts } = await supabase
      .from("workouts").select("feedback_effort, date")
      .eq("profile_id", user.id).order("date", { ascending: false }).limit(1);

    const prevFeedback = prevWorkouts?.[0]?.feedback_effort || null;

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

    const systemPrompt = `Você é o "Guia das Leoas", a inteligência de treino da Fábrica de Leoas, uma consultoria fitness feminina premium do Personal Gilvan.

REGRAS ABSOLUTAS:
1. SEMPRE agrupe exercícios em TRI-SETS (blocos de 3 exercícios consecutivos).
2. Todas as repetições são "15 a 30 repetições".
3. Para duração ${effectiveDuration}min: ${effectiveDuration === 10 ? "2 a 3 séries totais" : "5 a 6 séries totais"}.
4. Nível efetivo da aluna: ${effectiveLevel}.
${isMedicationRisk ? "5. SEGURANÇA MÁXIMA: A aluna usa medicação e se sente mal. EXCLUA exercícios de salto e impacto. Use APENAS exercícios de nível iniciante." : ""}
${profile.has_pain ? `6. FILTRO TERAPÊUTICO: A aluna tem dor em: ${profile.pain_location}. Priorize exercícios com foco terapêutico correspondente e EVITE exercícios que agravem essas regiões.` : ""}
${profile.goal === "Melhorar Dores" ? "7. OBJETIVO É DORES: Priorize exercícios com therapeutic_focus correspondente." : ""}
${prevFeedback ? `8. PROGRESSÃO: O feedback do treino anterior foi "${prevFeedback}". ${prevFeedback === "facil" ? "Aumente levemente a intensidade." : prevFeedback === "dificil" ? "Reduza a intensidade e escolha exercícios mais acessíveis." : "Mantenha o nível atual."}` : ""}

RESPONDA APENAS com um JSON válido no seguinte formato (sem markdown, sem explicação):
{
  "title": "Título do treino",
  "description": "Breve descrição",
  "total_series": number,
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
  therapeutic: e.therapeutic_focus
})), null, 2)}

Monte o treino do dia para a data ${targetDate}.`;

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

    // Save workout
    const { data: workout, error: workoutError } = await supabase
      .from("workouts")
      .upsert({
        profile_id: user.id,
        date: targetDate,
        workout_json: workoutJson,
        completed: false,
      }, { onConflict: "profile_id,date" })
      .select()
      .single();

    if (workoutError) {
      // If upsert fails, try insert
      const { data: insertedWorkout, error: insertError } = await supabase
        .from("workouts")
        .insert({
          profile_id: user.id,
          date: targetDate,
          workout_json: workoutJson,
          completed: false,
        })
        .select()
        .single();
      if (insertError) throw new Error(`Failed to save workout: ${insertError.message}`);
      return new Response(JSON.stringify({ workout: insertedWorkout }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ workout }), {
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
