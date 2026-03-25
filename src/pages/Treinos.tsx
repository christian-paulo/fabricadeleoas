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

  useEffect(() => {
    if (!user) return;
    const fetchWorkout = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase.from("workouts")
        .select("*").eq("profile_id", user.id).eq("date", today).maybeSingle();

      if (data) {
        setWorkout(data);
        setCompleted(data.completed);
        setFeedback(data.feedback_effort);
      } else {
        // Generate workout
        const { data: genData, error } = await supabase.functions.invoke("generate-workout", {
          body: { date: today },
        });
        if (error) toast.error("Erro ao gerar treino");
        else if (genData?.workout) setWorkout(genData.workout);
      }
      setLoading(false);
    };
    fetchWorkout();
  }, [user]);

  const submitFeedback = async (fb: FeedbackType) => {
    if (!workout) return;
    const { error } = await supabase.from("workouts")
      .update({ completed: true, feedback_effort: fb }).eq("id", workout.id);
    if (error) toast.error("Erro ao salvar feedback");
    else {
      setFeedback(fb);
      setCompleted(true);
      setShowFeedback(false);
      toast.success("Caçada concluída! 🎉");
    }
  };

  const workoutJson = workout?.workout_json;
  const triSets = workoutJson?.tri_sets || [];

  return (
    <AppLayout>
      <h1 className="text-2xl text-foreground mb-1">Treino do Dia</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {workoutJson?.title || "Carregando..."} {workoutJson?.total_series ? `• ${workoutJson.total_series} séries` : ""}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={32} />
          <span className="ml-3 text-muted-foreground text-sm">Gerando seu treino com IA...</span>
        </div>
      ) : triSets.length === 0 ? (
        <div className="neu-card p-6 text-center">
          <p className="text-muted-foreground text-sm">Nenhum treino disponível. Cadastre exercícios no painel admin.</p>
        </div>
      ) : (
        <>
          {triSets.map((ts: any, idx: number) => (
            <div key={idx} className="mb-6">
              <h3 className="text-xs font-heading text-primary mb-3 uppercase tracking-wider">{ts.label}</h3>
              <div className="space-y-3">
                {ts.exercises?.map((ex: any, i: number) => (
                  <div key={i} className="neu-card p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-heading text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground font-medium">{ex.name}</p>
                      <p className="text-xs text-muted-foreground">{ex.reps}</p>
                    </div>
                    {ex.video_url && (
                      <button onClick={() => setVideoModal({ name: ex.name, url: ex.video_url })}
                        className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-primary">
                        <Play size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {!completed ? (
            <Button onClick={() => setShowFeedback(true)}
              className="w-full gold-gradient text-primary-foreground font-heading h-12 rounded-xl mb-4">
              <CheckCircle2 size={18} className="mr-2" /> Concluir Caçada
            </Button>
          ) : (
            <div className="neu-card p-4 text-center mb-4">
              <CheckCircle2 className="mx-auto text-primary mb-2" size={32} />
              <p className="text-sm text-foreground">Caçada concluída! 🎉</p>
              <p className="text-xs text-muted-foreground">
                Feedback: {feedback === "facil" ? "Fácil" : feedback === "ideal" ? "Ideal" : "Muito Difícil"}
              </p>
            </div>
          )}
        </>
      )}

      {/* Feedback Modal */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-primary text-center">Como foi o esforço de hoje?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            {[
              { value: "facil" as FeedbackType, label: "😊 Fácil", desc: "Poderia ter feito mais" },
              { value: "ideal" as FeedbackType, label: "💪 Ideal", desc: "Na medida certa" },
              { value: "dificil" as FeedbackType, label: "🔥 Muito Difícil", desc: "Quase não consegui" },
            ].map((opt) => (
              <button key={opt.value} onClick={() => submitFeedback(opt.value)}
                className="neu-card p-4 text-left hover:ring-1 hover:ring-primary transition-all">
                <p className="text-sm font-medium text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Modal */}
      <Dialog open={!!videoModal} onOpenChange={() => setVideoModal(null)}>
        <DialogContent className="bg-card border-border max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">{videoModal?.name}</DialogTitle>
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
