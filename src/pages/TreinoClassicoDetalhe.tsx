import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, Play } from "lucide-react";

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
                <a
                  href={exercise.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"
                >
                  <Play className="w-5 h-5 text-primary" />
                </a>
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
    </AppLayout>
  );
};

export default TreinoClassicoDetalhe;
