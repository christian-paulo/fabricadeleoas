import AppLayout from "@/components/AppLayout";
import { User, CreditCard, HelpCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Perfil = () => {
  const { user, profile, subscription, signOut } = useAuth();
  const navigate = useNavigate();

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

  const getStatusLabel = () => {
    if (!subscription) return { label: "Carregando...", color: "bg-muted text-muted-foreground" };
    if (subscription.status === "trialing") return { label: "Trial Ativo", color: "bg-primary/20 text-primary" };
    if (subscription.subscribed) return { label: "Assinante Ativa", color: "bg-green-500/20 text-green-400" };
    return { label: "Inativa", color: "bg-destructive/20 text-destructive" };
  };

  const status = getStatusLabel();

  return (
    <AppLayout>
      <h1 className="text-2xl text-foreground mb-6">Meu Perfil 🦁</h1>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full gold-gradient flex items-center justify-center">
          <User size={28} className="text-primary-foreground" />
        </div>
        <div>
          <p className="font-heading text-foreground">{profile?.full_name || "Leoa"}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="neu-card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-heading text-primary">Status da Assinatura</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
        </div>
        {subscription?.trial_end && (
          <p className="text-xs text-muted-foreground mb-3">
            Trial até: {new Date(subscription.trial_end).toLocaleDateString("pt-BR")}
          </p>
        )}
        <Button onClick={handleCancelSubscription} variant="outline"
          className="w-full border-destructive text-destructive hover:bg-destructive/10 h-10 text-sm rounded-xl">
          Gerenciar Assinatura
        </Button>
      </div>

      <div className="space-y-3">
        {[
          { icon: User, label: "Editar dados do Quiz", desc: "Atualize suas informações", action: () => navigate("/onboarding") },
          { icon: CreditCard, label: "Assinatura", desc: "Gerenciar plano e pagamento", action: handleCancelSubscription },
          { icon: HelpCircle, label: "Suporte", desc: "Fale com a Alcateia", action: () => {} },
        ].map((item) => (
          <button key={item.label} onClick={item.action} className="neu-card p-4 w-full flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <item.icon size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-sm text-foreground font-medium">{item.label}</p>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <Button variant="ghost" onClick={handleSignOut}
        className="w-full mt-6 text-muted-foreground hover:text-destructive h-10 text-sm">
        <LogOut size={16} className="mr-2" /> Sair da Conta
      </Button>
    </AppLayout>
  );
};

export default Perfil;
