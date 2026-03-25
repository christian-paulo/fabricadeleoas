import AppLayout from "@/components/AppLayout";
import { Play, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const mockStats = { weekFrequency: 3, totalDays: 5, weekTarget: 4 };

const Dashboard = () => {
  const name = "Leoa";

  return (
    <AppLayout>
      {/* Greeting */}
      <h1 className="text-2xl text-foreground mb-6">
        Olá, Leoa <span className="text-primary">{name}</span>! 🦁
      </h1>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="neu-card p-4 flex flex-col items-center">
          <div className="relative w-16 h-16 mb-2">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15" fill="none"
                stroke="hsl(var(--primary))" strokeWidth="3"
                strokeDasharray={`${(mockStats.weekFrequency / mockStats.weekTarget) * 94} 94`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-heading text-primary">
              {mockStats.weekFrequency}/{mockStats.weekTarget}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">Frequência Semanal</span>
        </div>

        <div className="neu-card p-4 flex flex-col items-center">
          <div className="relative w-16 h-16 mb-2">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15" fill="none"
                stroke="hsl(var(--accent))" strokeWidth="3"
                strokeDasharray={`${(mockStats.totalDays / 30) * 94} 94`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-heading text-accent">
              {mockStats.totalDays}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">Dias de Caçada</span>
        </div>
      </div>

      {/* Treino do Dia */}
      <div className="neu-card p-5 mb-6 gold-glow">
        <h2 className="text-lg text-primary mb-1">Treino do Dia</h2>
        <p className="text-sm text-muted-foreground mb-4">Membros Superiores • Tri-set A</p>
        <Button className="w-full gold-gradient text-primary-foreground font-heading text-sm h-12 rounded-xl animate-pulse-gold">
          <Play size={18} className="mr-2" />
          Iniciar Caçada
        </Button>
      </div>

      {/* E-books */}
      <h2 className="text-lg text-primary mb-3">E-books da Alcateia 📚</h2>
      <div className="grid grid-cols-2 gap-4 mb-4">
        {[
          { title: "Ciclo dos Carboidratos", desc: "Guia alimentar" },
          { title: "Comportamentos", desc: "Mindset da Leoa" },
        ].map((ebook) => (
          <div key={ebook.title} className="neu-card p-4">
            <h3 className="text-xs font-heading text-foreground mb-1">{ebook.title}</h3>
            <p className="text-[10px] text-muted-foreground mb-3">{ebook.desc}</p>
            <button className="flex items-center gap-1 text-primary text-xs font-medium">
              <Download size={14} /> Baixar
            </button>
          </div>
        ))}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
