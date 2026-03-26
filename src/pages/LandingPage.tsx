import { useNavigate } from "react-router-dom";
import { Check, Flame, Target, Dumbbell, Brain, ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";
import trainerImg from "@/assets/trainer-gilvan.png";

const LandingPage = () => {
  const navigate = useNavigate();

  const goToAuth = () => navigate("/auth");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <span className="font-heading text-xl font-bold text-primary tracking-tight">
            Fábrica de Leoas
          </span>
          <Button variant="outline" size="sm" onClick={goToAuth} className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            Entrar
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <img
          src={heroBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        <div className="relative z-10 container mx-auto px-4 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Método Exclusivo</span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-primary leading-tight mb-6">
            Eu sou o Gilvan, e criei o método que vai transformar o seu corpo.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Destrua a pochete, elimine o braço merendeira e construa seu legado treinando em casa ou na academia.
            Entre na <span className="text-accent font-semibold">Fábrica de Leoas</span> e teste por 3 dias gratuitos.
          </p>
          <Button
            size="lg"
            onClick={goToAuth}
            className="gold-gradient text-primary-foreground font-heading font-bold text-lg px-10 py-7 rounded-xl animate-pulse-gold hover:scale-105 transition-transform"
          >
            Iniciar Meus 3 Dias Grátis
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-primary mb-4">
            Eu desenhei a Fábrica de Leoas para você que quer eliminar:
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
              <div
                key={i}
                className="neu-card p-8 flex flex-col items-center text-center gap-4 hover:gold-glow transition-shadow duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <item.icon className="w-7 h-7 text-accent" />
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
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-primary mb-16">
            Como Funciona
          </h2>
          <div className="space-y-12">
            {[
              {
                step: "01",
                title: "DNA da Leoa",
                desc: "Você responde um quiz rápido sobre seu corpo, tempo disponível e dores. Leva menos de 2 minutos.",
              },
              {
                step: "02",
                title: "Eu Monto Seu Treino",
                desc: "Eu cruzo seus dados com meus 142 exercícios e monto seus Tri-sets diários personalizados.",
              },
              {
                step: "03",
                title: "Eu Acompanho Você",
                desc: "A cada treino, eu ajusto a intensidade baseado no seu feedback. Se doer, eu adapto. Se ficar fácil, eu exijo mais.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-6 md:gap-8 items-start">
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center">
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

      {/* Authority */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-shrink-0">
              <div className="w-64 h-64 md:w-80 md:h-80 rounded-3xl overflow-hidden border-2 border-primary/30 gold-glow">
                <img
                  src={trainerImg}
                  alt="Personal Trainer Gilvan"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  width={768}
                  height={1024}
                />
              </div>
            </div>
            <div>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary mb-6">
                Quem sou eu?
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Sou o Gilvan, personal trainer com mais de 15 anos transformando corpos femininos. Desenvolvi um método único de Tri-sets
                que ataca simultaneamente estética e saúde. Cada treino que você recebe na Fábrica de Leoas
                carrega a minha lógica de progressão, as minhas combinações inteligentes de
                exercícios e a minha atenção a dores e limitações.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Agora, o meu método que era exclusivo para minhas alunas presenciais está disponível para você —
                <span className="text-accent font-semibold"> 24h por dia, 7 dias por semana</span>, no seu bolso.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 md:py-28 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-lg">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-primary mb-14">
            Invista na sua evolução
          </h2>
          <div className="neu-card p-8 md:p-10 border-2 border-primary/40 rounded-3xl gold-glow">
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
                "Adaptação inteligente a dores e lesões",
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
            <Button
              size="lg"
              onClick={goToAuth}
              className="w-full gold-gradient text-primary-foreground font-heading font-bold text-lg py-7 rounded-xl animate-pulse-gold hover:scale-105 transition-transform"
            >
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
