import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { User, CreditCard, HelpCircle, LogOut, Dumbbell, Edit2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Perfil = () => {
  const { user, profile, subscription, signOut } = useAuth();
  const navigate = useNavigate();
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: measurements } = await supabase.from("measurements")
        .select("weight").eq("profile_id", user.id).order("date", { ascending: false }).limit(1);
      if (measurements?.[0]?.weight) setLatestWeight(measurements[0].weight);

      const { count } = await supabase.from("workouts")
        .select("id", { count: "exact", head: true }).eq("profile_id", user.id).eq("completed", true);
      setStreak(count || 0);
    };
    fetchData();
  }, [user]);

  const handleCancelSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Erro ao abrir portal");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getGoalLabel = (goal: string | null) => {
    const map: Record<string, string> = {
      lose_weight: "Perder peso", gain_muscle: "Ganhar músculo",
      tone: "Tonificar", health: "Saúde", define: "Definir",
    };
    return goal ? map[goal] || goal : "—";
  };

  const getLevelLabel = (exp: string | null) => {
    const map: Record<string, string> = {
      beginner: "Iniciante", intermediate: "Intermediário", advanced: "Avançado",
    };
    return exp ? map[exp] || exp : "—";
  };

  const name = profile?.full_name?.split(" ")[0] || "Leoa";

  return (
    <AppLayout>
      {/* Avatar & Name */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 rounded-full gold-gradient flex items-center justify-center mb-3 shadow-lg">
          <User size={36} className="text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-heading text-foreground uppercase">{name}</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      {/* Weight / Goal cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="neu-card p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-xs text-muted-foreground font-semibold">Peso Atual</span>
            <Edit2 size={12} className="text-muted-foreground" />
          </div>
          <p className="text-2xl font-heading text-primary">
            {latestWeight ? `${latestWeight} kg` : "— kg"}
          </p>
        </div>
        <div className="neu-card p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-xs text-muted-foreground font-semibold">Meta</span>
            <Edit2 size={12} className="text-muted-foreground" />
          </div>
          <p className="text-2xl font-heading text-primary">
            {latestWeight ? `${Math.max(latestWeight - 5, 40)} kg` : "— kg"}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="neu-card p-4 mb-6">
        <div className="flex items-center justify-between py-2 border-b border-border">
          <span className="text-sm text-muted-foreground">Sequência</span>
          <span className="text-sm font-bold text-foreground">{streak} dias</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-border">
          <span className="text-sm text-muted-foreground">Objetivo</span>
          <span className="text-sm font-bold text-foreground">{getGoalLabel(profile?.goal || null)}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">Nível</span>
          <span className="text-sm font-bold text-foreground">{getLevelLabel(profile?.training_experience || null)}</span>
        </div>
      </div>

      {/* Medidas */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-title">Medidas Corporais</h2>
        <button onClick={() => navigate("/evolucao")} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <Plus size={16} className="text-foreground" />
        </button>
      </div>

      {/* Menu items */}
      <div className="space-y-3 mb-6">
        {[
          { icon: Dumbbell, label: "Plano de Treino", color: "bg-primary/15 text-primary", action: () => navigate("/treinos") },
          { icon: User, label: "Editar dados do Quiz", color: "bg-accent/15 text-accent", action: () => navigate("/onboarding") },
          { icon: CreditCard, label: "Gerenciar Assinatura", color: "bg-primary/15 text-primary", action: handleCancelSubscription },
          { icon: HelpCircle, label: "Suporte", color: "bg-muted text-foreground", action: () => {} },
        ].map((item) => (
          <button key={item.label} onClick={item.action}
            className="neu-card p-4 w-full flex items-center gap-4 text-left hover:border-primary/30 transition-all border border-transparent">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${item.color}`}>
              <item.icon size={20} />
            </div>
            <span className="text-base font-semibold text-foreground">{item.label}</span>
          </button>
        ))}
      </div>

      <Button variant="ghost" onClick={handleSignOut}
        className="w-full text-muted-foreground hover:text-destructive h-12 text-base font-medium">
        <LogOut size={18} className="mr-2" /> Sair da Conta
      </Button>
    </AppLayout>
  );
};

export default Perfil;
