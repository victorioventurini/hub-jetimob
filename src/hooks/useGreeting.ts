import { useMemo } from "react";

type PeriodOfDay = "morning" | "afternoon" | "night";

interface GreetingContext {
  userName?: string | null;
}

interface GreetingResult {
  greeting: string;
  subtext: string;
}

const getPeriodOfDay = (): PeriodOfDay => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "night";
};

const periodGreetings: Record<PeriodOfDay, string> = {
  morning: "Bom dia",
  afternoon: "Boa tarde",
  night: "Boa noite",
};

const buenasGreetings = [
  "Buenas",
  "E aí",
  "Olá",
];

const subtexts = [
  "Menos ruído. Mais clareza.",
  "Vamos ao que importa.",
  "Foco no que move a agulha.",
  "Clareza antes da execução.",
  "Bora fazer acontecer.",
  "O essencial primeiro.",
];

const getRandomItem = <T>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

export const useGreeting = ({ userName }: GreetingContext): GreetingResult => {
  const result = useMemo(() => {
    const period = getPeriodOfDay();
    const useBuenas = Math.random() > 0.5;
    
    let greeting: string;
    
    if (useBuenas) {
      const base = getRandomItem(buenasGreetings);
      greeting = userName ? `${base}, ${userName}!` : `${base}!`;
    } else {
      const base = periodGreetings[period];
      greeting = userName ? `${base}, ${userName}.` : `${base}.`;
    }
    
    const subtext = getRandomItem(subtexts);
    
    return { greeting, subtext };
  }, [userName]);

  return result;
};
