import { useEffect, useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Flame, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Minus, Dumbbell, Clock, CalendarDays, Ruler, CheckCircle2, XCircle, Timer, Lock } from "lucide-react";
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { BADGE_DEFINITIONS, type EarnedBadge } from "@/lib/badges";

interface WorkoutRecord {
  id: string;
  date: string;
  completed: boolean;
  feedback_effort: string | null;
  workout_json: any;
}

const Evolucao = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ weight: "", waist: "", hip: "", thigh: "", arm: "" });
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showMeasureForm, setShowMeasureForm] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);

  const fields = [
    { key: "weight", label: "Peso (kg)", icon: "⚖️" },
    { key: "waist", label: "Cintura (cm)", icon: "📏" },
    { key: "hip", label: "Quadril (cm)", icon: "📏" },
    { key: "thigh", label: "Coxa (cm)", icon: "📏" },
    { key: "arm", label: "Braço (cm)", icon: "💪" },
  ] as const;

  const fetchData = async () => {
    if (!user) return;
    const [measRes, workRes, badgeRes] = await Promise.all([
      supabase.from("measurements").select("*").eq("profile_id", user.id).order("date", { ascending: true }),
      supabase.from("workouts").select("*").eq("profile_id", user.id).order("date", { ascending: false }),
      supabase.from("user_badges").select("badge_key, earned_at").eq("profile_id", user.id),
    ]);
    if (measRes.data) setMeasurements(measRes.data);
    if (workRes.data) setWorkouts(workRes.data as WorkoutRecord[]);
    if (badgeRes.data) setEarnedBadges(badgeRes.data as EarnedBadge[]);
  };

  useEffect(() => { fetchData(); }, [user]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchData();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [user]);

  useEffect(() => {
    const handleFocus = () => fetchData();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user]);

  // --- Streak calculation ---
  const streak = useMemo(() => {
    return workouts.filter(w => w.completed).length;
  }, [workouts]);

  // --- Weekly calendar ---
  const currentWeekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const weekLabel = `${format(weekDays[0], "d MMM", { locale: ptBR })} - ${format(weekDays[6], "d MMM", { locale: ptBR })}`;

  const getWorkoutForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return workouts.find(w => w.date === dateStr);
  };

  const totalCompleted = workouts.filter(w => w.completed).length;
  const thisWeekCompleted = weekDays.filter(d => {
    const w = getWorkoutForDay(d);
    return w?.completed;
  }).length;

  // --- Weight trend ---
  const chartData = useMemo(() => {
    return measurements.map((m: any) => ({
      date: format(new Date(m.date), "dd/MM"),
      peso: m.weight,
      cintura: m.waist,
      quadril: m.hip,
    }));
  }, [measurements]);

  const latestMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;
  const previousMeasurement = measurements.length > 1 ? measurements[measurements.length - 2] : null;

  const getDiff = (key: string) => {
    if (!latestMeasurement || !previousMeasurement) return null;
    const curr = (latestMeasurement as any)[key];
    const prev = (previousMeasurement as any)[key];
    if (curr == null || prev == null) return null;
    return (curr - prev).toFixed(1);
  };

  const getLastUpdatedLabel = () => {
    if (!latestMeasurement) return null;
    const date = new Date(latestMeasurement.date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Atualizado hoje";
    if (diffDays === 1) return "Atualizado ontem";
    if (diffDays < 7) return `Atualizado há ${diffDays} dias`;
    if (diffDays < 30) return `Atualizado há ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) > 1 ? "s" : ""}`;
    return `Atualizado há ${Math.floor(diffDays / 30)} ${Math.floor(diffDays / 30) > 1 ? "meses" : "mês"}`;
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("measurements").insert({
      profile_id: user.id,
      weight: form.weight ? parseFloat(form.weight) : null,
      waist: form.waist ? parseFloat(form.waist) : null,
      hip: form.hip ? parseFloat(form.hip) : null,
      thigh: form.thigh ? parseFloat(form.thigh) : null,
      arm: form.arm ? parseFloat(form.arm) : null,
    });
    if (error) toast.error("Erro ao salvar medidas");
    else {
      toast.success("Medidas salvas! 🦁");
      setForm({ weight: "", waist: "", hip: "", thigh: "", arm: "" });
      setShowMeasureForm(false);
      fetchData();
    }
    setSaving(false);
  };

  const streakMilestones = [2, 5, 7, 14, 21, 30];
  const nextMilestone = streakMilestones.find(m => m > streak) || 30;
  const streakProgress = Math.min((streak / nextMilestone) * 100, 100);

  // Badge data
  const earnedKeys = new Set(earnedBadges.map(b => b.badge_key));
  const earnedCount = earnedBadges.length;
  const totalBadgesCount = BADGE_DEFINITIONS.length;
  const progressPercent = totalBadgesCount > 0 ? (earnedCount / totalBadgesCount) * 100 : 0;
  const today = new Date().toISOString().split("T")[0];

  const sortedBadges = [...BADGE_DEFINITIONS].sort((a, b) => {
    const aE = earnedKeys.has(a.key) ? 0 : 1;
    const bE = earnedKeys.has(b.key) ? 0 : 1;
    return aE - bE;
  });

  return (
    <AppLayout>
      <h1 className="text-2xl font-heading text-foreground mb-1">Sua Evolução</h1>
      <p className="text-sm text-muted-foreground mb-5">Acompanhe cada conquista 🦁</p>

      {/* Suas Conquistas — full detail */}
      <div className="mb-4">
        <h2 className="text-lg font-heading text-foreground uppercase mb-2">Suas Conquistas</h2>
        <p className="text-sm text-muted-foreground mb-2">
          {earnedCount} de {totalBadgesCount} conquistas desbloqueadas
        </p>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary mb-4">
          <div
            className="h-full rounded-full pink-gradient transition-all duration-1000 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div
          className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
        >
          <style>{`.snap-x::-webkit-scrollbar { display: none; }`}</style>
          {sortedBadges.map((badge, idx) => {
            const isEarned = earnedKeys.has(badge.key);
            const earnedBadge = earnedBadges.find(b => b.badge_key === badge.key);
            const isNew = isEarned && earnedBadge && earnedBadge.earned_at.split("T")[0] === today;

            const earnedDate = earnedBadge
              ? new Date(earnedBadge.earned_at).toLocaleDateString("pt-BR", { day: "numeric", month: "long" })
              : "";

            return (
              <Popover key={badge.key}>
                <PopoverTrigger asChild>
                  <div
                    className={`flex-shrink-0 w-[90px] h-[90px] rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer snap-start transition-all
                      ${isEarned ? "bg-primary/10" : "bg-muted/40"}
                      ${isNew ? "animate-badge-pop shadow-[0_0_20px_hsl(var(--primary)/0.4)]" : ""}
                    `}
                    style={{
                      opacity: 0,
                      animation: `fade-in 0.4s ease-out ${idx * 100}ms forwards${isNew ? ", badge-pop 0.5s ease-out 0.4s" : ""}`,
                    }}
                  >
                    <div className="relative">
                      <span className={`text-[40px] leading-none ${!isEarned ? "grayscale opacity-40" : ""}`}>
                        {badge.emoji}
                      </span>
                      {!isEarned && (
                        <Lock className="absolute -bottom-1 -right-1 w-4 h-4 text-muted-foreground animate-lock-pulse" />
                      )}
                    </div>
                    <span className={`text-[10px] font-bold text-center leading-tight px-1 ${isEarned ? "text-foreground" : "text-muted-foreground"}`}>
                      {badge.name}
                    </span>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto max-w-[200px] p-3 text-center text-sm">
                  {isEarned
                    ? `Conquistado em ${earnedDate} 🎉`
                    : badge.triggerDescription}
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      </div>

      {/* Streak Card */}
      <div className="soft-card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-lg font-heading text-foreground">
              Sequência de <span className="text-primary font-bold">{streak}</span> {streak === 1 ? "treino" : "treinos"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {streak === 0 ? "Comece seu primeiro treino!" : streak < 3 ? "Você começou muito bem!" : streak < 7 ? "Continue assim, leoa! 🦁" : "Você está imparável! 🔥"}
            </p>
          </div>
          <div className="relative flex-shrink-0 w-12 h-14">
            <svg viewBox="0 0 56 68" className="w-full h-full">
              <defs>
                <radialGradient id="fireGradEvo" cx="50%" cy="65%" r="50%">
                  <stop offset="0%" stopColor="#FF6B00" />
                  <stop offset="55%" stopColor="#FF9500" />
                  <stop offset="100%" stopColor="#FFD580" stopOpacity="0.5" />
                </radialGradient>
              </defs>
              <ellipse cx="28" cy="42" rx="26" ry="26" fill="#FFD580" opacity={streak > 0 ? 0.3 : 0.1} />
              <path d="M28 4 C18 20, 6 33, 6 46 C6 58, 15 66, 28 66 C41 66, 50 58, 50 46 C50 33, 38 20, 28 4Z" fill={streak > 0 ? "url(#fireGradEvo)" : "hsl(0 0% 80%)"} />
              <ellipse cx="28" cy="48" rx="10" ry="12" fill="#FFD580" opacity={streak > 0 ? 0.6 : 0.15} />
            </svg>
            {streak > 0 && (
              <span className="absolute -bottom-1 -right-1 text-[10px] font-bold bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                {streak}
              </span>
            )}
          </div>
        </div>
        <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full pink-gradient rounded-full transition-all duration-700"
            style={{ width: `${streakProgress}%` }}
          />
          {streakMilestones.filter(m => m <= nextMilestone).map(m => (
            <div
              key={m}
              className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-muted-foreground/20"
              style={{ left: `${(m / nextMilestone) * 100}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">0</span>
          <span className="text-[10px] text-primary font-semibold">{nextMilestone} dias 🔥</span>
        </div>
      </div>

      {/* Weekly Calendar */}
      <div className="soft-card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setWeekOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground capitalize">{weekLabel}</span>
          <button
            onClick={() => setWeekOffset(o => Math.min(o + 1, 0))}
            disabled={weekOffset >= 0}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, i) => {
            const w = getWorkoutForDay(day);
            const isToday = isSameDay(day, new Date());
            const isFuture = isAfter(day, new Date());
            const completed = w?.completed;

            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground uppercase">
                  {format(day, "EEE", { locale: ptBR }).slice(0, 3)}
                </span>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  completed
                    ? "bg-primary text-primary-foreground"
                    : isToday
                    ? "ring-2 ring-primary text-foreground"
                    : isFuture
                    ? "text-muted-foreground/40"
                    : w
                    ? "bg-muted text-muted-foreground"
                    : "text-muted-foreground/60"
                }`}>
                  {completed ? "✓" : format(day, "d")}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground"><span className="font-bold text-foreground">{thisWeekCompleted}</span> esta semana</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground"><span className="font-bold text-foreground">{totalCompleted}</span> total</span>
          </div>
        </div>
      </div>

      {/* Weight & Body Stats */}
      <div className="soft-card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-heading text-foreground flex items-center gap-2">
            <Ruler className="w-4 h-4 text-primary" />
            Corpo
          </h3>
          <button
            onClick={() => setShowMeasureForm(!showMeasureForm)}
            className="text-xs font-semibold text-primary"
          >
            {showMeasureForm ? "Fechar" : "Atualizar"}
          </button>
        </div>

        {latestMeasurement?.weight ? (
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-1">
              <p className="text-4xl font-bold text-foreground">
                {latestMeasurement.weight}<span className="text-lg font-normal text-muted-foreground ml-1">kg</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{getLastUpdatedLabel()}</p>
              {getDiff("weight") && (
                <div className={`flex items-center gap-1 mt-1.5 ${
                  parseFloat(getDiff("weight")!) < 0 ? "text-green-500" : parseFloat(getDiff("weight")!) > 0 ? "text-orange-500" : "text-muted-foreground"
                }`}>
                  {parseFloat(getDiff("weight")!) < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : parseFloat(getDiff("weight")!) > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  <span className="text-xs font-bold">{Math.abs(parseFloat(getDiff("weight")!))} kg</span>
                </div>
              )}
            </div>
            {chartData.length > 1 && (
              <div className="w-28 h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.slice(-7)}>
                    <Line type="monotone" dataKey="peso" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3 mb-3">Registre seu peso para acompanhar</p>
        )}

        {latestMeasurement && (
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {[
              { label: "Cintura", value: latestMeasurement.waist, unit: "cm", key: "waist" },
              { label: "Quadril", value: latestMeasurement.hip, unit: "cm", key: "hip" },
              { label: "Coxa", value: latestMeasurement.thigh, unit: "cm", key: "thigh" },
              { label: "Braço", value: latestMeasurement.arm, unit: "cm", key: "arm" },
            ].filter(s => s.value).map((stat) => {
              const diff = getDiff(stat.key);
              return (
                <div key={stat.label} className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.unit}</p>
                  {diff && (
                    <div className={`flex items-center justify-center gap-0.5 mt-1 ${
                      parseFloat(diff) < 0 ? "text-green-500" : parseFloat(diff) > 0 ? "text-orange-500" : "text-muted-foreground"
                    }`}>
                      {parseFloat(diff) < 0 ? <TrendingDown className="w-3 h-3" /> : parseFloat(diff) > 0 ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      <span className="text-[10px] font-bold">{Math.abs(parseFloat(diff))} {stat.unit}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!showMeasureForm ? (
          <button
            onClick={() => setShowMeasureForm(true)}
            className="w-full text-center text-sm font-semibold text-primary py-3 border-t border-border"
          >
            Atualizar dados de hoje
          </button>
        ) : (
          <div className="border-t border-border pt-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              {fields.map((f) => (
                <div key={f.key}>
                  <Label className="text-xs text-muted-foreground font-medium">{f.label}</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="bg-background border-border text-foreground mt-1 h-11 text-sm rounded-xl"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowMeasureForm(false)} className="flex-1 h-11 rounded-xl">
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 pink-gradient text-primary-foreground font-heading h-11 rounded-xl shadow-lg"
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Full chart */}
      {chartData.length > 1 && (
        <div className="soft-card p-5 mb-4">
          <h3 className="text-base font-heading text-foreground mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-primary" />
            Histórico
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(0 0% 50%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 50%)" }} axisLine={false} tickLine={false} width={35} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  fontSize: 12,
                }}
                labelStyle={{ color: "hsl(var(--primary))" }}
              />
              <Line type="monotone" dataKey="peso" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 3 }} name="Peso (kg)" />
              <Line type="monotone" dataKey="cintura" stroke="hsl(340 90% 70%)" strokeWidth={2} dot={{ r: 2 }} name="Cintura (cm)" />
              <Line type="monotone" dataKey="quadril" stroke="hsl(0 0% 65%)" strokeWidth={2} dot={{ r: 2 }} name="Quadril (cm)" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3 justify-center">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <span className="w-3 h-1 rounded bg-primary inline-block" /> Peso
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <span className="w-3 h-1 rounded inline-block" style={{ backgroundColor: "hsl(340 90% 70%)" }} /> Cintura
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <span className="w-3 h-1 rounded inline-block" style={{ backgroundColor: "hsl(0 0% 65%)" }} /> Quadril
            </span>
          </div>
        </div>
      )}

      {/* Recent workouts */}
      {workouts.filter(w => w.completed).length > 0 && (
        <div className="soft-card p-5 mb-4">
          <h3 className="text-base font-heading text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Últimos Treinos
          </h3>
          <div className="space-y-3">
            {workouts.filter(w => w.completed).slice(0, 5).map((w) => {
              const wJson = w.workout_json as any;
              const title = wJson?.title || "Treino";
              const summary = wJson?.tracking_summary;
              const allExercises = summary?.total_exercises || wJson?.exercises?.length || wJson?.tri_sets?.reduce((a: number, t: any) => a + (t.exercises?.length || 0), 0) || 0;
              const completedExercises = summary?.completed_exercises ?? allExercises;
              const skipped = summary?.skipped_exercises ?? 0;
              const durationMins = summary?.duration_minutes;
              const duration = durationMins ? `${durationMins} min` : (wJson?.estimated_duration || "~30 min");
              const effort = w.feedback_effort === "facil" ? "😊 Fácil" : w.feedback_effort === "ideal" ? "💪 Ideal" : w.feedback_effort === "dificil" ? "🔥 Difícil" : "";
              const effortColor = w.feedback_effort === "facil" ? "text-green-500" : w.feedback_effort === "ideal" ? "text-primary" : w.feedback_effort === "dificil" ? "text-orange-500" : "text-muted-foreground";

              return (
                <div key={w.id} className="bg-muted/40 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(w.date), "d 'de' MMM", { locale: ptBR })}
                      </p>
                    </div>
                    {effort && (
                      <span className={`text-xs font-semibold ${effortColor}`}>{effort}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center gap-1.5 bg-background rounded-lg px-2.5 py-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-foreground">{completedExercises}</p>
                        <p className="text-[9px] text-muted-foreground">Feitos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background rounded-lg px-2.5 py-2">
                      <XCircle className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-foreground">{skipped}</p>
                        <p className="text-[9px] text-muted-foreground">Restam</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background rounded-lg px-2.5 py-2">
                      <Timer className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-foreground">{duration}</p>
                        <p className="text-[9px] text-muted-foreground">Duração</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-border text-center">
            <p className="text-sm text-foreground font-medium">
              {(() => {
                const done = totalCompleted;
                if (done === 0) return "Seu corpo está esperando por você. Comece hoje! 💪";
                if (done === 1) return "Primeiro treino feito! O mais difícil já passou. Continue! 🌱";
                if (done < 5) return `${done} treinos completos! Você está criando um hábito poderoso 🔥`;
                if (done < 10) return "Você já está no ritmo! Sua disciplina inspira 🦁";
                if (done < 20) return "Leoa dedicada! Sua evolução é visível a cada treino 🦁";
                return `${done} treinos! Você é uma máquina de determinação! 👑`;
              })()}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {streak > 0
                ? `${streak} ${streak === 1 ? "dia" : "dias"} seguido${streak === 1 ? "" : "s"} treinando — não pare agora!`
                : "Cada treino é um passo rumo à sua melhor versão"}
            </p>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Evolucao;
