import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Play, Download, Loader2, Lock, Flame, CheckCircle2 } from "lucide-react";
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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { BADGE_DEFINITIONS, type EarnedBadge } from "@/lib/badges";
import cardProtocolo from "@/assets/card-protocolo.jpg";
import cardCoxa from "@/assets/card-coxa.jpg";
import card10min from "@/assets/card-10min.jpg";
import cardSeca from "@/assets/card-seca.jpg";
import TreinosClassicos from "@/components/TreinosClassicos";

const Dashboard = () => {
  const { user, profile, subscription, loading } = useAuth();
  usePushNotifications();
  const navigate = useNavigate();
  const [weekFrequency, setWeekFrequency] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [loadingWorkout, setLoadingWorkout] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const now = new Date();
      // Monday-based week (resets every Monday)
      const day = now.getDay(); // 0=Sun,1=Mon,...
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
    };
    fetchStats();
  }, [user]);

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

      <h1 className="text-3xl text-foreground mb-1">
        Olá, <span className="text-primary">{name}</span>! 👋
      </h1>
      <p className="text-base text-muted-foreground mb-4">Vamos treinar hoje?</p>

      {/* Weekly Consistency Bar */}
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
      </div>

      {/* Challenge Cards Carousel */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-heading text-foreground uppercase">Protocolos</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 pl-4 pr-4 snap-x snap-mandatory overscroll-x-contain" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x', scrollPaddingLeft: '16px' }}>
          <style>{`.overscroll-x-contain::-webkit-scrollbar { display: none; }`}</style>
          {(() => {
            const protocolTotalDays = weekTarget * 4; // 4-week protocol
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
                    className="absolute inset-0 w-full h-full object-cover"
                    loading={idx === 0 ? "eager" : "lazy"}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                  <div className="relative z-20 p-5 flex flex-col justify-end h-full items-center text-center">
                    {!card.locked && (
                      <>
                        <span className="inline-block bg-white/20 backdrop-blur-sm text-xs font-semibold px-4 py-1 rounded-full mb-3 text-white">
                          Seu Plano
                        </span>
                        <h3 className="text-2xl font-bold text-white leading-tight mb-2">
                          {card.title}
                        </h3>
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
                      </>
                    )}

                    {isUnlockable && (
                      <>
                        <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm mb-3">
                          <Lock className="w-5 h-5 text-white/70" />
                        </div>
                        <span className="inline-block text-xs font-semibold text-white/80 mb-3">
                          {card.unlockDays} dias 🔥
                        </span>
                        <button
                          disabled={!canUnlock}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canUnlock) toast.success(`${card.title} desbloqueado! 🎉🦁`);
                          }}
                          className={`inline-block bg-white/20 backdrop-blur-sm text-xs font-semibold px-4 py-1 rounded-full text-white mb-3 ${!canUnlock ? "opacity-60 cursor-not-allowed" : "cursor-pointer active:scale-95 transition-transform"}`}
                        >
                          Desbloquear
                        </button>
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

      {/* Streak / Sequência de dias */}
      <div className="soft-card p-6 mb-6 flex items-center gap-5">
        <div className="flex-shrink-0 w-14 h-16">
          <svg viewBox="0 0 56 68" className="w-full h-full">
            <defs>
              <radialGradient id="fireGrad" cx="50%" cy="65%" r="50%">
                <stop offset="0%" stopColor="#FF6B00" />
                <stop offset="55%" stopColor="#FF9500" />
                <stop offset="100%" stopColor="#FFD580" stopOpacity="0.5" />
              </radialGradient>
            </defs>
            <ellipse cx="28" cy="42" rx="26" ry="26" fill="#FFD580" opacity="0.3" />
            <path d="M28 4 C18 20, 6 33, 6 46 C6 58, 15 66, 28 66 C41 66, 50 58, 50 46 C50 33, 38 20, 28 4Z" fill="url(#fireGrad)" />
            <ellipse cx="28" cy="48" rx="10" ry="12" fill="#FFD580" opacity="0.6" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-heading text-foreground"><span className="text-xl font-bold">{totalDays}</span> Sequência de treinos</h3>
          <p className="text-sm text-muted-foreground">Cada treino te deixa mais perto da sua melhor versão 🦁</p>
        </div>
      </div>

      <TreinosClassicos />

      <h2 className="text-lg font-heading text-foreground mb-4 uppercase">Conteúdos da Alcateia</h2>
      <div className="space-y-3 mb-4">
        {[
          { title: "Ciclo dos Carboidratos", desc: "Guia completo para otimizar sua alimentação" },
          { title: "Comportamentos", desc: "Hábitos e mindset para resultados duradouros" },
        ].map((ebook) => (
          <div key={ebook.title} className="soft-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl pink-gradient flex items-center justify-center flex-shrink-0 shadow-md">
              <Download size={20} className="text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-heading text-foreground uppercase mb-0.5">{ebook.title}</h3>
              <p className="text-xs text-muted-foreground">{ebook.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
