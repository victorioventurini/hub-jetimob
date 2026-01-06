import { useMemo } from "react";
import type { OkrRagStatus, OkrConfidence } from "../types";
import type { Cycle } from "../hooks/useCycleData";
import type { Initiative, InitiativeStatus } from "../types/initiative";

export type HealthLevel = "healthy" | "at_risk" | "critical";

export interface HealthFactor {
  id: string;
  name: string;
  score: number; // 0-100
  weight: number; // 0-1
  status: "good" | "warning" | "bad";
  message: string;
}

export interface ObjectiveHealth {
  level: HealthLevel;
  score: number; // 0-100
  factors: HealthFactor[];
  summary: string;
}

interface KrData {
  id: string;
  status: OkrRagStatus;
  current_value: number;
  baseline: number;
  target: number;
  direction: "up" | "down";
  lastCheckinDate?: string | null;
}

interface InitiativeData {
  id: string;
  status: InitiativeStatus;
  expected_end_date?: string | null;
}

interface HealthCalculationInput {
  krs: KrData[];
  initiatives: InitiativeData[];
  cycle: Cycle | null;
  primaryKpiTrend?: "up" | "down" | "stable" | null;
}

/**
 * Calculate progress for a single KR
 */
function calculateKrProgress(kr: KrData): number {
  if (kr.direction === "up") {
    if (kr.target === kr.baseline) return kr.current_value >= kr.target ? 100 : 0;
    return Math.max(0, Math.min(100, ((kr.current_value - kr.baseline) / (kr.target - kr.baseline)) * 100));
  } else {
    if (kr.baseline === kr.target) return kr.current_value <= kr.target ? 100 : 0;
    return Math.max(0, Math.min(100, ((kr.baseline - kr.current_value) / (kr.baseline - kr.target)) * 100));
  }
}

/**
 * Calculate cycle progress percentage
 */
