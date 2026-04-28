/**
 * RitualCalendarPage — constantes compartilhadas entre as tabs.
 * Extraído de `RitualCalendarPage.tsx` em P3.2 (modularização).
 */

import type { OccurrenceStatus } from '../../hooks/useRitualOccurrences';
import type { WizardPersona } from '../../types/wizard';
import { ALL_RITUAL_WIZARD_TYPES } from '../../constants/ritualWizardTypes';

export const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
};

export const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const STATUS_CONFIG: Record<
  OccurrenceStatus,
  { label: string; color: string; dotColor: string }
> = {
  scheduled: {
    label: 'Agendado',
    color: 'bg-muted text-muted-foreground',
    dotColor: 'bg-muted-foreground/40',
  },
  completed_on_time: {
    label: 'No prazo',
    color: 'bg-status-green-muted text-status-green',
    dotColor: 'bg-status-green',
  },
  completed_late: {
    label: 'Com atraso',
    color: 'bg-status-amber-muted text-status-amber',
    dotColor: 'bg-status-amber',
  },
  missed: {
    label: 'Não executado',
    color: 'bg-destructive/10 text-destructive',
    dotColor: 'bg-destructive',
  },
  rescheduled: {
    label: 'Reagendado',
    color: 'bg-status-blue-muted text-status-blue',
    dotColor: 'bg-status-blue',
  },
};

/** Catálogo canônico de ritos exibidos em filtros e criação manual */
export const RECURRENT_WIZARD_TYPES: WizardPersona[] = ALL_RITUAL_WIZARD_TYPES;

/**
 * Ritos elegíveis para reagendamento em massa (ritos globais que materializam
 * uma ocorrência por time da BU em uma mesma data).
 */
export const BULK_RESCHEDULABLE_WIZARD_TYPES: WizardPersona[] = [
  'mbr',
  'mbr-pre',
  'qbr-pre',
  'qbr',
  'qbr-clevel',
];
