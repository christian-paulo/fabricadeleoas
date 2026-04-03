import { useEffect, useState, useMemo } from "react";
import { Play, CheckCircle2, Loader2, ArrowLeft, Dumbbell, Target } from "lucide-react";
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

  const submitFeedback = async (fb: FeedbackType) => {
    if (!workout) return;
    const { error } = await supabase.from("workouts").update({ completed: true, feedback_effort: fb }).eq("id", workout.id);
    if (error) { toast.error("Erro ao salvar feedback"); }
    else { setFeedback(fb); setCompleted(true); setShowFeedback(false); toast.success("Caçada concluída! 🎉"); }
  };

  const generateNextWorkout = async () => {
    setCompleted(false); setFeedback(null); setWorkout(null);
    await fetchCurrentWorkout();
  };

  const workoutJson = workout?.workout_json;
  const triSets = workoutJson?.tri_sets || [];

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
          <span className="text-muted-foreground text-base">Preparando seu protocolo...</span>
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
              onClick={() => setShowFeedback(true)}
              className="w-full pink-gradient text-primary-foreground font-heading text-lg h-16 rounded-2xl mb-24 shadow-lg"
            >
              Início
            </Button>
          ) : (
            <div className="soft-card p-5 text-center mb-4">
              <CheckCircle2 className="mx-auto text-primary mb-3" size={40} />
              <p className="text-base text-foreground font-bold">Caçada concluída! 🎉</p>
              <p className="text-sm text-muted-foreground mb-4">
                Feedback: {feedback === "facil" ? "Fácil" : feedback === "ideal" ? "Ideal" : "Muito Difícil"}
              </p>
              <Button
                onClick={generateNextWorkout}
                className="pink-gradient text-primary-foreground font-heading text-base h-12 rounded-2xl px-8 shadow-lg"
              >
                Gerar Próximo Protocolo
              </Button>
            </div>
          )}
          </div>
        </>
      )}

      {/* Feedback dialog */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
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
                onClick={() => submitFeedback(opt.value)}
                className="soft-card p-5 text-left hover:ring-2 hover:ring-primary transition-all"
              >
                <p className="text-base font-bold text-foreground">{opt.label}</p>
                <p className="text-sm text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Video modal - exercise detail */}
      <Dialog open={!!videoModal} onOpenChange={() => setVideoModal(null)}>
        <DialogContent className="bg-card border-border max-w-md mx-auto rounded-t-3xl p-0 gap-0 [&>button]:hidden">
          {videoModal?.url && (
            <div className="aspect-video w-full">
              <iframe
                src={videoModal.url.replace("watch?v=", "embed/")}
                className="w-full h-full rounded-t-3xl"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          )}
          <div className="p-6">
            <h3 className="text-2xl font-heading font-bold text-foreground mb-6">{videoModal?.name}</h3>
            <Button
              onClick={() => setVideoModal(null)}
              className="w-full pink-gradient text-primary-foreground font-heading text-lg h-14 rounded-2xl shadow-lg"
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
