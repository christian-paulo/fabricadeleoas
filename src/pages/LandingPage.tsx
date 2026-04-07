import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, Sparkles, ChevronDown, Flame, Target, TrendingUp, Dumbbell, Play, Users, Star, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureUtms } from "@/lib/utm";
import { useAuth } from "@/hooks/useAuth";

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const goToOnboarding = () => navigate("/onboarding/boas-vindas");
  const goToEntrar = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  useEffect(() => { captureUtms(); }, []);

  const marqueeItems = [
    "Protocolos diários personalizados",
    "Treino em casa ou academia",
    "Adaptado às suas dores",
    "Tri-sets com vídeo demonstrativo",
    "Acompanhamento de evolução",
    "Método exclusivo do Gilvan",
    "3 dias grátis para testar",
  ];

  const faqs = [
    {
      q: "Funciona mesmo para quem nunca treinou?",
      a: "Sim! Eu monto seu protocolo baseado no seu nível atual. Se você é iniciante, começo devagar e vou aumentando conforme sua evolução. Cada treino é pensado para o seu corpo e suas limitações."
    },
    {
      q: "Preciso de academia ou equipamentos?",
      a: "Não necessariamente. No onboarding, você me conta onde treina e o que tem disponível. Eu monto protocolos que funcionam em casa, na academia, ou com o mínimo de equipamento."
    },
    {
      q: "Tenho dores e lesões. Posso usar?",
      a: "Com certeza. Eu adapto cada protocolo às suas dores e limitações. Se algo incomoda, eu ajusto. Seu corpo é único e seu treino também deve ser."
    },
    {
      q: "Como funciona o período de teste?",
      a: "Você tem 3 dias de acesso total e gratuito. Se não amar o método, cancele com 1 clique no app antes da cobrança. Zero burocracia, zero risco."
    },
    {
      q: "Os treinos são longos?",
      a: "Você escolhe a duração que cabe na sua rotina. Eu monto protocolos de 20 a 50 minutos, sempre com máxima eficiência. Qualidade, não quantidade."
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Promo Banner */}
      <div className="pink-gradient text-primary-foreground text-center py-2.5 px-4 text-xs sm:text-sm font-medium">
        🔥 Promoção de lançamento: <strong>3 dias GRÁTIS</strong> · Apenas para as primeiras que decidirem · Encerra sem aviso
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <img src={logoIcon} alt="Fábrica de Leoas" className="h-10 w-auto" />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goToEntrar} className="text-foreground text-xs">
              {user ? "Ir para o App" : "Entrar"}
            </Button>
            <Button size="sm" onClick={goToOnboarding}
              className="pink-gradient text-primary-foreground rounded-full font-semibold text-xs px-4">
              Começar Grátis
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-12 pb-8 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-pink-soft/60 via-background to-background" />
        <div className="relative z-10 container mx-auto text-center max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">47 mulheres treinando agora</span>
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground leading-[1.1] mb-4">
            PARE DE TREINAR SEM RESULTADO.
          </h1>
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary leading-[1.1] mb-6 italic">
            SEU CORPO MUDA QUANDO O MÉTODO É CERTO.
          </h2>

          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            Sem direção, sem resultado, sem evolução.
          </p>
          <p className="text-foreground font-semibold text-base sm:text-lg mb-10">
            A Fábrica de Leoas é o sistema que muda isso de vez.
          </p>

          {/* Video Placeholder */}
          <div className="max-w-sm mx-auto mb-10 rounded-2xl overflow-hidden shadow-2xl border-2 border-border/40">
            <div className="relative bg-foreground/5" style={{ paddingBottom: "177.78%" }}>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-foreground/80 to-foreground/95">
                <div className="w-16 h-16 rounded-full pink-gradient flex items-center justify-center mb-3 shadow-lg">
                  <Play className="w-7 h-7 text-primary-foreground ml-1" />
                </div>
                <p className="text-primary-foreground font-heading font-bold text-sm">Assista e entenda o método</p>
                <p className="text-primary-foreground/70 text-xs mt-1">Clique para assistir</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <Button size="lg" onClick={goToOnboarding}
            className="w-full max-w-sm mx-auto pink-gradient text-primary-foreground font-heading font-bold text-base py-7 rounded-2xl animate-pulse-pink hover:scale-105 transition-transform shadow-lg">
            QUERO COMEÇAR AGORA
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Marquee */}
      <div className="py-4 bg-secondary/50 overflow-hidden border-y border-border/40">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className="mx-6 text-sm text-muted-foreground font-medium flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { value: "142", label: "exercícios com vídeo", icon: Dumbbell },
              { value: "4.9★", label: "avaliação das alunas", icon: Star },
              { value: "3 dias", label: "grátis para testar", icon: Shield },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="flex justify-center mb-2">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="font-heading text-xl sm:text-2xl font-extrabold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Diagnóstico - Pain Points */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 mb-4">
            <span className="text-xs text-destructive font-semibold">🔴 DIAGNÓSTICO</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">Reconhece alguma dessas situações?</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground mb-3">
            Você treina sem resultado. <em className="text-primary not-italic">E não é culpa sua.</em>
          </h2>
          <p className="text-muted-foreground text-sm mb-10 leading-relaxed">
            Os dias passam e nada muda. Treinos genéricos não funcionam porque ignoram o SEU corpo, as SUAS dores e os SEUS objetivos.
          </p>

          <div className="space-y-4">
            {[
              { stat: "3x", desc: "Você já recomeçou dietas e treinos este ano", icon: Flame },
              { stat: "80%", desc: "Das mulheres desistem por falta de resultado visível", icon: Target },
              { stat: "1 ano", desc: "E o corpo continua o mesmo de sempre", icon: TrendingUp },
            ].map((item, i) => (
              <div key={i} className="soft-card p-5 flex items-center gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
                  <span className="font-heading text-lg font-extrabold text-destructive">{item.stat}</span>
                </div>
                <div className="flex-1">
                  <p className="text-foreground text-sm font-medium">{item.desc}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={goToOnboarding}
                  className="text-primary text-xs font-semibold flex-shrink-0 whitespace-nowrap">
                  RESOLVER →
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* A Solução - Features */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-primary font-semibold">O MÉTODO</span>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground mb-3">
            3 pilares. <em className="text-primary not-italic">Um sistema.</em>
          </h2>
          <p className="text-muted-foreground text-sm mb-12 leading-relaxed">
            Protocolo, acompanhamento e adaptação. Tudo integrado no seu app.
          </p>

          <div className="space-y-8">
            {[
              {
                tag: "PROTOCOLO DIÁRIO",
                title: "Treino montado por mim, todo dia.",
                desc: "Eu cruzo seus dados com meus 142 exercícios e monto Tri-sets personalizados. Cada exercício tem vídeo demonstrativo.",
                bullets: ["Tri-sets com foco cirúrgico nas suas queixas.", "Vídeo de cada exercício para executar perfeito.", "Adaptado ao seu tempo e local de treino."]
              },
              {
                tag: "ADAPTAÇÃO",
                title: "Eu ajusto quando você precisa.",
                desc: "Se doer, eu adapto. Se ficar fácil, eu exijo mais. Seu protocolo evolui com você.",
                bullets: ["Adaptação a dores e lesões.", "Progressão inteligente de carga.", "Feedback a cada treino concluído."]
              },
              {
                tag: "EVOLUÇÃO",
                title: "Acompanhe sua transformação.",
                desc: "Registre medidas, veja gráficos e comprove que o método funciona. Resultado visível, não achismo.",
                bullets: ["Acompanhamento de medidas corporais.", "Gráficos de evolução ao longo do tempo.", "Histórico completo dos seus treinos."]
              },
            ].map((feature, i) => (
              <div key={i} className="soft-card p-6 sm:p-8">
                <div className="inline-flex px-2.5 py-1 rounded-full bg-primary/10 mb-4">
                  <span className="text-[10px] font-bold text-primary tracking-wider">{feature.tag}</span>
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm mb-5 leading-relaxed">{feature.desc}</p>
                <ul className="space-y-2.5">
                  {feature.bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-foreground">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-center text-foreground mb-12">
            Como <span className="text-primary">Funciona</span>
          </h2>
          <div className="space-y-8">
            {[
              { step: "01", title: "DNA da Leoa", desc: "Você responde um quiz rápido sobre seu corpo, tempo disponível e dores. Leva menos de 2 minutos." },
              { step: "02", title: "Eu Monto Seu Protocolo", desc: "Eu cruzo seus dados com meus 142 exercícios e monto seus Tri-sets diários personalizados." },
              { step: "03", title: "Eu Acompanho Você", desc: "A cada protocolo, eu ajusto a intensidade baseado no seu feedback. Se doer, eu adapto. Se ficar fácil, eu exijo mais." },
            ].map((item, i) => (
              <div key={i} className="flex gap-5 items-start">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl pink-gradient flex items-center justify-center shadow-lg">
                  <span className="font-heading font-bold text-lg text-primary-foreground">{item.step}</span>
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground mb-1">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="soft-card p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full pink-gradient flex items-center justify-center text-primary-foreground font-heading font-bold text-2xl shadow-lg">
                G
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 mb-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-[10px] text-primary font-semibold">Por que criei a Fábrica de Leoas</span>
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground">Gilvan</h3>
                <p className="text-xs text-muted-foreground">Criador do Método Fábrica de Leoas</p>
              </div>
            </div>
            <p className="text-foreground text-sm leading-relaxed mb-4">
              Eu vi milhares de mulheres treinando errado, seguindo treinos genéricos da internet, machucando o corpo e desistindo.
              <strong> Não era falta de vontade. Era falta de método.</strong>
            </p>
            <p className="text-foreground text-sm leading-relaxed">
              Criei a Fábrica de Leoas para resolver isso. Cada protocolo é montado por mim, adaptado ao seu corpo e à sua realidade.
              <strong> É o único app onde eu treino você de verdade.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-lg">
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-primary font-semibold">OFERTA EXCLUSIVA</span>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
              Invista em quem <em className="text-primary not-italic">mais importa.</em>
            </h2>
            <p className="text-muted-foreground text-sm">Acesso completo. Cancele quando quiser.</p>
            <p className="text-foreground text-sm font-semibold mt-2">3 dias grátis — sem burocracia.</p>
          </div>

          <div className="soft-card p-6 sm:p-8 border-2 border-primary/30 rounded-3xl shadow-lg mt-8">
            <div className="text-center mb-6">
              <p className="text-muted-foreground text-xs uppercase tracking-widest mb-2">Assinatura mensal</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="font-heading text-4xl sm:text-5xl font-extrabold text-primary">R$ 49,90</span>
                <span className="text-muted-foreground text-sm">/ mês</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Após o período de teste gratuito</p>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                "Protocolos diários personalizados por mim",
                "142 exercícios com vídeo demonstrativo",
                "Adaptação a dores e lesões",
                "Acompanhamento de medidas e evolução",
                "Treinos para casa e academia",
                "Suporte e comunidade de Leoas",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <Button size="lg" onClick={goToOnboarding}
              className="w-full pink-gradient text-primary-foreground font-heading font-bold text-base py-7 rounded-2xl animate-pulse-pink hover:scale-105 transition-transform shadow-lg">
              GARANTIR MEU ACESSO
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>

            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Check className="w-3 h-3" /> 3 dias grátis</span>
              <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Acesso imediato</span>
              <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Cancele quando quiser</span>
            </div>
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 max-w-lg text-center">
          <div className="soft-card p-6 sm:p-8 border border-primary/20">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-heading text-xl font-bold text-foreground mb-2">3 dias de garantia total</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Use tudo por 3 dias. Se não sentir diferença, cancele com 1 clique. Sem burocracia, sem perguntas.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-center text-foreground mb-3">
            Tudo que você precisa saber <em className="text-primary not-italic">antes de decidir.</em>
          </h2>
          <div className="mt-10 space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="soft-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-medium text-foreground text-sm pr-4">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 -mt-1">
                    <p className="text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-lg text-center">
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground mb-4">
            Sua transformação começa <span className="text-primary">agora.</span>
          </h2>
          <p className="text-muted-foreground text-sm mb-8">
            3 dias grátis. Sem risco. Sem burocracia.
          </p>
          <Button size="lg" onClick={goToOnboarding}
            className="w-full max-w-sm mx-auto pink-gradient text-primary-foreground font-heading font-bold text-base py-7 rounded-2xl animate-pulse-pink hover:scale-105 transition-transform shadow-lg">
            COMEÇAR MEUS 3 DIAS GRÁTIS
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            A partir de R$49,90/mês · 3 dias grátis
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border bg-background">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-wrap justify-center gap-6 mb-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-primary transition-colors">Política de Privacidade</a>
            <a href="#" className="hover:text-primary transition-colors">Contato</a>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Fábrica de Leoas. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
