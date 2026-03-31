import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import catPochete from "@/assets/cat-pochete.jpg";
import catBraco from "@/assets/cat-braco.jpg";
import catBumbum from "@/assets/cat-bumbum.jpg";
import catCoxa from "@/assets/cat-coxa.jpg";
import catFlancos from "@/assets/cat-flancos.jpg";
import cardPochete from "@/assets/card-pochete.jpg";
import cardBraco from "@/assets/card-braco.jpg";
import cardBumbum from "@/assets/card-bumbum.jpg";
import cardCoxa from "@/assets/card-coxa.jpg";
import cardFlancos from "@/assets/card-flancos.jpg";

type Exercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  target_aesthetic_tag: string | null;
  internal_level: string | null;
  exercise_type: string | null;
  equipment: string | null;
  video_url: string | null;
};

const CATEGORIES = [
  { key: "pochete", label: "Pochete", searchTag: "Pochete", thumb: catPochete, card: cardPochete },
  { key: "braco", label: "Braço", searchTag: "Merendeira", thumb: catBraco, card: cardBraco },
  { key: "bumbum", label: "Bumbum", searchTag: "Bumbum", thumb: catBumbum, card: cardBumbum },
  { key: "coxa", label: "Coxa", searchTag: "Coxa", thumb: catCoxa, card: cardCoxa },
  { key: "flancos", label: "Flancos", searchTag: "Barriga Grande", thumb: catFlancos, card: cardFlancos },
] as const;

const TreinosClassicos = () => {
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0].key);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExercises = async () => {
      const { data } = await supabase.from("exercises").select("*");
      if (data) setExercises(data as Exercise[]);
      setLoading(false);
    };
    fetchExercises();
  }, []);

  const activeCat = CATEGORIES.find((c) => c.key === activeCategory)!;

  const groups = useMemo(() => {
    const filtered = exercises.filter((e) =>
      e.target_aesthetic_tag?.toLowerCase().includes(activeCat.searchTag.toLowerCase())
    );

    const map = new Map<string, Exercise[]>();
    filtered.forEach((ex) => {
      const key = ex.muscle_group || "Outros";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ex);
    });

    return Array.from(map.entries()).map(([muscleGroup, exs]) => ({
      muscleGroup,
      level: exs[0]?.internal_level || "Iniciante",
      count: exs.length,
    }));
  }, [exercises, activeCat]);

  const handleCardClick = (muscleGroup: string) => {
    navigate(`/treinos-classicos/${activeCategory}/${encodeURIComponent(muscleGroup)}`);
  };

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

      {/* Grouped workout cards - full image with gradient overlay */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Nenhum treino encontrado</div>
        ) : (
          groups.map((group, idx) => (
            <div
              key={group.muscleGroup}
              onClick={() => handleCardClick(group.muscleGroup)}
              className="relative rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
              style={{ aspectRatio: "4/5" }}
            >
              {/* Background image */}
              <img
                src={activeCat.card}
                alt={group.muscleGroup}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />

              {/* Gradient overlay from bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

              {/* Content on top of gradient */}
              <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center text-center">
                <span className="inline-block px-4 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium mb-3">
                  {activeCat.label}
                </span>
                <h3 className="text-2xl font-heading font-bold text-white mb-1">
                  {group.muscleGroup}
                </h3>
                <p className="text-sm text-white/70 mb-4">
                  {group.level} • {group.count} exercício{group.count > 1 ? "s" : ""}
                </p>
                <button className="w-full py-3 rounded-xl bg-white text-black font-bold text-base uppercase tracking-wide">
                  Iniciar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TreinosClassicos;
