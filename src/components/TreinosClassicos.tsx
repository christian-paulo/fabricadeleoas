import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
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
  { key: "pochete", label: "Pochete", searchTag: "Pochete", image: catPochete, bg: "bg-pink-100" },
  { key: "braco", label: "Braço", searchTag: "Merendeira", image: catBraco, bg: "bg-pink-50" },
  { key: "bumbum", label: "Bumbum", searchTag: "Bumbum", image: catBumbum, bg: "bg-blue-100" },
  { key: "coxa", label: "Coxa", searchTag: "Coxa", image: catCoxa, bg: "bg-orange-50" },
  { key: "flancos", label: "Flancos", searchTag: "Barriga Grande", image: catFlancos, bg: "bg-green-50" },
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

  // Filter exercises by category, then group by muscle_group
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

      {/* Grouped workout cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Nenhum treino encontrado</div>
        ) : (
          groups.map((group) => (
            <div
              key={group.muscleGroup}
              onClick={() => handleCardClick(group.muscleGroup)}
              className="soft-card flex items-center gap-4 p-3 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className={`w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 ${activeCat.bg}`}>
                <img
                  src={activeCat.image}
                  alt={group.muscleGroup}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-heading text-foreground truncate">
                  {group.muscleGroup} {group.level}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {group.count} exercício{group.count > 1 ? "s" : ""}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TreinosClassicos;
