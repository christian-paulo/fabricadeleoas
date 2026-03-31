import { useEffect, useState, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Play, Download, Loader2, Lock } from "lucide-react";
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
import cardProtocolo from "@/assets/card-protocolo.jpg";
import cardCoxa from "@/assets/card-coxa.jpg";
import card10min from "@/assets/card-10min.jpg";
import cardSeca from "@/assets/card-seca.jpg";

const Dashboard = () => {
  const { user, profile, subscription, loading } = useAuth();
  const navigate = useNavigate();
  const [weekFrequency, setWeekFrequency] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [loadingWorkout, setLoadingWorkout] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const { data: weekWorkouts } = await supabase.from("workouts")
        .select("id").eq("profile_id", user.id).eq("completed", true)
        .gte("date", weekStart.toISOString().split("T")[0]);
      setWeekFrequency(weekWorkouts?.length || 0);

      const { count } = await supabase.from("workouts")
        .select("id", { count: "exact", head: true }).eq("profile_id", user.id).eq("completed", true);
      setTotalDays(count || 0);
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
      <p className="text-base text-muted-foreground mb-6">Vamos treinar hoje?</p>

      {/* Challenge Cards Carousel */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-heading text-foreground uppercase">Protocolos</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory overscroll-x-contain" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}>
          <style>{`.overscroll-x-contain::-webkit-scrollbar { display: none; }`}</style>
          {[
            { title: "Protocolo Personalizado", image: cardProtocolo, locked: false, bg: "from-sky-200 to-sky-100", route: "/treinos" },
            { title: "Desafio Coxa Turbinada", image: cardCoxa, locked: true, bg: "from-pink-300 to-pink-100" },
            { title: "10 Minutos Para Transformar Seu Corpo", image: card10min, locked: true, bg: "from-purple-300 to-purple-100" },
            { title: "Protocolo Seca Buxo", image: cardSeca, locked: true, bg: "from-orange-200 to-rose-100" },
          ].map((card, idx) => (
            <div
              key={idx}
              onClick={() => !card.locked && card.route && navigate(card.route)}
              className={`relative flex-shrink-0 w-[75%] snap-start rounded-3xl overflow-hidden h-[340px] ${card.locked ? "cursor-default" : "cursor-pointer active:scale-[0.98] transition-transform"}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.bg}`} />
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.3) 20px, rgba(255,255,255,0.3) 21px), repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(255,255,255,0.3) 20px, rgba(255,255,255,0.3) 21px)`
              }} />
              <img
                src={card.image}
                alt={card.title}
                className="absolute right-0 top-0 h-full w-[60%] object-cover object-top"
                loading={idx === 0 ? "eager" : "lazy"}
              />
              {card.locked && (
                <div className="absolute inset-0 bg-black/30 z-10 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                    <Lock className="w-7 h-7 text-white" />
                  </div>
                </div>
              )}
              <div className="relative z-20 p-5 flex flex-col justify-between h-full">
                <div>
                  <span className="inline-block bg-white/80 backdrop-blur-sm text-xs font-semibold px-3 py-1 rounded-full mb-3 text-foreground">
                    {card.locked ? "Em breve" : "Seu Plano"}
                  </span>
                  <h3 className="text-2xl font-bold text-foreground leading-tight max-w-[55%]">
                    {card.title}
                  </h3>
                </div>
                {!card.locked && (
                  <button className="w-full bg-white/90 backdrop-blur-sm text-foreground font-semibold py-3 rounded-2xl text-base">
                    Início
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Streak / Sequência de dias */}
      <div className="soft-card p-6 mb-6 flex items-center gap-5">
        <div className="relative flex-shrink-0 w-16 h-20">
          {/* Fire emoji SVG */}
          <svg viewBox="0 0 64 80" className="w-full h-full">
            <defs>
              <radialGradient id="fireGrad" cx="50%" cy="70%" r="50%">
                <stop offset="0%" stopColor="#FF6B00" />
                <stop offset="60%" stopColor="#FF9500" />
                <stop offset="100%" stopColor="#FFD580" stopOpacity="0.6" />
              </radialGradient>
            </defs>
            <ellipse cx="32" cy="50" rx="28" ry="30" fill="#FFD580" opacity="0.35" />
            <path d="M32 5 C20 25, 8 40, 8 55 C8 70, 18 78, 32 78 C46 78, 56 70, 56 55 C56 40, 44 25, 32 5Z" fill="url(#fireGrad)" />
            <ellipse cx="32" cy="58" rx="12" ry="14" fill="#FFD580" opacity="0.7" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white" style={{ paddingTop: '12px' }}>
            {totalDays}
          </span>
        </div>
        <div>
          <h3 className="text-xl font-heading text-foreground">Sequência de dias</h3>
          <p className="text-sm text-muted-foreground">Treine diariamente para manter sua sequência viva</p>
        </div>
      </div>

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
