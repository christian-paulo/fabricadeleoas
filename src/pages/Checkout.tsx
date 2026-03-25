import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Check, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const stripePromise = loadStripe("pk_test_51TEx7tI4dFrhArZv4EAhW27GaMJSJlxz84IGixOncD3L3D6gf1CT5dAYtcRfpX2CrSF12DV4mTvoQcSiGLoH6VHL00vUrdcK0y");

const benefits = [
  "Treinos diários personalizados por IA",
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
  const { checkSubscription } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/onboarding?checkout=success`,
        },
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message || "Erro ao processar pagamento");
      } else {
        await checkSubscription();
        toast.success("Assinatura ativada! Agora vamos montar seu treino! 🦁");
        navigate("/onboarding");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />
      <Button
        type="submit"
        disabled={!stripe || loading}
        className="w-full gold-gradient text-primary-foreground font-heading h-14 rounded-xl text-lg"
      >
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

const Checkout = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const createIntent = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("create-subscription-intent");
        if (fnError) throw fnError;

        if (data.already_subscribed) {
          toast.info("Você já possui uma assinatura ativa!");
          navigate("/dashboard");
          return;
        }

        if (data.client_secret) {
          setClientSecret(data.client_secret);
        } else {
          throw new Error("Não foi possível iniciar o checkout");
        }
      } catch (err: any) {
        console.error("Checkout error:", err);
        setError(err.message || "Erro ao carregar checkout");
      } finally {
        setLoading(false);
      }
    };

    createIntent();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="neu-card p-8 max-w-md w-full text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div className="neu-card p-6 md:p-8 order-2 md:order-1 h-fit">
          <div className="mb-6">
            <h1 className="font-heading text-2xl text-primary mb-1">Fábrica de Leoas</h1>
            <p className="text-sm text-muted-foreground">Consultoria Fitness com IA</p>
          </div>

          <div className="border border-border rounded-xl p-5 mb-6 bg-card">
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
              <span className="text-sm text-accent font-medium">3 dias grátis</span>
              <span className="text-sm text-accent font-medium">- R$ 49,90</span>
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

        {/* Payment Form */}
        <div className="neu-card p-6 md:p-8 order-1 md:order-2">
          <h2 className="font-heading text-xl text-foreground mb-6">Método de Pagamento</h2>

          {clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "night",
                  variables: {
                    colorPrimary: "#D4AF37",
                    colorBackground: "#242424",
                    colorText: "#e0e0e0",
                    colorDanger: "#ef4444",
                    fontFamily: "system-ui, sans-serif",
                    borderRadius: "12px",
                    spacingUnit: "4px",
                  },
                  rules: {
                    ".Input": {
                      backgroundColor: "#1A1A1A",
                      border: "1px solid #333",
                    },
                    ".Input:focus": {
                      borderColor: "#D4AF37",
                      boxShadow: "0 0 0 1px #D4AF37",
                    },
                    ".Label": {
                      color: "#a0a0a0",
                    },
                  },
                },
                locale: "pt-BR",
              }}
            >
              <CheckoutForm />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
};

export default Checkout;
