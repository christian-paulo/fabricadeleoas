import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { toast } from "sonner";
import { Check, Shield, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { captureUtms, getStoredUtms, clearStoredUtms } from "@/lib/utm";
import { linkQuizLead } from "@/lib/quizTracking";
import testimonial6 from "@/assets/testimonial-6.jpg";
import dep1 from "@/assets/dep1.webp";
import dep2 from "@/assets/dep2.webp";
import dep3 from "@/assets/dep3.webp";
import dep4 from "@/assets/dep4.webp";
import dep5 from "@/assets/dep5.webp";
import depoimentosWhatsapp from "@/assets/depoimentos-whatsapp.png";
import printApp from "@/assets/print-app.webp";
import atual1 from "@/assets/atual1.webp";
import atual2 from "@/assets/atual2.webp";
import atual3 from "@/assets/atual3.webp";
import atual4 from "@/assets/atual4.webp";
import desejadoSaudavel from "@/assets/desejado-saudavel.webp";
import desejadoDefinida from "@/assets/desejado-definida.webp";
import desejadoMusculosa from "@/assets/desejado-musculosa.webp";
import logoLeoa from "@/assets/logo-leoa-pink.png";

const benefits = [
  "Protocolos diários personalizados pelo Gilvan",
  "Adaptação automática a dores e limitações",
  "Acompanhamento de medidas corporais",
  "142 exercícios do método Gilvan",
  "Tri-sets inteligentes",
  "Grupo de Suporte no WhatsApp",
  "Cancele quando quiser",
];


// ─── Registration Form (shown AFTER payment) ──
const RegistrationForm = ({ checkoutEmail }: { checkoutEmail: string }) => {
  const navigate = useNavigate();
  const { checkSubscription, refreshProfile } = useAuth();
  const { data: onboardingData } = useOnboarding();
  const [email, setEmail] = useState(checkoutEmail || onboardingData.email_onboarding || "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(onboardingData.nome || "");
  const [whatsapp, setWhatsapp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => { captureUtms(); }, []);

  // Foca a aluna no formulário de cadastro assim que ele aparece
  useEffect(() => {
    const t = setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      // Pequeno delay extra para o scroll terminar antes do focus (evita o teclado mobile reverter o scroll)
      setTimeout(() => {
        if (!fullName) firstFieldRef.current?.focus({ preventScroll: true });
      }, 350);
    }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveOnboardingData = async (userId: string) => {
    try {
      const profileUpdate: any = {
        goal: onboardingData.goal,
        target_area: onboardingData.targetArea.join(", "),
        training_experience: onboardingData.trainingExperience,
        workout_days: onboardingData.workoutDays,
        workout_duration: onboardingData.workoutDuration === "10 min" ? 10 : 30,
        has_pain: onboardingData.hasPain || false,
        pain_location: onboardingData.painLocation.join(", "),
        uses_medication: onboardingData.usesMedication || false,
        medication_feeling: onboardingData.medicationFeeling,
        equipment: onboardingData.equipment,
        onboarding_completed: true,
      };
      // Garante que o nome capturado no onboarding seja persistido como full_name
      if (onboardingData.nome && onboardingData.nome.trim()) {
        profileUpdate.full_name = onboardingData.nome.trim();
      }
      await supabase.from("profiles").update(profileUpdate).eq("id", userId);

      await supabase.from("onboarding_responses" as any).upsert({
        profile_id: userId,
        motivacao: onboardingData.motivacao.join(", "),
        corpo_atual: onboardingData.corpo_atual,
        corpo_desejado: onboardingData.corpo_desejado,
        altura: onboardingData.altura ? parseFloat(onboardingData.altura) : null,
        peso_atual: onboardingData.peso_atual ? parseFloat(onboardingData.peso_atual) : null,
        meta_peso: onboardingData.meta_peso ? parseFloat(onboardingData.meta_peso) : null,
        biotipo: onboardingData.tipo_barriga,
        idade: onboardingData.idade ? parseInt(onboardingData.idade) : null,
        local_treino: onboardingData.local_treino,
        dificuldade: onboardingData.dificuldade,
        rotina: onboardingData.rotina,
        flexibilidade: onboardingData.flexibilidade,
        psicologico: onboardingData.psicologico,
        celebracao: onboardingData.celebracao,
      } as any, { onConflict: "profile_id" } as any);

      // Link quiz_leads (first-click tracking) to this profile/email
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        await linkQuizLead({ profileId: userId, email: authUser?.email || undefined });
      } catch {}

      localStorage.removeItem("onboarding_data");
    } catch (err) {
      console.error("Failed to save onboarding data:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, whatsapp },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;

      // Garantir sessão ativa (caso confirmação de email esteja exigida)
      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }

      const userId = data.user?.id || (await supabase.auth.getUser()).data.user?.id;
      if (userId) {
        const utms = getStoredUtms();
        await supabase.from("profiles").upsert({
          id: userId,
          email,
          full_name: (fullName || onboardingData.nome || "").trim() || null,
          whatsapp,
          onboarding_completed: false,
          ...utms,
        } as any, { onConflict: "id" });
        clearStoredUtms();

        await saveOnboardingData(userId);
      }

      await checkSubscription();
      await refreshProfile();

      toast.success("Bem-vinda à Fábrica de Leoas! 🦁");
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="soft-card p-6 md:p-8 order-1 md:order-2 scroll-mt-4">
      <h2 className="font-heading text-xl text-foreground mb-2">
        Crie sua conta para continuar
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Falta pouco para liberar seu protocolo personalizado!
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">Nome completo</Label>
          <Input ref={firstFieldRef} type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
            placeholder="Seu nome completo" className="bg-background border-border text-foreground h-12 mt-1 rounded-xl" required />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">WhatsApp</Label>
          <Input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="(11) 99999-9999" className="bg-background border-border text-foreground h-12 mt-1 rounded-xl" required />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">E-mail</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com" className="bg-background border-border text-foreground h-12 mt-1 rounded-xl" required />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Senha</Label>
          <div className="relative">
            <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" className="bg-background border-border text-foreground h-12 mt-1 pr-12 rounded-xl" required minLength={6} />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-muted-foreground hover:text-foreground transition-colors">
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        <Button type="submit" disabled={loading}
          className="w-full pink-gradient text-primary-foreground font-heading h-12 rounded-2xl shadow-lg">
          {loading ? "Carregando..." : "Criar Conta e Continuar"}
        </Button>
      </form>
    </div>
  );
};

const PLANS = {
  monthly: {
    id: "monthly",
    priceId: "price_1TPSGiIsQknBjnEncL7IlriJ",
    label: "MENSAL",
    badge: null,
    priceMain: "R$ 39,90",
    priceSecondary: "/mês",
    priceWeek: null,
    trialDays: 0,
    orderName: "Plano Mensal",
    orderPrice: "R$ 39,90",
    orderInterval: "Assinatura recorrente mensal",
    trialLabel: null,
    trialDiscount: null,
    discount: null,
  },
  semestral: {
    id: "semestral",
    priceId: "price_1TPSXJIsQknBjnEnKoQxE06s",
    label: "SEMESTRAL",
    badge: "MAIS USADO",
    priceMain: "R$ 119,90",
    priceSecondary: "/semestre",
    priceWeek: null,
    trialDays: 7,
    orderName: "Plano Semestral",
    orderPrice: "R$ 119,90",
    orderInterval: "Assinatura recorrente a cada 6 meses",
    trialLabel: "7 dias grátis",
    trialDiscount: "- R$ 119,90",
    discount: "50% OFF",
  },
  annual: {
    id: "annual",
    priceId: "price_1TPSXhIsQknBjnEn0WjwG2CS",
    label: "ANUAL",
    badge: null,
    priceMain: "R$ 197,00",
    priceSecondary: "/ano",
    priceWeek: null,
    trialDays: 7,
    orderName: "Plano Anual",
    orderPrice: "R$ 197,00",
    orderInterval: "Assinatura recorrente anual",
    trialLabel: "7 dias grátis",
    trialDiscount: "- R$ 197,00",
    discount: "59% OFF",
  },
};

type PlanKey = "monthly" | "semestral" | "annual";

const Checkout = () => {
  const { user, loading: authLoading, checkSubscription, refreshProfile } = useAuth();
  const { data: onboardingData } = useOnboarding();
  const navigate = useNavigate();
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"email" | "payment" | "registration">("payment");
  const [checkoutEmail, setCheckoutEmail] = useState(onboardingData.email_onboarding || "");
  const [emailConfirmed, setEmailConfirmed] = useState(!!onboardingData.email_onboarding);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("semestral");

  const isAuthenticated = !!user;
  const plan = PLANS[selectedPlan];

  // Detecta retorno do checkout AbacatePay (?payment=success)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success" && !isAuthenticated) {
      toast.success("Pagamento confirmado! Agora crie sua conta. 🦁");
      setStep("registration");
      window.history.replaceState({}, "", "/checkout");
    }
  }, [isAuthenticated]);

  // If already authenticated, go straight to payment (ou dashboard se veio do callback)
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      setCheckoutEmail(user.email);
      setEmailConfirmed(true);
      const params = new URLSearchParams(window.location.search);
      if (params.get("payment") === "success" || params.get("abacate") === "success") {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated]);

  // Reset checkout url when plan changes
  const handlePlanChange = (newPlan: PlanKey) => {
    if (newPlan === selectedPlan) return;
    setSelectedPlan(newPlan);
    setCheckoutUrl(null);
  };

  // Create AbacatePay subscription checkout when email is confirmed
  useEffect(() => {
    if (step !== "payment") return;
    if (!emailConfirmed || !checkoutEmail || checkoutUrl) return;
    setLoading(true);
    setError(null);
    const createCheckout = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("create-abacate-subscription", {
          body: {
            plan: selectedPlan,
            email: checkoutEmail,
          },
        });
        if (fnError) throw fnError;
        if (data?.url) {
          setCheckoutUrl(data.url);
        } else {
          throw new Error(data?.error || "Não foi possível iniciar o checkout");
        }
      } catch (err: any) {
        console.error("Checkout error:", err);
        setError(err.message || "Erro ao carregar checkout");
      } finally {
        setLoading(false);
      }
    };
    createCheckout();
  }, [emailConfirmed, checkoutEmail, selectedPlan, step]);

  const handlePaymentSuccess = async () => {
    if (isAuthenticated) {
      // Already has account, save data and go to dashboard
      const saveOnboardingData = async (userId: string) => {
        try {
          await supabase.from("profiles").update({
            goal: onboardingData.goal,
            target_area: onboardingData.targetArea.join(", "),
            training_experience: onboardingData.trainingExperience,
            workout_days: onboardingData.workoutDays,
            workout_duration: onboardingData.workoutDuration === "10 min" ? 10 : 30,
            has_pain: onboardingData.hasPain || false,
            pain_location: onboardingData.painLocation.join(", "),
            uses_medication: onboardingData.usesMedication || false,
            medication_feeling: onboardingData.medicationFeeling,
            equipment: onboardingData.equipment,
            onboarding_completed: true,
          } as any).eq("id", userId);

          await supabase.from("onboarding_responses" as any).upsert({
            profile_id: userId,
            motivacao: onboardingData.motivacao.join(", "),
            corpo_atual: onboardingData.corpo_atual,
            corpo_desejado: onboardingData.corpo_desejado,
            altura: onboardingData.altura ? parseFloat(onboardingData.altura) : null,
            peso_atual: onboardingData.peso_atual ? parseFloat(onboardingData.peso_atual) : null,
            meta_peso: onboardingData.meta_peso ? parseFloat(onboardingData.meta_peso) : null,
            biotipo: onboardingData.tipo_barriga,
            idade: onboardingData.idade ? parseInt(onboardingData.idade) : null,
            local_treino: onboardingData.local_treino,
            dificuldade: onboardingData.dificuldade,
            rotina: onboardingData.rotina,
            flexibilidade: onboardingData.flexibilidade,
            psicologico: onboardingData.psicologico,
            celebracao: onboardingData.celebracao,
          } as any, { onConflict: "profile_id" } as any);

          localStorage.removeItem("onboarding_data");
        } catch (err) {
          console.error("Failed to save onboarding data:", err);
        }
      };

      await saveOnboardingData(user!.id);
      await checkSubscription();
      await refreshProfile();
      toast.success("Bem-vinda à Fábrica de Leoas! 🦁");
      navigate("/dashboard");
    } else {
      // Not authenticated - show registration form
      setStep("registration");
    }
  };

  // No separate email step - email is collected inline in payment view

  // Registration step (after payment)
  if (step === "registration") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8 font-heading">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
          <OrderSummary selectedPlan={selectedPlan} onPlanChange={handlePlanChange} />
          <RegistrationForm checkoutEmail={checkoutEmail} />
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="soft-card p-8 max-w-md w-full text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">Tentar novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 font-heading">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <OrderSummary selectedPlan={selectedPlan} onPlanChange={handlePlanChange} />
          {/* Payment Form */}
          <div id="checkout-payment" className="soft-card p-6 md:p-8 order-1 md:order-2">
            {/* Email input for guest users */}
            {!isAuthenticated && !emailConfirmed && (
              <div className="mb-6">
                <h2 className="font-heading text-xl text-foreground mb-2">Quase lá!</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Informe seu e-mail para iniciar o pagamento
                </p>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (checkoutEmail) setEmailConfirmed(true);
                }} className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">E-mail</Label>
                    <Input type="email" value={checkoutEmail} onChange={(e) => setCheckoutEmail(e.target.value)}
                      placeholder="seu@email.com" className="bg-background border-border text-foreground h-12 mt-1 rounded-xl" required />
                  </div>
                  <Button type="submit"
                    className="w-full pink-gradient text-primary-foreground font-heading h-12 rounded-2xl shadow-lg">
                    Continuar para o Pagamento
                  </Button>
                </form>
              </div>
            )}

            {/* Payment form after email confirmed */}
            {emailConfirmed && (
              <>
                <h2 className="font-heading text-xl text-foreground mb-4">Método de Pagamento</h2>
                <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  Pagamento seguro via AbacatePay — Cartão ou PIX
                </p>
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
                {error && !loading && (
                  <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}
                {checkoutUrl && !loading && (
                  <div className="rounded-2xl overflow-hidden border border-border bg-background">
                    <iframe
                      src={checkoutUrl}
                      title="Checkout AbacatePay"
                      className="w-full"
                      style={{ height: "720px", border: "none" }}
                      allow="payment *"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {/* Depoimentos WhatsApp */}
        <div>
          <img src={depoimentosWhatsapp} alt="Depoimentos de alunas no WhatsApp" className="w-full rounded-2xl shadow-sm" />
        </div>

        {/* CTA de urgência */}
        <UrgencyCTA onCta={() => document.getElementById("checkout-form-anchor")?.scrollIntoView({ behavior: "smooth", block: "center" })} />

        {/* FAQ - última seção */}
        <CheckoutFAQ />
      </div>
    </div>
  );
};

// ─── Pre-Checkout Sections (before Order Summary) ───────────────
const UrgencyCTA = ({ onCta }: { onCta: () => void }) => {
  return (
    <div className="soft-card p-6 sm:p-8 text-center">
      <h3 className="font-heading font-extrabold text-foreground text-2xl sm:text-3xl leading-tight tracking-tight">
        VOCÊ VAI CONTINUAR
        <br />
        <span className="text-muted-foreground">PARADA</span> VENDO O{" "}
        <span className="text-primary">SUCESSO</span>
        <br />
        DAS OUTRAS?
      </h3>

      <div className="mt-6 rounded-2xl bg-primary/10 border border-primary/20 px-5 py-4 text-foreground">
        <p className="font-body text-sm sm:text-base leading-snug">
          É somente <strong className="font-extrabold text-primary">R$0,50 por dia</strong> para você conquistar o corpo de leoa 🦁 que sempre sonhou!
        </p>
      </div>

      <button
        onClick={onCta}
        className="mt-5 w-full rounded-2xl bg-primary hover:bg-primary/90 transition-colors py-4 px-6 font-heading font-bold text-primary-foreground text-lg shadow-md active:scale-[0.99]"
      >
        Resgatar meu treino 🦁
      </button>

      <div className="mt-4 flex items-center justify-center gap-3 text-muted-foreground text-xs font-body">
        <span>Visa</span>
        <span>•</span>
        <span>Mastercard</span>
        <span>•</span>
        <span>Amex</span>
        <span>•</span>
        <span>Elo</span>
        <span>•</span>
        <span>Pix</span>
      </div>
    </div>
  );
};

const CheckoutFAQ = () => {
  const faqs = [
    {
      q: "Tenho limitações físicas, é para mim?",
      a: "Sim! O protocolo do Gilvan é adaptado para sua rotina, limitações de saúde e até para quem usa medicações como Mounjaro/Ozempic. Adaptamos tudo conforme suas dores e nível.",
    },
    {
      q: "Preciso de equipamentos de academia?",
      a: "Não. Todos os treinos são feitos em casa, usando apenas o peso do corpo e itens simples como halteres leves ou caneleiras (opcionais). Nada de máquinas.",
    },
    {
      q: "Como recebo o treino?",
      o: "",
      a: "Você recebe acesso imediato ao app da Fábrica de Leoas após a confirmação do pagamento. Lá ficam todos os treinos, vídeos demonstrativos e o acompanhamento da sua evolução.",
    },
    {
      q: "É mensalidade? Vou ter que pagar todo mês?",
      a: "Você escolhe o plano. Temos o Semestral (cobrado a cada 6 meses, com 3 dias de teste grátis) e o Anual (cobrado uma vez por ano). Sem surpresas, sem cobranças escondidas.",
    },
    {
      q: "Quanto tempo dura cada treino?",
      a: "Os treinos têm duração de 10 a 30 minutos, ajustados ao seu nível e disponibilidade informados no quiz. Perfeito para encaixar na rotina mais corrida.",
    },
    {
      q: "De quanto em quanto tempo o treino muda?",
      a: "O protocolo é de 4 semanas e se adapta automaticamente conforme você completa as sessões. A cada novo ciclo, novos estímulos para garantir evolução constante.",
    },
    {
      q: "Posso cancelar quando quiser?",
      a: "Sim! Você pode cancelar a qualquer momento direto no app, sem burocracia, sem multa.",
    },
    {
      q: "Em quanto tempo vou ver resultados?",
      a: "A maioria das alunas começa a sentir mais energia e disposição já na primeira semana. Resultados visíveis no espelho costumam aparecer entre 3 e 6 semanas, seguindo o plano consistentemente.",
    },
  ];

  return (
    <div className="soft-card p-6">
      <h3 className="font-heading text-2xl text-center text-foreground mb-6">Perguntas Frequentes</h3>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border-border/60">
            <AccordionTrigger className="text-left font-heading text-foreground text-base hover:no-underline">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

const ReservedSlotBanner = () => {
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);

  useEffect(() => {
    const stored = sessionStorage.getItem("reserved_slot_deadline");
    let deadline: number;
    if (stored) {
      deadline = parseInt(stored, 10);
    } else {
      deadline = Date.now() + 15 * 60 * 1000;
      sessionStorage.setItem("reserved_slot_deadline", String(deadline));
    }

    const tick = () => {
      const diff = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-4">
      <img src={logoLeoa} alt="Fábrica de Leoas" className="h-14 w-auto" />
      <div className="w-full bg-primary/10 border border-primary/20 rounded-2xl px-5 py-4 text-center">
        <p className="text-sm md:text-base text-foreground leading-snug">
          Sua vaga no <span className="font-bold">meu protocolo</span> será entregue pra próxima candidata em :{" "}
          <span className="font-bold text-primary tabular-nums">{mm}:{ss}</span>
        </p>
      </div>
    </div>
  );
};

const CORPO_ATUAL_MAP: Record<string, string> = {
  "Médio": atual1,
  "Flácida": atual2,
  "Magro": atual3,
  "Tonificada": atual4,
};
const CORPO_DESEJADO_MAP: Record<string, string> = {
  "Saudável e Funcional": desejadoSaudavel,
  "Definida e com Curvas": desejadoDefinida,
  "Musculosa": desejadoMusculosa,
};

const BeforeAfterPreview = ({ corpoAtual, corpoDesejado }: { corpoAtual: string; corpoDesejado: string }) => {
  const imgAtual = CORPO_ATUAL_MAP[corpoAtual] || atual1;
  const imgDesejado = CORPO_DESEJADO_MAP[corpoDesejado] || desejadoDefinida;

  const beforeBars = [
    { label: "Amor próprio e orgulho do corpo", filled: 1, total: 6, percent: null as string | null },
    { label: "Confiança ao se olhar no espelho", filled: 1, total: 6, percent: "25%", caption: "Baixo" },
  ];
  const afterBars = [
    { label: "Amor próprio e orgulho do corpo", filled: 6, total: 6, percent: null as string | null },
    { label: "Confiança ao se olhar no espelho", filled: 6, total: 6, percent: "100%", caption: "Elevado" },
  ];

  const Bars = ({ filled, total, color }: { filled: number; total: number; color: "danger" | "success" }) => (
    <div className="flex gap-1 mt-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 flex-1 rounded-full ${
            i < filled
              ? color === "danger"
                ? "bg-destructive"
                : "bg-success"
              : "bg-muted"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="soft-card p-6">
      <h3 className="font-heading text-xl text-center text-foreground leading-snug">
        Agora só depende de <span className="text-primary">você</span>, aplique todas as técnicas do{" "}
        <span className="text-primary">Gilvan</span> e aproveite sua nova versão!
      </h3>

      <div className="grid grid-cols-2 gap-4 mt-6">
        {/* AGORA */}
        <div>
          <p className="text-center font-heading text-sm text-destructive mb-2">Agora</p>
          <div className="rounded-2xl overflow-hidden aspect-[3/4] bg-muted">
            <img src={imgAtual} alt="Antes do programa" className="w-full h-full object-cover" />
          </div>
          <div className="mt-4 space-y-3">
            {beforeBars.map((b, i) => (
              <div key={i}>
                <p className="text-[11px] text-foreground leading-tight">{b.label}</p>
                {b.caption && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">{b.caption}</span>
                    <span className="text-[10px] font-bold text-destructive">{b.percent}</span>
                  </div>
                )}
                <Bars filled={b.filled} total={b.total} color="danger" />
              </div>
            ))}
          </div>
        </div>

        {/* APÓS */}
        <div>
          <p className="text-center font-heading text-sm text-success mb-2">Após o programa</p>
          <div className="rounded-2xl overflow-hidden aspect-[3/4] bg-muted">
            <img src={imgDesejado} alt="Depois do programa" className="w-full h-full object-cover" />
          </div>
          <div className="mt-4 space-y-3">
            {afterBars.map((b, i) => (
              <div key={i}>
                <p className="text-[11px] text-foreground leading-tight">{b.label}</p>
                {b.caption && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-success">{b.caption}</span>
                    <span className="text-[10px] font-bold text-success">{b.percent}</span>
                  </div>
                )}
                <Bars filled={b.filled} total={b.total} color="success" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const WeightPrediction = ({ pesoAtual, metaPeso }: { pesoAtual: string; metaPeso: string }) => {
  const current = parseFloat(pesoAtual) || 85;
  const goal = parseFloat(metaPeso) || 75;
  const isGaining = goal > current;
  const mid = Math.round((current + goal) * 10 / 2) / 10;

  // Mesma lógica do onboarding (GraficoPrevisaoScreen): 3-8 semanas conforme diferença
  const absDiff = Math.abs(goal - current);
  const weeksNeeded = absDiff <= 5 ? 3 : absDiff <= 8 ? 5 : absDiff <= 12 ? 6 : absDiff <= 18 ? 7 : 8;
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + weeksNeeded * 7);
  const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const dateStr = `${monthNames[targetDate.getMonth()]}. ${targetDate.getDate()}`;

  const graphPath = isGaining
    ? "M 20 85 Q 80 75, 150 50 Q 220 25, 280 20"
    : "M 20 20 Q 80 25, 150 50 Q 220 75, 280 85";
  const fillPath = isGaining
    ? "M 20 85 Q 80 75, 150 50 Q 220 25, 280 20 L 280 120 L 20 120 Z"
    : "M 20 20 Q 80 25, 150 50 Q 220 75, 280 85 L 280 120 L 20 120 Z";
  const startY = isGaining ? 85 : 20;
  const midY = 50;
  const endY = isGaining ? 20 : 85;

  const actionText = isGaining ? "ganharam" : "perderam";
  const diff = Math.abs(current - goal).toFixed(1);

  return (
    <div className="soft-card p-6 text-center">
      <p className="font-heading text-lg text-foreground mb-1">Com base nas suas respostas, você atingirá</p>
      <p className="text-2xl font-heading mb-6">
        <span className="text-primary">{goal} kg</span> em <span className="text-primary">{dateStr}</span>
      </p>

      {/* Graph */}
      <div className="relative h-40 mb-4">
        <svg viewBox="0 0 300 120" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="graphGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
            <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={graphPath} fill="none" stroke="url(#graphGrad)" strokeWidth="3" strokeLinecap="round" />
          <path d={fillPath} fill="url(#bgGrad)" />
          <circle cx="20" cy={startY} r="6" fill="hsl(var(--primary))" />
          <circle cx="150" cy={midY} r="6" fill="hsl(var(--primary))" />
          <circle cx="280" cy={endY} r="6" fill="#60a5fa" />
        </svg>
        {/* Labels */}
        <div className={`absolute ${isGaining ? "bottom-[15%]" : "top-0"} left-2 text-xs text-muted-foreground`}>{current} kg</div>
        <div className="absolute top-[35%] left-[38%] bg-background border border-border rounded-lg px-2 py-0.5 text-xs font-medium">{mid} kg</div>
        <div className={`absolute ${isGaining ? "top-0" : "top-[55%]"} right-2 bg-primary text-primary-foreground rounded-lg px-3 py-1 text-sm font-heading`}>{goal} kg</div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground px-2">
        <span>Hoje</span>
        <span>Primeira sem.</span>
        <span>{dateStr}</span>
      </div>

      <p className="text-sm text-muted-foreground mt-4">
        <span className="font-bold text-foreground">90%</span> dos usuários como você {actionText}{" "}
        <span className="font-bold text-foreground">{diff}kg</span> com sucesso com o nosso plano
      </p>

      <Button
        className="w-full mt-4 bg-primary text-primary-foreground font-bold text-base py-6 rounded-xl"
        onClick={() => document.getElementById("checkout-payment")?.scrollIntoView({ behavior: "smooth" })}
      >
        Começar agora
      </Button>
    </div>
  );
};

const PersonalizedPlan = ({ targetArea, workoutDuration, goal, hasPain, painLocation }: { targetArea: string[]; workoutDuration: string; goal: string; hasPain: boolean | null; painLocation: string[] }) => {
  const areaText = targetArea.length > 0 ? targetArea.join(", ") : "Todo o corpo";
  const duration = workoutDuration || "10-30 min";
  const goalText = goal || "Melhorar condicionamento";
  const limitationsText = hasPain && painLocation.length > 0 ? painLocation.join(", ") : "Nenhuma informada";

  const weekDays = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    weekDays.push(d.getDate());
  }

  return (
    <div className="soft-card p-6">
      {/* Success stories carousel */}
      <SuccessStoriesAutoCarousel />

      {/* O que você terá */}
      <div className="text-left mb-6 mt-6">
        <p className="text-sm text-primary font-medium mb-2 text-center">— O que você terá —</p>
        <h3 className="font-heading text-xl text-foreground mb-2">PLANO PERSONALIZADO</h3>
        <p className="text-sm text-muted-foreground">
          Dividimos os seus objetivos em etapas diárias práticas:{" "}
          <span className="font-bold text-foreground">os treinos mais adequados</span> com base no seu nível de preparo físico e hábitos,{" "}
          <span className="font-bold text-foreground">consumo de água, calorias queimadas</span> etc.
        </p>
      </div>

      <img src={printApp} alt="Preview do app" className="rounded-xl shadow-sm w-full object-contain mb-6 border-2 border-primary" />

      <h3 className="font-heading text-xl text-foreground mb-4">PENSADO PARA VOCÊ</h3>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💪</span>
          <div>
            <p className="text-xs text-muted-foreground">Seu objetivo</p>
            <p className="font-heading text-foreground">{goalText}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="text-xs text-muted-foreground">Áreas de foco</p>
            <p className="font-heading text-foreground">{areaText}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">⏱️</span>
          <div>
            <p className="text-xs text-muted-foreground">Duração</p>
            <p className="font-heading text-foreground">{duration}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🩹</span>
          <div>
            <p className="text-xs text-muted-foreground">Limitações</p>
            <p className="font-heading text-foreground">{limitationsText}</p>
          </div>
        </div>
      </div>

      {/* Plan preview */}
      <div className="mt-6">
        <h4 className="font-heading text-lg text-foreground mb-3">PRÉ-VISUALIZAÇÃO DO PLANO</h4>
        <div className="space-y-2">
          {["Semana 1: Desperte Seu Corpo 😊", "Semana 2: Acelere o Ritmo 💪", "Semana 3: Supere Limites 🔥", "Semana 4: Transformação Total 🏆"].map((week, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
              <span className="text-sm text-foreground">{week}</span>
            </div>
          ))}
        </div>
        <Button
          className="w-full mt-4 bg-primary text-primary-foreground font-bold text-base py-6 rounded-xl"
          onClick={() => document.getElementById("checkout-payment")?.scrollIntoView({ behavior: "smooth" })}
        >
          Começar agora
        </Button>
      </div>
    </div>
  );
};

const WhatYouGet = () => null;


const successStories = [dep1, dep2, dep3, dep4, dep5];

const SuccessStoriesAutoCarousel = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToIndex = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const child = container.children[index] as HTMLElement;
    if (child) {
      container.scrollTo({ left: child.offsetLeft - 12, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % successStories.length;
        scrollToIndex(next);
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [scrollToIndex]);

  return (
    <div>
      <h3 className="font-heading text-lg text-foreground mb-4 text-center">
        Veja histórias de sucesso de quem confiou 💪
      </h3>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {successStories.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`História de sucesso ${i + 1}`}
            className="snap-center rounded-xl shadow-sm w-[85%] max-w-[340px] flex-shrink-0 object-contain"
          />
        ))}
      </div>
      <div className="flex justify-center gap-1.5 mt-3">
        {successStories.map((_, i) => (
          <button
            key={i}
            onClick={() => { setActiveIndex(i); scrollToIndex(i); }}
            className={`w-2 h-2 rounded-full transition-colors ${i === activeIndex ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Order Summary Component ────────────────────────────────────
const OrderSummary = ({ selectedPlan, onPlanChange }: { selectedPlan: PlanKey; onPlanChange: (p: PlanKey) => void }) => {
  const { data: onboardingData } = useOnboarding();
  const plan = PLANS[selectedPlan];

  return (
    <div className="flex flex-col gap-6">
      {/* Pre-checkout persuasion sections */}
      <ReservedSlotBanner />
      <BeforeAfterPreview corpoAtual={onboardingData.corpo_atual} corpoDesejado={onboardingData.corpo_desejado} />
      <WeightPrediction pesoAtual={onboardingData.peso_atual} metaPeso={onboardingData.meta_peso} />
      <PersonalizedPlan targetArea={onboardingData.targetArea} workoutDuration={onboardingData.workoutDuration} goal={onboardingData.goal} hasPain={onboardingData.hasPain} painLocation={onboardingData.painLocation} />
      <WhatYouGet />

      {/* Plan selector */}
      <div className="soft-card p-4 md:p-6 h-fit">
        {/* Conversion badges */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">🔥 Preço de Lançamento</span>
          <span className="bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">🍕 Mais barato que uma pizza</span>
        </div>

        <div className="mb-4">
          <h1 className="font-heading text-xl text-primary mb-0.5 text-center">O seu plano está pronto! 🦁</h1>
          <p className="text-xs text-muted-foreground text-center">Protocolo Personalizado</p>
        </div>

        {/* Plan cards - 3 columns */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(["monthly", "semestral", "annual"] as PlanKey[]).map((key) => {
            const p = PLANS[key];
            const isSelected = selectedPlan === key;
            const isPopular = !!p.badge;
            return (
              <button
                key={key}
                onClick={() => onPlanChange(key)}
                className={`relative text-center rounded-xl border-2 px-2 py-3 transition-all flex flex-col items-center justify-between min-h-[140px] ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-background"
                } ${isPopular ? "mt-2" : ""}`}
              >
                {isPopular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-full leading-tight flex items-center gap-0.5">
                      <span>⭐</span> {p.badge}
                    </span>
                  </div>
                )}
                <p className="font-heading text-[11px] text-foreground uppercase tracking-wide">{p.label}</p>
                <div className="my-1">
                  <p className="font-heading text-base text-foreground leading-tight">{p.priceMain}</p>
                  {p.priceSecondary && (
                    <p className="text-[10px] text-muted-foreground">{p.priceSecondary}</p>
                  )}
                </div>
                {p.trialDays > 0 ? (
                  <span className="text-[10px] font-bold text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded">
                    {p.trialDays} dias grátis
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Sem trial</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Trial info for selected plan */}
        {plan.trialDays > 0 && (
          <p className="text-[11px] text-muted-foreground text-center mb-3 flex items-center justify-center gap-1">
            <span>🎁</span> Desfrute de {plan.trialDays} dias de teste gratuito, depois {plan.orderPrice}
          </p>
        )}

        {/* Order summary */}
        <div className="border border-border rounded-xl p-4 mb-4 bg-background">
          <h2 className="font-heading text-base text-foreground mb-3">Resumo do Pedido</h2>
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <p className="font-medium text-sm text-foreground">{plan.orderName}</p>
              <p className="text-[11px] text-muted-foreground italic">{plan.orderInterval}</p>
            </div>
            <p className="font-heading text-base text-foreground">{plan.orderPrice}</p>
          </div>
          {plan.trialLabel && (
            <>
              <div className="border-t border-border my-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-primary font-medium">{plan.trialLabel}</span>
                <span className="text-xs text-primary font-medium">{plan.trialDiscount}</span>
              </div>
            </>
          )}
          <div className="border-t border-border my-2" />
          <div className="flex items-center justify-between">
            <span className="font-heading text-sm text-foreground">Total hoje</span>
            <span className="font-heading text-xl text-primary">
              {plan.trialDays > 0 ? "R$ 0,00" : plan.orderPrice}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {benefits.map((benefit, i) => (
            <div key={i} className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-xs text-muted-foreground">{benefit}</span>
            </div>
          ))}
        </div>

        <Button
          className="w-full mt-3 bg-primary text-primary-foreground font-bold text-sm py-5 rounded-xl uppercase"
          onClick={() => document.getElementById("checkout-payment")?.scrollIntoView({ behavior: "smooth" })}
        >
          {plan.trialDays > 0 ? `TESTE GRATUITO DE ${plan.trialDays} DIAS` : "ASSINAR AGORA"}
        </Button>
        {plan.trialDays > 0 && (
          <p className="text-[11px] text-center text-primary mt-1.5 flex items-center justify-center gap-1">
            <Check className="w-3 h-3" /> não pague nada agora
          </p>
        )}

        <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
          {plan.trialDays > 0
            ? `Você não será cobrada durante o período de teste. Após ${plan.trialDays} dias, a assinatura de ${plan.orderPrice} será ativada automaticamente. Cancele a qualquer momento com 1 clique.`
            : `A assinatura de ${plan.orderPrice} será cobrada imediatamente. Cancele a qualquer momento com 1 clique.`
          }
        </p>
      </div>
    </div>
  );
};

export default Checkout;
