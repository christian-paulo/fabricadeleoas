import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight } from "lucide-react";
import logoLeoa from "@/assets/logo-leoa.webp";
import heroTreino from "@/assets/hero-gilvan-primeira-sessao.webp";
import { trackQuizFirstClick } from "@/lib/quizTracking";

type VariantKey = "v1" | "v2" | "v3";

type VariantContent = {
  headline: React.ReactNode;
  subtitle: string;
  quizSubtitle: string;
};

const VARIANTS: Record<VariantKey, VariantContent> = {
  v1: {
    headline: (
      <>
        Bumbum caído, pochete de avental ou braço de merendeira?{" "}
        <span className="text-primary">
          Em 10 minutos por dia em casa eu resolvo isso pra você
        </span>
      </>
    ),
    subtitle:
      "Meu Treino personalizado é montado para o seu corpo, sua rotina e suas limitações. Sem equipamento. Sem academia.",
    quizSubtitle:
      "Responda o quiz de 1 minuto que EU MESMO monto o protocolo personalizado pra você",
  },
  v2: {
    headline: (
      <>
        Você cuida da casa, cuida dos filhos e ainda quer emagrecer —{" "}
        <span className="text-primary">
          eu vou te mostrar como fazer isso em 10 minutos por dia
        </span>
      </>
    ),
    subtitle:
      "Treino em casa, sem equipamento, montado pelo Gilvan especialmente para a sua realidade.",
    quizSubtitle:
      "Responda o quiz de 1 minuto que EU MESMO monto o protocolo personalizado pra você",
  },
  v3: {
    headline: (
      <>
        Se você tem mais de 35 anos, sente dores no corpo e acha que não consegue mais emagrecer —{" "}
        <span className="text-primary">esse treino foi feito pra você</span>
      </>
    ),
    subtitle:
      "Exercícios adaptados para eliminar as dores e transformar seu corpo em 10 minutos por dia, em casa, sem equipamento.",
    quizSubtitle:
      "Responda o quiz de 1 minuto que EU MESMO monto o protocolo personalizado pra você",
  },
};

const BoasVindasVariants = () => {
  const { variant } = useParams<{ variant: string }>();
  const navigate = useNavigate();

  const key = (variant as VariantKey) in VARIANTS ? (variant as VariantKey) : null;

  useEffect(() => {
    if (!key) navigate("/onboarding/boas-vindas", { replace: true });
  }, [key, navigate]);

  if (!key) return null;

  const content = VARIANTS[key];

  const handleStart = () => {
    trackQuizFirstClick(key);
    navigate("/onboarding/nome");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-5 max-w-lg mx-auto">
      <div className="w-full flex justify-center pt-8 pb-6 animate-[fade-in_0.5s_ease-out_both]">
        <img
          src={logoLeoa}
          alt="Fábrica de Leoas"
          className="w-20 h-20 drop-shadow-[0_0_20px_hsl(var(--primary)/0.35)]"
        />
      </div>

      <h1 className="text-2xl sm:text-3xl font-heading text-foreground text-center leading-tight mb-4 animate-[fade-in_0.6s_ease-out_0.2s_both]">
        {content.headline}
      </h1>

      <p className="text-base text-muted-foreground text-center max-w-md leading-relaxed mb-6 animate-[fade-in_0.6s_ease-out_0.35s_both]">
        {content.subtitle}
      </p>

      <div className="w-full rounded-2xl overflow-hidden mb-6 shadow-lg animate-[scale-in_0.6s_ease-out_0.45s_both]">
        <img
          src={heroTreino}
          alt="Treino em casa com o Gilvan"
          className="w-full h-80 object-cover object-top"
        />
      </div>

      <p className="text-sm text-foreground/80 text-center max-w-md italic mb-5 animate-[fade-in_0.6s_ease-out_0.55s_both]">
        “{content.quizSubtitle}”
      </p>

      <div className="w-full pb-4 animate-[fade-in_0.6s_ease-out_0.7s_both]">
        <Button
          onClick={handleStart}
          className="w-full pink-gradient text-primary-foreground font-heading h-14 rounded-2xl text-base shadow-lg uppercase tracking-wide hover-scale"
        >
          QUERO O TREINO DO GILVAN
          <ArrowRight size={18} className="ml-2" />
        </Button>
      </div>

      <div className="w-full flex items-start gap-2 px-2 pb-8 text-xs text-muted-foreground animate-[fade-in_0.6s_ease-out_0.85s_both]">
        <ShieldCheck size={18} className="text-primary shrink-0 mt-0.5" />
        <span>
          Você testa por 7 dias — se não gostar, seu dinheiro de volta. Simples assim.
        </span>
      </div>
    </div>
  );
};

export default BoasVindasVariants;
