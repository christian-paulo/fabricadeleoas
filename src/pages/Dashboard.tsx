import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Play, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      toast.error(err.message || "Erro ao gerar treino");
    } finally {
      setLoadingWorkout(false);
    }
  };

  if (!loading && subscription && !subscription.subscribed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 max-w-lg mx-auto">
        <h1 className="text-3xl font-heading text-primary mb-4">Acesso Bloqueado 🔒</h1>
        <p className="text-base text-muted-foreground text-center mb-6">
          Seu período de teste expirou. Assine para continuar treinando!
        </p>
        <Button onClick={async () => {
          const { data } = await supabase.functions.invoke("create-checkout");
          if (data?.url) window.location.href = data.url;
        }} className="gold-gradient text-primary-foreground font-heading text-base h-14 rounded-xl px-8">
          Assinar R$ 49,90/mês
        </Button>
      </div>
    );
  }

  const weekTarget = profile?.workout_days || 4;
  const name = profile?.full_name || "Leoa";

  return (
    <AppLayout>
      <h1 className="text-3xl text-foreground mb-1">
        Olá, <span className="text-primary">{name}</span>! 👋
      </h1>
      <p className="text-base text-muted-foreground mb-6">Vamos treinar hoje?</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="neu-card p-5 flex flex-col items-center">
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
        <div className="neu-card p-5 flex flex-col items-center">
          <div className="relative w-20 h-20 mb-3">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--accent))" strokeWidth="3.5"
                strokeDasharray={`${(totalDays / 30) * 94} 94`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-heading text-accent">
              {totalDays}
            </span>
          </div>
          <span className="text-sm text-muted-foreground font-medium">Dias de Caçada</span>
        </div>
      </div>

      <div className="neu-card p-6 mb-6 gold-glow">
        <h2 className="text-xl text-primary mb-1 uppercase">Treino do Dia</h2>
        <p className="text-sm text-muted-foreground mb-5">Gerado pela IA Guia das Leoas</p>
        <Button onClick={handleStartWorkout} disabled={loadingWorkout}
          className="w-full gold-gradient text-primary-foreground font-heading text-base h-14 rounded-xl animate-pulse-gold">
          {loadingWorkout ? <Loader2 className="animate-spin mr-2" size={20} /> : <Play size={20} className="mr-2" />}
          {loadingWorkout ? "Gerando Treino..." : "Iniciar Caçada"}
        </Button>
      </div>

      <h2 className="text-xl text-foreground mb-4 uppercase">Conteúdos da Alcateia</h2>
      <div className="space-y-3 mb-4">
        {[
          { title: "Ciclo dos Carboidratos", desc: "Guia completo para otimizar sua alimentação" },
          { title: "Comportamentos", desc: "Hábitos e mindset para resultados duradouros" },
        ].map((ebook) => (
          <div key={ebook.title} className="neu-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center flex-shrink-0">
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
