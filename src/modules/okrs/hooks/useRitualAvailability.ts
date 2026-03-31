/**
 * useRitualAvailability — Hook centralizado de janela de disponibilidade de rituais
 * 
 * Verifica se um rito está dentro da sua janela de acesso com base nas datas do ciclo.
 * Puramente computacional — sem queries ao banco.
 * 
 * Fallback permissivo: se as datas de referência forem null, retorna isAvailable = true
 * (não bloquear se admin não preencheu datas).
 */

import { useMemo } from 'react';
import type { WizardPersona } from '../types/wizard';
import type { CycleWithStatus } from './useActiveCycle';

// ============================================================
// TYPES
// ============================================================

export interface RitualAvailability {
  isAvailable: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
  reason: 'not_yet' | 'expired' | 'no_cycle' | 'no_dates' | 'available';
  message: string;
}

// ============================================================
// RITUAL LABELS (PT-BR)
// ============================================================

const RITUAL_LABELS: Partial<Record<WizardPersona, string>> = {
  'collaborator': 'Check-in do Colaborador',
  'leader-prep': 'Preparação do Check-in',
  'team-checkin': 'Check-in do Time',
  'managers-checkin': 'Check-in de Gestores',
  'clevel-checkin': 'Check-in Estratégico',
  'mbr-pre': 'Pré-MBR',
  'mbr': 'MBR',
  'qbr-pre': 'Pré-QBR',
  'qbr-pre-clevel': 'Pré-QBR (C-Level)',
  'qbr-meeting': 'Reunião QBR',
  'qbr-post': 'Pós-QBR',
};

// ============================================================
// DATE HELPERS
// ============================================================

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ============================================================
// WINDOW DEFINITIONS
// ============================================================

interface WindowDef {
  getWindow: (cycle: CycleWithStatus) => { opens: Date | null; closes: Date | null };
}

const WINDOW_DEFS: Partial<Record<WizardPersona, WindowDef>> = {
  'collaborator': {
    getWindow: (c) => ({
      opens: parseDate(c.start_date),
      closes: parseDate(c.end_date),
    }),
  },
  'leader-prep': {
    getWindow: (c) => ({
      opens: parseDate(c.start_date),
      closes: parseDate(c.end_date),
    }),
  },
  'team-checkin': {
    getWindow: (c) => ({
      opens: parseDate(c.start_date),
      closes: parseDate(c.end_date),
    }),
  },
  'managers-checkin': {
    getWindow: (c) => ({
      opens: parseDate(c.start_date),
      closes: parseDate(c.end_date),
    }),
  },
  'clevel-checkin': {
    getWindow: (c) => ({
      opens: parseDate(c.start_date),
      closes: parseDate(c.end_date),
    }),
  },
  'mbr-pre': {
    getWindow: (c) => {
      const review = parseDate(c.review_date);
      if (!review) return { opens: null, closes: null };
      return {
        opens: addDays(review, -3),
        closes: addDays(review, 1),
      };
    },
  },
  'mbr': {
    getWindow: (c) => {
      const review = parseDate(c.review_date);
      if (!review) return { opens: null, closes: null };
      return {
        opens: review,
        closes: addDays(review, 2),
      };
    },
  },
  'qbr-pre': {
    getWindow: (c) => ({
      opens: parseDate(c.planning_date),
      closes: parseDate(c.retro_date),
    }),
  },
  'qbr-pre-clevel': {
    getWindow: (c) => {
      const planning = parseDate(c.planning_date);
      if (!planning) return { opens: null, closes: null };
      return {
        opens: addDays(planning, 7),
        closes: parseDate(c.retro_date),
      };
    },
  },
  'qbr-meeting': {
    getWindow: (c) => {
      const retro = parseDate(c.retro_date);
      if (!retro) return { opens: null, closes: null };
      return {
        opens: retro,
        closes: addDays(retro, 3),
      };
    },
  },
  'qbr-post': {
    getWindow: (c) => {
      const retro = parseDate(c.retro_date);
      const end = parseDate(c.end_date);
      if (!retro) return { opens: null, closes: null };
      return {
        opens: retro,
        closes: end ? addDays(end, 7) : null,
      };
    },
  },
};

// ============================================================
// HOOK
// ============================================================

export function useRitualAvailability(
  wizardType: WizardPersona,
  cycle: CycleWithStatus | null | undefined,
): RitualAvailability {
  return useMemo((): RitualAvailability => {
    const label = RITUAL_LABELS[wizardType] || wizardType;

    // No cycle active
    if (!cycle) {
      return {
        isAvailable: false,
        opensAt: null,
        closesAt: null,
        reason: 'no_cycle',
        message: `Nenhum ciclo ativo encontrado. É necessário ter um ciclo ativo para acessar o ${label}.`,
      };
    }

    const windowDef = WINDOW_DEFS[wizardType];
    if (!windowDef) {
      // Unknown wizard type — permissive fallback
      return {
        isAvailable: true,
        opensAt: null,
        closesAt: null,
        reason: 'available',
        message: '',
      };
    }

    const { opens, closes } = windowDef.getWindow(cycle);

    // Dates not configured — permissive fallback
    if (!opens && !closes) {
      return {
        isAvailable: true,
        opensAt: null,
        closesAt: null,
        reason: 'no_dates',
        message: '',
      };
    }

    const now = new Date();
    // Normalize to start of day for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Not yet open
    if (opens && today < opens) {
      return {
        isAvailable: false,
        opensAt: opens,
        closesAt: closes,
        reason: 'not_yet',
        message: `O ${label} abre em ${formatDateBR(opens)}. Você receberá uma notificação quando estiver disponível.`,
      };
    }

    // Already expired
    if (closes) {
      const closesEndOfDay = new Date(closes.getFullYear(), closes.getMonth(), closes.getDate(), 23, 59, 59);
      if (now > closesEndOfDay) {
        return {
          isAvailable: false,
          opensAt: opens,
          closesAt: closes,
          reason: 'expired',
          message: `O período do ${label} encerrou em ${formatDateBR(closes)}. Acesse o histórico para ver os rituais realizados.`,
        };
      }
    }

    // Within window
    return {
      isAvailable: true,
      opensAt: opens,
      closesAt: closes,
      reason: 'available',
      message: '',
    };
  }, [wizardType, cycle]);
}
