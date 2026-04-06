import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, Play } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const CATEGORY_TAG_MAP: Record<string, string> = {
  pochete: "Pochete",
  braco: "Merendeira",
  bumbum: "Bumbum",
  coxa: "Coxa",
  flancos: "Barriga Grande",
};

type Exercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  target_aesthetic_tag: string | null;
  exercise_type: string | null;
  equipment: string | null;
  video_url: string | null;
};

const TreinoClassicoDetalhe = () => {
  const { category, muscleGroup } = useParams<{ category: string; muscleGroup: string }>();
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoModal, setVideoModal] = useState<{ name: string; url: string } | null>(null);

  const searchTag = CATEGORY_TAG_MAP[category || ""] || "";
  const decodedMuscleGroup = decodeURIComponent(muscleGroup || "");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("exercises").select("*");
      if (data) {
        const filtered = (data as Exercise[]).filter(
          (e) =>
            e.target_aesthetic_tag?.toLowerCase().includes(searchTag.toLowerCase()) &&
            e.muscle_group === decodedMuscleGroup
        );
        setExercises(filtered);
      }
      setLoading(false);
    };
    fetch();
  }, [searchTag, decodedMuscleGroup]);

  const getEmbedUrl = (url: string) => {
    const shortsMatch = url.match(/youtube\.com\/shorts\/([^?&]+)/);
    if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    return url.replace("watch?v=", "embed/");
  };

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-heading text-foreground">{decodedMuscleGroup}</h1>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div>
      ) : exercises.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Nenhum exercício encontrado</div>
      ) : (
        <div className="space-y-3">
          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              className="soft-card flex items-center gap-4 p-4"
            >
              {exercise.video_url ? (
                <button
                  onClick={() => setVideoModal({ name: exercise.name, url: getEmbedUrl(exercise.video_url!) })}
                  className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"
                >
                  <Play className="w-5 h-5 text-primary" />
                </button>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Play className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-heading text-foreground truncate">{exercise.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {exercise.muscle_group} • {exercise.equipment || "Sem equipamento"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video modal */}
      <Dialog open={!!videoModal} onOpenChange={() => setVideoModal(null)}>
        <DialogContent className="bg-card border-border max-w-md mx-auto rounded-t-3xl p-0 gap-0 [&>button]:hidden">
          {videoModal?.url && (
            <div className="aspect-video w-full">
              <iframe
                src={videoModal.url}
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
    </AppLayout>
  );
};

export default TreinoClassicoDetalhe;
