import { useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, ChevronLeft, Sparkles, Heart, Flame, Target, Dumbbell, Brain, Clock, TrendingDown, Activity, Pill, Star, PartyPopper, Zap, Eye, HeartPulse, ThumbsUp, Ruler, Scale, Hourglass, Sofa, Footprints, StretchHorizontal, Wind } from "lucide-react";
import logoLeoa from "@/assets/logo-leoa.png";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useOnboarding, ONBOARDING_STEPS, type OnboardingStep } from "@/contexts/OnboardingContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

const Onboarding = () => {
  const { step } = useParams<{ step: string }>();
  const navigate = useNavigate();
  const { data, updateField } = useOnboarding();
  const { user } = useAuth();
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
      // Save all data then go to checkout
      await saveAllData();
      return;
    }
    const nextIndex = currentIndex + 1;
    if (nextIndex < totalSteps) {
      navigate(`/onboarding/${ONBOARDING_STEPS[nextIndex]}`);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      navigate(`/onboarding/${ONBOARDING_STEPS[currentIndex - 1]}`);
    }
  };

  const saveAllData = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Save structural data to profiles
      const { error: profileError } = await supabase.from("profiles").update({
        goal: data.goal,
        target_area: data.targetArea.join(", "),
        training_experience: data.trainingExperience,
        workout_days: data.workoutDays,
        workout_duration: data.workoutDuration === "10 min" ? 10 : 30,
        has_pain: data.hasPain || false,
        pain_location: data.painLocation.join(", "),
        uses_medication: data.usesMedication || false,
        medication_feeling: data.medicationFeeling,
        equipment: data.equipment,
      } as any).eq("id", user.id);
      if (profileError) throw profileError;

      // Save psychological data to onboarding_responses
      const { error: responseError } = await supabase.from("onboarding_responses" as any).upsert({
        profile_id: user.id,
        motivacao: data.motivacao,
        corpo_atual: data.corpo_atual,
        corpo_desejado: data.corpo_desejado,
        altura: data.altura ? parseFloat(data.altura) : null,
        peso_atual: data.peso_atual ? parseFloat(data.peso_atual) : null,
        meta_peso: data.meta_peso ? parseFloat(data.meta_peso) : null,
        biotipo: data.biotipo,
        idade: data.idade ? parseInt(data.idade) : null,
        local_treino: data.local_treino,
        dificuldade: data.dificuldade,
        rotina: data.rotina,
        flexibilidade: data.flexibilidade,
        psicologico: data.psicologico,
        celebracao: data.celebracao,
      } as any, { onConflict: "profile_id" } as any);
      if (responseError) throw responseError;

      navigate("/onboarding/checkout");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar dados");
    } finally {
      setSaving(false);
    }
  };

  if (currentIndex === -1) return null;

  // Special screens without standard navigation
  if (currentStep === "boas-vindas") return <BoasVindasScreen onNext={goNext} />;
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
    className={`soft-card w-full p-4 text-left text-sm transition-all flex items-center gap-3 animate-[fade-in_0.4s_ease-out_both] ${
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
          <p className="text-sm text-muted-foreground mb-6 animate-[fade-in_0.4s_ease-out_0.2s_both]">Escolha o que mais combina com o seu momento</p>
          <div className="space-y-3">
            {[
              { label: "Entrar em forma", icon: <Flame className="w-5 h-5" /> },
              { label: "Melhorar aparência", icon: <Eye className="w-5 h-5" /> },
              { label: "Cuidar da saúde", icon: <HeartPulse className="w-5 h-5" /> },
              { label: "Ter mais energia", icon: <Zap className="w-5 h-5" /> },
              { label: "Ganhar confiança", icon: <ThumbsUp className="w-5 h-5" /> },
            ].map((m, i) => (
              <OptionCard key={m.label} selected={data.motivacao === m.label} onClick={() => updateField("motivacao", m.label)} icon={m.icon} index={i}>{m.label}</OptionCard>
            ))}
          </div>
        </div>
      );

    case "objetivo":
      return (
        <div>
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
          <h2 className="text-2xl font-heading text-foreground mb-2 animate-[fade-in_0.4s_ease-out_both]">Em qual área quer focar?</h2>
          <p className="text-sm text-muted-foreground mb-6 animate-[fade-in_0.4s_ease-out_0.1s_both]">Selecione uma ou mais áreas</p>
          <div className="space-y-4">
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
                  className={`w-full rounded-2xl overflow-hidden relative h-28 flex items-center transition-all duration-300 animate-[fade-in_0.4s_ease-out_both] ${
                    selected 
                      ? "ring-2 ring-primary bg-primary/10 scale-[1.02]" 
                      : "bg-secondary/50 hover:bg-secondary/80"
                  }`}
                  style={{ animationDelay: `${i * 100}ms` }}>
                  <span className={`relative z-10 pl-5 text-xl font-bold leading-tight whitespace-pre-line text-left ${
                    selected ? "text-primary" : "text-foreground"
                  }`}>{a.label}</span>
                  <img src={a.img} alt={a.value} className="absolute right-0 top-0 h-full w-1/2 object-cover object-center" />
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

    case "corpo-desejado":
      return (
        <div>
          <h2 className="text-2xl text-foreground mb-2 animate-[fade-in_0.4s_ease-out_both]">Qual é o seu corpo desejado?</h2>
          <p className="text-sm text-muted-foreground mb-6 animate-[fade-in_0.4s_ease-out_0.1s_both]">Onde gostaria de chegar?</p>
          <div className="space-y-3">
            {["Definida e seca", "Tonificada com curvas", "Atlética", "Saudável e funcional"].map((c, i) => (
              <OptionCard key={c} selected={data.corpo_desejado === c} onClick={() => updateField("corpo_desejado", c)} index={i}>{c}</OptionCard>
            ))}
          </div>
        </div>
      );

    case "medidas":
      return (
        <div>
          <h2 className="text-2xl text-foreground mb-2">Altura e Peso Atual</h2>
          <p className="text-sm text-muted-foreground mb-6">Precisamos desses dados para calcular sua evolução</p>
          <div className="space-y-4">
            <div className="soft-card p-4">
              <label className="text-sm text-muted-foreground font-medium mb-2 block">Altura (cm)</label>
              <Input type="number" value={data.altura} onChange={(e) => updateField("altura", e.target.value)}
                placeholder="165" className="bg-background border-border text-foreground h-12 text-lg" />
            </div>
            <div className="soft-card p-4">
              <label className="text-sm text-muted-foreground font-medium mb-2 block">Peso Atual (kg)</label>
              <Input type="number" value={data.peso_atual} onChange={(e) => updateField("peso_atual", e.target.value)}
                placeholder="70" className="bg-background border-border text-foreground h-12 text-lg" />
            </div>
          </div>
        </div>
      );

    case "meta":
      return (
        <div>
          <h2 className="text-2xl text-foreground mb-2">Qual a sua meta de peso?</h2>
          <p className="text-sm text-muted-foreground mb-6">Seu objetivo em quilos</p>
          <div className="soft-card p-4">
            <label className="text-sm text-muted-foreground font-medium mb-2 block">Meta de Peso (kg)</label>
            <Input type="number" value={data.meta_peso} onChange={(e) => updateField("meta_peso", e.target.value)}
              placeholder="60" className="bg-background border-border text-foreground h-12 text-lg" />
          </div>
          {data.peso_atual && data.meta_peso && (
            <div className="soft-card p-4 mt-4 text-center">
              <p className="text-sm text-muted-foreground">Diferença</p>
              <p className="text-3xl font-heading text-primary font-bold">
                {Math.abs(parseFloat(data.peso_atual) - parseFloat(data.meta_peso)).toFixed(1)} kg
              </p>
            </div>
          )}
        </div>
      );

    case "biotipo":
      return (
        <div>
          <h2 className="text-2xl text-foreground mb-2">Qual tipo de corpo mais combina consigo?</h2>
          <p className="text-sm text-muted-foreground mb-6">Ajuda-nos a personalizar o protocolo</p>
          <div className="space-y-3">
            {["Ampulheta", "Retangular", "Triângulo", "Triângulo invertido", "Oval"].map((b, i) => (
              <OptionCard key={b} selected={data.biotipo === b} onClick={() => updateField("biotipo", b)} index={i}>{b}</OptionCard>
            ))}
          </div>
        </div>
      );

    case "idade":
      return (
        <div>
          <h2 className="text-2xl text-foreground mb-2">Qual é a sua idade?</h2>
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
          <h2 className="text-2xl text-foreground mb-2">Qual o tipo de protocolo?</h2>
          <p className="text-sm text-muted-foreground mb-6">Defina os equipamentos disponíveis</p>
          <div className="space-y-3">
            {[
              { val: "Sem equipamento", icon: "🙌", desc: "Apenas peso corporal" },
              { val: "Halteres e elásticos", icon: "💪", desc: "Equipamento básico em casa" },
              { val: "Academia completa", icon: "🏋️", desc: "Acesso a máquinas e aparelhos" },
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
              { val: "Nunca treinei", desc: "Estou começando do zero" },
              { val: "Retomando", desc: "Já treinei mas parei faz tempo" },
              { val: "Treino com frequência", desc: "Pratico regularmente há meses" },
              { val: "Avançada", desc: "Pratico há mais de 2 anos" },
            ].map((e, i) => (
              <OptionCard key={e.val} selected={data.trainingExperience === e.val} onClick={() => updateField("trainingExperience", e.val)} index={i}>
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
          <h2 className="text-2xl text-foreground mb-2">Quantos dias na semana?</h2>
          <p className="text-sm text-muted-foreground mb-6">Quantos dias você pode treinar?</p>
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
          <h2 className="text-2xl text-foreground mb-2">Quanto tempo por dia?</h2>
          <p className="text-sm text-muted-foreground mb-6">Para alcançar esses resultados</p>
          <div className="flex gap-4 justify-center mt-8">
            {["10 min", "30 min"].map((d) => (
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
          {data.hasPain && (
            <div className="space-y-3 mt-4">
              <p className="text-sm text-muted-foreground mb-2">Onde sente dor?</p>
              <div className="grid grid-cols-2 gap-3">
                {["Nenhum", "Lombar", "Joelho", "Ombro", "Cervical", "Quadril", "Tornozelo", "Cotovelo"].map((p) => {
                  const selected = data.painLocation.includes(p);
                  return (
                    <OptionCard key={p} selected={selected}
                      onClick={() => updateField("painLocation", selected ? data.painLocation.filter((x: string) => x !== p) : [...data.painLocation, p])}>
                      {p}
                    </OptionCard>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );

    case "rotina":
      return (
        <div>
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
              "Me sinto insatisfeita no espelho",
              "Começo e desisto fácil",
              "Não tenho motivação para me exercitar",
              "Tenho vergonha do meu corpo",
              "Quero recuperar minha autoestima",
              "Quero ser exemplo para minha família",
            ].map((p, i) => {
              const selected = data.psicologico.includes(p);
              return (
                <OptionCard key={p} selected={selected} index={i}
                  onClick={() => updateField("psicologico", selected ? data.psicologico.filter((x: string) => x !== p) : [...data.psicologico, p])}>
                  {p}
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
  const pesoAtual = parseFloat(data.peso_atual) || 75;
  const metaPeso = parseFloat(data.meta_peso) || 65;
  const diff = pesoAtual - metaPeso;
  const chartData = [0, 2, 4, 6, 8, 10, 12].map((w) => ({
    semana: `Sem ${w}`,
    peso: parseFloat((pesoAtual - diff * (1 - Math.pow(1 - w / 12, 1.3))).toFixed(1)),
  }));

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-2">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full pink-gradient rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }} />
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <TrendingDown className="w-10 h-10 text-primary mb-4" />
        <h2 className="text-2xl font-heading text-foreground mb-2">Sua previsão de resultado</h2>
        <p className="text-sm text-muted-foreground mb-8">Com base nos seus dados e no método Gilvan</p>

        <div className="soft-card p-4 w-full mb-6">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
              <XAxis dataKey="semana" tick={{ fill: "hsl(0 0% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[Math.floor(metaPeso - 2), Math.ceil(pesoAtual + 2)]} tick={{ fill: "hsl(0 0% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} unit="kg" />
              <Tooltip
                contentStyle={{ background: "hsl(0 0% 13%)", border: "1px solid hsl(0 0% 20%)", borderRadius: "12px", color: "hsl(43 30% 90%)" }}
                formatter={(value: number) => [`${value}kg`, "Peso"]}
              />
              <Line type="monotone" dataKey="peso" stroke="hsl(43 76% 52%)" strokeWidth={3} dot={{ fill: "hsl(43 76% 52%)", r: 5, strokeWidth: 0 }} activeDot={{ r: 7, fill: "hsl(43 80% 60%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex gap-3 w-full mb-4">
          <div className="soft-card p-4 flex-1 text-center">
            <p className="text-xs text-muted-foreground">Peso atual</p>
            <p className="text-lg font-heading text-foreground font-bold">{pesoAtual}kg</p>
          </div>
          <div className="soft-card p-4 flex-1 text-center">
            <p className="text-xs text-muted-foreground">Meta</p>
            <p className="text-lg font-heading text-primary font-bold">{metaPeso}kg</p>
          </div>
        </div>

        <div className="soft-card p-4 w-full text-center">
          <p className="text-xs text-muted-foreground">Meta estimada em</p>
          <p className="text-xl font-heading text-primary font-bold">12 semanas</p>
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
    case "motivacao": return data.motivacao !== "";
    case "objetivo": return data.goal !== "";
    case "area-alvo": return data.targetArea.length > 0;
    case "corpo-atual": return data.corpo_atual !== "";
    case "corpo-desejado": return data.corpo_desejado !== "";
    case "medidas": return data.altura !== "" && data.peso_atual !== "";
    case "meta": return data.meta_peso !== "";
    case "biotipo": return data.biotipo !== "";
    case "idade": return data.idade !== "";
    
    case "equipamentos": return data.equipment !== "";
    case "dificuldade": return data.dificuldade !== "";
    case "momento": return data.trainingExperience !== "";
    case "frequencia": return data.workoutDays >= 2;
    case "tempo": return data.workoutDuration !== "";
    case "dores": return data.hasPain !== null;
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
