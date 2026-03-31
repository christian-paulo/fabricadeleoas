import { useState, useEffect } from "react";
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

const stripePromise = loadStripe("pk_test_51TEx7tI4dFrhArZv4EAhW27GaMJSJlxz84IGixOncD3L3D6gf1CT5dAYtcRfpX2CrSF12DV4mTvoQcSiGLoH6VHL00vUrdcK0y");

const benefits = [
  "Protocolos diários personalizados por IA",
  "Adaptação automática a dores e limitações",
  "Acompanhamento de medidas corporais",
  "142 exercícios do método Gilvan",
  "Tri-sets inteligentes",
  "Cancele quando quiser",
];

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { checkSubscription, refreshProfile } = useAuth();
  const { data: onboardingData } = useOnboarding();
  const [loading, setLoading] = useState(false);

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

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await saveOnboardingData(user.id);
      }

      const nextSubscription = await checkSubscription();
      await refreshProfile();

      if (nextSubscription?.subscribed) {
        toast.success("Bem-vinda à Fábrica de Leoas! 🦁");
        navigate("/dashboard");
        return;
      }

      toast.error("Cadastre um cartão válido para liberar o acesso.");
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

// ─── Registration Form (shown before payment if not logged in) ──
const RegistrationForm = ({ onRegistered }: { onRegistered: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(false);

  useEffect(() => { captureUtms(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vinda de volta, Leoa! 🦁");
      } else {
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
        }

        toast.success("Conta criada com sucesso! 🦁");
      }

      onRegistered();
    } catch (error: any) {
      toast.error(error.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="soft-card p-6 md:p-8 order-1 md:order-2">
      <h2 className="font-heading text-xl text-foreground mb-2">
        {isLogin ? "Entrar na Alcateia" : "Crie sua conta para continuar"}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        {isLogin ? "Use seus dados de acesso" : "Falta pouco para liberar seu protocolo personalizado!"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <>
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
          </>
        )}
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
          {loading ? "Carregando..." : isLogin ? "Entrar 🦁" : "Criar Conta e Continuar"}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline">
          {isLogin ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
};

const Checkout = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const isAuthenticated = !!user;

  // When user becomes authenticated (either already was, or just registered), load checkout
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    const createIntent = async () => {
      try {
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
      } catch (err: any) {
        console.error("Checkout error:", err);
        setError(err.message || "Erro ao carregar checkout");
      } finally {
        setLoading(false);
      }
    };
    createIntent();
  }, [isAuthenticated, registered]);

  // Show registration form if not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Order Summary */}
          <OrderSummary />
          {/* Registration */}
          <RegistrationForm onRegistered={() => setRegistered(true)} />
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
              <CheckoutForm />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Order Summary Component ────────────────────────────────────
const OrderSummary = () => (
  <div className="soft-card p-6 md:p-8 order-2 md:order-1 h-fit">
    <div className="mb-6">
      <h1 className="font-heading text-2xl text-primary mb-1">O seu plano está pronto! 🦁</h1>
      <p className="text-sm text-muted-foreground">Consultoria Fitness com IA</p>
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
);

export default Checkout;
