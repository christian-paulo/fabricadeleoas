import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { toast } from "sonner";
import { Check, Shield, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { captureUtms, getStoredUtms, clearStoredUtms } from "@/lib/utm";
import testimonial1 from "@/assets/testimonial-1.jpg";
import printApp from "@/assets/print-app.webp";
import testimonial2 from "@/assets/testimonial-2.jpg";
import testimonial3 from "@/assets/testimonial-3.jpg";
import testimonial4 from "@/assets/testimonial-4.jpg";
import testimonial5 from "@/assets/testimonial-5.jpg";
import testimonial6 from "@/assets/testimonial-6.jpg";
import dep1 from "@/assets/dep1.webp";
import dep2 from "@/assets/dep2.webp";
import dep3 from "@/assets/dep3.webp";
import dep4 from "@/assets/dep4.webp";
import dep5 from "@/assets/dep5.webp";

const stripePromise = loadStripe("pk_test_51TEx7tI4dFrhArZv4EAhW27GaMJSJlxz84IGixOncD3L3D6gf1CT5dAYtcRfpX2CrSF12DV4mTvoQcSiGLoH6VHL00vUrdcK0y");

const benefits = [
  "Protocolos diários personalizados por IA",
  "Adaptação automática a dores e limitações",
  "Acompanhamento de medidas corporais",
  "142 exercícios do método Gilvan",
  "Tri-sets inteligentes",
  "Cancele quando quiser",
];

const CheckoutForm = ({ onPaymentSuccess }: { onPaymentSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`,
        },
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message || "Erro ao processar pagamento");
        return;
      }

      toast.success("Pagamento confirmado! Agora crie sua conta. 🦁");
      onPaymentSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement options={{ layout: "tabs" }} />
      <Button type="submit" disabled={!stripe || loading}
        className="w-full pink-gradient text-primary-foreground font-heading h-14 rounded-2xl text-lg shadow-lg">
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Processando...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Iniciar 3 Dias Grátis
          </span>
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
        <Shield className="w-3 h-3" />
        Pagamento seguro e criptografado
      </p>
    </form>
  );
};

// ─── Registration Form (shown AFTER payment) ──
const RegistrationForm = ({ checkoutEmail }: { checkoutEmail: string }) => {
  const navigate = useNavigate();
  const { checkSubscription, refreshProfile } = useAuth();
  const { data: onboardingData } = useOnboarding();
  const [email, setEmail] = useState(checkoutEmail);
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { captureUtms(); }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, whatsapp } },
      });
      if (error) throw error;

      if (data.user) {
        const utms = getStoredUtms();
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email,
          full_name: fullName,
          whatsapp,
          onboarding_completed: false,
          ...utms,
        } as any, { onConflict: "id" });
        clearStoredUtms();

        await saveOnboardingData(data.user.id);
      }

      await checkSubscription();
      await refreshProfile();

      toast.success("Bem-vinda à Fábrica de Leoas! 🦁");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="soft-card p-6 md:p-8 order-1 md:order-2">
      <h2 className="font-heading text-xl text-foreground mb-2">
        Crie sua conta para continuar
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Falta pouco para liberar seu protocolo personalizado!
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">Nome completo</Label>
          <Input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
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

const Checkout = () => {
  const { user, loading: authLoading, checkSubscription, refreshProfile } = useAuth();
  const { data: onboardingData } = useOnboarding();
  const navigate = useNavigate();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"email" | "payment" | "registration">("payment");
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [emailConfirmed, setEmailConfirmed] = useState(false);

  const isAuthenticated = !!user;

  // If already authenticated, go straight to payment
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      setCheckoutEmail(user.email);
      setStep("payment");
    }
  }, [isAuthenticated]);

  // Load checkout when we have an email and are on payment step
  useEffect(() => {
    if (step !== "payment" || !checkoutEmail || clientSecret) return;
    setLoading(true);
    const createIntent = async () => {
      try {
        const invokeOptions: any = {};
        
        if (isAuthenticated) {
          // Authenticated user - will use auth header automatically
          const { data, error: fnError } = await supabase.functions.invoke("create-subscription-intent");
          if (fnError) throw fnError;
          if (data.already_subscribed) {
            await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user!.id);
            toast.info("Você já possui uma assinatura ativa!");
            navigate("/dashboard");
            return;
          }
          if (data.client_secret) setClientSecret(data.client_secret);
          else throw new Error("Não foi possível iniciar o checkout");
        } else {
          // Guest user - pass email in body
          const { data, error: fnError } = await supabase.functions.invoke("create-subscription-intent", {
            body: { email: checkoutEmail },
          });
          if (fnError) throw fnError;
          if (data.already_subscribed) {
            toast.info("Este email já possui uma assinatura ativa! Faça login.");
            navigate("/auth");
            return;
          }
          if (data.client_secret) setClientSecret(data.client_secret);
          else throw new Error("Não foi possível iniciar o checkout");
        }
      } catch (err: any) {
        console.error("Checkout error:", err);
        setError(err.message || "Erro ao carregar checkout");
      } finally {
        setLoading(false);
      }
    };
    createIntent();
  }, [step, checkoutEmail]);

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

  // Email collection step
  if (!authLoading && !isAuthenticated && step === "email") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md flex flex-col gap-6">
          <OrderSummary />
          <div className="soft-card p-6 md:p-8">
            <h2 className="font-heading text-xl text-foreground mb-2">Quase lá!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Informe seu e-mail para iniciar o pagamento
            </p>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (checkoutEmail) setStep("payment");
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
        </div>
      </div>
    );
  }

  // Registration step (after payment)
  if (step === "registration") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
          <OrderSummary />
          <RegistrationForm checkoutEmail={checkoutEmail} />
        </div>
      </div>
    );
  }

  if (loading || authLoading) {
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
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        <OrderSummary />
        {/* Payment Form */}
        <div className="soft-card p-6 md:p-8 order-1 md:order-2">
          <h2 className="font-heading text-xl text-foreground mb-6">Método de Pagamento</h2>
          {clientSecret && (
            <Elements stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "#FF69B4",
                    colorBackground: "#FFFFF4",
                    colorText: "#4A4A4A",
                    colorDanger: "#ef4444",
                    fontFamily: "system-ui, sans-serif",
                    borderRadius: "16px",
                    spacingUnit: "4px",
                  },
                  rules: {
                    ".Input": {
                      backgroundColor: "#FFFFF4",
                      border: "1px solid hsl(340 20% 90%)",
                    },
                    ".Input:focus": {
                      borderColor: "#FF69B4",
                      boxShadow: "0 0 0 1px #FF69B4",
                    },
                    ".Label": {
                      color: "#808080",
                    },
                  },
                },
                locale: "pt-BR",
              }}>
              <CheckoutForm onPaymentSuccess={handlePaymentSuccess} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Pre-Checkout Sections (before Order Summary) ───────────────
const WeightPrediction = ({ pesoAtual, metaPeso }: { pesoAtual: string; metaPeso: string }) => {
  const current = parseFloat(pesoAtual) || 85;
  const goal = parseFloat(metaPeso) || 75;
  const isGaining = goal > current;
  const mid = Math.round((current + goal) * 10 / 2) / 10;
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + 2);
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
      </div>
    </div>
  );
};

const WhatYouGet = () => null;

const testimonials = [testimonial1, testimonial2, testimonial3, testimonial4, testimonial5, testimonial6];

const SuccessStoriesCarousel = () => {
  return (
    <div className="soft-card p-6">
      <h3 className="font-heading text-lg text-foreground mb-4 text-center">
        O que minhas alunas dizem 💬
      </h3>
      <div className="flex flex-col gap-3">
        {testimonials.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Depoimento ${i + 1}`}
            className="rounded-xl shadow-sm w-full object-contain"
          />
        ))}
      </div>
    </div>
  );
};

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
const OrderSummary = () => {
  const { data: onboardingData } = useOnboarding();

  return (
    <div className="flex flex-col gap-6">
      {/* Pre-checkout persuasion sections */}
      <WeightPrediction pesoAtual={onboardingData.peso_atual} metaPeso={onboardingData.meta_peso} />
      <PersonalizedPlan targetArea={onboardingData.targetArea} workoutDuration={onboardingData.workoutDuration} goal={onboardingData.goal} hasPain={onboardingData.hasPain} painLocation={onboardingData.painLocation} />
      <WhatYouGet />

      {/* Success stories carousel */}
      <SuccessStoriesCarousel />

      {/* Order summary */}
      <div className="soft-card p-6 md:p-8 h-fit">
        <div className="mb-6">
          <h1 className="font-heading text-2xl text-primary mb-1 text-center">O seu plano está pronto! 🦁</h1>
          <p className="text-sm text-muted-foreground text-center">Protocolo Personalizado</p>
        </div>

        <div className="border border-border rounded-2xl p-5 mb-6 bg-background">
          <h2 className="font-heading text-lg text-foreground mb-4">Resumo do Pedido</h2>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium text-foreground">Plano Mensal</p>
              <p className="text-xs text-muted-foreground italic">Assinatura recorrente</p>
            </div>
            <p className="font-heading text-lg text-foreground">R$ 49,90</p>
          </div>
          <div className="border-t border-border my-3" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-primary font-medium">3 dias grátis</span>
            <span className="text-sm text-primary font-medium">- R$ 49,90</span>
          </div>
          <div className="border-t border-border my-3" />
          <div className="flex items-center justify-between">
            <span className="font-heading text-foreground">Total hoje</span>
            <span className="font-heading text-2xl text-primary">R$ 0,00</span>
          </div>
        </div>

        <div className="space-y-3">
          {benefits.map((benefit, i) => (
            <div key={i} className="flex items-start gap-3">
              <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{benefit}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-6 leading-relaxed">
          Você não será cobrada durante o período de teste. Após 3 dias, a assinatura de R$ 49,90/mês
          será ativada automaticamente. Cancele a qualquer momento com 1 clique.
        </p>
      </div>
    </div>
  );
};

export default Checkout;
