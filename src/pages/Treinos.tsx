import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Play, CheckCircle2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type FeedbackType = "facil" | "ideal" | "dificil" | null;

const Treinos = () => {
  const { user } = useAuth();
  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [videoModal, setVideoModal] = useState<{ name: string; url: string } | null>(null);
  const [phase, setPhase] = useState<string>("initial");
  const [workoutNumber, setWorkoutNumber] = useState<number>(1);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [exerciseState, setExerciseState] = useState<Record<string, { carga: string; rpe: string; done: boolean }>>({});

  useEffect(() => {
    if (!user) return;
    fetchCurrentWorkout();
  }, [user]);

  const fetchCurrentWorkout = async () => {
    setLoading(true);
    try {
      const { data: rawData, error } = await supabase.functions.invoke("generate-workout", { body: {} });
      if (error) {
        console.error("generate-workout error:", error);
        toast.error("Erro ao carregar treino");
      } else {
        const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
        if (data?.workout) {
          setWorkout(data.workout);
          setCompleted(data.workout.completed || false);
          setFeedback(data.workout.feedback_effort as FeedbackType);
          setPhase(data.phase || "initial");
          setWorkoutNumber(data.workoutNumber || 1);
          setCompletedCount(data.completedCount || 0);
        } else {
          toast.error("Treino não encontrado");
        }
      }
    } catch (err) {
      console.error("generate-workout catch:", err);
      toast.error("Erro ao carregar treino");
    }
    setLoading(false);
  };

  const toggleExerciseDone = (key: string) => {
    setExerciseState((prev) => ({
      ...prev,
      [key]: { ...prev[key], done: !prev[key]?.done },
    }));
  };

  const updateExerciseField = (key: string, field: "carga" | "rpe", value: string) => {
    setExerciseState((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const submitFeedback = async (fb: FeedbackType) => {
    if (!workout) return;
    const { error } = await supabase.from("workouts")
      .update({ completed: true, feedback_effort: fb }).eq("id", workout.id);
    if (error) {
      toast.error("Erro ao salvar feedback");
    } else {
      setFeedback(fb);
      setCompleted(true);
      setShowFeedback(false);
      toast.success("Caçada concluída! 🎉");
    }
  };

  const generateNextWorkout = async () => {
    setCompleted(false);
    setFeedback(null);
    setWorkout(null);
    setExerciseState({});
    await fetchCurrentWorkout();
  };

  const workoutJson = workout?.workout_json;
  const triSets = workoutJson?.tri_sets || [];
  const allExercises = triSets.flatMap((ts: any) => ts.exercises || []);
  const doneCount = Object.values(exerciseState).filter((e) => e.done).length;
  const totalExercises = allExercises.length;
  const progressPercent = totalExercises > 0 ? (doneCount / totalExercises) * 100 : 0;

  const phaseLabel = phase === "monthly"
    ? `Programa Mensal • Treino ${workoutNumber}`
    : `Fase Inicial • Treino ${workoutNumber} de 3`;

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button className="w-10 h-10 rounded-full bg-card flex items-center justify-center border border-border">
          <ChevronLeft size={20} className="text-foreground" />
        </button>
        <h1 className="text-lg font-heading text-foreground uppercase text-center flex-1">
          {workoutJson?.title || "Treino do Dia"}
        </h1>
        <button className="w-10 h-10 rounded-full bg-card flex items-center justify-center border border-border">
          <ChevronRight size={20} className="text-foreground" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground text-center mb-3">{phaseLabel}</p>

      {/* Progress */}
      <div className="mb-6">
        <Progress value={progressPercent} className="h-2 bg-muted" />
        <p className="text-right text-xs text-muted-foreground mt-1 font-bold">{doneCount}/{totalExercises}</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary mb-4" size={40} />
          <span className="text-muted-foreground text-base font-medium">Gerando seu treino com IA...</span>
        </div>
      ) : triSets.length === 0 ? (
        <div className="neu-card p-6 text-center">
          <p className="text-muted-foreground text-base">Nenhum treino disponível.</p>
        </div>
      ) : (
        <>
          {triSets.map((ts: any, idx: number) => (
            <div key={idx} className="mb-6">
              <h3 className="section-title text-primary mb-3">{ts.label}</h3>
              <div className="space-y-4">
                {ts.exercises?.map((ex: any, i: number) => {
                  const key = `${idx}-${i}`;
                  const state = exerciseState[key] || { carga: "0", rpe: "0", done: false };
                  return (
                    <div key={key} className={`neu-card p-4 transition-all ${state.done ? "border-primary/50 opacity-70" : ""}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-base font-heading text-foreground uppercase">{ex.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {ex.sets || "3"} séries  •  {ex.reps}  •  {ex.rest || "60s"} descanso
                          </p>
                        </div>
                        <button onClick={() => toggleExerciseDone(key)}
                          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                            state.done ? "bg-primary border-primary" : "border-muted-foreground/40"
                          }`}>
                          {state.done && <CheckCircle2 size={18} className="text-primary-foreground" />}
                        </button>
                      </div>

                      {/* Carga and RPE inputs */}
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="text-xs text-muted-foreground font-semibold mb-1 block">Carga (kg)</label>
                          <Input type="number" value={state.carga}
                            onChange={(e) => updateExerciseField(key, "carga", e.target.value)}
                            className="bg-input border-border text-foreground h-11 text-base font-bold text-center rounded-xl" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground font-semibold mb-1 block">RPE (1-10)</label>
                          <Input type="number" value={state.rpe} min={0} max={10}
                            onChange={(e) => updateExerciseField(key, "rpe", e.target.value)}
                            className="bg-input border-border text-foreground h-11 text-base font-bold text-center rounded-xl" />
                        </div>
                      </div>

                      {/* Video button */}
                      {ex.video_url && (
                        <button onClick={() => setVideoModal({ name: ex.name, url: ex.video_url })}
                          className="w-full mt-3 py-2.5 rounded-xl bg-muted flex items-center justify-center gap-2 text-sm text-foreground font-medium hover:bg-muted/80 transition-colors">
                          <Play size={16} className="text-foreground" /> Ver Vídeo
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {!completed ? (
            <Button onClick={() => setShowFeedback(true)}
              className="w-full gold-gradient text-primary-foreground font-heading text-base h-14 rounded-2xl mb-4">
              <CheckCircle2 size={20} className="mr-2" /> Concluir Caçada
            </Button>
          ) : (
            <div className="neu-card p-5 text-center mb-4 border border-primary/30">
              <CheckCircle2 className="mx-auto text-primary mb-3" size={40} />
              <p className="text-lg font-heading text-foreground">Caçada concluída! 🎉</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Feedback: {feedback === "facil" ? "Fácil" : feedback === "ideal" ? "Ideal" : "Muito Difícil"}
              </p>
              <Button onClick={generateNextWorkout}
                className="gold-gradient text-primary-foreground font-heading h-12 rounded-2xl px-8 text-base">
                Gerar Próximo Treino
              </Button>
            </div>
          )}
        </>
      )}

      {/* Feedback Modal */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-primary text-center text-xl font-heading">Como foi o esforço?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            {[
              { value: "facil" as FeedbackType, label: "😊 Fácil", desc: "Poderia ter feito mais" },
              { value: "ideal" as FeedbackType, label: "💪 Ideal", desc: "Na medida certa" },
              { value: "dificil" as FeedbackType, label: "🔥 Muito Difícil", desc: "Quase não consegui" },
            ].map((opt) => (
              <button key={opt.value} onClick={() => submitFeedback(opt.value)}
                className="neu-card p-4 text-left hover:border-primary/50 transition-all border border-transparent">
                <p className="text-base font-bold text-foreground">{opt.label}</p>
                <p className="text-sm text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Modal */}
      <Dialog open={!!videoModal} onOpenChange={() => setVideoModal(null)}>
        <DialogContent className="bg-card border-border max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-primary font-heading">{videoModal?.name}</DialogTitle>
          </DialogHeader>
          {videoModal?.url && (
            <div className="aspect-video">
              <iframe src={videoModal.url.replace("watch?v=", "embed/")} className="w-full h-full rounded-lg"
                allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Treinos;
