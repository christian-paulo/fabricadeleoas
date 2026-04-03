import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Sparkles, RotateCcw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";

import thumb1 from "@/assets/workout-thumb-1.jpg";
import thumb2 from "@/assets/workout-thumb-2.jpg";
import thumb3 from "@/assets/workout-thumb-3.jpg";
import thumb4 from "@/assets/workout-thumb-4.jpg";

const THUMBS = [thumb1, thumb2, thumb3, thumb4];

const STAGES = [
  { id: 1, name: "Ative Seu Corpo", days: 7 },
  { id: 2, name: "Derretimento Total", days: 7 },
  { id: 3, name: "Impulsionador de Resultados", days: 7 },
  { id: 4, name: "Rush Final", days: 7 },
];

const DURATIONS = [22, 15, 18, 20, 25, 17, 22, 15, 18, 21, 20, 16, 24, 18, 21, 19, 23, 17, 20, 22, 22, 26, 18, 20, 25, 17, 21, 19];

const PlanoProtocolo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentDay, setCurrentDay] = useState(1);
  const [showBackToToday, setShowBackToToday] = useState(false);
  const todayRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Determine current day based on profile trial_start_date
  useEffect(() => {
    if (!user) return;
    const fetchDay = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("trial_start_date, created_at")
        .eq("id", user.id)
        .single();
      if (data) {
        const start = new Date(data.trial_start_date || data.created_at || new Date());
        const now = new Date();
        const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        setCurrentDay(Math.min(Math.max(diff + 1, 1), 28));
      }
    };
    fetchDay();
  }, [user]);

  // Auto-scroll to today on mount
  useEffect(() => {
    setTimeout(() => {
      todayRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  }, [currentDay]);

  // Track scroll to show/hide "Voltar Para Hoje" button
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const handleScroll = () => {
      const todayEl = todayRef.current;
      if (!todayEl) return;
      const rect = todayEl.getBoundingClientRect();
      const visible = rect.top >= 0 && rect.bottom <= window.innerHeight;
      setShowBackToToday(!visible);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToToday = () => {
    todayRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Build day list with stage separators
  const plan = useMemo(() => {
    const items: Array<
      | { type: "stage"; stage: typeof STAGES[0]; stageIndex: number }
      | { type: "day"; dayNumber: number; duration: number; thumb: string; stageIndex: number }
    > = [];
    let dayCounter = 0;
    STAGES.forEach((stage, si) => {
      items.push({ type: "stage", stage, stageIndex: si });
      for (let d = 0; d < stage.days; d++) {
        items.push({
          type: "day",
          dayNumber: dayCounter + 1,
          duration: DURATIONS[dayCounter] || 20,
          thumb: THUMBS[dayCounter % THUMBS.length],
          stageIndex: si,
        });
        dayCounter++;
      }
    });
    return items;
  }, []);

  const goalText = "28 dias corpo inteiro";

  return (
    <div ref={scrollRef} className="min-h-screen bg-background max-w-lg mx-auto relative">
      <div className="px-4 pt-6 pb-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-primary font-heading font-bold text-base">Plano Pessoal</span>
          </div>
        </div>
        <h1 className="text-2xl font-heading font-bold text-foreground leading-tight mb-6">
          {goalText}
        </h1>
      </div>

      {/* Plan timeline */}
      <div className="px-4 pb-32">
        {plan.map((item, idx) => {
          if (item.type === "stage") {
            return (
              <div key={`stage-${item.stage.id}`} className="flex items-center gap-4 py-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img
                    src={THUMBS[item.stageIndex]}
                    alt=""
                    className="w-full h-full object-cover rounded-full"
                    loading="lazy"
                    width={48}
                    height={48}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Estágio {item.stage.id}</p>
                  <p className="text-base font-heading font-bold text-foreground">{item.stage.name}</p>
                </div>
              </div>
            );
          }

          const isToday = item.dayNumber === currentDay;
          const isPast = item.dayNumber < currentDay;
          const isFuture = item.dayNumber > currentDay;

          return (
            <div key={`day-${item.dayNumber}`} className="relative flex items-stretch">
              {/* Timeline line + circle */}
              <div className="flex flex-col items-center mr-4 w-6 flex-shrink-0">
                <div className={`w-px flex-1 ${isPast ? "bg-muted-foreground/30" : "bg-border"}`} />
                <div
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${
                    isToday
                      ? "border-primary bg-primary"
                      : isPast
                      ? "border-muted-foreground/40 bg-muted-foreground/20"
                      : "border-border bg-background"
                  }`}
                />
                <div className={`w-px flex-1 ${isPast ? "bg-muted-foreground/30" : "bg-border"}`} />
              </div>

              {/* Day card */}
              <div
                ref={isToday ? todayRef : undefined}
                className={`flex-1 mb-3 rounded-2xl p-4 transition-all ${
                  isToday
                    ? "bg-card shadow-md border border-primary/20"
                    : "bg-card/60"
                } ${isFuture ? "opacity-60" : ""}`}
              >
                <button
                  onClick={() => !isFuture && navigate("/treinos/detalhe")}
                  className="flex items-center gap-4 w-full text-left"
                  disabled={isFuture}
                >
                  <img
                    src={item.thumb}
                    alt={`Dia ${item.dayNumber}`}
                    className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                    loading="lazy"
                    width={80}
                    height={80}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xl font-heading font-bold text-foreground">{item.dayNumber}°Dia</p>
                    <p className="text-sm text-muted-foreground">{item.duration} min</p>
                  </div>
                  {!isFuture && (
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>

                {isToday && (
                  <Button
                    onClick={() => navigate("/treinos/detalhe")}
                    className="w-full mt-4 pink-gradient text-primary-foreground font-heading text-lg h-14 rounded-2xl shadow-lg"
                  >
                    Começar Agora
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating "Voltar Para Hoje" button */}
      {showBackToToday && (
        <button
          onClick={scrollToToday}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-foreground text-background font-heading font-bold text-base px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-2 max-w-[calc(100%-2rem)]"
        >
          <RotateCcw className="w-5 h-5" />
          Voltar Para Hoje
        </button>
      )}

      <BottomNav />
    </div>
  );
};

export default PlanoProtocolo;
