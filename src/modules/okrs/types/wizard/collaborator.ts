/**
 * Wizard Types — Collaborator (Check-in Individual de sexta-feira)
 */

import type { WizardKr } from '../../hooks/useTeamPendingKrs';

export interface CollaboratorCheckinResult {
  krId: string;
  /** @deprecated Onda 4 Fase 1 — Resolver via lookup `useKeyResults` por `krId`. */
  krTitle: string;
  /** @deprecated Onda 4 Fase 1 — Resolver via lookup `useObjectives` pelo objective_id do KR. */
  objectiveTitle: string;
  previousValue: number;
  newValue: number;
  confidence: 'high' | 'medium' | 'low';
  comment?: string;
  skipped: boolean;
  blocker?: string;
}

export interface CollaboratorReflection {
  impactSummary?: string;
  helpNeeded?: string;
}

/**
 * Resultado de check-in de KPI no wizard de colaborador.
 * Segue padrão fail-safe: KPIs são instrumentos auditáveis, mas nunca bloqueiam o fluxo.
 */
export interface KpiCheckinResult {
  kpiId: string;
  /** @deprecated Onda 4 Fase 1 — Resolver via lookup `useKpiMetrics` por `kpiId`. */
  kpiName: string;
  previousValue: number | null;
  newValue: number;
  referenceDate: string;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
  skipped: boolean;
}
