// Pace + status helpers for team-checkin-summary
import type { PaceAnalysis } from "./types.ts";

export function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function calculateExpectedProgress(
  cycleStart: Date,
  cycleEnd: Date,
  referenceDate: Date = new Date(),
): number {
  const start = cycleStart.getTime();
  const end = cycleEnd.getTime();
  const now = referenceDate.getTime();
  if (now < start) return 0;
  if (now > end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

const CYCLE_LABELS: Record<string, string> = {
  month: 'mensal',
  quarter: 'trimestral',
  semester: 'semestral',
  year: 'anual',
};

export function analyzePace(
  actualProgress: number,
  cycleStart: Date,
  cycleEnd: Date,
  cycleType: string,
  tolerancePercent = 10,
): PaceAnalysis {
  const expectedProgress = calculateExpectedProgress(cycleStart, cycleEnd);
  const cycleElapsed = expectedProgress;
  const gap = actualProgress - expectedProgress;
  const cycleLabel = CYCLE_LABELS[cycleType] || cycleType;

  if (actualProgress >= 100) {
    return { status: 'completed', label: 'Meta atingida', expectedProgress, cycleElapsed,
      interpretation: `Meta do ciclo ${cycleLabel} já foi atingida.` };
  }
  if (actualProgress === 0 && cycleElapsed > 10) {
    return { status: 'not_started', label: 'Não iniciado', expectedProgress, cycleElapsed,
      interpretation: `KR ainda não iniciou, com ${cycleElapsed}% do ciclo ${cycleLabel} transcorrido.` };
  }
  if (cycleElapsed <= 15) {
    return { status: 'on_pace', label: 'Início do ciclo', expectedProgress, cycleElapsed,
      interpretation: `Ciclo ${cycleLabel} ainda no início. Progresso atual: ${actualProgress}%.` };
  }
  if (gap >= tolerancePercent) {
    return { status: 'above_pace', label: 'Acima do ritmo', expectedProgress, cycleElapsed,
      interpretation: `Acima do ritmo esperado para este ponto do ciclo ${cycleLabel} (+${gap.toFixed(0)}%).` };
  }
  if (gap <= -tolerancePercent) {
    return { status: 'below_pace', label: 'Abaixo do ritmo', expectedProgress, cycleElapsed,
      interpretation: `Abaixo do ritmo esperado para este ponto do ciclo ${cycleLabel} (${gap.toFixed(0)}%).` };
  }
  return { status: 'on_pace', label: 'Dentro do ritmo', expectedProgress, cycleElapsed,
    interpretation: `Dentro do ritmo esperado para o ciclo ${cycleLabel}.` };
}

export function getKrStatus(progress: number, updatedRecently: boolean): string {
  if (!updatedRecently) return 'desatualizado';
  if (progress >= 100) return 'atingido';
  if (progress >= 70) return 'no ritmo';
  if (progress >= 40) return 'atenção';
  return 'fora da trilha';
}

export function generatePaceGuidance(cycleType: string, cycleElapsed: number): string {
  const cycleLabel = CYCLE_LABELS[cycleType] || cycleType;
  return `
CONTEXTO TEMPORAL OBRIGATÓRIO:
- Ciclo: ${cycleLabel}
- Tempo transcorrido: ${cycleElapsed}%
- Progresso esperado neste ponto: ~${cycleElapsed}%

REGRAS DE INTERPRETAÇÃO:
1. Avalie progresso em relação ao RITMO, não ao valor final
2. Use: "dentro do ritmo", "acima do ritmo", "abaixo do ritmo"
3. NUNCA use: "atrasado", "falhou", "insuficiente"
4. Para metas de longo prazo, considere a proporcionalidade
5. Início de ciclo (<15%): não fazer julgamentos negativos
`;
}
