import { useEffect, useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, ChevronLeft, Sparkles, Heart, Flame, Target, Dumbbell, Brain, Clock, TrendingDown, Activity, Pill, Star, PartyPopper, Zap, Eye, HeartPulse, ThumbsUp, Ruler, Scale, Hourglass, Sofa, Footprints, StretchHorizontal, Wind } from "lucide-react";
import logoLeoa from "@/assets/logo-leoa.webp";
import obj1Img from "@/assets/obj1.webp";
import obj2Img from "@/assets/obj2.webp";
import obj3Img from "@/assets/obj3.webp";
import obj4Img from "@/assets/obj4.webp";
import foco1Img from "@/assets/foco1.webp";
import foco2Img from "@/assets/foco2.webp";
import foco3Img from "@/assets/foco3.webp";
import foco4Img from "@/assets/foco4.webp";
import foco5Img from "@/assets/foco5.webp";
import atual1Img from "@/assets/atual1.webp";
import atual2Img from "@/assets/atual2.webp";
import atual3Img from "@/assets/atual3.webp";
import atual4Img from "@/assets/atual4.webp";
import desejadoSaudavelImg from "@/assets/desejado-saudavel.webp";
import desejadoDefinidaImg from "@/assets/desejado-definida.webp";
import desejadoMusculosaImg from "@/assets/desejado-musculosa.webp";
import barr1Img from "@/assets/barr1.webp";
import barr2Img from "@/assets/barr2.webp";
import barr3Img from "@/assets/barr3.webp";
import barr4Img from "@/assets/barr4.webp";
import barr5Img from "@/assets/barr5.webp";
import quadril1Img from "@/assets/quadril1.png";
import quadril2Img from "@/assets/quadril2.png";
import quadril3Img from "@/assets/quadril3.png";
import quadril4Img from "@/assets/quadril4.png";
import quadril5Img from "@/assets/quadril5.png";
import perna1Img from "@/assets/perna1.png";
import perna2Img from "@/assets/perna2.png";
import perna3Img from "@/assets/perna3.png";
import perna4Img from "@/assets/perna4.png";
import dorCervicalImg from "@/assets/dor_cervical.webp";
import dorToracicaImg from "@/assets/dor_toracica.webp";
import dorLombarImg from "@/assets/dor_lombar.webp";
import dorOmbroImg from "@/assets/dor_ombro.webp";
import dorCotoveloImg from "@/assets/dor_cotovelo.webp";
import dorPunhoImg from "@/assets/dor_punho.webp";
import dorQuadrilImg from "@/assets/dor_quadril.webp";
import dorJoelhoImg from "@/assets/dor_joelho.webp";
import dorTornozeloImg from "@/assets/dor_tornozelo.webp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RulerSlider from "@/components/RulerSlider";
import { Slider } from "@/components/ui/slider";
import { useOnboarding, ONBOARDING_STEPS, type OnboardingStep } from "@/contexts/OnboardingContext";
import { toast } from "sonner";


const Onboarding = () => {
  const { step } = useParams<{ step: string }>();
  const navigate = useNavigate();
  const { data, updateField } = useOnboarding();
  const [saving, setSaving] = useState(false);

  const currentStep = (step || "motivacao") as OnboardingStep;
  const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);
  const totalSteps = ONBOARDING_STEPS.length;

  useEffect(() => {
    if (currentIndex === -1) navigate("/onboarding/boas-vindas", { replace: true });
  }, [currentIndex, navigate]);

  const canProceed = useMemo(() => validateStep(currentStep, data), [currentStep, data]);

  const goNext = async () => {
    if (currentStep === "analise-ia") {
      navigate("/checkout");
      return;
    }
    let nextIndex = currentIndex + 1;
    // Skip "local-dor" and "beneficios" if user has no pain
    while (nextIndex < totalSteps && (ONBOARDING_STEPS[nextIndex] === "local-dor" || ONBOARDING_STEPS[nextIndex] === "beneficios") && !data.hasPain) {
      nextIndex++;
    }
    if (nextIndex < totalSteps) {
      navigate(`/onboarding/${ONBOARDING_STEPS[nextIndex]}`);
    }
  };

  const goBack = () => {
    let prevIndex = currentIndex - 1;
    // Skip "local-dor" and "beneficios" going back if user has no pain
    while (prevIndex >= 0 && (ONBOARDING_STEPS[prevIndex] === "local-dor" || ONBOARDING_STEPS[prevIndex] === "beneficios") && !data.hasPain) {
      prevIndex--;
    }
    if (prevIndex >= 0) {
      navigate(`/onboarding/${ONBOARDING_STEPS[prevIndex]}`);
    }
  };

  // saveAllData is now handled in Checkout after account creation

  if (currentIndex === -1) return null;

  // Special screens without standard navigation
  if (currentStep === "boas-vindas") return <BoasVindasScreen onNext={goNext} />;
  if (currentStep === "transformacao") return <TransformacaoScreen onNext={goNext} onBack={goBack} currentIndex={currentIndex} totalSteps={totalSteps} data={data} />;
  if (currentStep === "resultado-visual") return <ResultadoVisualScreen onNext={goNext} onBack={goBack} currentIndex={currentIndex} totalSteps={totalSteps} />;
  if (currentStep === "grafico-previsao") return <GraficoPrevisaoScreen onNext={goNext} onBack={goBack} currentIndex={currentIndex} totalSteps={totalSteps} data={data} />;
  if (currentStep === "analise-ia") return <AnaliseIAScreen onNext={goNext} saving={saving} />;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {/* Progress */}
      <div className="px-4 pt-6 pb-2">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full pink-gradient rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }} />
        </div>
      </div>

      {/* Step Content */}
      <div key={currentStep} className="flex-1 px-4 pt-6 pb-4 overflow-y-auto animate-[fade-in_0.3s_ease-out_both]">
        {renderStep(currentStep, data, updateField)}
      </div>

      {/* Navigation */}
      <div className="px-4 pb-8 flex gap-3">
        {currentIndex > 0 && (
          <Button variant="outline" onClick={goBack} className="border-border text-foreground h-12 rounded-2xl px-4">
            <ChevronLeft size={18} />
          </Button>
        )}
        <Button onClick={goNext} disabled={!canProceed || saving}
          className="flex-1 pink-gradient text-primary-foreground font-heading h-12 rounded-2xl disabled:opacity-40 shadow-lg">
          {saving ? "Salvando..." : "Continuar"}
          {!saving && <ChevronRight size={18} className="ml-1" />}
        </Button>
      </div>
    </div>
  );
};

