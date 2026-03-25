import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type QuizData = {
  goal: string;
  targetArea: string[];
  trainingExperience: string;
  workoutDays: number;
  workoutDuration: string;
  hasPain: boolean | null;
  painLocation: string[];
  usesMedication: boolean | null;
  medicationFeeling: string;
};

const initialData: QuizData = {
  goal: "", targetArea: [], trainingExperience: "",
  workoutDays: 3, workoutDuration: "", hasPain: null, painLocation: [],
  usesMedication: null, medicationFeeling: "",
};

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<QuizData>(initialData);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const totalSteps = getStepCount(data);

  const saveAndProceed = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: profile?.full_name,
        goal: data.goal,
        target_area: data.targetArea.join(", "),
        training_experience: data.trainingExperience,
        workout_days: data.workoutDays,
        workout_duration: data.workoutDuration === "10 min" ? 10 : 30,
        has_pain: data.hasPain || false,
        pain_location: data.painLocation.join(", "),
        uses_medication: data.usesMedication || false,
        medication_feeling: data.medicationFeeling,
        onboarding_completed: true,
      }).eq("id", user.id);

      if (error) throw error;
      await refreshProfile();

      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar perfil");
      setSaving(false);
    }
  };

  const next = () => {
    if (step < totalSteps - 1) setStep(step + 1);
    else saveAndProceed();
  };

  const back = () => { if (step > 0) setStep(step - 1); };
  const canProceed = validateStep(step, data);

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-heading">DNA DA LEOA</span>
          <span className="text-xs text-primary font-heading">{step + 1}/{totalSteps}</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full gold-gradient rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
        </div>
      </div>

      <div className="flex-1 px-4 pt-8 pb-4">{renderStep(step, data, setData)}</div>

      <div className="px-4 pb-8 flex gap-3">
        {step > 0 && (
          <Button variant="outline" onClick={back} className="border-border text-foreground h-12 rounded-xl px-4">
            <ChevronLeft size={18} />
          </Button>
        )}
        <Button onClick={next} disabled={!canProceed || saving}
          className="flex-1 gold-gradient text-primary-foreground font-heading h-12 rounded-xl disabled:opacity-40">
          {saving ? "Salvando..." : step === totalSteps - 1 ? "Começar! 🦁" : "Continuar"}
          {step < totalSteps - 1 && !saving && <ChevronRight size={18} className="ml-1" />}
        </Button>
      </div>
    </div>
  );
};

function getStepCount(data: QuizData): number {
  let count = 5;
  if (data.goal !== "Melhorar Dores") count++;
  if (data.hasPain) count++;
  count++;
  if (data.usesMedication) count++;
  return count;
}

function validateStep(step: number, data: QuizData): boolean {
  switch (step) {
    case 0: return data.goal !== "";
    case 1: return data.targetArea.length > 0;
    case 2: return data.trainingExperience !== "";
    case 3: return data.workoutDays >= 2 && data.workoutDays <= 5;
    case 4: return data.workoutDuration !== "";
    default: return true;
  }
}

function renderStep(step: number, data: QuizData, setData: (d: QuizData) => void) {
  const steps = buildSteps(data, setData);
  return steps[step] || null;
}

