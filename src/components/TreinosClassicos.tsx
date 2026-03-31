import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock } from "lucide-react";
import catPochete from "@/assets/cat-pochete.jpg";
import catBraco from "@/assets/cat-braco.jpg";
import catBumbum from "@/assets/cat-bumbum.jpg";
import catCoxa from "@/assets/cat-coxa.jpg";
import catFlancos from "@/assets/cat-flancos.jpg";

type Exercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  target_aesthetic_tag: string | null;
  exercise_type: string | null;
  equipment: string | null;
  video_url: string | null;
};

const CATEGORIES = [
  { key: "pochete", label: "Pochete", searchTag: "Pochete", image: catPochete, bg: "bg-pink-100" },
  { key: "braco", label: "Braço", searchTag: "Merendeira", image: catBraco, bg: "bg-pink-50" },
  { key: "bumbum", label: "Bumbum", searchTag: "Bumbum", image: catBumbum, bg: "bg-blue-100" },
  { key: "coxa", label: "Coxa", searchTag: "Coxa", image: catCoxa, bg: "bg-orange-50" },
  { key: "flancos", label: "Flancos", searchTag: "Barriga Grande", image: catFlancos, bg: "bg-green-50" },
] as const;

const TreinosClassicos = () => {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].key);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExercises = async () => {
      const { data } = await supabase.from("exercises").select("*");
      if (data) setExercises(data);
      setLoading(false);
    };
    fetchExercises();
  }, []);

  const activeCat = CATEGORIES.find((c) => c.key === activeCategory)!;
  const filtered = exercises.filter((e) =>
    e.target_aesthetic_tag?.toLowerCase().includes(activeCat.searchTag.toLowerCase())
  );

  return (
    <div className="mb-6">
      <h2 className="text-lg font-heading text-foreground uppercase mb-3">Treinos Clássicos</h2>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
              activeCategory === cat.key
                ? "border-primary text-primary bg-primary/5"
                : "border-border text-muted-foreground bg-background"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Exercise list */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Nenhum exercício encontrado</div>
        ) : (
          filtered.map((exercise) => (
            <div
              key={exercise.id}
              className="soft-card flex items-center gap-4 p-3 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className={`w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 ${activeCat.bg}`}>
                <img
                  src={activeCat.image}
                  alt={exercise.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-heading text-foreground truncate">{exercise.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {exercise.muscle_group} • {exercise.equipment}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TreinosClassicos;
