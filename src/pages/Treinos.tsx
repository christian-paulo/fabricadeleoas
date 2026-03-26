import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Play, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const phaseLabel = phase === "monthly" ? `Programa Mensal • Protocolo ${workoutNumber}` : `Fase Inicial • Protocolo ${workoutNumber} de 3`;

  return (
    <AppLayout>
      <h1 className="text-3xl text-foreground mb-1 uppercase">Protocolo do Dia</h1>
      <p className="text-sm text-primary font-heading mb-1">{phaseLabel}</p>
      <p className="text-base text-muted-foreground mb-6">
        {workoutJson?.title || "Carregando..."} {workoutJson?.total_series ? `• ${workoutJson.total_series} séries` : ""}
      </p>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary mb-3" size={40} />
          <span className="text-muted-foreground text-base">Preparando seu protocolo...</span>
        </div>
      ) : triSets.length === 0 ? (
        <div className="soft-card p-6 text-center">
          <p className="text-muted-foreground text-base">Nenhum protocolo disponível.</p>
        </div>
      ) : (
        <>
          {triSets.map((ts: any, idx: number) => (
            <div key={idx} className="mb-6">
              <h3 className="text-sm font-heading text-primary mb-3 uppercase tracking-widest">{ts.label}</h3>
              <div className="space-y-3">
                {ts.exercises?.map((ex: any, i: number) => (
                  <div key={i} className="soft-card p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full pink-gradient flex items-center justify-center text-sm font-heading text-primary-foreground font-bold shadow-md">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-base text-foreground font-bold uppercase">{ex.name}</p>
                      <p className="text-sm text-muted-foreground">{ex.reps}</p>
                    </div>
                    {ex.video_url && (
                      <button onClick={() => setVideoModal({ name: ex.name, url: ex.video_url })}
                        className="w-10 h-10 rounded-full pink-gradient flex items-center justify-center text-primary-foreground shadow-md">
                        <Play size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {!completed ? (
            <Button onClick={() => setShowFeedback(true)}
              className="w-full pink-gradient text-primary-foreground font-heading text-base h-14 rounded-2xl mb-4 shadow-lg">
              <CheckCircle2 size={20} className="mr-2" /> Concluir Caçada
            </Button>
          ) : (
            <div className="soft-card p-5 text-center mb-4">
              <CheckCircle2 className="mx-auto text-primary mb-3" size={40} />
              <p className="text-base text-foreground font-bold">Caçada concluída! 🎉</p>
              <p className="text-sm text-muted-foreground mb-4">
                Feedback: {feedback === "facil" ? "Fácil" : feedback === "ideal" ? "Ideal" : "Muito Difícil"}
              </p>
              <Button onClick={generateNextWorkout}
                className="pink-gradient text-primary-foreground font-heading text-base h-12 rounded-2xl px-8 shadow-lg">
                Gerar Próximo Protocolo
              </Button>
            </div>
          )}
        </>
      )}

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
              <button key={opt.value} onClick={() => submitFeedback(opt.value)}
                className="soft-card p-5 text-left hover:ring-2 hover:ring-primary transition-all">
                <p className="text-base font-bold text-foreground">{opt.label}</p>
                <p className="text-sm text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!videoModal} onOpenChange={() => setVideoModal(null)}>
        <DialogContent className="bg-card border-border max-w-md mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-primary text-lg">{videoModal?.name}</DialogTitle>
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
