import { useEffect, useState, useMemo, useCallback } from "react";
import { Play, CheckCircle2, Loader2, ArrowLeft, ChevronUp, ChevronDown, Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

type FeedbackType = "facil" | "ideal" | "dificil" | null;
type FeedbackStep = "effort" | "comment" | null;

interface SeriesState {
  reps: number;
  completed: boolean;
}

interface ExerciseProgress {
  [exerciseIndex: number]: SeriesState[];
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

  // New state for exercise tracking
  const [expandedExercise, setExpandedExercise] = useState<number | null>(0);
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress>({});
  const [editingCell, setEditingCell] = useState<{ exIdx: number; setIdx: number } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  useEffect(() => {
    if (completed || loading) return;
    const interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [completed, loading]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

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

        // Initialize exercise progress
        const wJson = data.workout.workout_json;
        const exs = wJson?.exercises || [];
        const progress: ExerciseProgress = {};
        exs.forEach((ex: any, idx: number) => {
          const sets = ex.sets || 3;
          const defaultReps = parseInt(ex.reps) || 15;
          progress[idx] = Array.from({ length: sets }, () => ({
            reps: defaultReps,
            completed: false,
          }));
        });
        setExerciseProgress(progress);
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
  
  // Support both old tri_sets format and new exercises format
  const exercisesList = useMemo(() => {
    if (workoutJson?.exercises) {
      return workoutJson.exercises.map((ex: any) => {
        const hasValidUrl = ex.video_url && ex.video_url.length > 10 && ex.video_url.startsWith("http");
        return {
          ...ex,
          video_url: hasValidUrl ? ex.video_url : findVideoUrl(ex.name),
        };
      });
    }
    // Fallback: flatten tri_sets into individual exercises
    if (workoutJson?.tri_sets) {
      const flat: any[] = [];
      for (const ts of workoutJson.tri_sets) {
        for (const ex of (ts.exercises || [])) {
          const hasValidUrl = ex.video_url && ex.video_url.length > 10 && ex.video_url.startsWith("http");
          flat.push({
            ...ex,
            sets: ex.sets || 3,
            video_url: hasValidUrl ? ex.video_url : findVideoUrl(ex.name),
          });
        }
      }
      return flat;
    }
    return [];
  }, [workoutJson, dbExercises]);

  // Initialize progress when exercises list changes (for old format)
  useEffect(() => {
    if (exercisesList.length > 0 && Object.keys(exerciseProgress).length === 0) {
      const progress: ExerciseProgress = {};
      exercisesList.forEach((ex: any, idx: number) => {
        const sets = ex.sets || 3;
        const defaultReps = parseInt(ex.reps) || 15;
        progress[idx] = Array.from({ length: sets }, () => ({
          reps: defaultReps,
          completed: false,
        }));
      });
      setExerciseProgress(progress);
    }
  }, [exercisesList]);

  const toggleSeriesComplete = useCallback((exIdx: number, setIdx: number) => {
    setExerciseProgress(prev => {
      const updated = { ...prev };
      const series = [...(updated[exIdx] || [])];
      series[setIdx] = { ...series[setIdx], completed: !series[setIdx].completed };
      updated[exIdx] = series;
      return updated;
    });
  }, []);

  const markAllSeries = useCallback((exIdx: number) => {
    setExerciseProgress(prev => {
      const updated = { ...prev };
      const series = updated[exIdx] || [];
      const allDone = series.every(s => s.completed);
      updated[exIdx] = series.map(s => ({ ...s, completed: !allDone }));
      return updated;
    });
  }, []);

  const isExerciseComplete = (exIdx: number) => {
    const series = exerciseProgress[exIdx] || [];
    return series.length > 0 && series.every(s => s.completed);
  };

  const completedSetsCount = (exIdx: number) => {
    return (exerciseProgress[exIdx] || []).filter(s => s.completed).length;
  };

  const totalSetsCount = (exIdx: number) => {
    return (exerciseProgress[exIdx] || []).length;
  };

  const updateReps = useCallback((exIdx: number, setIdx: number, reps: number) => {
    setExerciseProgress(prev => {
      const updated = { ...prev };
      const series = [...(updated[exIdx] || [])];
      series[setIdx] = { ...series[setIdx], reps };
      updated[exIdx] = series;
      return updated;
    });
  }, []);

  const startEditReps = (exIdx: number, setIdx: number) => {
    const current = exerciseProgress[exIdx]?.[setIdx]?.reps || 0;
    setEditValue(current.toString());
    setEditingCell({ exIdx, setIdx });
  };

  const confirmEdit = () => {
    if (editingCell) {
      const val = parseInt(editValue) || 0;
      updateReps(editingCell.exIdx, editingCell.setIdx, val);
      setEditingCell(null);
    }
  };

  // Find next incomplete exercise
  const goToNextExercise = () => {
    for (let i = 0; i < exercisesList.length; i++) {
      if (!isExerciseComplete(i)) {
        setExpandedExercise(i);
        return;
      }
    }
  };

  const allExercisesDone = exercisesList.length > 0 && exercisesList.every((_: any, idx: number) => isExerciseComplete(idx));

  const restSeconds = workoutJson?.rest_seconds || 45;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Loader2 className="animate-spin text-primary mb-3" size={40} />
          <span className="text-muted-foreground text-base">Carregando seu protocolo...</span>
        </div>
      ) : exercisesList.length === 0 ? (
        <div className="px-4 pt-6">
          <div className="soft-card p-6 text-center">
            <p className="text-muted-foreground text-base">Nenhum protocolo disponível.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="sticky top-0 z-30 bg-background border-b border-border px-4 py-3">
            <div className="flex items-center justify-between">
              <button onClick={() => navigate("/treinos")} className="p-1">
                <ArrowLeft className="w-6 h-6 text-foreground" />
              </button>
              <div className="text-center">
                <p className="text-base font-heading font-bold text-foreground">{workoutJson?.title || "Treino do dia"}</p>
                <p className="text-sm text-muted-foreground">{formatTime(timerSeconds)}</p>
              </div>
              {allExercisesDone && !completed ? (
                <button
                  onClick={() => { setFeedbackStep("effort"); setShowFeedback(true); }}
                  className="text-primary font-heading font-bold text-sm"
                >
                  Acabado
                </button>
              ) : <div className="w-16" />}
            </div>
          </div>

          {/* Exercise list */}
          <div className="px-4 pt-4 pb-32 space-y-3">
            {exercisesList.map((ex: any, exIdx: number) => {
              const isExpanded = expandedExercise === exIdx;
              const isDone = isExerciseComplete(exIdx);
              const completedSets = completedSetsCount(exIdx);
              const totalSets = totalSetsCount(exIdx);

              return (
                <div
                  key={exIdx}
                  className={`rounded-2xl overflow-hidden transition-all ${
                    isDone ? "bg-primary/10 border border-primary/30" : "bg-card border border-border"
                  }`}
                >
                  {/* Exercise header */}
                  <button
                    className="w-full flex items-center gap-3 p-4"
                    onClick={() => setExpandedExercise(isExpanded ? null : exIdx)}
                  >
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Thumbnail */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (ex.video_url) setVideoModal({ name: ex.name, url: ex.video_url });
                      }}
                      className="relative w-16 h-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Play className="w-4 h-4 text-primary ml-0.5" />
                      </div>
                    </button>

                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-bold text-foreground leading-tight uppercase">{ex.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isDone ? (
                          <span className="flex items-center gap-1 text-primary">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {completedSets}/{totalSets} feito(s)
                          </span>
                        ) : (
                          `${completedSets}/${totalSets} feito(s)`
                        )}
                      </p>
                    </div>

                    {/* 3 dots menu placeholder */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                      <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                      <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                    </div>
                  </button>

                  {/* Expanded series */}
                  {isExpanded && (
                    <div className="px-4 pb-3">
                      {/* Table header */}
                      <div className="grid grid-cols-[36px_1fr_36px] gap-2 mb-1 px-1">
                        <span className="text-[10px] font-bold text-muted-foreground">Série</span>
                        <span className="text-[10px] font-bold text-muted-foreground text-center">Rep.</span>
                        <span></span>
                      </div>

                      {/* Series rows */}
                      {(exerciseProgress[exIdx] || []).map((series, setIdx) => (
                        <div
                          key={setIdx}
                          className={`grid grid-cols-[36px_1fr_36px] gap-2 items-center rounded-lg px-1 py-1.5 ${
                            series.completed ? "bg-primary/10" : ""
                          }`}
                        >
                          <span className={`text-sm font-bold text-center ${series.completed ? "text-primary" : "text-foreground"}`}>
                            {setIdx + 1}
                          </span>

                          <button
                            onClick={() => startEditReps(exIdx, setIdx)}
                            className="bg-muted rounded-lg py-2 px-3 text-center"
                          >
                            <span className="text-sm font-bold text-foreground">{series.reps}</span>
                          </button>

                          <button
                            onClick={() => toggleSeriesComplete(exIdx, setIdx)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto transition-all ${
                              series.completed ? "bg-primary" : "bg-muted"
                            }`}
                          >
                            {series.completed && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                          </button>
                        </div>
                      ))}

                      <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                        Descanso: {restSeconds}s entre séries
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom action bar */}
          {!completed && (
            <div className="fixed bottom-16 left-0 right-0 z-30 max-w-lg mx-auto px-4 pb-3 pt-2 bg-background/95 backdrop-blur-sm border-t border-border">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    // Mark all exercises as complete
                    setExerciseProgress(prev => {
                      const updated = { ...prev };
                      const allDone = exercisesList.every((_: any, idx: number) => isExerciseComplete(idx));
                      exercisesList.forEach((_: any, idx: number) => {
                        updated[idx] = (updated[idx] || []).map(s => ({ ...s, completed: !allDone }));
                      });
                      return updated;
                    });
                  }}
                  className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-card border border-border"
                >
                  <Check className="w-5 h-5 text-foreground" />
                  <span className="text-xs font-bold text-foreground">Todos</span>
                </button>

                <Button
                  onClick={() => {
                    if (allExercisesDone) {
                      setFeedbackStep("effort");
                      setShowFeedback(true);
                    } else {
                      goToNextExercise();
                    }
                  }}
                  className="flex-1 pink-gradient text-primary-foreground font-heading text-lg h-14 rounded-2xl shadow-lg"
                >
                  {allExercisesDone ? "Finalizar Treino" : "Registrar Próximo"}
                </Button>
              </div>
            </div>
          )}

          {completed && (
            <div className="px-4 pb-32">
              <div className="soft-card p-5 text-center">
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
            </div>
          )}
        </>
      )}

      {/* Numeric input modal */}
      <Dialog open={!!editingCell} onOpenChange={(open) => { if (!open) confirmEdit(); }}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto rounded-2xl p-0 gap-0">
          <div className="p-4 text-center">
            <p className="text-lg font-bold text-foreground mb-2">Repetições</p>
            <div className="bg-muted rounded-xl py-4 px-6 mb-4">
              <span className="text-3xl font-bold text-primary">{editValue || "0"}</span>
            </div>
            {/* Numeric keypad */}
            <div className="grid grid-cols-4 gap-2">
              {[1,2,3,null,4,5,6,null,7,8,9,null].map((num, i) => {
                if (i % 4 === 3) {
                  // Right column buttons
                  const row = Math.floor(i / 4);
                  if (row === 0) return (
                    <button key={`del`} onClick={() => setEditValue(v => v.slice(0, -1))} className="bg-muted rounded-xl py-4 text-lg font-bold text-foreground">⌫</button>
                  );
                  if (row === 1) return <div key={`empty-${i}`} />;
                  if (row === 2) return <div key={`empty2-${i}`} />;
                  return null;
                }
                return (
                  <button
                    key={num}
                    onClick={() => setEditValue(v => v + num)}
                    className="bg-muted rounded-xl py-4 text-lg font-bold text-foreground"
                  >
                    {num}
                  </button>
                );
              })}
              <button onClick={() => setEditValue(v => v + "0")} className="bg-muted rounded-xl py-4 text-lg font-bold text-foreground col-span-2">0</button>
              <button
                onClick={confirmEdit}
                className="bg-primary rounded-xl py-4 text-base font-bold text-primary-foreground col-span-2"
              >
                OK
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Video modal */}
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

      <BottomNav />
    </div>
  );
};

export default Treinos;
