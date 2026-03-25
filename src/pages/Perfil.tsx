import AppLayout from "@/components/AppLayout";
import { User, CreditCard, HelpCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const Perfil = () => {
  return (
    <AppLayout>
      <h1 className="text-2xl text-foreground mb-6">Meu Perfil 🦁</h1>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full gold-gradient flex items-center justify-center">
          <User size={28} className="text-primary-foreground" />
        </div>
        <div>
          <p className="font-heading text-foreground">Leoa Guerreira</p>
          <p className="text-xs text-muted-foreground">leoa@email.com</p>
        </div>
      </div>

      {/* Subscription status */}
      <div className="neu-card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-heading text-primary">Status da Assinatura</span>
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">Trial Ativo</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Período de teste: 3 dias restantes</p>
        <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10 h-10 text-sm rounded-xl">
          Cancelar Período de Teste
        </Button>
      </div>

      {/* Menu items */}
      <div className="space-y-3">
        {[
          { icon: User, label: "Editar dados do Quiz", desc: "Atualize suas informações" },
          { icon: CreditCard, label: "Assinatura", desc: "Gerenciar plano e pagamento" },
          { icon: HelpCircle, label: "Suporte", desc: "Fale com a Alcateia" },
        ].map((item) => (
          <button key={item.label} className="neu-card p-4 w-full flex items-center gap-3 text-left">
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

      <Button variant="ghost" className="w-full mt-6 text-muted-foreground hover:text-destructive h-10 text-sm">
        <LogOut size={16} className="mr-2" /> Sair da Conta
      </Button>
    </AppLayout>
  );
};

export default Perfil;
