import { useEffect, useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Minus, Dumbbell, Clock, CalendarDays, Ruler, Lock } from "lucide-react";
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

const METRIC_OPTIONS = [
  { key: "peso", label: "Peso", dbKey: "weight", unit: "kg" },
  { key: "cintura", label: "Cintura", dbKey: "waist", unit: "cm" },
  { key: "quadril", label: "Quadril", dbKey: "hip", unit: "cm" },
  { key: "coxa", label: "Coxa", dbKey: "thigh", unit: "cm" },
  { key: "braco", label: "Braço", dbKey: "arm", unit: "cm" },
] as const;

const Evolucao = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ weight: "", waist: "", hip: "", thigh: "", arm: "" });
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showMeasureForm, setShowMeasureForm] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<typeof METRIC_OPTIONS[number]>(METRIC_OPTIONS[0]);

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

  // --- Total completed workouts ---
  const totalCompleted = useMemo(() => workouts.filter(w => w.completed).length, [workouts]);

  // --- Days since first workout ---
  const daysSinceFirst = useMemo(() => {
    const completed = workouts.filter(w => w.completed);
    if (completed.length === 0) return 0;
    const first = completed[completed.length - 1]; // oldest (sorted desc)
    const diffMs = new Date().getTime() - new Date(first.date).getTime();
    return Math.max(Math.floor(diffMs / (1000 * 60 * 60 * 24)), 1);
  }, [workouts]);

  // --- Weekly calendar ---
  const currentWeekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const weekLabel = `${format(weekDays[0], "d MMM", { locale: ptBR })} - ${format(weekDays[6], "d MMM", { locale: ptBR })}`;

  const getWorkoutForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return workouts.find(w => w.date === dateStr);
  };

  const thisWeekCompleted = weekDays.filter(d => getWorkoutForDay(d)?.completed).length;

  // --- Chart data for selected metric ---
  const chartData = useMemo(() => {
    return measurements
      .filter((m: any) => m[selectedMetric.dbKey] != null)
      .map((m: any) => ({
        date: format(new Date(m.date), "dd/MM"),
        value: m[selectedMetric.dbKey],
      }));
  }, [measurements, selectedMetric]);

  const latestMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;
  const previousMeasurement = measurements.length > 1 ? measurements[measurements.length - 2] : null;
  const firstMeasurement = measurements.length > 0 ? measurements[0] : null;

  const getDiff = (key: string) => {
    if (!latestMeasurement || !previousMeasurement) return null;
    const curr = (latestMeasurement as any)[key];
    const prev = (previousMeasurement as any)[key];
    if (curr == null || prev == null) return null;
    return (curr - prev).toFixed(1);
  };

  // Best variation since start (biggest reduction)
  const bestVariation = useMemo(() => {
    if (!latestMeasurement || !firstMeasurement) return null;
    const keys = [
      { key: "waist", label: "cintura" },
      { key: "hip", label: "quadril" },
      { key: "thigh", label: "coxa" },
      { key: "arm", label: "braço" },
      { key: "weight", label: "peso" },
    ];
    let best: { label: string; diff: number; unit: string } | null = null;
    for (const k of keys) {
      const first = (firstMeasurement as any)[k.key];
      const last = (latestMeasurement as any)[k.key];
      if (first != null && last != null) {
        const diff = first - last; // positive = reduction
        const unit = k.key === "weight" ? "kg" : "cm";
        if (diff > 0 && (!best || diff > best.diff)) {
          best = { label: k.label, diff: parseFloat(diff.toFixed(1)), unit };
        }
      }
    }
    return best;
  }, [latestMeasurement, firstMeasurement]);

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

  // Check if any measurement data exists
  const hasMeasurements = measurements.length > 0 && latestMeasurement && (
    latestMeasurement.weight || latestMeasurement.waist || latestMeasurement.hip || latestMeasurement.thigh || latestMeasurement.arm
  );

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
        {hasMeasurements ? (
          <>
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
                {chartData.length > 1 && selectedMetric.key === "peso" && (
                  <div className="w-28 h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData.slice(-7)}>
                        <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {[
                { label: "Cintura", value: latestMeasurement?.waist, unit: "cm", key: "waist" },
                { label: "Quadril", value: latestMeasurement?.hip, unit: "cm", key: "hip" },
                { label: "Coxa", value: latestMeasurement?.thigh, unit: "cm", key: "thigh" },
                { label: "Braço", value: latestMeasurement?.arm, unit: "cm", key: "arm" },
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

            {bestVariation && (
              <p className="text-xs text-green-600 font-medium mb-3">
                ✨ Sua {bestVariation.label} reduziu {bestVariation.diff} {bestVariation.unit} desde que você começou.
              </p>
            )}
          </>
        ) : (
          /* Empty state */
          <div className="text-center py-4">
            <h3 className="text-base font-heading text-foreground mb-2">📏 Suas medidas</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Registre hoje para ver sua evolução em números.
            </p>
            <Button
              onClick={() => setShowMeasureForm(true)}
              className="pink-gradient text-primary-foreground font-heading rounded-2xl shadow-lg"
            >
              Registrar minhas medidas agora
            </Button>
          </div>
        )}

        {showMeasureForm && (
          <div className={hasMeasurements ? "border-t border-border pt-4 mt-2" : "mt-4"}>
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

      {/* Chart with metric selector */}
      {measurements.length > 1 && (
        <div className="soft-card p-5 mb-4">
          <h3 className="text-base font-heading text-foreground mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-primary" />
            Histórico
          </h3>

          {/* Metric selector */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {METRIC_OPTIONS.map((metric) => (
              <button
                key={metric.key}
                onClick={() => setSelectedMetric(metric)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedMetric.key === metric.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {metric.label}
              </button>
            ))}
          </div>

          {chartData.length > 1 ? (
            <>
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
                    formatter={(value: number) => [`${value} ${selectedMetric.unit}`, selectedMetric.label]}
                  />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 3 }} name={`${selectedMetric.label} (${selectedMetric.unit})`} />
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Registre mais uma medida de {selectedMetric.label.toLowerCase()} para ver o gráfico.
            </p>
          )}
        </div>
      )}

      {/* Recent workouts — simplified */}
      {workouts.filter(w => w.completed).length > 0 && (
        <div className="soft-card p-5 mb-4">
          <h3 className="text-base font-heading text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Últimos Treinos
          </h3>
          <div className="space-y-2">
            {workouts.filter(w => w.completed).slice(0, 5).map((w) => {
              const wJson = w.workout_json as any;
              const title = wJson?.title || wJson?.name || wJson?.nome || "Treino";
              const summary = wJson?.tracking_summary;
              const durationMins = summary?.duration_minutes;
              const duration = durationMins ? `${durationMins} min` : null;
              const effortLabel = w.feedback_effort === "facil" ? "😊 Fácil" : w.feedback_effort === "ideal" ? "💪 Ideal" : w.feedback_effort === "dificil" ? "🔥 Difícil" : "";

              return (
                <div key={w.id} className="bg-muted/40 rounded-xl px-4 py-3">
                  <p className="text-sm font-bold text-foreground truncate">{title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {format(new Date(w.date), "d 'de' MMM", { locale: ptBR })}
                    {duration && ` · ${duration}`}
                    {effortLabel && ` · ${effortLabel}`}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-border text-center">
            <p className="text-sm text-foreground font-medium">
              {totalCompleted === 0
                ? "Seu corpo está esperando por você. Comece hoje! 💪"
                : totalCompleted === 1
                ? "Primeiro treino feito! O mais difícil já passou. Continue! 🌱"
                : totalCompleted < 5
                ? `${totalCompleted} treinos completos! Você está criando um hábito poderoso 🔥`
                : totalCompleted < 10
                ? "Você já está no ritmo! Sua disciplina inspira 🦁"
                : totalCompleted < 20
                ? "Leoa dedicada! Sua evolução é visível a cada treino 🦁"
                : `${totalCompleted} treinos! Você é uma máquina de determinação! 👑`}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {totalCompleted > 0
                ? `${totalCompleted} ${totalCompleted === 1 ? "treino" : "treinos"} em ${daysSinceFirst} ${daysSinceFirst === 1 ? "dia" : "dias"} — continue assim!`
                : "Cada treino é um passo rumo à sua melhor versão"}
            </p>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Evolucao;
