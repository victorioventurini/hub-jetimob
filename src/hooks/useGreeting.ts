import { useMemo } from "react";

type PeriodOfDay = "morning" | "afternoon" | "night";
type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type Weather = "sunny" | "cloudy" | "rainy" | "unknown";

interface GreetingContext {
  userName?: string | null;
  userGender?: "male" | "female" | null;
  city?: string | null;
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

const getDayOfWeek = (): DayOfWeek => {
  const days: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return days[new Date().getDay()];
};

const isWeekend = (): boolean => {
  const day = new Date().getDay();
  return day === 0 || day === 6;
};

// Mock weather - in production this would come from an API
const getWeather = (): Weather => {
  const weathers: Weather[] = ["sunny", "cloudy", "rainy", "sunny", "cloudy"];
  return weathers[Math.floor(Math.random() * weathers.length)];
};

const periodGreetings: Record<PeriodOfDay, string> = {
  morning: "Bom dia",
  afternoon: "Boa tarde",
  night: "Boa noite",
};

const weatherEmojis: Record<Weather, string> = {
  sunny: "☀️",
  cloudy: "⛅",
  rainy: "🌧️",
  unknown: "",
};

const getRandomItem = <T>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

const buildGreeting = (
  period: PeriodOfDay,
  dayOfWeek: DayOfWeek,
  weekend: boolean,
  weather: Weather,
  userName?: string | null
): string => {
  const useBuenas = Math.random() > 0.6;
  const showWeatherEmoji = weather !== "unknown" && Math.random() > 0.5;
  const emoji = showWeatherEmoji ? ` ${weatherEmojis[weather]}` : "";
  
  if (useBuenas) {
    const bases = ["Buenas", "E aí", "Olá"];
    const base = getRandomItem(bases);
    return userName ? `${base}, ${userName}!${emoji}` : `${base}!${emoji}`;
  }
  
  const base = periodGreetings[period];
  return userName ? `${base}, ${userName}.${emoji}` : `${base}.${emoji}`;
};

const buildSubtext = (
  period: PeriodOfDay,
  dayOfWeek: DayOfWeek,
  weekend: boolean,
  weather: Weather
): string => {
  // Context-aware subtexts
  const contextSubtexts: string[] = [];
  
  // Weather-based
  if (weather === "rainy") {
    contextSubtexts.push(
      "Dia bom pra focar.",
      "Chuva lá fora, foco aqui dentro.",
      "Clima perfeito pra produzir."
    );
  }
  
  // Day-based
  if (dayOfWeek === "mon") {
    contextSubtexts.push(
      "Semana nova, foco renovado.",
      "Segunda pede clareza.",
      "Começa bem, termina melhor."
    );
  } else if (dayOfWeek === "fri") {
    contextSubtexts.push(
      "Fecha bem a semana.",
      "Sexta pede fechamento.",
      "Arremata os pendentes."
    );
  } else if (dayOfWeek === "thu") {
    contextSubtexts.push(
      "Quinta pede ajuste fino.",
      "Reta final da semana.",
      "Hora de revisar prioridades."
    );
  } else if (dayOfWeek === "wed") {
    contextSubtexts.push(
      "Quarta: meio de campo.",
      "Metade do caminho. Segue firme.",
      "Ajusta o passo e segue."
    );
  }
  
  // Weekend
  if (weekend) {
    contextSubtexts.push(
      "Fim de semana, foco leve.",
      "Só o essencial.",
      "Descansa a mente também."
    );
  }
  
  // Period-based
  if (period === "morning") {
    contextSubtexts.push(
      "Manhã é pra clareza.",
      "Começa pelo que importa."
    );
  } else if (period === "night") {
    contextSubtexts.push(
      "Noite pede revisão leve.",
      "Fecha o dia com calma."
    );
  }
  
  // Generic fallbacks
  const genericSubtexts = [
    "Menos ruído. Mais clareza.",
    "Vamos ao que importa.",
    "Foco no que move a agulha.",
    "Clareza antes da execução.",
    "O essencial primeiro.",
    "Prioridade é tudo.",
  ];
  
  // Prefer contextual if available, otherwise use generic
  const pool = contextSubtexts.length > 0 
    ? [...contextSubtexts, ...genericSubtexts.slice(0, 2)] 
    : genericSubtexts;
  
  return getRandomItem(pool);
};

export const useGreeting = ({ userName, userGender, city }: GreetingContext): GreetingResult => {
  const result = useMemo(() => {
    const period = getPeriodOfDay();
    const dayOfWeek = getDayOfWeek();
    const weekend = isWeekend();
    const weather = getWeather();
    
    const greeting = buildGreeting(period, dayOfWeek, weekend, weather, userName);
    const subtext = buildSubtext(period, dayOfWeek, weekend, weather);
    
    return { greeting, subtext };
  }, [userName]);

  return result;
};
