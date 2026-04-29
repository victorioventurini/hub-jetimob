/**
 * Wizard Types — Managers Checkin + C-Level Checkin
 *
 * Mantidos juntos por compartilharem o nível de sumarização agregada
 * (área / empresa) e pela proximidade temática.
 */

// ============================================================
// MANAGERS CHECKIN WIZARD (descontinuado, mantido para compat)
// ============================================================

export interface AreaOkrSummary {
  /** @deprecated Onda 4 Fase 1 — Resolver via lookup `useTeams` por `teamId` (área = time pai). */
  areaName: string;
  teamId: string;
  okrCount: number;
  avgProgress: number;
  trend: 'improving' | 'stable' | 'declining';
  atRiskCount: number;
}

export interface CrossDependency {
  id: string;
  description: string;
  fromTeam: { id: string; name: string };
  toTeam: { id: string; name: string };
  status: 'healthy' | 'at_risk' | 'blocked';
}

export interface ManagersWizardState {
  areaSummaries: AreaOkrSummary[];
  crossDependencies: CrossDependency[];
  adjustments: string[];
}

// ============================================================
// C-LEVEL CHECKIN WIZARD
// ============================================================

export interface CompanyOkrSummary {
  objectiveId: string;
  /** @deprecated Onda 4 Fase 1 — Resolver via lookup `useObjectives` por `objectiveId`. */
  objectiveTitle: string;
  progress: number;
  trend: 'improving' | 'stable' | 'declining';
  riskLevel: 'low' | 'medium' | 'high';
  linkedAreaProgress: number;
}

export interface StrategicDirective {
  id: string;
  text: string;
  scope: 'company' | 'area' | 'specific_team';
  targetTeamId?: string;
}

export interface CLevelWizardState {
  companyOkrs: CompanyOkrSummary[];
  strategicDecisions: string[];
  directives: StrategicDirective[];
}
