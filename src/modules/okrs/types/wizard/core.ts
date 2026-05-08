/**
 * Wizard Types — Core
 *
 * Tipos fundacionais compartilhados por todos os wizards: identificação de
 * personas, configuração de steps e insights da IA (Vic).
 */

import type { VicAgentSlug } from '@/modules/vic/types';

// ============================================================
// WIZARD PERSONAS
// ============================================================

export type WizardPersona =
  | 'collaborator'
  | 'leader-prep'
  | 'team-checkin'
  | 'managers-checkin'
  | 'clevel-checkin'
  | 'team-okr-creation'
  | 'team-kr-creation'
  | 'mbr'
  | 'mbr-pre'
  | 'mbr-first'
  | 'mbr-pre-first'
  | 'qbr-pre'
  | 'qbr-pre-clevel'
  | 'qbr-meeting'
  | 'qbr-post'
  // Onda 4 — Ritos semanais (Pré-Weekly v2 / Weekly v2)
  | 'pre-weekly'
  | 'weekly'
  // Onda 5 — All Hands (rito mensal de comunicação da BU, derivado do MBR)
  | 'all-hands';

// ============================================================
// STEP CONFIG
// ============================================================

export interface WizardStepConfig {
  id: string;
  label: string;
  shortLabel: string;
  description?: string;
  optional?: boolean;
}

export interface WizardConfig {
  persona: WizardPersona;
  title: string;
  description: string;
  steps: WizardStepConfig[];
  aiAgents: VicAgentSlug[];
}

// ============================================================
// VIC INSIGHTS
// ============================================================

export type VicInsightType = 'question' | 'insight' | 'alert' | 'suggestion';
export type VicInsightPriority = 'low' | 'medium' | 'high';

export interface VicInsight {
  id: string;
  type: VicInsightType;
  content: string;
  priority: VicInsightPriority;
  source: VicAgentSlug;
  context?: string;
  dismissed?: boolean;
}

export interface VicGuidingQuestion {
  id: string;
  question: string;
  context?: string;
  source: VicAgentSlug;
}
