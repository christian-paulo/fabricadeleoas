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

const WEEK_NAMES = [
  "Ative Seu Corpo",
  "Derretimento Total",
  "Impulsionador de Resultados",
  "Rush Final",
];

const BASE_DURATIONS = [22, 15, 18, 20, 25, 17, 22, 15, 18, 21, 20, 16, 24, 18, 21, 19, 23, 17, 20, 22, 22, 26, 18, 20, 25, 17, 21, 19];

const PlanoProtocolo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentDay, setCurrentDay] = useState(1);
  const [workoutDays, setWorkoutDays] = useState(3);
  const [showBackToToday, setShowBackToToday] = useState(false);
  const todayRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch completed workouts count and workout_days preference
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ count }, { data: profile }] = await Promise.all([
        supabase
          .from("workouts")
          .select("id", { count: "exact", head: true })
          .eq("profile_id", user.id)
          .eq("completed", true),
        supabase
          .from("profiles")
          .select("workout_days")
          .eq("id", user.id)
          .single(),
      ]);
      const days = profile?.workout_days || 3;
      setWorkoutDays(Math.max(1, Math.min(7, days)));
      const totalDays = days * 4;
      setCurrentDay(Math.min((count || 0) + 1, totalDays));
    };
    fetchData();
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

  // Build plan: 4 weeks, each with workoutDays training days
  const plan = useMemo(() => {
    const items: Array<
      | { type: "week"; weekNumber: number; weekName: string }
      | { type: "day"; dayNumber: number; duration: number; thumb: string; weekIndex: number }
    > = [];
    let dayCounter = 0;
    for (let week = 0; week < 4; week++) {
      items.push({ type: "week", weekNumber: week + 1, weekName: WEEK_NAMES[week] });
      for (let d = 0; d < workoutDays; d++) {
        items.push({
          type: "day",
          dayNumber: dayCounter + 1,
          duration: BASE_DURATIONS[dayCounter % BASE_DURATIONS.length] || 20,
          thumb: THUMBS[dayCounter % THUMBS.length],
          weekIndex: week,
        });
        dayCounter++;
      }
    }
    return items;
  }, [workoutDays]);

  const totalDays = workoutDays * 4;

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
        <h1 className="text-2xl font-heading font-bold text-foreground leading-tight mb-1">
          Protocolo de 4 semanas
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {workoutDays}x por semana · {totalDays} treinos no total
        </p>
      </div>

      {/* Plan timeline */}
      <div className="px-4 pb-32">
        {plan.map((item, idx) => {
          if (item.type === "week") {
            return (
              <div key={`week-${item.weekNumber}`} className="flex items-center gap-4 py-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img
                    src={THUMBS[item.weekNumber - 1]}
                    alt=""
                    className="w-full h-full object-cover rounded-full"
                    loading="lazy"
                    width={48}
                    height={48}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Semana {item.weekNumber}</p>
                  <p className="text-base font-heading font-bold text-foreground">{item.weekName}</p>
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
                    alt={`Treino ${item.dayNumber}`}
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
