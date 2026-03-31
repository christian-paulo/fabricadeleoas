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

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="soft-card p-5 flex flex-col items-center">
          <div className="relative w-20 h-20 mb-3">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--primary))" strokeWidth="3.5"
                strokeDasharray={`${(weekFrequency / weekTarget) * 94} 94`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-heading text-primary">
              {weekFrequency}/{weekTarget}
            </span>
          </div>
          <span className="text-sm text-muted-foreground font-medium">Frequência Semanal</span>
        </div>
        <div className="soft-card p-5 flex flex-col items-center">
          <div className="relative w-20 h-20 mb-3">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--primary))" strokeWidth="3.5"
                strokeDasharray={`${(totalDays / 30) * 94} 94`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-heading text-primary">
              {totalDays}
            </span>
          </div>
          <span className="text-sm text-muted-foreground font-medium">Dias de Caçada</span>
        </div>
      </div>

      <div className="soft-card p-6 mb-6 border-2 border-primary/20">
        <h2 className="text-xl text-primary mb-1 uppercase">Protocolo do Dia</h2>
        <p className="text-sm text-muted-foreground mb-5">Preparado pelo Personal Gilvan</p>
        <Button onClick={handleStartWorkout} disabled={loadingWorkout}
          className="w-full pink-gradient text-primary-foreground font-heading text-base h-14 rounded-2xl animate-pulse-pink shadow-lg">
          {loadingWorkout ? <Loader2 className="animate-spin mr-2" size={20} /> : <Play size={20} className="mr-2" />}
          {loadingWorkout ? "Preparando Protocolo..." : "Iniciar Caçada"}
        </Button>
      </div>

      <h2 className="text-xl text-foreground mb-4 uppercase">Conteúdos da Alcateia</h2>
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