function buildSteps(data: QuizData, setData: (d: QuizData) => void) {
  const steps: JSX.Element[] = [];

  const goals = ["Emagrecimento", "Ganho de Massa", "Saúde", "Melhorar Dores"];
  steps.push(
    <div key="goal">
      <h2 className="text-2xl text-foreground mb-2">Qual seu objetivo?</h2>
      <p className="text-sm text-muted-foreground mb-6">Escolha o que mais combina com você</p>
      <div className="space-y-3">
        {goals.map((g) => (
          <button key={g} onClick={() => setData({ ...data, goal: g })}
            className={`neu-card w-full p-4 text-left text-sm transition-all ${data.goal === g ? "ring-2 ring-primary text-primary" : "text-foreground"}`}>
            {g}
          </button>
        ))}
      </div>
    </div>
  );

  const areas = ["Pochete", "Braço Merendeira", "Bumbum Caído", "Coxa de Amoeba", "Flancos"];
  steps.push(
    <div key="areas">
      <h2 className="text-2xl text-foreground mb-2">Áreas Alvo 🎯</h2>
      <p className="text-sm text-muted-foreground mb-6">Selecione uma ou mais áreas</p>
      <div className="space-y-3">
        {areas.map((a) => {
          const selected = data.targetArea.includes(a);
          return (
            <button key={a} onClick={() => setData({ ...data, targetArea: selected ? data.targetArea.filter((x) => x !== a) : [...data.targetArea, a] })}
              className={`neu-card w-full p-4 text-left text-sm transition-all ${selected ? "ring-2 ring-primary text-primary" : "text-foreground"}`}>
              {a}
            </button>
          );
        })}
      </div>
    </div>
  );

  const expOptions = ["Nunca treinei", "Até 6 meses", "1 a 2 anos", "Mais de 2 anos"];
  steps.push(
    <div key="exp">
      <h2 className="text-2xl text-foreground mb-2">Há quanto tempo treina?</h2>
      <p className="text-sm text-muted-foreground mb-6">Queremos entender seu nível</p>
      <div className="space-y-3">
        {expOptions.map((e) => (
          <button key={e} onClick={() => setData({ ...data, trainingExperience: e })}
            className={`neu-card w-full p-4 text-left text-sm transition-all ${data.trainingExperience === e ? "ring-2 ring-primary text-primary" : "text-foreground"}`}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );

  steps.push(
    <div key="days">
      <h2 className="text-2xl text-foreground mb-2">Dias disponíveis na semana</h2>
      <p className="text-sm text-muted-foreground mb-6">Quantos dias você pode treinar?</p>
      <div className="flex gap-3 justify-center">
        {[2, 3, 4, 5].map((d) => (
          <button key={d} onClick={() => setData({ ...data, workoutDays: d })}
            className={`w-14 h-14 rounded-xl font-heading text-lg transition-all ${data.workoutDays === d ? "gold-gradient text-primary-foreground gold-glow" : "neu-card text-foreground"}`}>
            {d}
          </button>
        ))}
      </div>
    </div>
  );

  const durations = ["10 min", "30 min"];
  steps.push(
    <div key="duration">
      <h2 className="text-2xl text-foreground mb-2">Tempo por treino</h2>
      <p className="text-sm text-muted-foreground mb-6">Quanto tempo você tem por dia?</p>
      <div className="flex gap-4 justify-center">
        {durations.map((d) => (
          <button key={d} onClick={() => setData({ ...data, workoutDuration: d })}
            className={`flex-1 max-w-[140px] h-20 rounded-xl font-heading text-lg transition-all ${data.workoutDuration === d ? "gold-gradient text-primary-foreground gold-glow" : "neu-card text-foreground"}`}>
            {d}
          </button>
        ))}
      </div>
    </div>
  );

  if (data.goal !== "Melhorar Dores") {
    steps.push(
      <div key="pain">
        <h2 className="text-2xl text-foreground mb-2">Possui dores ou restrição médica?</h2>
        <p className="text-sm text-muted-foreground mb-6">Precisamos saber para sua segurança</p>
        <div className="flex gap-4 justify-center">
          {[{ val: true, label: "Sim" }, { val: false, label: "Não" }].map((opt) => (
            <button key={String(opt.val)} onClick={() => setData({ ...data, hasPain: opt.val, painLocation: opt.val ? data.painLocation : [] })}
              className={`flex-1 max-w-[140px] h-16 rounded-xl font-heading transition-all ${data.hasPain === opt.val ? "gold-gradient text-primary-foreground gold-glow" : "neu-card text-foreground"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );

    if (data.hasPain) {
      const painAreas = ["Cervical", "Torácica", "Lombar", "Ombros", "Cotovelo/Punho", "Quadril", "Joelho", "Tornozelo"];
      steps.push(
        <div key="painLoc">
          <h2 className="text-2xl text-foreground mb-2">Onde sente dor?</h2>
          <p className="text-sm text-muted-foreground mb-6">Selecione as regiões</p>
          <div className="grid grid-cols-2 gap-3">
            {painAreas.map((p) => {
              const selected = data.painLocation.includes(p);
              return (
                <button key={p} onClick={() => setData({ ...data, painLocation: selected ? data.painLocation.filter((x) => x !== p) : [...data.painLocation, p] })}
                  className={`neu-card p-3 text-sm text-left transition-all ${selected ? "ring-2 ring-accent text-accent" : "text-foreground"}`}>
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
  }

  steps.push(
    <div key="med">
      <h2 className="text-2xl text-foreground mb-2">Utiliza medicações?</h2>
      <p className="text-sm text-muted-foreground mb-6">Ozempic, Mounjaro, Antidepressivos...</p>
      <div className="flex gap-4 justify-center">
        {[{ val: true, label: "Sim" }, { val: false, label: "Não" }].map((opt) => (
          <button key={String(opt.val)} onClick={() => setData({ ...data, usesMedication: opt.val })}
            className={`flex-1 max-w-[140px] h-16 rounded-xl font-heading transition-all ${data.usesMedication === opt.val ? "gold-gradient text-primary-foreground gold-glow" : "neu-card text-foreground"}`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (data.usesMedication) {
    steps.push(
      <div key="medFeel">
        <h2 className="text-2xl text-foreground mb-2">Como se sente no dia a dia?</h2>
        <p className="text-sm text-muted-foreground mb-6">Descreva como a medicação te afeta</p>
        <textarea value={data.medicationFeeling} onChange={(e) => setData({ ...data, medicationFeeling: e.target.value })}
          placeholder="Ex: Sinto enjoo pela manhã, mas à tarde me sinto bem..."
          className="w-full h-32 bg-input border border-border rounded-xl p-4 text-sm text-foreground resize-none focus:ring-2 focus:ring-primary outline-none" />
      </div>
    );
  }

  return steps;
}

export default Onboarding;