function calculateCycleProgress(cycle: Cycle | null): number {
  if (!cycle) return 0;
  
  const today = new Date();
  const start = new Date(cycle.start_date);
  const end = new Date(cycle.end_date);
  
  if (today < start) return 0;
  if (today > end) return 100;
  
  const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  const elapsedDays = (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  
  return Math.round((elapsedDays / totalDays) * 100);
}

/**
 * Calculate Objective Health Score
 * 
 * Factors:
 * 1. Average KR progress (weight: 0.25)
 * 2. KR RAG status distribution (weight: 0.25)
 * 3. Check-in frequency (weight: 0.15)
 * 4. Primary KPI trend (weight: 0.15)
 * 5. Late initiatives (weight: 0.10)
 * 6. Cycle remaining time vs progress (weight: 0.10)
 */
export function calculateObjectiveHealth(input: HealthCalculationInput): ObjectiveHealth {
  const { krs, initiatives, cycle, primaryKpiTrend } = input;
  const factors: HealthFactor[] = [];

  // 1. Average KR Progress
  if (krs.length > 0) {
    const avgProgress = krs.reduce((acc, kr) => acc + calculateKrProgress(kr), 0) / krs.length;
    const progressStatus = avgProgress >= 70 ? "good" : avgProgress >= 40 ? "warning" : "bad";
    
    factors.push({
      id: "kr_progress",
      name: "Progresso médio dos KRs",
      score: avgProgress,
      weight: 0.25,
      status: progressStatus,
      message: `${avgProgress.toFixed(0)}% de progresso médio`,
    });
  }

  // 2. KR RAG Status Distribution
  if (krs.length > 0) {
    const greenCount = krs.filter(kr => kr.status === "green").length;
    const yellowCount = krs.filter(kr => kr.status === "yellow").length;
    const redCount = krs.filter(kr => kr.status === "red").length;
    
    // Score: 100% green = 100, 100% red = 0
    const ragScore = ((greenCount * 100) + (yellowCount * 50) + (redCount * 0)) / krs.length;
    const ragStatus = redCount === 0 && yellowCount === 0 ? "good" 
      : redCount === 0 ? "warning" 
      : "bad";
    
    factors.push({
      id: "rag_status",
      name: "Status RAG dos KRs",
      score: ragScore,
      weight: 0.25,
      status: ragStatus,
      message: `${greenCount} verde, ${yellowCount} amarelo, ${redCount} vermelho`,
    });
  }

  // 3. Check-in Frequency
  if (krs.length > 0) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentCheckins = krs.filter(kr => {
      if (!kr.lastCheckinDate) return false;
      return new Date(kr.lastCheckinDate) >= sevenDaysAgo;
    }).length;
    
    const checkinScore = (recentCheckins / krs.length) * 100;
    const checkinStatus = checkinScore >= 70 ? "good" : checkinScore >= 40 ? "warning" : "bad";
    
    factors.push({
      id: "checkin_frequency",
      name: "Frequência de check-ins",
      score: checkinScore,
      weight: 0.15,
      status: checkinStatus,
      message: `${recentCheckins}/${krs.length} KRs com check-in nos últimos 7 dias`,
    });
  }

  // 4. Primary KPI Trend
  if (primaryKpiTrend) {
    let trendScore = 50; // stable
    let trendStatus: "good" | "warning" | "bad" = "warning";
    let trendMessage = "Tendência estável";
    
    // Assuming direction=up is the goal (simplified)
    if (primaryKpiTrend === "up") {
      trendScore = 100;
      trendStatus = "good";
      trendMessage = "Tendência positiva";
    } else if (primaryKpiTrend === "down") {
      trendScore = 0;
      trendStatus = "bad";
      trendMessage = "Tendência negativa";
    }
    
    factors.push({
      id: "kpi_trend",
      name: "Tendência do KPI primário",
      score: trendScore,
      weight: 0.15,
      status: trendStatus,
      message: trendMessage,
    });
  }

  // 5. Late Initiatives
  if (initiatives.length > 0) {
    const now = new Date();
    const lateCount = initiatives.filter(init => {
      if (init.status === "completed") return false;
      if (!init.expected_end_date) return false;
      return new Date(init.expected_end_date) < now;
    }).length;
    
    const lateScore = ((initiatives.length - lateCount) / initiatives.length) * 100;
    const lateStatus = lateCount === 0 ? "good" : lateCount <= 1 ? "warning" : "bad";
    
    factors.push({
      id: "late_initiatives",
      name: "Iniciativas atrasadas",
      score: lateScore,
      weight: 0.10,
      status: lateStatus,
      message: lateCount === 0 ? "Nenhuma atrasada" : `${lateCount} iniciativa(s) atrasada(s)`,
    });
  }

  // 6. Cycle Time vs Progress
  if (cycle && krs.length > 0) {
    const cycleProgress = calculateCycleProgress(cycle);
    const avgKrProgress = krs.reduce((acc, kr) => acc + calculateKrProgress(kr), 0) / krs.length;
    
    // If KR progress is ahead of cycle progress, good. Behind = bad.
    const progressDelta = avgKrProgress - cycleProgress;
    let timeScore = 50;
    let timeStatus: "good" | "warning" | "bad" = "warning";
    let timeMessage = "Progresso alinhado com o tempo";
    
    if (progressDelta >= 10) {
      timeScore = 100;
      timeStatus = "good";
      timeMessage = "Adiantado em relação ao tempo";
    } else if (progressDelta >= -10) {
      timeScore = 70;
      timeStatus = "warning";
      timeMessage = "Progresso alinhado com o tempo";
    } else if (progressDelta >= -25) {
      timeScore = 40;
      timeStatus = "warning";
      timeMessage = "Ligeiramente atrasado";
    } else {
      timeScore = 0;
      timeStatus = "bad";
      timeMessage = "Significativamente atrasado";
    }
    
    factors.push({
      id: "cycle_alignment",
      name: "Tempo restante vs progresso",
      score: timeScore,
      weight: 0.10,
      status: timeStatus,
      message: timeMessage,
    });
  }

  // Calculate overall score
  const totalWeight = factors.reduce((acc, f) => acc + f.weight, 0);
  const weightedScore = totalWeight > 0 
    ? factors.reduce((acc, f) => acc + (f.score * f.weight), 0) / totalWeight
    : 0;

  // Determine health level
  let level: HealthLevel;
  if (weightedScore >= 70) {
    level = "healthy";
  } else if (weightedScore >= 40) {
    level = "at_risk";
  } else {
    level = "critical";
  }

  // Generate summary
  const badFactors = factors.filter(f => f.status === "bad");
  const warningFactors = factors.filter(f => f.status === "warning");
  
  let summary: string;
  if (level === "healthy") {
    summary = "Objetivo está saudável e no caminho certo.";
  } else if (level === "at_risk") {
    if (badFactors.length > 0) {
      summary = `Atenção necessária: ${badFactors.map(f => f.name.toLowerCase()).join(", ")}.`;
    } else {
      summary = `Monitorar: ${warningFactors.slice(0, 2).map(f => f.name.toLowerCase()).join(", ")}.`;
    }
  } else {
    summary = `Situação crítica: ${badFactors.map(f => f.name.toLowerCase()).join(", ")}.`;
  }

  return {
    level,
    score: Math.round(weightedScore),
    factors,
    summary,
  };
}

/**
 * Hook to calculate objective health
 */
export function useObjectiveHealth(input: HealthCalculationInput): ObjectiveHealth {
  return useMemo(() => calculateObjectiveHealth(input), [input]);
}

/**
 * Get health level configuration
 */
export function getHealthLevelConfig(level: HealthLevel) {
  switch (level) {
    case "healthy":
      return {
        label: "Saudável",
        emoji: "🟢",
        color: "text-green-600",
        bgColor: "bg-green-100 dark:bg-green-900/30",
        borderColor: "border-green-500",
      };
    case "at_risk":
      return {
        label: "Em risco",
        emoji: "🟡",
        color: "text-yellow-600",
        bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
        borderColor: "border-yellow-500",
      };
    case "critical":
      return {
        label: "Crítico",
        emoji: "🔴",
        color: "text-red-600",
        bgColor: "bg-red-100 dark:bg-red-900/30",
        borderColor: "border-red-500",
      };
  }
}
