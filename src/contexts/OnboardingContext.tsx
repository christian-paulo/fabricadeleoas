import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type OnboardingData = {
  // Psychological / engagement
  motivacao: string[];
  corpo_atual: string;
  corpo_desejado: string;
  altura: string;
  peso_atual: string;
  meta_peso: string;
  tipo_barriga: string;
  tipo_quadril: string;
  tipo_perna: string;
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
  motivacao: [],
  corpo_atual: "",
  corpo_desejado: "",
  altura: "",
  peso_atual: "",
  meta_peso: "",
  tipo_barriga: "",
  tipo_quadril: "",
  tipo_perna: "",
  idade: "",
  local_treino: "Casa",
  dificuldade: "",
  rotina: "",
  flexibilidade: "",
  psicologico: [],
  celebracao: "",
  goal: [],
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
  "boas-vindas",
  "motivacao",
  "objetivo",
  "area-alvo",
  "corpo-atual",
  "corpo-desejado",
  "altura",
  "peso",
  "meta",
  "tipo-barriga",
  "tipo-quadril",
  "tipo-perna",
  "transformacao",
  "grafico-previsao",
  "idade",
  "equipamentos",
  "dificuldade",
  "frequencia",
  "tempo",
  "momento",
  "resultado-visual",
  "dores",
  "local-dor",
  "beneficios",
  "rotina",
  "flexibilidade",
  "medicacao",
  "psicologico",
  "celebracao",
  "analise-ia",
] as const;

export type OnboardingStep = typeof ONBOARDING_STEPS[number];

const STORAGE_KEY = "onboarding_data";

const loadFromStorage = (): OnboardingData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...initialData, ...JSON.parse(stored) };
  } catch {}
  return initialData;
};

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<OnboardingData>(loadFromStorage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

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
