import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Play, Flame, Droplets, Loader2, Download, User } from "lucide-react";
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
        }} className="gold-gradient text-primary-foreground font-heading h-14 rounded-2xl px-10 text-base">
          Assinar R$ 49,90/mês
        </Button>
      </div>
    );
  }

  const weekTarget = profile?.workout_days || 4;
  const name = profile?.full_name?.split(" ")[0] || "Leoa";

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl text-foreground uppercase">
            Olá, {name}! <span className="inline-block">👋</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Vamos treinar hoje?</p>
        </div>
        <button onClick={() => navigate("/perfil")}
          className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
          <User size={22} className="text-primary" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="neu-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={20} className="text-primary" />
            <span className="text-sm text-muted-foreground font-medium">Treinos da Semana</span>
          </div>
          <p className="text-3xl font-heading text-foreground">
            {weekFrequency}<span className="text-lg text-muted-foreground">/{weekTarget}</span>
          </p>
          {/* Progress bar */}
          <div className="w-full h-2 bg-muted rounded-full mt-3">
            <div className="h-2 bg-primary rounded-full transition-all" style={{ width: `${Math.min((weekFrequency / weekTarget) * 100, 100)}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{weekFrequency} treinos completados</p>
        </div>

        <div className="neu-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Droplets size={20} className="text-accent" />
            <span className="text-sm text-muted-foreground font-medium">Água</span>
          </div>
          <p className="text-3xl font-heading text-foreground">
            {totalDays}<span className="text-lg text-muted-foreground"> dias</span>
          </p>
          <div className="flex gap-1 mt-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full ${i < Math.min(totalDays, 8) ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Total de caçadas</p>
        </div>
      </div>

      {/* Current Workout Card */}
      <div className="neu-card p-5 mb-6 gold-glow border border-primary/30">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-primary/20 text-primary text-xs font-bold px-3 py-1 rounded-full">Dia A</span>
          <span className="text-xs text-muted-foreground">📅 {weekTarget}x semana</span>
        </div>
        <h2 className="text-xl font-heading text-foreground uppercase mt-3">Treino do Dia</h2>
        <p className="text-sm text-muted-foreground mb-4">{weekFrequency} de {weekTarget} treinos completados</p>
        <Button onClick={handleStartWorkout} disabled={loadingWorkout}
          className="w-full gold-gradient text-primary-foreground font-heading text-base h-14 rounded-2xl animate-pulse-gold">
          {loadingWorkout ? <Loader2 className="animate-spin mr-2" size={20} /> : <Play size={20} className="mr-2" />}
          {loadingWorkout ? "Gerando Treino..." : "▶ Iniciar Treino"}
        </Button>
      </div>

      {/* Content Section */}
      <h2 className="section-title mb-4">Conteúdo Suprema</h2>
      <div className="space-y-3 mb-4">
        {[
          { icon: "🔥", title: "Kit Corpinho de Verão Suprema", desc: "Treinos intensos para resultados rápidos" },
          { icon: "🥤", title: "Drink Anti Pochete Suprema", desc: "Receita exclusiva para queima de gordura" },
        ].map((item) => (
          <div key={item.title} className="neu-card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center text-2xl flex-shrink-0">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-heading text-foreground uppercase">{item.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
