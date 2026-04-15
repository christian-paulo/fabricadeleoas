import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
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
  internal_level: string | null;
  exercise_type: string | null;
  equipment: string | null;
  video_url: string | null;
};

const CATEGORIES = [
  { key: "pochete", label: "Pochete", searchTag: "Pochete", image: catPochete },
  { key: "braco", label: "Braço", searchTag: "Merendeira", image: catBraco },
  { key: "bumbum", label: "Bumbum", searchTag: "Bumbum", image: catBumbum },
  { key: "coxa", label: "Coxa", searchTag: "Coxa", image: catCoxa },
  { key: "flancos", label: "Flancos", searchTag: "Barriga Grande", image: catFlancos },
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
      const raw = ex.muscle_group || "Outros";
      const key = raw.split(/([/\s])/).map(part => /^[a-záàâãéêíóôõúç]/i.test(part) ? part.charAt(0).toUpperCase() + part.slice(1) : part).join("");
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
      <h2 className="text-lg font-heading text-foreground uppercase mb-1">Turbine seu Treino</h2>
      <p className="text-sm text-muted-foreground mb-3">Quer ir além hoje? Adiciona esse treino:</p>

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

      {/* Horizontal scrollable cards */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Nenhum treino encontrado</div>
      ) : (
        <div
          className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
        >
          <style>{`.snap-x::-webkit-scrollbar { display: none; }`}</style>
          {groups.map((group) => (
            <div
              key={group.muscleGroup}
              onClick={() => handleCardClick(group.muscleGroup)}
              className="flex-shrink-0 w-[160px] snap-start rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform relative h-[120px]"
            >
              <img
                src={activeCat.image}
                alt={group.muscleGroup}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="relative z-10 flex flex-col justify-end h-full p-3">
                <h3 className="text-sm font-bold text-white leading-tight truncate">
                  {group.muscleGroup} {group.level}
                </h3>
                <p className="text-[11px] text-white/70">
                  {group.count} exercício{group.count > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TreinosClassicos;
