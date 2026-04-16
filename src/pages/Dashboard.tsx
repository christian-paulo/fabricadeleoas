import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Play, Loader2, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BADGE_DEFINITIONS, type EarnedBadge } from "@/lib/badges";
import cardProtocolo from "@/assets/card-protocolo.jpg";
import cardCoxa from "@/assets/card-coxa.jpg";
import card10min from "@/assets/card-10min.jpg";
import cardSeca from "@/assets/card-seca.jpg";
import TreinosClassicos from "@/components/TreinosClassicos";

const MEASUREMENT_REMINDER_KEY = "measurement_reminder_dismissed_at";

const Dashboard = () => {
  const { user, profile, subscription, loading } = useAuth();
  usePushNotifications();
  const navigate = useNavigate();
  const [weekFrequency, setWeekFrequency] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [loadingWorkout, setLoadingWorkout] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [todayWorkoutLabel, setTodayWorkoutLabel] = useState<string | null>(null);
  const [countdownText, setCountdownText] = useState("");
  const [showMeasurementReminder, setShowMeasurementReminder] = useState(false);
  const [lastMeasurementDate, setLastMeasurementDate] = useState<string | null>(null);

  // Compute unlock target date from trial_start_date + 7 days
  const trialStart = profile?.trial_start_date ? new Date(profile.trial_start_date) : null;
  const unlockDate = trialStart ? new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000) : null;

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const now = new Date();
      const day = now.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - diffToMonday);
      const { data: weekWorkouts } = await supabase.from("workouts")
        .select("id").eq("profile_id", user.id).eq("completed", true)
        .gte("date", weekStart.toISOString().split("T")[0]);
      setWeekFrequency(weekWorkouts?.length || 0);

      const { count } = await supabase.from("workouts")
        .select("id", { count: "exact", head: true }).eq("profile_id", user.id).eq("completed", true);
      setTotalDays(count || 0);

      const { data: badges } = await supabase
        .from("user_badges")
        .select("badge_key, earned_at")
        .eq("profile_id", user.id);
      if (badges) setEarnedBadges(badges as EarnedBadge[]);

      // Fetch next uncompleted workout for today's label
      const { data: nextWorkout } = await supabase
        .from("workouts")
        .select("workout_json")
        .eq("profile_id", user.id)
        .eq("completed", false)
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextWorkout?.workout_json) {
        const wj = nextWorkout.workout_json as any;
        const week = wj.week || wj.semana || null;
        const dayNum = wj.day || wj.dia || null;
        const workoutName = wj.name || wj.nome || wj.title || wj.titulo || null;
        if (week && dayNum) {
          setTodayWorkoutLabel(`📅 Hoje: Semana ${week} · Dia ${dayNum}${workoutName ? ` — ${workoutName}` : ""}`);
        }
      }
      // Check last measurement date for reminder
      const { data: latestMeas } = await supabase
        .from("measurements")
        .select("date")
        .eq("profile_id", user.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestMeas) {
        setLastMeasurementDate(latestMeas.date);
        const daysSince = Math.floor((Date.now() - new Date(latestMeas.date).getTime()) / (1000 * 60 * 60 * 24));
        const dismissed = localStorage.getItem(MEASUREMENT_REMINDER_KEY);
        const dismissedDaysAgo = dismissed ? Math.floor((Date.now() - new Date(dismissed).getTime()) / (1000 * 60 * 60 * 24)) : 999;
        setShowMeasurementReminder(daysSince >= 7 && dismissedDaysAgo >= 7);
      } else {
        // No measurements at all — also show reminder
        const dismissed = localStorage.getItem(MEASUREMENT_REMINDER_KEY);
        const dismissedDaysAgo = dismissed ? Math.floor((Date.now() - new Date(dismissed).getTime()) / (1000 * 60 * 60 * 24)) : 999;
        setShowMeasurementReminder(dismissedDaysAgo >= 7);
      }
    };
    fetchStats();
  }, [user]);

  // Countdown timer for locked protocols
  useEffect(() => {
    if (!unlockDate) return;

    const update = () => {
      const now = new Date();
      const diff = unlockDate.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdownText("Desbloqueado! 🎉");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setCountdownText(`🔒 Desbloqueia em ${days}d, ${hours}h e ${minutes}min`);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [unlockDate?.getTime()]);

  const handleStartWorkout = async () => {
    setLoadingWorkout(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-workout", {
        body: { date: new Date().toISOString().split("T")[0] },
      });
      if (error) throw error;
      navigate("/treinos");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar protocolo");
    } finally {
      setLoadingWorkout(false);
    }
  };

  const isExpired = !loading && subscription && !subscription.subscribed;

  const weekTarget = profile?.workout_days || 4;
  const name = profile?.full_name || "Leoa";

  const earnedKeys = new Set(earnedBadges.map(b => b.badge_key));
  const earnedCount = earnedBadges.length;
  const totalBadges = BADGE_DEFINITIONS.length;

  return (
    <AppLayout>
      {/* Expired subscription modal — cannot be closed */}
      <Dialog open={!!isExpired} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-md text-center [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="items-center">
            <div className="mx-auto mb-2 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-heading text-primary">
              Seu acesso expirou
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground mt-2 leading-relaxed">
              Seu período de teste chegou ao fim, mas sua jornada não precisa parar aqui.
              Suas alunas já estão vendo resultados — e o seu protocolo personalizado continua te esperando.
              Reative agora e não perca o ritmo! 💪🦁
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <Button
              onClick={async () => {
                const { data } = await supabase.functions.invoke("create-checkout");
                if (data?.url) window.open(data.url, "_blank");
              }}
              className="w-full pink-gradient text-primary-foreground font-heading text-base h-14 rounded-2xl shadow-lg"
            >
              Reativar meu acesso — R$ 49,90/mês
            </Button>
            <p className="text-xs text-muted-foreground">
              Cancele quando quiser, sem burocracia.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* 1. Greeting */}
      <h1 className="text-3xl text-foreground mb-1">
        Olá, <span className="text-primary">{name}</span>! 👋
      </h1>
      <p className="text-base text-muted-foreground mb-4">Vamos treinar hoje?</p>

      {/* 2. Protocolos */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-heading text-foreground uppercase">Protocolos</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 pl-4 pr-4 snap-x snap-mandatory overscroll-x-contain" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x', scrollPaddingLeft: '16px' }}>
          <style>{`.overscroll-x-contain::-webkit-scrollbar { display: none; }`}</style>
          {(() => {
            const protocolTotalDays = weekTarget * 4;
            const protocolPercent = protocolTotalDays > 0 ? Math.min(Math.round((totalDays / protocolTotalDays) * 100), 100) : 0;
            
            const cards = [
              { title: "Protocolo Personalizado", image: cardProtocolo, locked: false, route: "/treinos", unlockDays: 0 },
              { title: "Protocolo Seca Buxo", image: cardSeca, locked: true, unlockDays: 7 },
              { title: "10 Minutos Para Transformar Seu Corpo", image: card10min, locked: true, unlockDays: 14 },
              { title: "Desafio Coxa Turbinada", image: cardCoxa, locked: true, unlockDays: 21 },
            ];

            return cards.map((card, idx) => {
              const canUnlock = totalDays >= card.unlockDays;
              const isUnlockable = card.locked && card.unlockDays > 0;
              const isLocked = card.locked && !canUnlock;

              return (
                <div
                  key={idx}
                  onClick={() => !card.locked && card.route && navigate(card.route)}
                  className={`relative flex-shrink-0 w-[70%] snap-start rounded-3xl overflow-hidden h-[340px] ${isLocked ? "cursor-default" : card.locked ? "cursor-default" : "cursor-pointer active:scale-[0.98] transition-transform"}`}
                >
                  <img
                    src={card.image}
                    alt={card.title}
                    className={`absolute inset-0 w-full h-full object-cover ${isLocked ? "blur-[3px]" : ""}`}
                    loading={idx === 0 ? "eager" : "lazy"}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                  <div className="relative z-20 p-5 flex flex-col justify-end h-full items-center text-center">
                    {!card.locked && (
                      <>
                        <span className="inline-block bg-white/20 backdrop-blur-sm text-xs font-semibold px-4 py-1 rounded-full mb-3 text-white">
                          Seu Plano
                        </span>
                        <h3 className="text-2xl font-bold text-white leading-tight mb-1">
                          {card.title}
                        </h3>

                        {/* Today's workout label */}
                        {todayWorkoutLabel && (
                          <p className="text-xs text-white/80 mb-2">{todayWorkoutLabel}</p>
                        )}

                        {totalDays > 0 && (
                          <div className="w-full mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-white/90">
                                {protocolPercent}% concluído 🔥
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden">
                              <div
                                className="h-full rounded-full pink-gradient transition-all duration-500 ease-out"
                                style={{ width: `${protocolPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <button className="w-full bg-white text-black font-bold py-3 rounded-2xl text-base uppercase tracking-wide">
                          Iniciar
                        </button>
                        <p className="text-[11px] text-white/50 mt-1.5">
                          Complete o treino de hoje para liberar o próximo dia do protocolo
                        </p>
                      </>
                    )}

                    {isUnlockable && (
                      <>
                        {/* Countdown instead of static lock */}
                        <p className="text-xs font-semibold text-white/90 mb-3 leading-snug">
                          {countdownText || "🔒 Em breve"}
                        </p>
                        <h3 className="text-2xl font-bold text-white leading-tight">
                          {card.title}
                        </h3>
                      </>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* 3. Meta Semanal + Badges inline */}
      <div className="soft-card p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-heading text-foreground uppercase">Meta semanal</span>
          <span className="text-sm text-muted-foreground">{weekFrequency} de {weekTarget} treinos</span>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full pink-gradient transition-all duration-500 ease-out"
            style={{ width: `${Math.min((weekFrequency / weekTarget) * 100, 100)}%` }}
          />
        </div>
        {weekFrequency >= weekTarget ? (
          <div className="flex items-center gap-2 mt-3">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">🔥 Semana completa! Você cumpriu sua meta.</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-2">
            {weekTarget - weekFrequency === 1
              ? "Falta 1 treino para fechar sua semana!"
              : `Faltam ${weekTarget - weekFrequency} treinos para fechar sua semana.`}
          </p>
        )}

        {/* Inline badges summary */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            {BADGE_DEFINITIONS.map((badge) => (
              <span
                key={badge.key}
                className={`text-[24px] leading-none ${!earnedKeys.has(badge.key) ? "grayscale opacity-40" : ""}`}
              >
                {badge.emoji}
              </span>
            ))}
          </div>
          <button
            onClick={() => navigate("/evolucao")}
            className="text-xs font-semibold text-primary whitespace-nowrap ml-auto"
          >
            ver conquistas →
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          {earnedCount} de {totalBadges} conquistas
        </p>
      </div>

      {/* 4. Turbine seu Treino */}
      <TreinosClassicos />
    </AppLayout>
  );
};

export default Dashboard;
