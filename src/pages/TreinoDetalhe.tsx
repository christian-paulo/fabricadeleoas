import { useEffect, useState, useMemo } from "react";
import { Play, CheckCircle2, Loader2, ArrowLeft, Dumbbell, Target, Send } from "lucide-react";
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
      } else { toast.error("Protocolo não encontrado"); }
    } catch { toast.error("Erro ao carregar protocolo"); }
    setLoading(false);
  };

  const submitFeedback = async () => {
    if (!workout || !selectedEffort) return;
    const { error } = await supabase.from("workouts").update({ completed: true, feedback_effort: selectedEffort }).eq("id", workout.id);
    if (error) { toast.error("Erro ao salvar feedback"); }
    else { setFeedback(selectedEffort); setCompleted(true); setFeedbackStep(null); setShowFeedback(false); toast.success("Treino finalizado! 🎉"); navigate("/treinos"); }
  };

  const generateNextWorkout = async () => {
    setCompleted(false); setFeedback(null); setWorkout(null);
    await fetchCurrentWorkout();
  };

  const [dbExercises, setDbExercises] = useState<{ name: string; video_url: string }[]>([]);

  // Fetch exercises from DB for video URL matching
  useEffect(() => {
    const fetchVideos = async () => {
      const { data } = await supabase.from("exercises").select("name, video_url");
      if (data) setDbExercises(data.filter((e) => !!e.video_url) as { name: string; video_url: string }[]);
    };
    fetchVideos();
  }, []);

  // Fuzzy match: find the best matching exercise by name similarity
  const findVideoUrl = (exerciseName: string): string | null => {
    if (!exerciseName || dbExercises.length === 0) return null;
    const lower = exerciseName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Exact match first
    const exact = dbExercises.find((e) => e.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === lower);
    if (exact) return exact.video_url;
    // Partial match: check if DB name contains the exercise name or vice-versa
    const partial = dbExercises.find((e) => {
      const dbLower = e.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return dbLower.includes(lower) || lower.includes(dbLower);
    });
    if (partial) return partial.video_url;
    // Word-based match: find exercise with most common words
    const words = lower.split(/\s+/).filter((w) => w.length > 2);
    let bestMatch: { name: string; video_url: string } | null = null;
    let bestScore = 0;
    for (const e of dbExercises) {
      const dbWords = e.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/);
      const score = words.filter((w) => dbWords.some((dw) => dw.includes(w) || w.includes(dw))).length;
      if (score > bestScore && score >= 2) { bestScore = score; bestMatch = e; }
    }
    return bestMatch?.video_url || null;
  };

  const workoutJson = workout?.workout_json;
  const triSets = useMemo(() => {
    const sets = workoutJson?.tri_sets || [];
    return sets.map((ts: any) => ({
      ...ts,
      exercises: ts.exercises?.map((ex: any) => {
        const hasValidUrl = ex.video_url && ex.video_url.length > 10 && ex.video_url.startsWith("http");
        return {
          ...ex,
          video_url: hasValidUrl ? ex.video_url : findVideoUrl(ex.name),
        };
      }),
    }));
  }, [workoutJson, dbExercises]);

  // Compute stats
  const stats = useMemo(() => {
    let totalExercises = 0;
    const focusAreas = new Set<string>();
    triSets.forEach((ts: any) => {
      ts.exercises?.forEach((ex: any) => {
        totalExercises++;
        if (ex.muscle_group) focusAreas.add(ex.muscle_group);
      });
    });
    return {
      totalExercises,
      focusAreas: focusAreas.size > 0 ? Array.from(focusAreas).join(", ") : workoutJson?.title || "Corpo todo",
      duration: workoutJson?.estimated_duration || "~30 min",
      level: workoutJson?.level || "Intermediário",
    };
  }, [triSets, workoutJson]);

  const dayLabel = `${workoutNumber}º dia`;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Loader2 className="animate-spin text-primary mb-3" size={40} />
          <span className="text-muted-foreground text-base">Carregando seu protocolo...</span>
        </div>
      ) : triSets.length === 0 ? (
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
              <p className="text-xs text-muted-foreground">{triSets.length} séries</p>
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
              {triSets.map((ts: any, idx: number) => (
                <div key={idx}>
                  <p className="text-xs font-heading text-primary uppercase tracking-widest mb-2">{ts.label}</p>
                  {ts.exercises?.map((ex: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 py-3 border-b border-border last:border-0"
                    >
                      {/* Thumbnail / play area */}
                      <button
                        onClick={() => ex.video_url && setVideoModal({ name: ex.name, url: ex.video_url })}
                        className="relative w-20 h-20 rounded-2xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Play className="w-5 h-5 text-primary ml-0.5" />
                        </div>
                      </button>

                      {/* Exercise info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-foreground leading-tight">{ex.name}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{ex.reps}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom action */}
          {!completed ? (
            <Button
              onClick={() => { setFeedbackStep("effort"); setShowFeedback(true); }}
              className="w-full pink-gradient text-primary-foreground font-heading text-lg h-16 rounded-2xl mb-24 shadow-lg"
            >
              Finalizar Treino
            </Button>
          ) : (
            <div className="soft-card p-5 text-center mb-24">
              <CheckCircle2 className="mx-auto text-primary mb-3" size={40} />
              <p className="text-base text-foreground font-bold">Treino finalizado! 🎉</p>
              <p className="text-sm text-muted-foreground mb-4">
                Feedback: {feedback === "facil" ? "Fácil" : feedback === "ideal" ? "Ideal" : "Muito Difícil"}
              </p>
              <Button
                onClick={() => navigate("/treinos")}
                className="pink-gradient text-primary-foreground font-heading text-base h-12 rounded-2xl px-8 shadow-lg"
              >
                Voltar ao Plano
              </Button>
            </div>
          )}
          </div>
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
        <DialogContent className="bg-card border-border max-w-md mx-auto rounded-2xl p-0 gap-0 [&>button]:hidden overflow-hidden">
          {videoModal?.url && (
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
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

      <BottomNav />
    </div>
  );
};

export default Treinos;
