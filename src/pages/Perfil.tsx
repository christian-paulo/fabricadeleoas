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
    if (subscription.status === "trialing") return { label: "Trial Ativo", color: "bg-primary/15 text-primary" };
    if (subscription.subscribed) return { label: "Assinante Ativa", color: "bg-green-100 text-green-600" };
    return { label: "Inativa", color: "bg-destructive/15 text-destructive" };
  };

  const status = getStatusLabel();

  return (
    <AppLayout>
      <h1 className="text-3xl text-foreground mb-6 uppercase">Meu Perfil</h1>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-20 h-20 rounded-full pink-gradient flex items-center justify-center shadow-lg">
          <User size={32} className="text-primary-foreground" />
        </div>
        <div>
          <p className="font-heading text-xl text-foreground">{profile?.full_name || "Leoa"}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="soft-card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-heading text-primary">Status da Assinatura</span>
          <span className={`text-sm px-3 py-1 rounded-full font-bold ${status.color}`}>{status.label}</span>
        </div>
        {subscription?.trial_end && (
          <p className="text-sm text-muted-foreground mb-3">
            Trial até: {new Date(subscription.trial_end).toLocaleDateString("pt-BR")}
          </p>
        )}
        <Button onClick={handleCancelSubscription} variant="outline"
          className="w-full border-destructive text-destructive hover:bg-destructive/10 h-12 text-base rounded-2xl font-bold">
          Gerenciar Assinatura
        </Button>
      </div>

      <div className="space-y-3">
        {[
          { icon: User, label: "Editar dados do Quiz", desc: "Atualize suas informações", action: () => navigate("/onboarding/motivacao") },
          { icon: CreditCard, label: "Assinatura", desc: "Gerenciar plano e pagamento", action: handleCancelSubscription },
          { icon: HelpCircle, label: "Suporte", desc: "Fale com a Alcateia", action: () => {} },
        ].map((item) => (
          <button key={item.label} onClick={item.action} className="soft-card p-5 w-full flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <item.icon size={22} className="text-primary" />
            </div>
            <div>
              <p className="text-base text-foreground font-bold">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <Button variant="ghost" onClick={handleSignOut}
        className="w-full mt-6 text-muted-foreground hover:text-destructive h-12 text-base">
        <LogOut size={18} className="mr-2" /> Sair da Conta
      </Button>
    </AppLayout>
  );
};

export default Perfil;
