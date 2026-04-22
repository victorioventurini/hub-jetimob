/**
 * RitualHistoryPage — constantes e helpers compartilhados.
 * Extraído em P3.2 (modularização).
 */

import { Lightbulb, Target, CheckCircle2 } from 'lucide-react';
import type { WizardPersona } from '../../types/wizard';

export const CATEGORY_CONFIG = {
  decision: { label: 'Decisão', icon: Lightbulb, color: 'bg-status-blue-muted text-status-blue' },
  focus_adjustment: { label: 'Ajuste de Foco', icon: Target, color: 'bg-status-purple-muted text-status-purple' },
  next_step: { label: 'Próximo Passo', icon: CheckCircle2, color: 'bg-status-green-muted text-status-green' },
} as const;

export const EVALUATED_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'yes', label: 'Avaliados' },
  { value: 'no', label: 'Não avaliados' },
];

export const WIZARD_TYPE_OPTIONS: { value: WizardPersona | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os rituais' },
  { value: 'mbr', label: 'MBR' },
  { value: 'mbr-pre', label: 'Pré-MBR' },
  { value: 'team-checkin', label: 'Check-in do Time' },
  { value: 'collaborator', label: 'Check-in Individual' },
  { value: 'leader-prep', label: 'Pré-Check-in do Time' },
  { value: 'clevel-checkin', label: 'Check-in Executivo' },
  { value: 'qbr-pre', label: 'Pré-QBR' },
  { value: 'qbr-pre-clevel', label: 'Pré-QBR Executivo' },
  { value: 'qbr-meeting', label: 'QBR' },
  { value: 'qbr-post', label: 'Pós-QBR' },
];

/** Checa se o ritual possui avaliações de participantes nos addendums */
export function hasParticipantEvaluations(addendums: unknown[] | null): boolean {
  if (!Array.isArray(addendums)) return false;
  const ev = addendums.find((a: any) => a?.type === 'participant_evaluation') as any;
  return Array.isArray(ev?.evaluations) && ev.evaluations.length > 0;
}
