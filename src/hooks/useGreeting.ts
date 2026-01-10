import { useMemo } from "react";

type PeriodOfDay = "morning" | "afternoon" | "night";
type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type Weather = "sunny" | "cloudy" | "rainy" | "unknown";

type UserProfile = "executive" | "leader" | "collaborator" | "external";

interface GreetingContext {
  userName?: string | null;
  userGender?: "male" | "female" | null;
  profile?: UserProfile;
  buName?: string;
  teamName?: string;
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

const periodGreetings: Record<PeriodOfDay, string> = {
  morning: "Bom dia",
  afternoon: "Boa tarde",
  night: "Boa noite",
};

const weatherEmojis: Record<Weather, string> = {
  sunny: "☀️",
  cloudy: "🌥️",
  rainy: "🌧️",
  unknown: "",
};

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const buildGreeting = (
  period: PeriodOfDay,
  dayOfWeek: DayOfWeek,
  weather: Weather,
  userName?: string | null
): string => {
  // IMPORTANT: Always use first name only for greetings
  // Nobody says "Olá, Nome Sobrenome" - it's always "Olá, Nome"
  const firstName = userName?.split(' ')[0];
  
  const useBuenas = Math.random() > 0.5;
  const showEmoji = weather !== "unknown" && Math.random() > 0.6;
  const emoji = showEmoji ? ` ${weatherEmojis[weather]}` : "";
  
  // Variações com "Buenas"
  if (useBuenas) {
    if (firstName) {
      return `Buenas, ${firstName}!${emoji}`;
    }
    // Buenas com contexto de dia
    if (dayOfWeek === "fri") return `Buenas! Sextou.${emoji}`;
    if (dayOfWeek === "thu") return `Buenas! Quinta-feira já tá aí.${emoji}`;
    return `Buenas!${emoji}`;
  }
  
  // Saudação por período
  const base = periodGreetings[period];
  if (firstName) {
    return `${base}, ${firstName}.${emoji}`;
  }
  return `${base}.${emoji}`;
};

const buildSubtext = (
  period: PeriodOfDay,
  dayOfWeek: DayOfWeek,
  weekend: boolean,
  weather: Weather,
  profile?: UserProfile,
  buName?: string,
  teamName?: string
): string => {
  // Profile-specific subtexts (contextual)
  if (profile === "executive" && buName) {
    const executiveOptions = [
      `Visão estratégica da ${buName}`,
      `Acompanhe os resultados da ${buName}`,
      `Saúde estratégica da ${buName}`,
    ];
    return pick(executiveOptions);
  }
  
  if (profile === "leader" && teamName) {
    const leaderOptions = [
      `Acompanhamento do seu time`,
      `Gestão de ${teamName}`,
      `Seu time em destaque`,
    ];
    return pick(leaderOptions);
  }
  
  if (profile === "external") {
    return "Acompanhe suas demandas";
  }
  
  // Collaborator - "Seu dia no Hub"
  if (profile === "collaborator") {
    const collaboratorOptions = [
      "Seu dia no Hub",
      "Vamos ao que importa",
      "Foco no que move a agulha",
    ];
    return pick(collaboratorOptions);
  }
  
  // Default pool contextual (fallback)
  const options: string[] = [];
  
  // Clima
  if (weather === "rainy") {
    options.push("Chuva lá fora, clareza aqui.", "Dia bom pra focar.");
  }
  if (weather === "sunny") {
    options.push("Dia claro, mente clara.");
  }
  
  // Dia da semana
  if (dayOfWeek === "mon") {
    options.push("Semana nova, foco renovado.", "Começa pelo que importa.");
  }
  if (dayOfWeek === "tue" || dayOfWeek === "wed") {
    options.push("Semana andando, ritmo certo.", "Foco no que move.");
  }
  if (dayOfWeek === "thu") {
    options.push("Reta final chegando.", "Ajusta o passo.");
  }
  if (dayOfWeek === "fri") {
    options.push("Fecha bem a semana.", "Arremata os pendentes.");
  }
  
  // Fim de semana
  if (weekend) {
    options.push("Só o essencial.", "Ritmo leve.");
  }
  
  // Período
  if (period === "night") {
    options.push("Fecha o dia com calma.");
  }
  
  // Fallbacks genéricos (sempre disponíveis)
  const fallbacks = [
    "Vamos ao que importa.",
    "Pouco ruído hoje.",
    "Clareza antes de tudo.",
    "Foco no que move a agulha.",
  ];
  
  const pool = options.length > 0 ? [...options, ...fallbacks.slice(0, 2)] : fallbacks;
  return pick(pool);
};

export const useGreeting = ({ 
  userName, 
  profile, 
  buName, 
  teamName 
}: GreetingContext): GreetingResult => {
  return useMemo(() => {
    const period = getPeriodOfDay();
    const dayOfWeek = getDayOfWeek();
    const weekend = isWeekend();
    // Weather seria integrado via API - por agora, assume unknown
    const weather: Weather = "unknown";
    
    return {
      greeting: buildGreeting(period, dayOfWeek, weather, userName),
      subtext: buildSubtext(period, dayOfWeek, weekend, weather, profile, buName, teamName),
    };
  }, [userName, profile, buName, teamName]);
};