// ─── Option Card Component ─────────────────────────────────────
const OptionCard = ({ selected, onClick, children, icon, index = 0 }: { selected: boolean; onClick: () => void; children: React.ReactNode; icon?: React.ReactNode; index?: number }) => (
  <button onClick={onClick}
    className={`soft-card w-full py-5 px-5 text-left text-base transition-all flex items-center gap-3 animate-[fade-in_0.4s_ease-out_both] ${
      selected ? "ring-2 ring-primary bg-primary/5 text-primary scale-[1.02]" : "text-foreground hover:bg-secondary/50"
    }`}
    style={{ animationDelay: `${index * 80}ms` }}>
    {icon && <span className="text-xl shrink-0">{icon}</span>}
    <span className="font-medium">{children}</span>
  </button>
);

// ─── Step Renderer ──────────────────────────────────────────────
function renderStep(step: OnboardingStep, data: any, updateField: any) {
  switch (step) {
    case "motivacao":
      return (
        <div>
          <div className="mb-1 animate-[scale-in_0.4s_ease-out_both]"><Heart className="w-8 h-8 text-primary" /></div>
          <h2 className="text-2xl text-foreground mb-2 animate-[fade-in_0.4s_ease-out_0.1s_both]">O que mais te motiva hoje?</h2>
          <p className="text-sm text-muted-foreground mb-6 animate-[fade-in_0.4s_ease-out_0.2s_both]">Selecione uma ou mais opções</p>
          <div className="space-y-3">
            {[
              { label: "Entrar em forma", icon: <Flame className="w-5 h-5" /> },
              { label: "Melhorar aparência", icon: <Eye className="w-5 h-5" /> },
              { label: "Cuidar da saúde", icon: <HeartPulse className="w-5 h-5" /> },
              { label: "Ter mais energia", icon: <Zap className="w-5 h-5" /> },
              { label: "Ganhar confiança", icon: <ThumbsUp className="w-5 h-5" /> },
            ].map((m, i) => {
              const selected = data.motivacao.includes(m.label);
              return (
                <OptionCard key={m.label} selected={selected} onClick={() => updateField("motivacao", selected ? data.motivacao.filter((x: string) => x !== m.label) : [...data.motivacao, m.label])} icon={m.icon} index={i}>{m.label}</OptionCard>
              );
            })}
          </div>
        </div>
      );

    case "objetivo":
      return (
        <div>
          <div className="mb-1 animate-[scale-in_0.4s_ease-out_both]"><Target className="w-8 h-8 text-primary" /></div>
          <h2 className="text-2xl font-heading text-foreground mb-2 animate-[fade-in_0.4s_ease-out_both]">Qual o seu principal objetivo?</h2>
          <p className="text-sm text-muted-foreground mb-6 animate-[fade-in_0.4s_ease-out_0.1s_both]">Este dado é fundamental para o seu protocolo</p>
          <div className="space-y-3">
            {[
              { label: "Perder\npeso", value: "Emagrecimento", img: obj1Img },
              { label: "Ganhar massa\nmuscular", value: "Ganho de Massa", img: obj2Img },
              { label: "Melhorar\na saúde", value: "Saúde", img: obj3Img },
              { label: "Melhorar as\ndores", value: "Melhorar Dores", img: obj4Img },
            ].map((g, i) => (
              <button key={g.value} onClick={() => updateField("goal", g.value)}
                className={`w-full rounded-2xl overflow-hidden relative h-24 flex items-center transition-all duration-300 animate-[fade-in_0.4s_ease-out_both] ${
                  data.goal === g.value 
                    ? "ring-2 ring-primary bg-primary/10 scale-[1.02]" 
                    : "bg-secondary/50 hover:bg-secondary/80"
                }`}
                style={{ animationDelay: `${i * 100}ms` }}>
                <span className={`relative z-10 pl-5 text-xl font-bold leading-tight whitespace-pre-line text-left ${
                  data.goal === g.value ? "text-primary" : "text-foreground"
                }`}>{g.label}</span>
                <img src={g.img} alt={g.value} className="absolute right-0 top-1/2 -translate-y-1/2 h-[110%] w-auto object-cover" />
              </button>
            ))}
          </div>
        </div>
      );

    case "area-alvo":
      return (
        <div>
          <div className="mb-1 animate-[scale-in_0.4s_ease-out_both]"><Dumbbell className="w-8 h-8 text-primary" /></div>
          <h2 className="text-2xl font-heading text-foreground mb-2 animate-[fade-in_0.4s_ease-out_both]">Qual dos problemas abaixo você gostaria que fosse intensificado no seu treino?</h2>
          <p className="text-sm text-muted-foreground mb-6 animate-[fade-in_0.4s_ease-out_0.1s_both]">Selecione uma ou mais áreas</p>
          <div className="space-y-3">
            {[
              { label: "Pochete", value: "Pochete", img: foco1Img },
              { label: "Braço\nMerendeira", value: "Braço Merendeira", img: foco2Img },
              { label: "Bumbum\nCaído", value: "Bumbum Caído", img: foco3Img },
              { label: "Coxa de\nAmoeba", value: "Coxa de Amoeba", img: foco4Img },
              { label: "Flancos", value: "Flancos", img: foco5Img },
            ].map((a, i) => {
              const selected = data.targetArea.includes(a.value);
              return (
                <button key={a.value} onClick={() => updateField("targetArea", selected ? data.targetArea.filter((x: string) => x !== a.value) : [...data.targetArea, a.value])}
                  className={`w-full rounded-2xl overflow-hidden relative h-24 flex items-center transition-all duration-300 animate-[fade-in_0.4s_ease-out_both] ${
                    selected 
                      ? "ring-2 ring-primary bg-primary/10 scale-[1.02]" 
                      : "bg-secondary/50 hover:bg-secondary/80"
                  }`}
                  style={{ animationDelay: `${i * 100}ms` }}>
                  <span className={`relative z-10 pl-5 text-xl font-bold leading-tight whitespace-pre-line text-left ${
                    selected ? "text-primary" : "text-foreground"
                  }`}>{a.label}</span>
                  <img src={a.img} alt={a.value} className="absolute right-0 top-1/2 -translate-y-1/2 h-[110%] w-auto object-cover" />
                </button>
              );
            })}
          </div>
        </div>
      );

    case "corpo-atual":
      const corpoAtualOptions = [
        { label: "Médio", value: "Médio", img: atual1Img },
        { label: "Flácida", value: "Flácida", img: atual2Img },
        { label: "Magro", value: "Magro", img: atual3Img },
        { label: "Tonificada", value: "Tonificada", img: atual4Img },
      ];
      return (
        <div>
          <div className="mb-1 animate-[scale-in_0.4s_ease-out_both]"><Eye className="w-8 h-8 text-primary" /></div>
          <h2 className="text-2xl text-foreground mb-2 animate-[fade-in_0.4s_ease-out_both]">Qual é o seu tipo de corpo atual?</h2>
          <p className="text-sm text-muted-foreground mb-6 animate-[fade-in_0.4s_ease-out_0.1s_both]">Selecione o que mais se aproxima</p>
          <div className="space-y-3">
            {corpoAtualOptions.map((c, i) => (
              <button
                key={c.value}
                onClick={() => updateField("corpo_atual", c.value)}
                className={`w-full relative h-24 rounded-2xl overflow-hidden transition-all duration-200 animate-[fade-in_0.4s_ease-out_both] flex items-center ${data.corpo_atual === c.value ? "ring-2 ring-primary bg-primary/10" : "bg-muted/50 hover:bg-muted"}`}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <span className="relative z-10 pl-5 text-xl font-bold text-foreground">{c.label}</span>
                <img src={c.img} alt={c.label} className="absolute right-0 top-1/2 -translate-y-1/2 h-[110%] w-auto object-cover" />
              </button>
            ))}
          </div>
        </div>
      );

    case "corpo-desejado": {
      const corpoDesejadoOptions = [
        { value: "Saudável e Funcional", label: "Saudável e\nFuncional", img: desejadoSaudavelImg },
        { value: "Definida e com Curvas", label: "Definida e\ncom Curvas", img: desejadoDefinidaImg },
        { value: "Musculosa", label: "Musculosa", img: desejadoMusculosaImg },
        { value: "Sem Dores", label: "Sem Dores", img: desejadoSaudavelImg },
      ];
      return (
        <div>
          <div className="mb-1 animate-[scale-in_0.4s_ease-out_both]"><Sparkles className="w-8 h-8 text-primary" /></div>
          <h2 className="text-2xl text-foreground mb-2 animate-[fade-in_0.4s_ease-out_both]">Qual é o seu corpo desejado?</h2>
          <p className="text-sm text-muted-foreground mb-6 animate-[fade-in_0.4s_ease-out_0.1s_both]">Onde gostaria de chegar?</p>
          <div className="space-y-3">
            {corpoDesejadoOptions.map((cd, i) => (
              <button
                key={cd.value}
                onClick={() => updateField("corpo_desejado", cd.value)}
                className={`w-full rounded-2xl overflow-hidden relative h-24 flex items-center transition-all duration-200 ${data.corpo_desejado === cd.value ? "bg-primary/10 ring-2 ring-primary" : "bg-secondary/50"}`}
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <span className="relative z-10 pl-5 text-xl font-bold text-foreground whitespace-pre-line text-left">{cd.label}</span>
                <img src={cd.img} alt={cd.value} className="absolute right-0 top-1/2 -translate-y-1/2 h-[110%] w-auto object-cover" />
              </button>
            ))}
          </div>
        </div>
      );
    }

    case "altura":
      return (
        <div className="flex flex-col items-center">
          <div className="mb-1 animate-[scale-in_0.4s_ease-out_both]"><Ruler className="w-8 h-8 text-primary" /></div>
          <h2 className="text-3xl font-bold text-foreground mb-2 animate-[fade-in_0.4s_ease-out_both] text-center">
            Qual é sua <span className="text-primary">altura</span>?
          </h2>
          <p className="text-sm text-muted-foreground mb-8 animate-[fade-in_0.4s_ease-out_0.1s_both] text-center">
            Exemplo: 1.94m = 194cm
          </p>
          <div className="w-full px-2">
            <RulerSlider
              min={140}
              max={210}
              value={data.altura ? parseInt(data.altura) : 165}
              onChange={(v) => updateField("altura", String(v))}
              unit="cm"
              step={1}
              majorEvery={10}
            />
          </div>
        </div>
      );

    case "peso":
      return (
        <div className="flex flex-col items-center">
          <div className="mb-1 animate-[scale-in_0.4s_ease-out_both]"><Scale className="w-8 h-8 text-primary" /></div>
          <h2 className="text-3xl font-bold text-foreground mb-2 animate-[fade-in_0.4s_ease-out_both] text-center">
            Qual é seu peso atual?
          </h2>
          <p className="text-sm text-muted-foreground mb-8 animate-[fade-in_0.4s_ease-out_0.1s_both] text-center">
            Arraste para indicar seu peso
          </p>
          <div className="w-full px-2">
            <RulerSlider
              min={40}
              max={150}
              value={data.peso_atual ? parseInt(data.peso_atual) : 70}
              onChange={(v) => updateField("peso_atual", String(v))}
              unit="kg"
              step={1}
              majorEvery={10}
            />
          </div>
        </div>
      );

    case "meta":
      return (
        <div className="flex flex-col items-center">
          <div className="mb-1 animate-[scale-in_0.4s_ease-out_both]"><TrendingDown className="w-8 h-8 text-primary" /></div>
          <h2 className="text-3xl font-bold text-foreground mb-2 animate-[fade-in_0.4s_ease-out_both] text-center">
            Qual a sua meta de peso?
          </h2>
          <p className="text-sm text-muted-foreground mb-8 animate-[fade-in_0.4s_ease-out_0.1s_both] text-center">
            Arraste para indicar sua meta
          </p>
          <div className="w-full px-2">
            <RulerSlider
              min={40}
              max={150}
              value={data.meta_peso ? parseInt(data.meta_peso) : 60}
              onChange={(v) => updateField("meta_peso", String(v))}
              unit="kg"
              step={1}
              majorEvery={10}
            />
          </div>
          {data.peso_atual && data.meta_peso && (
            <div className="soft-card p-4 mt-4 text-center">
              <p className="text-sm text-muted-foreground">Diferença</p>
              <p className="text-3xl font-heading text-primary font-bold">
                {parseFloat(data.meta_peso) >= parseFloat(data.peso_atual) ? "+" : "-"}{Math.abs(parseFloat(data.peso_atual) - parseFloat(data.meta_peso)).toFixed(1)} kg
              </p>
            </div>
          )}
        </div>
      );

    case "tipo-barriga":
      return (
        <div>
          <h2 className="text-2xl text-foreground mb-2">Qual tipo de <span className="text-primary">barriga</span> mais representa a sua atualmente?</h2>
          <div className="space-y-3 mt-6">
            {[
              { val: "Barriga normal", img: barr1Img },
              { val: "Barriga de mãe", img: barr2Img },
              { val: "Barriga hormonal", img: barr3Img },
              { val: "Barriga de álcool", img: barr4Img },
              { val: "Barriga estressada", img: barr5Img },
            ].map((opt) => (
              <button key={opt.val} onClick={() => updateField("tipo_barriga", opt.val)}
                className={`soft-card w-full h-24 rounded-2xl overflow-hidden flex items-center relative transition-all ${data.tipo_barriga === opt.val ? "ring-2 ring-primary bg-primary/10" : "bg-secondary/50"}`}>
                <span className="pl-5 text-xl font-bold text-foreground relative z-10">{opt.val}</span>
                <img src={opt.img} alt={opt.val} className="absolute right-0 top-1/2 -translate-y-1/2 h-[110%] w-auto object-cover" />
              </button>
            ))}
          </div>
        </div>
      );

    case "tipo-quadril":
      return (
        <div>
          <h2 className="text-2xl text-foreground mb-2">Qual tipo de <span className="text-primary">quadril</span> mais representa o seu atualmente?</h2>
          <div className="space-y-3 mt-6">
            {[
              { val: "Normal", img: quadril1Img },
              { val: "Chato", img: quadril2Img },
              { val: "Caído", img: quadril3Img },
              { val: "Duplo", img: quadril4Img },
              { val: "Redondo", img: quadril5Img },
            ].map((opt) => (
              <button key={opt.val} onClick={() => updateField("tipo_quadril", opt.val)}
                className={`soft-card w-full h-24 rounded-2xl overflow-hidden flex items-center relative transition-all ${data.tipo_quadril === opt.val ? "ring-2 ring-primary bg-primary/10" : "bg-secondary/50"}`}>
                <span className="pl-5 text-xl font-bold text-foreground relative z-10">{opt.val}</span>
                <img src={opt.img} alt={opt.val} className="absolute right-0 top-1/2 -translate-y-1/2 h-[110%] w-auto object-cover" />
              </button>
            ))}
          </div>
        </div>
      );

    case "tipo-perna":
      return (
        <div>
          <h2 className="text-2xl text-foreground mb-2">Qual tipo de <span className="text-primary">perna</span> mais representa a sua atualmente?</h2>
          <div className="space-y-3 mt-6">
            {[
              { val: "Pernas normais", img: perna1Img },
              { val: "Pernas em forma de X", img: perna2Img },
              { val: "Pernas em forma de O", img: perna3Img },
              { val: "Pernas em forma de XO", img: perna4Img },
            ].map((opt) => (
              <button key={opt.val} onClick={() => updateField("tipo_perna", opt.val)}
                className={`soft-card w-full h-24 rounded-2xl overflow-hidden flex items-center relative transition-all ${data.tipo_perna === opt.val ? "ring-2 ring-primary bg-primary/10" : "bg-secondary/50"}`}>
                <span className="pl-5 text-xl font-bold text-foreground relative z-10">{opt.val}</span>
                <img src={opt.img} alt={opt.val} className="absolute right-0 top-1/2 -translate-y-1/2 h-[110%] w-auto object-cover" />
              </button>
            ))}
          </div>
        </div>
      );

    case "idade":
      return (
        <div>
          <div className="mb-1"><Star className="w-8 h-8 text-primary" /></div>
          <h2 className="text-2xl text-foreground mb-2">Qual é a sua <span className="text-primary">idade</span>?</h2>
          <p className="text-sm text-muted-foreground mb-6">Importante para ajustar a intensidade</p>
          <div className="soft-card p-6 text-center">
            <Input type="number" value={data.idade} onChange={(e) => updateField("idade", e.target.value)}
              placeholder="40" className="bg-background border-border text-foreground h-14 text-2xl text-center font-heading max-w-[120px] mx-auto" />
            <p className="text-xs text-muted-foreground mt-3">anos</p>
          </div>
        </div>
      );

    case "equipamentos":
      return (
        <div>
          <div className="mb-1"><Dumbbell className="w-8 h-8 text-primary" /></div>
          <h2 className="text-2xl text-foreground mb-2">Como você prefere fazer os exercícios?</h2>
          <p className="text-sm text-muted-foreground mb-6">Defina os equipamentos disponíveis</p>
          <div className="space-y-3">
            {[
              { val: "Sem equipamento", icon: "🙌", desc: "Apenas peso corporal e materiais simples" },
              { val: "Halteres e elásticos", icon: "💪", desc: "Equipamento básico em casa" },
              { val: "Equipamentos completos", icon: "🏋️", desc: "Acesso a máquinas e aparelhos em casa" },
            ].map((e) => (
              <button key={e.val} onClick={() => updateField("equipment", e.val)}
                className={`soft-card w-full p-4 text-left transition-all ${data.equipment === e.val ? "ring-2 ring-primary bg-primary/5" : "hover:bg-secondary/50"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{e.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{e.val}</p>
                    <p className="text-xs text-muted-foreground">{e.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      );

    case "dificuldade":
      return (
        <div>
          <div className="mb-1"><Flame className="w-8 h-8 text-primary" /></div>
          <h2 className="text-2xl text-foreground mb-2">Nível de dificuldade esperado?</h2>
          <p className="text-sm text-muted-foreground mb-6">Qual intensidade te parece ideal?</p>
          <div className="space-y-3">
            {[
              { val: "Fácil", icon: "😊", desc: "Quero começar devagar" },
              { val: "Suar um pouco", icon: "💧", desc: "Moderado, mas sentir o protocolo" },
              { val: "Desafiador", icon: "🔥", desc: "Quero ser desafiada!" },
            ].map((d) => (
              <button key={d.val} onClick={() => updateField("dificuldade", d.val)}
                className={`soft-card w-full p-4 text-left transition-all ${data.dificuldade === d.val ? "ring-2 ring-primary bg-primary/5" : "hover:bg-secondary/50"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{d.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.val}</p>
                    <p className="text-xs text-muted-foreground">{d.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      );

    case "momento":
      return (
        <div>
          <div className="mb-1"><Activity className="w-8 h-8 text-primary" /></div>
          <h2 className="text-2xl text-foreground mb-2">Em que momento está?</h2>
          <p className="text-sm text-muted-foreground mb-6">Seu nível de experiência atual</p>
          <div className="space-y-3">
            {[
              { val: "Nunca treinei", desc: "Estou começando do zero", emoji: "🌱" },
              { val: "Retomando", desc: "Já treinei mas parei faz tempo", emoji: "🔄" },
              { val: "Treino com frequência", desc: "Pratico regularmente há meses", emoji: "💪" },
              { val: "Avançada", desc: "Pratico há mais de 2 anos", emoji: "🏆" },
            ].map((e, i) => (
              <OptionCard key={e.val} selected={data.trainingExperience === e.val} onClick={() => updateField("trainingExperience", e.val)} icon={<span>{e.emoji}</span>} index={i}>
                <div>
                  <p className="font-medium">{e.val}</p>
                  <p className="text-xs text-muted-foreground">{e.desc}</p>
                </div>
              </OptionCard>
            ))}
          </div>
        </div>
      );

    case "frequencia":
      return (
        <div>
          <div className="mb-1"><Clock className="w-8 h-8 text-primary" /></div>
          <h2 className="text-2xl text-foreground mb-2">Com que <span className="text-primary">frequência</span> na semana você gostaria de treinar?</h2>
          <div className="flex gap-3 justify-center mt-8">
            {[2, 3, 4, 5].map((d) => (
              <button key={d} onClick={() => updateField("workoutDays", d)}
                className={`w-16 h-16 rounded-2xl font-heading text-xl transition-all ${
                  data.workoutDays === d ? "pink-gradient text-primary-foreground shadow-lg" : "soft-card text-foreground"
                }`}>
                {d}
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">
            {data.workoutDays} dias por semana
          </p>
        </div>
      );

    case "tempo":
      return (
        <div>
          <div className="mb-1"><Hourglass className="w-8 h-8 text-primary" /></div>
          <h2 className="text-2xl text-foreground mb-2">Quanto <span className="text-primary">tempo</span> por dia você gostaria de treinar?</h2>
          <div className="flex gap-4 justify-center mt-8">
            {["Até 10 min", "Até 30 min"].map((d) => (
              <button key={d} onClick={() => updateField("workoutDuration", d)}
                className={`flex-1 max-w-[160px] h-24 rounded-2xl font-heading text-lg transition-all ${
                  data.workoutDuration === d ? "pink-gradient text-primary-foreground shadow-lg" : "soft-card text-foreground"
                }`}>
                {d}
              </button>
            ))}
          </div>
        </div>
      );

    case "dores":
      return (
        <div>
          <div className="mb-1"><HeartPulse className="w-8 h-8 text-primary" /></div>
          <h2 className="text-2xl text-foreground mb-2">Sente algum desconforto?</h2>
          <p className="text-sm text-muted-foreground mb-6">Precisamos saber para sua segurança</p>
          <div className="flex gap-4 justify-center mb-6">
            {[{ val: true, label: "Sim" }, { val: false, label: "Não" }].map((opt) => (
              <button key={String(opt.val)} onClick={() => { updateField("hasPain", opt.val); if (!opt.val) updateField("painLocation", []); }}
                className={`flex-1 max-w-[140px] h-16 rounded-2xl font-heading transition-all ${
                  data.hasPain === opt.val ? "pink-gradient text-primary-foreground shadow-lg" : "soft-card text-foreground"
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      );

    case "local-dor":
      return (
        <div>
          <div className="mb-1"><HeartPulse className="w-8 h-8 text-primary" /></div>
          <h2 className="text-2xl text-foreground mb-2">Onde você sente dor?</h2>
          <p className="text-sm text-muted-foreground mb-6">Selecione todas as regiões com desconforto</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Cervical", img: dorCervicalImg },
              { label: "Torácica", img: dorToracicaImg },
              { label: "Lombar", img: dorLombarImg },
              { label: "Ombro", img: dorOmbroImg },
              { label: "Cotovelo", img: dorCotoveloImg },
              { label: "Punho", img: dorPunhoImg },
              { label: "Quadril", img: dorQuadrilImg },
              { label: "Joelho", img: dorJoelhoImg },
              { label: "Tornozelo", img: dorTornozeloImg },
              { label: "Todos", img: null },
            ].map((p) => {
              const selected = p.label === "Todos"
                ? data.painLocation.includes("Todos")
                : data.painLocation.includes(p.label);
              return (
                <button
                  key={p.label}
                  onClick={() => {
                    if (p.label === "Todos") {
                      updateField("painLocation", selected ? [] : ["Todos"]);
                    } else {
                      const without = data.painLocation.filter((x: string) => x !== "Todos" && x !== p.label);
                      updateField("painLocation", selected ? without : [...without, p.label]);
                    }
                  }}
                  className={`relative rounded-2xl overflow-hidden border-2 transition-all flex flex-col items-center p-2 ${selected ? "border-primary bg-primary/10 shadow-lg" : "border-border bg-card"}`}
                >
                  {p.img ? (
                    <img src={p.img} alt={p.label} className="w-full h-24 object-cover rounded-xl mb-1" />
                  ) : (
                    <div className="w-full h-24 rounded-xl mb-1 flex items-center justify-center bg-red-500/20">
                      <span className="text-3xl">❌</span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-foreground">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      );

    case "beneficios":
      return (
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-bold text-foreground mb-2 text-center">Descubra os benefícios do Protocolo das Leoas</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center">Veja por que nosso método é diferente</p>
          <div className="flex gap-3 w-full">
            {/* Outros */}
            <div className="flex-1 rounded-2xl border border-border bg-card p-4 flex flex-col items-center">
              <div className="w-full h-32 rounded-xl mb-3 bg-muted flex items-center justify-center overflow-hidden">
                <span className="text-5xl opacity-60">😔</span>
              </div>
              <h3 className="text-lg font-bold text-muted-foreground italic mb-3">Outros</h3>
              <ul className="space-y-2 w-full">
                {["Transformação Lenta", "Falta de Personalização", "Falta de Especialização", "Progresso Limitado"].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-destructive mt-0.5">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Nosso Programa */}
            <div className="flex-1 rounded-2xl border-2 border-primary pink-gradient p-4 flex flex-col items-center shadow-lg">
              <div className="w-full h-32 rounded-xl mb-3 overflow-hidden flex items-center justify-center bg-primary/20">
                <span className="text-5xl">💪</span>
              </div>
              <div className="bg-background/80 backdrop-blur rounded-xl px-3 py-1.5 mb-3 text-center">
                <h3 className="text-sm font-bold text-foreground">Protocolo das Leoas</h3>
                <p className="text-xs text-muted-foreground">Plano personalizado</p>
              </div>
              <ul className="space-y-2 w-full">
                {["Resultados Mais Rápidos", "Personalizado para você", "Orientação de Especialistas", "Progresso Impulsionado"].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-primary-foreground font-semibold">
                    <span className="mt-0.5">✅</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      );

    case "rotina":
      return (
        <div>
          <div className="mb-1 animate-[scale-in_0.4s_ease-out_both]"><Sofa className="w-8 h-8 text-primary" /></div>
          <h2 className="text-2xl text-foreground mb-2 animate-[fade-in_0.4s_ease-out_both]">Como são os seus dias?</h2>
          <p className="text-sm text-muted-foreground mb-6 animate-[fade-in_0.4s_ease-out_0.1s_both]">Descreva a sua rotina diária</p>
          <div className="space-y-3">
            {[
              { label: "Sedentária (muito tempo sentada)", icon: <Sofa className="w-5 h-5" /> },
              { label: "Caminhada leve", icon: <Footprints className="w-5 h-5" /> },
              { label: "Muito tempo de pé", icon: <Activity className="w-5 h-5" /> },
              { label: "Ativa (ando bastante)", icon: <Zap className="w-5 h-5" /> },
            ].map((r, i) => (
              <OptionCard key={r.label} selected={data.rotina === r.label} onClick={() => updateField("rotina", r.label)} icon={r.icon} index={i}>{r.label}</OptionCard>
            ))}
          </div>
        </div>
      );

    case "flexibilidade":
      return (
        <div>
          <div className="mb-1"><StretchHorizontal className="w-8 h-8 text-primary" /></div>
          <h2 className="text-2xl text-foreground mb-2">Nível aeróbico e flexibilidade</h2>
          <p className="text-sm text-muted-foreground mb-6">Ajuda a calibrar a intensidade</p>
          <div className="space-y-3">
            {[
              { label: "Fico ofegante subindo escadas", icon: <Wind className="w-5 h-5" /> },
              { label: "Consigo subir sem dificuldade", icon: <Footprints className="w-5 h-5" /> },
              { label: "Não consigo alcançar os pés", icon: <StretchHorizontal className="w-5 h-5" /> },
              { label: "Consigo tocar os pés facilmente", icon: <Star className="w-5 h-5" /> },
            ].map((f, i) => (
              <OptionCard key={f.label} selected={data.flexibilidade === f.label} onClick={() => updateField("flexibilidade", f.label)} icon={f.icon} index={i}>{f.label}</OptionCard>
            ))}
          </div>
        </div>
      );

    case "medicacao":
      return (
        <div>
          <div className="mb-1"><Pill className="w-8 h-8 text-primary" /></div>
          <h2 className="text-2xl text-foreground mb-2">Usa alguma medicação?</h2>
          <p className="text-sm text-muted-foreground mb-6">Ozempic, Mounjaro, Antidepressivos...</p>
          <div className="flex gap-4 justify-center mb-6">
            {[{ val: true, label: "Sim" }, { val: false, label: "Não" }].map((opt) => (
              <button key={String(opt.val)} onClick={() => updateField("usesMedication", opt.val)}
                className={`flex-1 max-w-[140px] h-16 rounded-2xl font-heading transition-all ${
                  data.usesMedication === opt.val ? "pink-gradient text-primary-foreground shadow-lg" : "soft-card text-foreground"
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
          {data.usesMedication && (
            <div className="soft-card p-4 mt-4">
              <label className="text-sm text-muted-foreground font-medium mb-2 block">Como se sente fisicamente?</label>
              <textarea value={data.medicationFeeling} onChange={(e) => updateField("medicationFeeling", e.target.value)}
                placeholder="Ex: Sinto enjoo pela manhã, mas à tarde me sinto bem..."
                className="w-full h-28 bg-background border border-border rounded-xl p-4 text-sm text-foreground resize-none focus:ring-2 focus:ring-primary outline-none" />
            </div>
          )}
        </div>
      );

    case "psicologico":
      return (
        <div>
          <div className="mb-1"><Brain className="w-8 h-8 text-primary" /></div>
          <h2 className="text-2xl text-foreground mb-2">Identifica-se com alguma frase?</h2>
          <p className="text-sm text-muted-foreground mb-6">Selecione as que mais combinam</p>
          <div className="space-y-3">
            {[
              { label: "Me sinto insatisfeita no espelho", emoji: "🪞" },
              { label: "Começo e desisto fácil", emoji: "😔" },
              { label: "Não tenho motivação para me exercitar", emoji: "😴" },
              { label: "Tenho vergonha do meu corpo", emoji: "🫣" },
              { label: "Quero recuperar minha autoestima", emoji: "💖" },
              { label: "Quero ser exemplo para minha família", emoji: "👨‍👩‍👧" },
            ].map((p, i) => {
              const selected = data.psicologico.includes(p.label);
              return (
                <OptionCard key={p.label} selected={selected} index={i} icon={<span>{p.emoji}</span>}
                  onClick={() => updateField("psicologico", selected ? data.psicologico.filter((x: string) => x !== p.label) : [...data.psicologico, p.label])}>
                  {p.label}
                </OptionCard>
              );
            })}
          </div>
        </div>
      );

    case "celebracao":
      return (
        <div>
          <div className="mb-1"><PartyPopper className="w-8 h-8 text-primary" /></div>
          <h2 className="text-2xl text-foreground mb-2">Como vai celebrar ao atingir a meta?</h2>
          <p className="text-sm text-muted-foreground mb-6">Visualize sua conquista!</p>
          <div className="soft-card p-4">
            <textarea value={data.celebracao} onChange={(e) => updateField("celebracao", e.target.value)}
              placeholder="Ex: Vou comprar um biquíni novo e ir à praia com confiança! 🏖️"
              className="w-full h-32 bg-background border border-border rounded-xl p-4 text-sm text-foreground resize-none focus:ring-2 focus:ring-primary outline-none" />
          </div>
        </div>
      );

    default:
      return null;
  }
}

// ─── Transformação Screen ────────────────────────────────────────
const TransformacaoScreen = ({ onNext, onBack, currentIndex, totalSteps, data }: any) => {
  const pesoAtual = data.peso_atual || "70";
  const metaPeso = data.meta_peso || "60";

  // Map corpo_atual to image
  const corpoAtualMap: Record<string, string> = {
    "Médio": atual1Img,
    "Flácida": atual2Img,
    "Magro": atual3Img,
    "Tonificada": atual4Img,
  };

  // Map corpo_desejado to image
  const corpoDesejadoMap: Record<string, string> = {
    "Saudável e Funcional": desejadoSaudavelImg,
    "Definida e com Curvas": desejadoDefinidaImg,
    "Musculosa": desejadoMusculosaImg,
  };

  const imgAtual = corpoAtualMap[data.corpo_atual] || atual1Img;
  const imgDesejado = corpoDesejadoMap[data.corpo_desejado] || desejadoSaudavelImg;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-2">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full pink-gradient rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }} />
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h2 className="text-3xl font-heading text-foreground mb-2 animate-[fade-in_0.6s_ease-out_both]">
          Veja as <span className="text-primary">mudanças incríveis</span> após atingir seu objetivo!
        </h2>

        <div className="relative flex items-center justify-center gap-2 mt-8 mb-6 w-full">

          {/* Before image */}
          <div className="relative w-[42%] animate-[fade-in_0.5s_ease-out_0.3s_both]">
            <div className="rounded-2xl overflow-hidden border-2 border-border shadow-lg aspect-[3/4]">
              <img src={imgAtual} alt="Corpo atual" className="w-full h-full object-cover" />
            </div>
            <div className="mt-2 bg-muted rounded-xl py-2 px-4 inline-block">
              <span className="text-lg font-heading font-bold text-foreground">{pesoAtual} kg</span>
            </div>
          </div>

          {/* Arrow */}
          <div className="text-primary text-3xl font-bold animate-[scale-in_0.5s_ease-out_0.5s_both] mx-1">
            ➜
          </div>

          {/* After image */}
          <div className="relative w-[48%] animate-[fade-in_0.5s_ease-out_0.5s_both]">
            <div className="rounded-2xl overflow-hidden border-2 border-primary shadow-xl aspect-[3/4]">
              <img src={imgDesejado} alt="Corpo desejado" className="w-full h-full object-cover" />
            </div>
            <div className="mt-2 pink-gradient rounded-xl py-2 px-4 inline-block">
              <span className="text-lg font-heading font-bold text-primary-foreground">{metaPeso} kg</span>
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 pb-8 flex gap-3">
        <Button variant="outline" onClick={onBack} className="border-border text-foreground h-12 rounded-2xl px-4">
          <ChevronLeft size={18} />
        </Button>
        <Button onClick={onNext} className="flex-1 pink-gradient text-primary-foreground font-heading h-12 rounded-2xl shadow-lg">
          Continuar <ChevronRight size={18} className="ml-1" />
        </Button>
      </div>
    </div>
  );
};

// ─── Resultado Visual Screen ────────────────────────────────────
const ResultadoVisualScreen = ({ onNext, onBack, currentIndex, totalSteps }: any) => (
  <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
    <div className="px-4 pt-6 pb-2">
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className="h-full pink-gradient rounded-full transition-all duration-500"
          style={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }} />
      </div>
    </div>
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full pink-gradient flex items-center justify-center mb-6 shadow-lg">
        <Sparkles className="w-10 h-10 text-primary-foreground" />
      </div>
      <h2 className="text-2xl font-heading text-foreground mb-3">Resultados são possíveis!</h2>
      <p className="text-muted-foreground mb-8 leading-relaxed">
        Milhares de mulheres já transformaram seus corpos com o método Gilvan. 
        Com consistência e o protocolo certo, você também vai chegar lá. 💪
      </p>
      <div className="soft-card p-6 w-full mb-8">
        <p className="text-sm text-muted-foreground mb-2">Média de resultados em 12 semanas</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-heading text-primary font-bold">-5kg</p>
            <p className="text-xs text-muted-foreground">Peso</p>
          </div>
          <div>
            <p className="text-2xl font-heading text-primary font-bold">-8cm</p>
            <p className="text-xs text-muted-foreground">Cintura</p>
          </div>
          <div>
            <p className="text-2xl font-heading text-primary font-bold">+3cm</p>
            <p className="text-xs text-muted-foreground">Glúteo</p>
          </div>
        </div>
      </div>
    </div>
    <div className="px-4 pb-8 flex gap-3">
      <Button variant="outline" onClick={onBack} className="border-border text-foreground h-12 rounded-2xl px-4">
        <ChevronLeft size={18} />
      </Button>
      <Button onClick={onNext} className="flex-1 pink-gradient text-primary-foreground font-heading h-12 rounded-2xl shadow-lg">
        Continuar <ChevronRight size={18} className="ml-1" />
      </Button>
    </div>
  </div>
);

// ─── Gráfico Previsão Screen ────────────────────────────────────
const GraficoPrevisaoScreen = ({ onNext, onBack, currentIndex, totalSteps, data }: any) => {
  const pesoAtual = parseFloat(data.peso_atual) || 70;
  const metaPeso = parseFloat(data.meta_peso) || 60;
  const diff = metaPeso - pesoAtual;
  const absDiff = Math.abs(diff);
  const isGain = diff > 0;

  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + 12 * 7);
  const months = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
  const targetLabel = `${months[targetDate.getMonth()]} ${targetDate.getDate()}`;

  // SVG dimensions
  const w = 360, h = 240, pad = 20;
  const chartW = w - pad * 2;
  const chartH = h - pad * 2;

  // Normalize Y: map peso to SVG y coordinate
  const minP = Math.min(pesoAtual, metaPeso);
  const maxP = Math.max(pesoAtual, metaPeso);
  const range = maxP - minP || 1;
  const yOf = (peso: number) => pad + chartH - ((peso - minP + range * 0.15) / (range * 1.3)) * chartH;

  // S-curve points
  const pts = 50;
  const points = Array.from({ length: pts + 1 }, (_, i) => {
    const t = i / pts;
    const s = 1 / (1 + Math.exp(-12 * (t - 0.45)));
    const peso = pesoAtual + diff * s;
    const x = pad + t * chartW;
    const y = yOf(peso);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${pad + chartW},${h} L${pad},${h} Z`;

  const startPt = points[0];
  const endPt = points[pts];

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-2">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full pink-gradient rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }} />
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-muted-foreground text-base mb-1 animate-[fade-in_0.4s_ease-out_both]">Isso é totalmente realizável!</p>
        <h2 className="text-3xl font-heading text-foreground mb-6 animate-[fade-in_0.5s_ease-out_0.1s_both]">
          {isGain ? "Ganhe" : "Perca"} <span className="text-primary">{absDiff.toFixed(0)} kg</span> até <span className="text-primary">{targetLabel}</span>
        </h2>

        <div className="w-full animate-[fade-in_0.5s_ease-out_0.3s_both]">

          {/* SVG Chart */}
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 220 }}>
            <defs>
              <linearGradient id="curveGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(210 70% 55%)" />
              </linearGradient>
              <linearGradient id="fillGrad" x1="0" y1="0" x2="0.5" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                <stop offset="100%" stopColor="hsl(210 70% 55%)" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#fillGrad)" />
            <path d={linePath} fill="none" stroke="url(#curveGrad)" strokeWidth="3" strokeLinecap="round" />
            {/* Start dot */}
            <circle cx={startPt.x} cy={startPt.y} r="6" fill="hsl(var(--primary))" />
            <circle cx={startPt.x} cy={startPt.y} r="3" fill="hsl(var(--background))" />
            {/* End dot */}
            <circle cx={endPt.x} cy={endPt.y} r="6" fill="hsl(210 70% 55%)" />
            <circle cx={endPt.x} cy={endPt.y} r="3" fill="hsl(var(--background))" />
          </svg>

          {/* Labels */}
          <div className="flex justify-between px-1 mt-1">
            <div className="text-left">
              <p className="text-sm font-bold text-foreground">{pesoAtual} kg</p>
              <p className="text-xs text-muted-foreground">Hoje</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-green-500">{metaPeso} kg</p>
              <p className="text-xs text-muted-foreground">{targetLabel}</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-6 leading-relaxed animate-[fade-in_0.5s_ease-out_0.5s_both]">
          Nós previmos essa data-alvo com base no progresso de <strong className="text-foreground">60,000 usuárias</strong> como você.
        </p>
      </div>
      <div className="px-4 pb-8 flex gap-3">
        <Button variant="outline" onClick={onBack} className="border-border text-foreground h-12 rounded-2xl px-4">
          <ChevronLeft size={18} />
        </Button>
        <Button onClick={onNext} className="flex-1 pink-gradient text-primary-foreground font-heading h-12 rounded-2xl shadow-lg">
          Continuar <ChevronRight size={18} className="ml-1" />
        </Button>
      </div>
    </div>
  );
};

// ─── Análise IA Screen ──────────────────────────────────────────
const AnaliseIAScreen = ({ onNext, saving }: { onNext: () => void; saving: boolean }) => {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);

  const steps = [
    "Analisando seu perfil corporal...",
    "Cruzando com o método Gilvan...",
    "Selecionando exercícios ideais...",
    "Montando seus Tri-sets personalizados...",
    "Seu plano está pronto! 🦁",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 2;
      });
    }, 80);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const newStep = Math.min(Math.floor(progress / 20), steps.length - 1);
    setStep(newStep);
  }, [progress]);

  useEffect(() => {
    if (progress >= 100) {
      const timeout = setTimeout(onNext, 1500);
      return () => clearTimeout(timeout);
    }
  }, [progress, onNext]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 max-w-lg mx-auto">
      <div className="w-24 h-24 rounded-full pink-gradient flex items-center justify-center mb-8 shadow-lg animate-pulse">
        <Sparkles className="w-12 h-12 text-primary-foreground" />
      </div>
      <h2 className="text-2xl font-heading text-foreground mb-2 text-center">
        {steps[step]}
      </h2>
      <p className="text-sm text-muted-foreground mb-8 text-center">
        Inteligência Artificial analisando seus dados
      </p>
      <div className="w-full max-w-xs h-3 bg-secondary rounded-full overflow-hidden mb-4">
        <div className="h-full pink-gradient rounded-full transition-all duration-200"
          style={{ width: `${progress}%` }} />
      </div>
      <p className="text-sm text-primary font-heading font-bold">{progress}%</p>
    </div>
  );
};

// ─── Boas-vindas Screen ─────────────────────────────────────────
const BoasVindasScreen = ({ onNext }: { onNext: () => void }) => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 max-w-lg mx-auto overflow-hidden">
    <div className="flex-1 flex flex-col items-center justify-center">
      <img
        src={logoLeoa}
        alt="Fábrica de Leoas"
        className="w-32 h-32 mb-8 drop-shadow-[0_0_25px_hsl(var(--primary)/0.4)] animate-[scale-in_0.8s_ease-out_both]"
      />
      <h1 className="text-3xl font-heading text-primary mb-4 text-center animate-[fade-in_0.7s_ease-out_0.4s_both]">
        Bem-vinda, Leoa!
      </h1>
      <p className="text-base text-muted-foreground text-center max-w-xs leading-relaxed animate-[fade-in_0.7s_ease-out_0.7s_both]">
        Vou fazer algumas perguntas rápidas para montar o seu <span className="text-primary font-semibold">Protocolo personalizado</span> de treino em casa.
      </p>
    </div>
    <div className="w-full pb-8 animate-[fade-in_0.6s_ease-out_1.1s_both]">
      <Button onClick={onNext}
        className="w-full pink-gradient text-primary-foreground font-heading h-14 rounded-2xl text-lg shadow-lg uppercase tracking-wide hover-scale">
        COMEÇAR AGORA
      </Button>
    </div>
  </div>
);

// ─── Validation ─────────────────────────────────────────────────
function validateStep(step: OnboardingStep, data: any): boolean {
  switch (step) {
    case "boas-vindas": return true;
    case "motivacao": return data.motivacao.length > 0;
    case "objetivo": return data.goal !== "";
    case "area-alvo": return data.targetArea.length > 0;
    case "corpo-atual": return data.corpo_atual !== "";
    case "corpo-desejado": return data.corpo_desejado !== "";
    case "altura": return data.altura !== "";
    case "peso": return data.peso_atual !== "";
    case "meta": return data.meta_peso !== "";
    case "tipo-barriga": return data.tipo_barriga !== "";
    case "tipo-quadril": return data.tipo_quadril !== "";
    case "tipo-perna": return data.tipo_perna !== "";
    case "transformacao": return true;
    case "idade": return data.idade !== "";
    
    case "equipamentos": return data.equipment !== "";
    case "dificuldade": return data.dificuldade !== "";
    case "momento": return data.trainingExperience !== "";
    case "frequencia": return data.workoutDays >= 2;
    case "tempo": return data.workoutDuration !== "";
    case "dores": return data.hasPain !== null;
    case "local-dor": return data.painLocation.length > 0;
    case "beneficios": return true;
    case "rotina": return data.rotina !== "";
    case "flexibilidade": return data.flexibilidade !== "";
    case "medicacao": return data.usesMedication !== null;
    case "resultado-visual":
    case "grafico-previsao":
    case "analise-ia":
    case "psicologico":
    case "celebracao":
      return true;
    default: return true;
  }
}

export default Onboarding;
