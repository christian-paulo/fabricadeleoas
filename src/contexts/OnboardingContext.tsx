import { createContext, useContext, useState, ReactNode } from "react";

export type OnboardingData = {
  // Psychological / engagement
  motivacao: string;
  corpo_atual: string;
  corpo_desejado: string;
  altura: string;
  peso_atual: string;
  meta_peso: string;
  biotipo: string;
  idade: string;
  local_treino: string;
  dificuldade: string;
  rotina: string;
  flexibilidade: string;
  psicologico: string[];
  celebracao: string;

  // Structural (saved to profiles)
  goal: string;
  targetArea: string[];
  equipment: string;
  trainingExperience: string;
  workoutDays: number;
  workoutDuration: string;
  hasPain: boolean | null;
  painLocation: string[];
  usesMedication: boolean | null;
  medicationFeeling: string;
};

const initialData: OnboardingData = {
  motivacao: "",
  corpo_atual: "",
  corpo_desejado: "",
  altura: "",
  peso_atual: "",
  meta_peso: "",
  biotipo: "",
  idade: "",
  local_treino: "",
  dificuldade: "",
  rotina: "",
  flexibilidade: "",
  psicologico: [],
  celebracao: "",
  goal: "",
  targetArea: [],
  equipment: "",
  trainingExperience: "",
  workoutDays: 3,
  workoutDuration: "",
  hasPain: null,
  painLocation: [],
  usesMedication: null,
  medicationFeeling: "",
};

type OnboardingContextType = {
  data: OnboardingData;
  setData: (d: OnboardingData) => void;
  updateField: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const ONBOARDING_STEPS = [
  "motivacao",
  "objetivo",
  "area-alvo",
  "corpo-atual",
  "corpo-desejado",
  "medidas",
  "meta",
  "biotipo",
  "idade",
  "local",
  "equipamentos",
  "dificuldade",
  "momento",
  "frequencia",
  "resultado-visual",
  "tempo",
  "grafico-previsao",
  "dores",
  "rotina",
  "flexibilidade",
  "medicacao",
  "psicologico",
  "celebracao",
  "analise-ia",
] as const;

export type OnboardingStep = typeof ONBOARDING_STEPS[number];

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<OnboardingData>(initialData);

  const updateField = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <OnboardingContext.Provider value={{ data, setData, updateField }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error("useOnboarding must be used within OnboardingProvider");
  return context;
};
