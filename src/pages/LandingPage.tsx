import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Flame, Target, Dumbbell, ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureUtms } from "@/lib/utm";

const LandingPage = () => {
  const navigate = useNavigate();
  const goToAuth = () => navigate("/auth");

  useEffect(() => { captureUtms(); }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <span className="font-heading text-xl font-bold text-primary tracking-tight">Fábrica de Leoas</span>
          <Button variant="outline" size="sm" onClick={goToAuth}
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-xl">
            Entrar
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-pink-soft/80 via-background to-background" />
        <div className="relative z-10 container mx-auto px-4 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Método Exclusivo</span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
            Eu sou o Gilvan, e criei o método que vai <span className="text-primary">transformar o seu corpo.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Destrua a pochete, elimine o braço merendeira e construa seu legado treinando em casa ou na academia.
            Entre na <span className="text-primary font-semibold">Fábrica de Leoas</span> e teste por 3 dias gratuitos.
          </p>
          <Button size="lg" onClick={goToAuth}
            className="pink-gradient text-primary-foreground font-heading font-bold text-lg px-10 py-7 rounded-2xl animate-pulse-pink hover:scale-105 transition-transform shadow-lg">
            Iniciar Meus 3 Dias Grátis
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
            Eu desenhei a Fábrica de Leoas para você que quer <span className="text-primary">eliminar:</span>
          </h2>
          <p className="text-center text-muted-foreground mb-14 max-w-lg mx-auto">
            Eu monto cada treino com foco cirúrgico nas suas queixas.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Flame, title: "A Barriga Pochete / de Grávida" },
              { icon: Target, title: "O Braço Mole (Merendeira)" },
              { icon: TrendingUp, title: "O Bumbum Caído" },
              { icon: Dumbbell, title: "A Coxa Flácida (Amoeba)" },
            ].map((item, i) => (
              <div key={i} className="soft-card p-8 flex flex-col items-center text-center gap-4 hover:shadow-lg transition-shadow duration-300">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground text-lg">{item.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-foreground mb-16">
            Como <span className="text-primary">Funciona</span>
          </h2>
          <div className="space-y-12">
            {[
              { step: "01", title: "DNA da Leoa", desc: "Você responde um quiz rápido sobre seu corpo, tempo disponível e dores. Leva menos de 2 minutos." },
              { step: "02", title: "Eu Monto Seu Treino", desc: "Eu cruzo seus dados com meus 142 exercícios e monto seus Tri-sets diários personalizados." },
              { step: "03", title: "Eu Acompanho Você", desc: "A cada treino, eu ajusto a intensidade baseado no seu feedback. Se doer, eu adapto. Se ficar fácil, eu exijo mais." },
            ].map((item, i) => (
              <div key={i} className="flex gap-6 md:gap-8 items-start">
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl pink-gradient flex items-center justify-center shadow-lg">
                  <span className="font-heading font-bold text-xl text-primary-foreground">{item.step}</span>
                </div>
                <div>
                  <h3 className="font-heading text-xl font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4 max-w-lg">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-foreground mb-14">
            Invista na sua <span className="text-primary">evolução</span>
          </h2>
          <div className="soft-card p-8 md:p-10 border-2 border-primary/30 rounded-3xl shadow-lg">
            <div className="text-center mb-8">
              <p className="text-muted-foreground text-sm uppercase tracking-widest mb-2">Assinatura mensal</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="font-heading text-5xl font-bold text-primary">R$ 49,90</span>
                <span className="text-muted-foreground">/ mês</span>
              </div>
            </div>
            <ul className="space-y-4 mb-10">
              {[
                "Treinos diários personalizados por mim",
                "Adaptação a dores e lesões",
                "Acompanhamento de medidas e evolução",
                "E-books exclusivos de nutrição",
                "Suporte e comunidade de Leoas",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <Button size="lg" onClick={goToAuth}
              className="w-full pink-gradient text-primary-foreground font-heading font-bold text-lg py-7 rounded-2xl animate-pulse-pink hover:scale-105 transition-transform shadow-lg">
              Desbloquear Minha Evolução
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <p className="text-center text-muted-foreground text-sm mt-6 leading-relaxed">
              <strong className="text-foreground">Por que pedimos o cartão?</strong> Para garantir seu compromisso.
              Você tem 3 dias de acesso total. Se não amar, cancele com 1 clique no app antes da cobrança. Zero burocracia.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-border bg-background">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-wrap justify-center gap-6 mb-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-primary transition-colors">Política de Privacidade</a>
            <a href="#" className="hover:text-primary transition-colors">Contato</a>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Fábrica de Leoas. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
