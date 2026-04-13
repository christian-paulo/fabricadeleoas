import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Play, CheckCircle2, Loader2, ArrowLeft, Dumbbell, Target, Send, ChevronUp, ChevronDown, Timer, Flame, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import heroTreino from "@/assets/hero-treino.jpg";

type FeedbackType = "facil" | "ideal" | "dificil" | null;
type FeedbackStep = "effort" | "comment" | null;

interface SeriesLog {
  reps: number | null;
  completed: boolean;
}

interface ExerciseTracking {
  [exerciseIndex: number]: SeriesLog[];
}

const Treinos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackStep, setFeedbackStep] = useState<FeedbackStep>(null);
  const [selectedEffort, setSelectedEffort] = useState<FeedbackType>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [completed, setCompleted] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [videoModal, setVideoModal] = useState<{ name: string; url: string } | null>(null);
  const [phase, setPhase] = useState<string>("initial");
  const [workoutNumber, setWorkoutNumber] = useState<number>(1);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  const [tracking, setTracking] = useState<ExerciseTracking>({});
  const [editingCell, setEditingCell] = useState<{ exIdx: number; seriesIdx: number } | null>(null);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [weekDays, setWeekDays] = useState<{ label: string; completed: boolean; isToday: boolean }[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchCurrentWorkout();
  }, [user]);

  const fetchCurrentWorkout = async () => {
    setLoading(true);
    try {
      const { data: rawData, error } = await supabase.functions.invoke("generate-workout", { body: {} });
      if (error) { toast.error("Erro ao carregar protocolo"); return; }
      const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      if (data?.workout) {
        setWorkout(data.workout);
        setCompleted(data.workout.completed || false);
        setFeedback(data.workout.feedback_effort as FeedbackType);
        setPhase(data.phase || "initial");
        setWorkoutNumber(data.workoutNumber || 1);
        // Initialize tracking from workout exercises
        initializeTracking(data.workout.workout_json);
      } else { toast.error("Protocolo não encontrado"); }
    } catch { toast.error("Erro ao carregar protocolo"); }
    setLoading(false);
  };

  const initializeTracking = (wJson: any) => {
    if (!wJson) return;
    const exercises = getExercisesList(wJson);
    const initial: ExerciseTracking = {};
    exercises.forEach((ex: any, idx: number) => {
      const seriesCount = ex.series || 3;
      initial[idx] = Array.from({ length: seriesCount }, () => ({
        reps: null,
        completed: false,
      }));
    });
    setTracking(initial);
  };

  // Helper to get flat exercises list from either new or legacy format
  const getExercisesList = (wJson: any): any[] => {
    if (wJson?.exercises && Array.isArray(wJson.exercises)) {
      return wJson.exercises;
    }
    // Legacy tri-set format
    if (wJson?.tri_sets) {
      const flat: any[] = [];
      for (const ts of wJson.tri_sets) {
        if (ts.exercises) flat.push(...ts.exercises);
      }
      return flat;
    }
    return [];
  };

  const computeStreakAndWeek = async () => {
    if (!user) return;
    // Fetch completed workouts
    const { data: allWorkouts } = await supabase
      .from("workouts")
      .select("date, completed")
      .eq("profile_id", user.id)
      .eq("completed", true)
      .order("date", { ascending: false });

    // Count total completed workouts
    const totalCompleted = allWorkouts?.length || 0;
    setStreakCount(totalCompleted);

    // Compute week days
    const completedDates = new Set(allWorkouts?.map(w => w.date) || []);
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

    const labels = ["Seg.", "Ter.", "Qua.", "Qui.", "Sex.", "Sáb.", "Dom."];
    const days = labels.map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      return {
        label,
        completed: completedDates.has(dateStr),
        isToday: dateStr === today.toISOString().split("T")[0],
      };
    });
    setWeekDays(days);
  };

  const submitFeedback = async () => {
    if (!workout || !selectedEffort) return;
    const completedCount = exercises.filter((_: any, idx: number) => isExerciseComplete(idx)).length;
    const totalCount = exercises.length;
    const durationMinutes = Math.ceil(elapsedSeconds / 60);
    const updatedJson = {
      ...workoutJson,
      tracking_summary: {
        completed_exercises: completedCount,
        total_exercises: totalCount,
        skipped_exercises: totalCount - completedCount,
        duration_minutes: durationMinutes,
        duration_seconds: elapsedSeconds,
      },
    };
    const { error } = await supabase.from("workouts").update({
      completed: true,
      feedback_effort: selectedEffort,
      workout_json: updatedJson,
    }).eq("id", workout.id);
    if (error) { toast.error("Erro ao salvar feedback"); return; }
    
    setFeedback(selectedEffort);
    setCompleted(true);
    setFeedbackStep(null);
    setShowFeedback(false);
    await computeStreakAndWeek();
    setShowSuccess(true);
  };

  const [dbExercises, setDbExercises] = useState<{ name: string; video_url: string }[]>([]);

  useEffect(() => {
    const fetchVideos = async () => {
      const { data } = await supabase.from("exercises").select("name, video_url");
      if (data) setDbExercises(data.filter((e) => !!e.video_url) as { name: string; video_url: string }[]);
    };
    fetchVideos();
  }, []);

  const findVideoUrl = (exerciseName: string): string | null => {
    if (!exerciseName || dbExercises.length === 0) return null;
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const lower = normalize(exerciseName);
    const exact = dbExercises.find((e) => normalize(e.name) === lower);
    if (exact) return exact.video_url;
    const contained = dbExercises.find((e) => {
      const dbLower = normalize(e.name);
      return dbLower === lower || dbLower.includes(lower) || lower.includes(dbLower);
    });
    if (contained) return contained.video_url;
    return null;
  };

  const workoutJson = workout?.workout_json;

  const exercises = useMemo(() => {
    const list = getExercisesList(workoutJson);
    return list.map((ex: any) => {
      const hasValidUrl = ex.video_url && ex.video_url.length > 10 && ex.video_url.startsWith("http");
      return {
        ...ex,
        video_url: hasValidUrl ? ex.video_url : findVideoUrl(ex.name),
        series: ex.series || workoutJson?.series_count || 3,
        reps: ex.reps || workoutJson?.reps_range || "15 a 30",
        rest_seconds: ex.rest_seconds || workoutJson?.rest_seconds || 45,
      };
    });
  }, [workoutJson, dbExercises]);

  // Compute stats
  const stats = useMemo(() => {
    const focusAreas = new Set<string>();
    exercises.forEach((ex: any) => {
      if (ex.muscle_group) focusAreas.add(ex.muscle_group);
    });
    return {
      totalExercises: exercises.length,
      focusAreas: focusAreas.size > 0 ? Array.from(focusAreas).join(", ") : workoutJson?.title || "Corpo todo",
      duration: workoutJson?.estimated_duration || "~30 min",
      level: workoutJson?.level === "iniciante" ? "Iniciante" : workoutJson?.level === "avancado" ? "Avançado" : "Intermediário",
      seriesCount: exercises[0]?.series || 3,
    };
  }, [exercises, workoutJson]);

  // Check if all series of an exercise are completed
  const isExerciseComplete = useCallback((exIdx: number) => {
    const series = tracking[exIdx];
    if (!series) return false;
    return series.every(s => s.completed);
  }, [tracking]);

  const completedSeriesCount = useCallback((exIdx: number) => {
    const series = tracking[exIdx];
    if (!series) return 0;
    return series.filter(s => s.completed).length;
  }, [tracking]);

  // Toggle series completion
  const toggleSeriesComplete = (exIdx: number, seriesIdx: number) => {
    setTracking(prev => {
      const updated = { ...prev };
      const series = [...(updated[exIdx] || [])];
      series[seriesIdx] = { ...series[seriesIdx], completed: !series[seriesIdx].completed };
      updated[exIdx] = series;
      return updated;
    });
  };

  // Update reps for a series
  const updateReps = (exIdx: number, seriesIdx: number, reps: number | null) => {
    setTracking(prev => {
      const updated = { ...prev };
      const series = [...(updated[exIdx] || [])];
      series[seriesIdx] = { ...series[seriesIdx], reps };
      updated[exIdx] = series;
      return updated;
    });
  };

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (workoutStarted && !completed) {
      interval = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [workoutStarted, completed]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const dayLabel = `${workoutNumber}º dia`;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Loader2 className="animate-spin text-primary mb-3" size={40} />
          <span className="text-muted-foreground text-base">Carregando seu protocolo...</span>
        </div>
      ) : exercises.length === 0 ? (
        <div className="px-4 pt-6">
          <div className="soft-card p-6 text-center">
            <p className="text-muted-foreground text-base">Nenhum protocolo disponível.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Hero image */}
          <div className="relative h-72 w-full">
            <img
              src={heroTreino}
              alt="Treino do dia"
              className="w-full h-full object-cover"
              width={1024}
              height={640}
            />
            <button
              onClick={() => navigate("/treinos")}
              className="absolute top-6 left-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center z-10"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Content overlapping the image */}
          <div className="relative -mt-8 bg-background rounded-t-3xl px-4 pt-6 pb-6 bottom-nav-safe">

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xl font-bold text-foreground">{stats.duration}</p>
              <p className="text-sm text-muted-foreground">Duração</p>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{stats.level}</p>
              <p className="text-sm text-muted-foreground">Nível</p>
            </div>
          </div>

          {/* Focus area & exercise count cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="soft-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Área de foco</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{stats.focusAreas}</p>
            </div>
            <div className="soft-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Dumbbell className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Exercícios</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.totalExercises}</p>
              <p className="text-xs text-muted-foreground">{stats.seriesCount} séries</p>
            </div>
          </div>

          {/* Exercise list */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-heading text-foreground">
                Exercícios <span className="text-muted-foreground font-normal">({stats.totalExercises})</span>
              </h2>
            </div>

            <div className="space-y-3">
              {exercises.map((ex: any, idx: number) => {
                const isExpanded = expandedExercise === idx;
                const exComplete = isExerciseComplete(idx);
                const completedCount = completedSeriesCount(idx);
                const totalSeries = ex.series || 3;

                return (
                  <div key={idx} className={`rounded-2xl overflow-hidden transition-all ${exComplete ? "bg-primary/10 border border-primary/30" : "bg-card border border-border"}`}>
                    {/* Exercise header */}
                    <button
                      onClick={() => setExpandedExercise(isExpanded ? null : idx)}
                      className="flex items-center gap-3 p-4 w-full text-left"
                    >
                      {/* Collapse/Expand icon */}
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Thumbnail / play area */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (ex.video_url) setVideoModal({ name: ex.name, url: ex.video_url });
                        }}
                        className="relative w-16 h-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <Play className="w-4 h-4 text-primary ml-0.5" />
                        </div>
                      </div>

                      {/* Exercise info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground leading-tight uppercase">{ex.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          {exComplete && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                          <span className={exComplete ? "text-primary font-semibold" : ""}>
                            {completedCount}/{totalSeries} feito(s)
                          </span>
                        </p>
                      </div>
                    </button>

                    {/* Expanded: Series tracking */}
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        {/* Header row */}
                        <div className="grid grid-cols-[50px_1fr_50px] gap-2 mb-2 px-1">
                          <span className="text-xs font-semibold text-muted-foreground">Série</span>
                          <span className="text-xs font-semibold text-muted-foreground text-center">Rep.</span>
                          <span></span>
                        </div>

                        {/* Series rows */}
                        {(tracking[idx] || []).map((series, sIdx) => (
                          <div key={sIdx}>
                            <div
                              className={`grid grid-cols-[50px_1fr_50px] gap-2 items-center mb-2 px-1 py-2 rounded-xl transition-all ${
                                series.completed ? "bg-primary/15" : ""
                              }`}
                            >
                              <span className={`text-lg font-bold ${series.completed ? "text-primary" : "text-foreground"}`}>
                                {sIdx + 1}
                              </span>
                              <button
                                onClick={() => setEditingCell(
                                  editingCell?.exIdx === idx && editingCell?.seriesIdx === sIdx
                                    ? null
                                    : { exIdx: idx, seriesIdx: sIdx }
                                )}
                                className={`rounded-xl py-3 px-4 text-center text-base font-medium ${
                                  editingCell?.exIdx === idx && editingCell?.seriesIdx === sIdx
                                    ? "bg-primary/20 ring-2 ring-primary text-foreground"
                                    : "bg-muted text-foreground"
                                }`}
                              >
                                {series.reps !== null ? series.reps : ex.reps || "—"}
                              </button>
                              <button
                                onClick={() => toggleSeriesComplete(idx, sIdx)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                  series.completed
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {series.completed && <CheckCircle2 className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Inline NumberPad */}
                        {editingCell?.exIdx === idx && (
                          <div className="mt-2 mb-2">
                            <NumberPad
                              initialValue={tracking[editingCell.exIdx]?.[editingCell.seriesIdx]?.reps}
                              onConfirm={(val) => {
                                updateReps(editingCell.exIdx, editingCell.seriesIdx, val);
                                if (val !== null) {
                                  toggleSeriesComplete(editingCell.exIdx, editingCell.seriesIdx);
                                }
                                setEditingCell(null);
                              }}
                              onClose={() => setEditingCell(null)}
                            />
                          </div>
                        )}

                        {/* Rest info */}
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          Descanso: {ex.rest_seconds || 45}s entre séries
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spacer for floating bar */}
          <div className="h-28" />
          </div>

          {/* Floating bottom bar */}
          {!completed ? (
            <div className="fixed bottom-20 left-0 right-0 z-40 flex items-center justify-center gap-3 px-4 max-w-lg mx-auto" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
              {workoutStarted && (
                <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-4 py-4 shadow-lg">
                  <Timer className="w-5 h-5 text-primary" />
                  <span className="text-lg font-bold text-foreground font-mono">{formatTime(elapsedSeconds)}</span>
                </div>
              )}
              <Button
                onClick={() => {
                  if (!workoutStarted) {
                    setWorkoutStarted(true);
                  } else {
                    setFeedbackStep("effort");
                    setShowFeedback(true);
                  }
                }}
                className="flex-1 pink-gradient text-primary-foreground font-heading text-lg h-14 rounded-2xl shadow-lg"
              >
                {workoutStarted ? "Finalizar Treino" : "Iniciar Treino"}
              </Button>
            </div>
          ) : (
            <div className="fixed bottom-20 left-0 right-0 z-40 px-4 max-w-lg mx-auto" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
              <div className="bg-card border border-primary/30 rounded-2xl p-4 shadow-lg flex items-center gap-3">
                <CheckCircle2 className="text-primary flex-shrink-0" size={32} />
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">Treino finalizado! 🎉</p>
                  <p className="text-xs text-muted-foreground">
                    {feedback === "facil" ? "Fácil" : feedback === "ideal" ? "Ideal" : "Muito Difícil"}
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/treinos")}
                  size="sm"
                  className="pink-gradient text-primary-foreground font-heading rounded-xl shadow-lg"
                >
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </>
      )}


      {/* Feedback dialog - Step 1: Effort */}
      <Dialog open={showFeedback && feedbackStep === "effort"} onOpenChange={(open) => { if (!open) { setShowFeedback(false); setFeedbackStep(null); } }}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-primary text-center text-xl">Como foi o esforço de hoje?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            {[
              { value: "facil" as FeedbackType, label: "😊 Fácil", desc: "Poderia ter feito mais" },
              { value: "ideal" as FeedbackType, label: "💪 Ideal", desc: "Na medida certa" },
              { value: "dificil" as FeedbackType, label: "🔥 Muito Difícil", desc: "Quase não consegui" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setSelectedEffort(opt.value); setFeedbackStep("comment"); }}
                className={`soft-card p-5 text-left hover:ring-2 hover:ring-primary transition-all ${
                  selectedEffort === opt.value ? "ring-2 ring-primary" : ""
                }`}
              >
                <p className="text-base font-bold text-foreground">{opt.label}</p>
                <p className="text-sm text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback dialog - Step 2: Comment */}
      <Dialog open={showFeedback && feedbackStep === "comment"} onOpenChange={(open) => { if (!open) { setShowFeedback(false); setFeedbackStep(null); } }}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-primary text-center text-xl">Conte mais sobre seu treino</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-center">
            Como você se sentiu? Alguma dificuldade ou observação?
          </p>
          <textarea
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
            placeholder="Ex: Senti que os exercícios de perna foram intensos, mas consegui completar tudo..."
            className="w-full mt-3 p-4 rounded-xl bg-muted border border-border text-foreground text-sm min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/60"
          />
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setFeedbackStep("effort")}
              className="flex-1 h-12 rounded-xl"
            >
              Voltar
            </Button>
            <Button
              onClick={submitFeedback}
              className="flex-1 pink-gradient text-primary-foreground font-heading h-12 rounded-xl shadow-lg flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Enviar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video modal - exercise detail */}
      <Dialog open={!!videoModal} onOpenChange={() => setVideoModal(null)}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto rounded-2xl p-0 gap-0 [&>button]:hidden overflow-hidden">
          {videoModal?.url && (
            <div className="relative w-full" style={{ paddingBottom: "177.78%" }}>
              <iframe
                src={(() => {
                  const url = videoModal.url;
                  const shortsMatch = url.match(/youtube\.com\/shorts\/([^?&]+)/);
                  if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
                  const watchMatch = url.match(/[?&]v=([^&]+)/);
                  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
                  return url.replace("watch?v=", "embed/");
                })()}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          )}
          <div className="p-5">
            <h3 className="text-lg font-heading font-bold text-foreground mb-4">{videoModal?.name}</h3>
            <Button
              onClick={() => setVideoModal(null)}
              className="w-full pink-gradient text-primary-foreground font-heading text-base h-12 rounded-2xl shadow-lg"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success celebration screen */}
      {showSuccess && (
        <div className="fixed inset-0 z-[60] bg-background flex flex-col items-center justify-center px-6 max-w-lg mx-auto overflow-y-auto py-10">
          {/* Fire icon with streak */}
          <div className="relative mb-6">
            <div className="w-32 h-32 flex items-center justify-center">
              <svg viewBox="0 0 120 140" className="w-32 h-36">
                <defs>
                  <radialGradient id="fireGrad" cx="50%" cy="60%" r="50%">
                    <stop offset="0%" stopColor="#FFA726" />
                    <stop offset="100%" stopColor="#E65100" />
                  </radialGradient>
                </defs>
                <path
                  d="M60 5 C60 5 95 45 95 85 C95 108 80 130 60 135 C40 130 25 108 25 85 C25 45 60 5 60 5Z"
                  fill="url(#fireGrad)"
                />
                <path
                  d="M60 50 C60 50 78 70 78 90 C78 105 70 115 60 118 C50 115 42 105 42 90 C42 70 60 50 60 50Z"
                  fill="#FFD54F"
                  opacity="0.7"
                />
              </svg>
              <span className="absolute text-4xl font-black text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                {streakCount}
              </span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-black text-foreground text-center uppercase leading-tight mb-1">
            {streakCount === 1 ? "Você começou sua sequência!" : "Você está em uma sequência de"}
          </h1>
          <p className="text-3xl font-black text-primary text-center mb-8">
            {streakCount} {streakCount === 1 ? "treino" : "treinos"}!
          </p>

          {/* Week card */}
          <div className="w-full bg-card border border-border rounded-2xl p-5 mb-8">
            <p className="text-center text-muted-foreground mb-4">
              O primeiro marco: <span className="font-bold text-foreground">7 Treinos</span>
            </p>
            
            <div className="flex justify-between mb-3">
              {weekDays.map((day, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <span className={`text-xs font-medium ${day.isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {day.label}
                  </span>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    day.completed
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}>
                    {day.completed && <Check className="w-4 h-4" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-border my-3" />
            
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              {streakCount >= 7
                ? "Incrível! Você atingiu seu primeiro marco! 🎉 Continue assim!"
                : `Você foi muito bem hoje! Faltam apenas ${7 - streakCount} ${7 - streakCount === 1 ? "treino" : "treinos"} para atingir o seu objetivo. Continue assim!`}
            </p>
          </div>

          {/* Workout summary mini */}
          <div className="w-full flex gap-3 mb-8">
            <div className="flex-1 bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-foreground">{formatTime(elapsedSeconds)}</p>
              <p className="text-xs text-muted-foreground">Duração</p>
            </div>
            <div className="flex-1 bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-foreground">{exercises.filter((_: any, idx: number) => isExerciseComplete(idx)).length}/{exercises.length}</p>
              <p className="text-xs text-muted-foreground">Exercícios</p>
            </div>
            <div className="flex-1 bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-foreground">
                {selectedEffort === "facil" ? "😊" : selectedEffort === "ideal" ? "💪" : "🔥"}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedEffort === "facil" ? "Fácil" : selectedEffort === "ideal" ? "Ideal" : "Difícil"}
              </p>
            </div>
          </div>

          {/* CTA */}
          <Button
            onClick={() => navigate("/treinos")}
            className="w-full pink-gradient text-primary-foreground font-heading text-lg h-14 rounded-2xl shadow-lg mb-6"
          >
            Pronto
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

// Number pad component for rep input
const NumberPad = ({ initialValue, onConfirm, onClose }: { initialValue: number | null; onConfirm: (val: number | null) => void; onClose: () => void }) => {
  const [value, setValue] = useState(initialValue?.toString() || "");

  const handleKey = (key: string) => {
    if (key === "backspace") {
      setValue(prev => prev.slice(0, -1));
    } else if (key === "00") {
      setValue(prev => prev + "00");
    } else {
      setValue(prev => prev + key);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Display */}
      <div className="text-center py-3">
        <span className="text-3xl font-bold text-foreground">{value || "0"}</span>
        <span className="text-lg text-muted-foreground ml-1">reps</span>
      </div>

      {/* Number grid */}
      <div className="grid grid-cols-4 gap-2">
        {["1", "2", "3", "backspace", "4", "5", "6", "", "7", "8", "9", "confirm", "00", "0"].map((key, i) => {
          if (key === "") return <div key={i} />;
          if (key === "backspace") {
            return (
              <button key={i} onClick={() => handleKey("backspace")} className="bg-muted rounded-xl py-4 text-lg font-bold text-foreground flex items-center justify-center">
                ⌫
              </button>
            );
          }
          if (key === "confirm") {
            return (
              <button
                key={i}
                onClick={() => onConfirm(value ? parseInt(value) : null)}
                className="bg-primary text-primary-foreground rounded-xl py-4 text-sm font-bold row-span-2 flex items-center justify-center"
                style={{ gridRow: "span 2" }}
              >
                OK
              </button>
            );
          }
          return (
            <button key={i} onClick={() => handleKey(key)} className="bg-muted rounded-xl py-4 text-lg font-bold text-foreground">
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Treinos;
