import { useEffect, useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Flame, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Minus, Dumbbell, Clock, CalendarDays, Ruler, CheckCircle2, XCircle, Timer } from "lucide-react";
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";

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

  const fields = [
    { key: "weight", label: "Peso (kg)", icon: "⚖️" },
    { key: "waist", label: "Cintura (cm)", icon: "📏" },
    { key: "hip", label: "Quadril (cm)", icon: "📏" },
    { key: "thigh", label: "Coxa (cm)", icon: "📏" },
    { key: "arm", label: "Braço (cm)", icon: "💪" },
  ] as const;

  const fetchData = async () => {
    if (!user) return;
    const [measRes, workRes] = await Promise.all([
      supabase.from("measurements").select("*").eq("profile_id", user.id).order("date", { ascending: true }),
      supabase.from("workouts").select("*").eq("profile_id", user.id).order("date", { ascending: false }),
    ]);
    if (measRes.data) setMeasurements(measRes.data);
    if (workRes.data) setWorkouts(workRes.data as WorkoutRecord[]);
  };

  useEffect(() => { fetchData(); }, [user]);

  // --- Streak calculation ---
  const streak = useMemo(() => {
    const completedDates = workouts
      .filter(w => w.completed)
      .map(w => w.date)
      .sort((a, b) => b.localeCompare(a)); // descending

    if (completedDates.length === 0) return 0;

    let count = 0;
    const today = format(new Date(), "yyyy-MM-dd");
    let checkDate = today;

    // If today isn't completed, start from yesterday
    if (!completedDates.includes(today)) {
      const yesterday = format(addDays(new Date(), -1), "yyyy-MM-dd");
      if (!completedDates.includes(yesterday)) return 0;
      checkDate = yesterday;
    }

    for (let i = 0; i < 365; i++) {
      const d = format(addDays(new Date(checkDate), -i), "yyyy-MM-dd");
      if (completedDates.includes(d)) count++;
      else break;
    }
    return count;
  }, [workouts]);

  // --- Weekly calendar ---
  const currentWeekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const weekLabel = `${format(weekDays[0], "d MMM", { locale: ptBR })} - ${format(weekDays[6], "d MMM", { locale: ptBR })}`;

  const getWorkoutForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return workouts.find(w => w.date === dateStr);
  };

  // --- Stats ---
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

  const latestWeight = measurements.length > 0 ? measurements[measurements.length - 1]?.weight : null;
  const previousWeight = measurements.length > 1 ? measurements[measurements.length - 2]?.weight : null;
  const weightDiff = latestWeight && previousWeight ? (latestWeight - previousWeight).toFixed(1) : null;

  const latestMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;

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
      toast.success("Medidas salvas! 🦋");
      setForm({ weight: "", waist: "", hip: "", thigh: "", arm: "" });
      setShowMeasureForm(false);
      fetchData();
    }
    setSaving(false);
  };

  // Streak milestones
  const streakMilestones = [2, 5, 7, 14, 21, 30];
  const nextMilestone = streakMilestones.find(m => m > streak) || 30;
  const streakProgress = Math.min((streak / nextMilestone) * 100, 100);

  return (
    <AppLayout>
      <h1 className="text-2xl font-heading text-foreground mb-1">Sua Evolução</h1>
      <p className="text-sm text-muted-foreground mb-5">Acompanhe cada conquista 🦋</p>

      {/* Streak Card */}
      <div className="soft-card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-lg font-heading text-foreground">
              Sequência de <span className="text-primary font-bold">{streak}</span> {streak === 1 ? "dia" : "dias"}
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
        {/* Progress bar */}
        <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full pink-gradient rounded-full transition-all duration-700"
            style={{ width: `${streakProgress}%` }}
          />
          {/* Milestone markers */}
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

        {/* Week summary */}
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

        {/* Current stats grid */}
        {latestMeasurement ? (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Peso", value: latestMeasurement.weight, unit: "kg", diff: weightDiff },
              { label: "Cintura", value: latestMeasurement.waist, unit: "cm", diff: null },
              { label: "Quadril", value: latestMeasurement.hip, unit: "cm", diff: null },
            ].map((stat) => (
              <div key={stat.label} className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {stat.value ?? "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">{stat.unit}</p>
                {stat.diff && (
                  <div className={`flex items-center justify-center gap-0.5 mt-1 ${
                    parseFloat(stat.diff) < 0 ? "text-green-500" : parseFloat(stat.diff) > 0 ? "text-orange-500" : "text-muted-foreground"
                  }`}>
                    {parseFloat(stat.diff) < 0 ? <TrendingDown className="w-3 h-3" /> : parseFloat(stat.diff) > 0 ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    <span className="text-[10px] font-bold">{Math.abs(parseFloat(stat.diff))} kg</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4 mb-4">Registre suas primeiras medidas abaixo</p>
        )}

        {/* Additional measurements */}
        {latestMeasurement && (latestMeasurement.thigh || latestMeasurement.arm) && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "Coxa", value: latestMeasurement.thigh, unit: "cm" },
              { label: "Braço", value: latestMeasurement.arm, unit: "cm" },
            ].filter(s => s.value).map((stat) => (
              <div key={stat.label} className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                <p className="text-lg font-bold text-foreground mt-1">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.unit}</p>
              </div>
            ))}
          </div>
        )}

        {/* Measurement form */}
        {showMeasureForm && (
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
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full pink-gradient text-primary-foreground font-heading mt-4 h-12 rounded-2xl text-base shadow-lg"
            >
              {saving ? "Salvando..." : "Salvar Medidas"}
            </Button>
          </div>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="soft-card p-5 mb-4">
          <h3 className="text-base font-heading text-foreground mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-primary" />
            Progresso
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
              <Line type="monotone" dataKey="peso" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 3 }} name="Peso" />
              <Line type="monotone" dataKey="cintura" stroke="hsl(340 90% 70%)" strokeWidth={2} dot={{ r: 2 }} name="Cintura" />
              <Line type="monotone" dataKey="quadril" stroke="hsl(0 0% 65%)" strokeWidth={2} dot={{ r: 2 }} name="Quadril" />
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
          <div className="space-y-2.5">
            {workouts.filter(w => w.completed).slice(0, 5).map((w) => {
              const wJson = w.workout_json as any;
              const title = wJson?.title || "Treino";
              const exerciseCount = wJson?.exercises?.length || wJson?.tri_sets?.reduce((a: number, t: any) => a + (t.exercises?.length || 0), 0) || 0;
              const effort = w.feedback_effort === "facil" ? "😊 Fácil" : w.feedback_effort === "ideal" ? "💪 Ideal" : w.feedback_effort === "dificil" ? "🔥 Difícil" : "";

              return (
                <div key={w.id} className="flex items-center gap-3 bg-muted/40 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(w.date), "d 'de' MMM", { locale: ptBR })} · {exerciseCount} exercícios
                    </p>
                  </div>
                  {effort && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">{effort}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Evolucao;
