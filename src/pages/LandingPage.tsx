import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, Sparkles, ChevronDown, Flame, Target, TrendingUp, Dumbbell, Star, Shield, Quote, Zap, Heart, Home, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureUtms } from "@/lib/utm";
import { useAuth } from "@/hooks/useAuth";
import logoIcon from "@/assets/logo-leoa-icon.png";
import dep1 from "@/assets/dep1.webp";
import dep2 from "@/assets/dep2.webp";
import dep3 from "@/assets/dep3.webp";
import dep4 from "@/assets/dep4.webp";
import dep5 from "@/assets/dep5.webp";
import depoimentosWhatsapp from "@/assets/depoimentos-whatsapp.png";

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showStickyCta, setShowStickyCta] = useState(false);

  const goToOnboarding = () => navigate("/onboarding/boas-vindas");
  const goToEntrar = () => {
    if (user) navigate("/dashboard");
    else navigate("/auth");
  };

  useEffect(() => {
    captureUtms();
    const handleScroll = () => setShowStickyCta(window.scrollY > 500);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const marqueeItems = [
    "Protocolos diários personalizados",
    "Treino em casa ou academia",
    "Adaptado às suas dores",
    "Tri-sets com vídeo demonstrativo",
    "Acompanhamento de evolução",
    "Método exclusivo do Gilvan",
    "7 dias de garantia de satisfação",
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
      q: "Como funciona a garantia?",
      a: "Você tem 7 dias de garantia incondicional de satisfação. Se não amar o método, devolvemos 100% do seu dinheiro — basta pedir pelo app. Zero burocracia, zero risco."
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
        🔥 Promoção de lançamento: <strong>7 DIAS DE GARANTIA</strong> · Apenas para as primeiras que decidirem · Encerra sem aviso
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

      {/* ─── HERO ─── */}
      <section className="relative pt-14 pb-14 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-pink-soft/70 via-background to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/8 blur-3xl pointer-events-none" />

        <div className="relative z-10 container mx-auto text-center max-w-3xl">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-background border border-border shadow-sm mb-7">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground font-medium">47 mulheres treinando agora</span>
          </div>

          {/* Aspirational H1 — identity, not accusation */}
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground leading-[1.1] mb-3 tracking-tight">
            SEJA A LEOA QUE SEU
          </h1>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary leading-[1.1] mb-6 italic">
            CORPO SEMPRE PEDIU.
          </h2>

          <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto mb-10 leading-relaxed">
            Treinos personalizados para o <strong className="text-foreground">seu corpo</strong>, seus objetivos e sua rotina.
            Sem academia. Sem desculpas. Com resultado.
          </p>

          <Button size="lg" onClick={goToOnboarding}
            className="w-full max-w-sm mx-auto pink-gradient text-primary-foreground font-heading font-bold text-base py-7 rounded-2xl animate-pulse-pink hover:scale-105 transition-transform shadow-lg">
            CRIAR MEU PROTOCOLO AGORA
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>

          {/* Trust row */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="flex -space-x-1.5">
              {[dep1, dep2, dep3, dep4, dep5].map((src, i) => (
                <img key={i} src={src} alt={`Aluna ${i + 1}`}
                  className="w-8 h-8 rounded-full border-2 border-background object-cover shadow-sm" />
              ))}
            </div>
            <div className="flex flex-col items-start">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-primary text-primary" />)}
              </div>
              <span className="text-xs text-muted-foreground">+200 leoas transformadas</span>
            </div>
          </div>
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

      {/* ─── STATS ─── */}
      <section className="py-14 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
            {[
              { value: "142", label: "exercícios com vídeo", icon: Dumbbell },
              { value: "4.9★", label: "avaliação das alunas", icon: Star },
              { value: "7 dias", label: "de garantia de satisfação", icon: Shield },
            ].map((stat, i) => (
              <div key={i} className="soft-card p-4 text-center border border-primary/10 bg-primary/5">
                <div className="flex justify-center mb-2">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="font-heading text-xl sm:text-2xl font-extrabold text-foreground">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PARA QUEM É ─── */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Heart className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-primary font-semibold">PARA QUEM É</span>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground">
              A Fábrica de Leoas foi feita <em className="text-primary not-italic">para você.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: Home,         title: "Treina em casa",          desc: "Sem academia, sem mensalidade, sem deslocamento. O protocolo funciona no seu espaço." },
              { icon: AlertCircle,  title: "Tem dores ou lesões",     desc: "Cada exercício é adaptado às suas limitações. Você treina com segurança e evolui." },
              { icon: Clock,        title: "Tem pouco tempo",         desc: "Protocolos de 20 a 50 min que cabem na sua rotina, mesmo nos dias mais corridos." },
              { icon: TrendingUp,   title: "Já tentou antes e desistiu", desc: "Desta vez é diferente: o método evolui com você. Sem treinos genéricos, sem abandono." },
            ].map((card, i) => (
              <div key={i} className="soft-card p-5 flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl pink-gradient flex items-center justify-center flex-shrink-0 shadow-sm">
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-heading font-bold text-sm text-foreground mb-1">{card.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button size="lg" onClick={goToOnboarding}
              className="pink-gradient text-primary-foreground font-heading font-bold text-sm py-6 px-8 rounded-2xl hover:scale-105 transition-transform shadow-lg">
              ISSO SOU EU — QUERO COMEÇAR
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── DIAGNÓSTICO — Pain Points ─── */}
      <section className="py-16 bg-background">
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
              { stat: "3x",   desc: "Você já recomeçou dietas e treinos este ano",           icon: Flame },
              { stat: "80%",  desc: "Das mulheres desistem por falta de resultado visível",  icon: Target },
              { stat: "1 ano",desc: "E o corpo continua o mesmo de sempre",                  icon: TrendingUp },
            ].map((item, i) => (
              <div key={i} className="soft-card p-5 flex items-center gap-4 border-l-4 border-l-destructive/60">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
                  <span className="font-heading text-lg font-extrabold text-destructive">{item.stat}</span>
                </div>
                <p className="text-foreground text-sm font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMO FUNCIONA (merged with O Método) ─── */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-primary font-semibold">COMO FUNCIONA</span>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground mb-3">
            3 passos. <em className="text-primary not-italic">Resultado real.</em>
          </h2>
          <p className="text-muted-foreground text-sm mb-12 leading-relaxed">
            Do quiz ao protocolo em menos de 2 minutos. Simples assim.
          </p>

          <div className="relative">
            <div className="absolute left-7 top-7 bottom-7 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-transparent hidden sm:block" />
            <div className="space-y-6">
              {[
                {
                  step: "01", icon: Target,
                  title: "DNA da Leoa",
                  desc: "Você responde um quiz rápido sobre seu corpo, objetivos, tempo disponível e dores. Leva menos de 2 minutos.",
                  bullets: ["Nível de experiência", "Local de treino e equipamentos", "Objetivos e áreas-alvo"]
                },
                {
                  step: "02", icon: Dumbbell,
                  title: "Seu Protocolo é Montado",
                  desc: "Eu cruzo seus dados com meus 142 exercícios e monto Tri-sets personalizados com vídeo para cada movimento.",
                  bullets: ["Tri-sets com foco nas suas queixas", "Vídeo demonstrativo em cada exercício", "Duração que cabe na sua rotina"]
                },
                {
                  step: "03", icon: TrendingUp,
                  title: "Evolução Contínua",
                  desc: "A cada treino, registro seu progresso. Se doer, eu adapto. Se ficar fácil, eu exijo mais.",
                  bullets: ["Acompanhamento de medidas e gráficos", "Progressão inteligente de carga", "Histórico completo dos seus treinos"]
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-5 items-start">
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl pink-gradient flex items-center justify-center shadow-lg z-10">
                    <span className="font-heading font-bold text-lg text-primary-foreground">{item.step}</span>
                  </div>
                  <div className="soft-card p-5 flex-1 overflow-hidden">
                    <div className="h-0.5 pink-gradient w-full -mt-5 mb-4 -mx-5" style={{ width: "calc(100% + 2.5rem)" }} />
                    <h3 className="font-heading text-lg font-bold text-foreground mb-1">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">{item.desc}</p>
                    <ul className="space-y-1.5">
                      {item.bullets.map((b, j) => (
                        <li key={j} className="flex items-center gap-2 text-xs text-foreground">
                          <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── RESULTADOS (fotos antes/depois) ─── */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Star className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-primary font-semibold">RESULTADOS REAIS</span>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground mb-3">
              Mulheres que <em className="text-primary not-italic">transformaram seus corpos.</em>
            </h2>
            <p className="text-muted-foreground text-sm">
              Resultados reais de alunas que seguiram o método.
            </p>
          </div>
          <ResultsCarousel />
          <div className="text-center mt-8">
            <Button size="lg" onClick={goToOnboarding}
              className="w-full sm:w-auto pink-gradient text-primary-foreground font-heading font-bold text-sm sm:text-base py-6 px-8 rounded-2xl hover:scale-105 transition-transform shadow-lg">
              QUERO MEU RESULTADO TAMBÉM
              <ArrowRight className="ml-2 w-5 h-5 shrink-0" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── DEPOIMENTOS ─── */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Quote className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-primary font-semibold">DEPOIMENTOS</span>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground mb-3">
              O que nossas <em className="text-primary not-italic">Leoas dizem.</em>
            </h2>
            <p className="text-muted-foreground text-sm">Feedbacks reais das alunas no WhatsApp.</p>
          </div>

          <div className="mb-8">
            <img
              src={depoimentosWhatsapp}
              alt="Depoimentos de alunas no WhatsApp"
              className="w-full rounded-2xl shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: "Camila S.",   initial: "C", text: "Em 2 semanas já senti diferença no corpo e na disposição. O método é incrível!", rating: 5 },
              { name: "Juliana M.", initial: "J", text: "Nunca consegui manter uma rotina de treino até conhecer a Fábrica de Leoas. Agora treino todo dia!", rating: 5 },
              { name: "Fernanda R.", initial: "F", text: "Tenho problema no joelho e o treino foi todo adaptado pra mim. Sem dor e com resultado!", rating: 5 },
              { name: "Patrícia L.", initial: "P", text: "Os tri-sets são desafiadores mas funcionam demais. Meu corpo mudou em 1 mês!", rating: 5 },
            ].map((dep, i) => (
              <div key={i} className="soft-card p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-0.5 mb-3">
                    {Array.from({ length: dep.rating }).map((_, j) => (
                      <Star key={j} className="w-3.5 h-3.5 fill-primary text-primary" />
                    ))}
                  </div>
                  <div className="text-4xl font-heading text-primary/20 leading-none mb-1 select-none">"</div>
                  <p className="text-sm text-foreground leading-relaxed mb-4">{dep.text}</p>
                </div>
                <div className="flex items-center gap-2.5 pt-3 border-t border-border/50">
                  <div className="w-8 h-8 rounded-full pink-gradient flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {dep.initial}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{dep.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOUNDER ─── */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="soft-card p-6 sm:p-8 border border-primary/15">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-full pink-gradient flex items-center justify-center text-primary-foreground font-heading font-bold text-2xl shadow-lg flex-shrink-0">
                G
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 mb-1">
                  <Heart className="w-3 h-3 text-primary" />
                  <span className="text-[10px] text-primary font-semibold">Por que criei a Fábrica de Leoas</span>
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground">Gilvan</h3>
                <p className="text-xs text-muted-foreground">Criador do Método Fábrica de Leoas</p>
              </div>
            </div>
            <div className="text-3xl text-primary/20 font-heading leading-none mb-2 select-none">"</div>
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

      {/* ─── PRICING ─── */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-primary font-semibold">OFERTA EXCLUSIVA</span>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
              Invista em quem <em className="text-primary not-italic">mais importa.</em>
            </h2>
            <p className="text-muted-foreground text-sm">Acesso completo. Cancele quando quiser.</p>
            <p className="text-xs text-destructive font-semibold mt-2">🔥 Preço de lançamento — pode encerrar a qualquer momento</p>
          </div>

          {/* 3 planos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              {
                label: "MENSAL",
                badge: null,
                price: "R$ 39,90",
                period: "/mês",
                perMonth: "R$ 39,90/mês",
                trial: null,
                discount: null,
                highlight: false,
              },
              {
                label: "SEMESTRAL",
                badge: "⭐ MAIS USADO",
                price: "R$ 119,90",
                period: "/6 meses",
                perMonth: "≈ R$ 20/mês",
                trial: "7 dias de garantia",
                discount: "50% OFF",
                highlight: true,
              },
              {
                label: "ANUAL",
                badge: null,
                price: "R$ 197,00",
                period: "/ano",
                perMonth: "≈ R$ 16/mês",
                trial: "7 dias de garantia",
                discount: "59% OFF",
                highlight: false,
              },
            ].map((plan, i) => (
              <div key={i} className={`relative soft-card p-5 flex flex-col gap-3 border-2 transition-all ${plan.highlight ? "border-primary shadow-[0_8px_40px_hsl(340_82%_52%/0.2)]" : "border-border/60"} ${plan.badge ? "mt-4 sm:mt-4" : ""}`}>
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="pink-gradient text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md">
                      {plan.badge}
                    </div>
                  </div>
                )}
                <div className="text-center">
                  <p className="font-heading text-xs font-bold text-muted-foreground tracking-widest mb-2">{plan.label}</p>
                  <div className="flex items-baseline justify-center gap-1 flex-wrap">
                    <span className={`font-heading text-xl font-extrabold whitespace-nowrap ${plan.highlight ? "text-primary" : "text-foreground"}`}>{plan.price}</span>
                    <span className="text-muted-foreground text-xs whitespace-nowrap">{plan.period}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{plan.perMonth}</p>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  {plan.discount && (
                    <span className="bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-0.5 rounded-full">{plan.discount}</span>
                  )}
                  {plan.trial ? (
                    <span className="text-[11px] font-semibold text-green-600 bg-green-500/10 px-2.5 py-0.5 rounded-full">{plan.trial}</span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Sem período de teste</span>
                  )}
                </div>

                <Button size="sm" onClick={goToOnboarding}
                  className={`w-full rounded-xl font-heading font-bold text-xs py-5 transition-transform hover:scale-105 ${plan.highlight ? "pink-gradient text-primary-foreground shadow-md animate-pulse-pink" : "border border-primary text-primary bg-transparent hover:bg-primary/5"}`}>
                  {plan.trial ? "COMEÇAR GRÁTIS" : "ASSINAR AGORA"}
                  <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Benefícios comuns a todos os planos */}
          <div className="soft-card p-5 border border-primary/15">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 text-center">Incluído em todos os planos</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                "Protocolos diários personalizados",
                "142 exercícios com vídeo demonstrativo",
                "Adaptação a dores e lesões",
                "Acompanhamento de medidas e evolução",
                "Treinos para casa e academia",
                "Suporte e comunidade de Leoas",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-primary" />
                  </div>
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── GARANTIA ─── */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 max-w-lg text-center">
          <div className="soft-card p-6 sm:p-8 border border-primary/20 bg-primary/3">
            <div className="w-16 h-16 rounded-full pink-gradient flex items-center justify-center mx-auto mb-4 shadow-md">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-heading text-xl font-bold text-foreground mb-2">7 dias de garantia total</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Use tudo por 7 dias. Se não sentir diferença, cancele com 1 clique. Sem burocracia, sem perguntas.
            </p>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-primary font-semibold">DÚVIDAS FREQUENTES</span>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground">
              Tudo que você precisa saber <em className="text-primary not-italic">antes de decidir.</em>
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="soft-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left gap-4"
                >
                  <span className="font-medium text-foreground text-sm">{faq.q}</span>
                  <ChevronDown
                    className="w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-300"
                    style={{ transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </button>
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{ maxHeight: openFaq === i ? "200px" : "0px" }}
                >
                  <div className="px-5 pb-5">
                    <p className="text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-lg text-center">
          <div className="w-12 h-12 rounded-full pink-gradient flex items-center justify-center mx-auto mb-6 shadow-md">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground mb-4">
            Sua transformação começa <span className="text-primary">agora.</span>
          </h2>
          <p className="text-muted-foreground text-sm mb-8">
            7 dias grátis. Sem risco. Sem burocracia.
          </p>
          <Button size="lg" onClick={goToOnboarding}
            className="w-full max-w-sm mx-auto pink-gradient text-primary-foreground font-heading font-bold text-base py-7 rounded-2xl animate-pulse-pink hover:scale-105 transition-transform shadow-lg">
            COMEÇAR MEUS 7 DIAS GRÁTIS
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            A partir de R$49,90/mês · 7 dias grátis · Cancele quando quiser
          </p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-8 border-t border-border bg-background">
        <div className="container mx-auto px-4 text-center">
          <img src={logoIcon} alt="Fábrica de Leoas" className="h-8 w-auto mx-auto mb-4 opacity-70" />
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

      {/* ─── STICKY CTA FLUTUANTE ─── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-lg border-t border-border shadow-2xl transition-transform duration-300"
        style={{ transform: showStickyCta ? "translateY(0)" : "translateY(100%)" }}
      >
        <div className="container mx-auto max-w-lg">
          <Button size="lg" onClick={goToOnboarding}
            className="w-full pink-gradient text-primary-foreground font-heading font-bold text-sm py-5 rounded-2xl hover:scale-105 transition-transform shadow-lg">
            COMEÇAR 7 DIAS GRÁTIS
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const resultPhotos = [dep1, dep2, dep3, dep4, dep5];

const ResultsCarousel = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToIndex = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const child = container.children[index] as HTMLElement;
    if (child) container.scrollTo({ left: child.offsetLeft - 12, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % resultPhotos.length;
        scrollToIndex(next);
        return next;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [scrollToIndex]);

  return (
    <div className="overflow-hidden">
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {resultPhotos.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Resultado de aluna ${i + 1}`}
            className="snap-center rounded-2xl shadow-md w-[80%] max-w-[320px] flex-shrink-0 object-contain"
          />
        ))}
      </div>
      <div className="flex justify-center gap-1.5 mt-4">
        {resultPhotos.map((_, i) => (
          <button
            key={i}
            onClick={() => { setActiveIndex(i); scrollToIndex(i); }}
            className={`h-2 rounded-full transition-all duration-300 ${i === activeIndex ? "bg-primary w-6" : "bg-muted w-2.5"}`}
          />
        ))}
      </div>
    </div>
  );
};

export default LandingPage;
