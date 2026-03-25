import AppLayout from "@/components/AppLayout";
import { Play, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const mockExercises = [
  { id: "1", name: "Supino Inclinado com Halteres", reps: "15 a 30 reps", videoUrl: "" },
  { id: "2", name: "Crucifixo na Máquina", reps: "15 a 30 reps", videoUrl: "" },
  { id: "3", name: "Flexão de Braços", reps: "15 a 30 reps", videoUrl: "" },
  { id: "4", name: "Elevação Lateral", reps: "15 a 30 reps", videoUrl: "" },
  { id: "5", name: "Desenvolvimento com Halteres", reps: "15 a 30 reps", videoUrl: "" },
  { id: "6", name: "Encolhimento com Barra", reps: "15 a 30 reps", videoUrl: "" },
];

const triSets = [
  { label: "Tri-set A", exercises: mockExercises.slice(0, 3) },
  { label: "Tri-set B", exercises: mockExercises.slice(3, 6) },
];

type FeedbackType = "facil" | "ideal" | "dificil" | null;

const Treinos = () => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [completed, setCompleted] = useState(false);

  const handleFinish = () => setShowFeedback(true);

  const submitFeedback = (fb: FeedbackType) => {
    setFeedback(fb);
    setCompleted(true);
    setShowFeedback(false);
  };

  return (
    <AppLayout>
      <h1 className="text-2xl text-foreground mb-1">Treino do Dia</h1>
      <p className="text-sm text-muted-foreground mb-6">Membros Superiores • 3 séries</p>

      {triSets.map((ts) => (
        <div key={ts.label} className="mb-6">
          <h3 className="text-xs font-heading text-primary mb-3 uppercase tracking-wider">{ts.label}</h3>
          <div className="space-y-3">
            {ts.exercises.map((ex, i) => (
              <div key={ex.id} className="neu-card p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-heading text-primary">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium">{ex.name}</p>
                  <p className="text-xs text-muted-foreground">{ex.reps}</p>
                </div>
                <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-primary">
                  <Play size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!completed ? (
        <Button onClick={handleFinish} className="w-full gold-gradient text-primary-foreground font-heading h-12 rounded-xl mb-4">
          <CheckCircle2 size={18} className="mr-2" />
          Concluir Caçada
        </Button>
      ) : (
        <div className="neu-card p-4 text-center mb-4">
          <CheckCircle2 className="mx-auto text-primary mb-2" size={32} />
          <p className="text-sm text-foreground">Caçada concluída! 🎉</p>
          <p className="text-xs text-muted-foreground">Feedback: {feedback === "facil" ? "Fácil" : feedback === "ideal" ? "Ideal" : "Muito Difícil"}</p>
        </div>
      )}

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
              <button
                key={opt.value}
                onClick={() => submitFeedback(opt.value)}
                className="neu-card p-4 text-left hover:ring-1 hover:ring-primary transition-all"
              >
                <p className="text-sm font-medium text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Treinos;
