/**
 * useRitualAvailability — Hook centralizado de janela de disponibilidade de rituais
 * 
 * Verifica se um rito está dentro da sua janela de acesso com base nas datas do ciclo.
 * Puramente computacional — sem queries ao banco.
 * 
 * Janelas contam em DIAS ÚTEIS (seg–sex).
 * Fallback permissivo: se as datas de referência forem null, retorna isAvailable = true.
 */

import { useMemo } from 'react';
import type { WizardPersona } from '../types/wizard';
import type { CycleWithStatus } from './useActiveCycle';
import { addBusinessDaysToDate } from '../utils/generateCycles';

// ============================================================
// TYPES
// ============================================================

export interface RitualAvailability {
  isAvailable: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
  reason: 'not_yet' | 'expired' | 'no_cycle' | 'no_dates' | 'qbr_period' | 'available';
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
  'mbr-pre-first': 'Pré-MBR (1º mês)',
  'mbr-first': 'MBR (1º mês)',
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

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ============================================================
// WINDOW DEFINITIONS — ALL WINDOWS USE BUSINESS DAYS
// ============================================================

interface WindowDef {
  getWindow: (cycle: CycleWithStatus) => { opens: Date | null; closes: Date | null };
}

const WINDOW_DEFS: Partial<Record<WizardPersona, WindowDef>> = {
  // Check-ins: available throughout the cycle
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

  // MBR₁ (1st month review)
  'mbr-pre-first': {
    getWindow: (c) => {
      const review = parseDate(c.review_date_first_month);
      if (!review) return { opens: null, closes: null };
      return {
        opens: addBusinessDaysToDate(review, -5),
        closes: addBusinessDaysToDate(review, -1),
      };
    },
  },
  'mbr-first': {
    getWindow: (c) => {
      const review = parseDate(c.review_date_first_month);
      if (!review) return { opens: null, closes: null };
      return {
        opens: review,
        closes: addBusinessDaysToDate(review, 2),
      };
    },
  },

  // MBR₂ (2nd month review)
  'mbr-pre': {
    getWindow: (c) => {
      const review = parseDate(c.review_date);
      if (!review) return { opens: null, closes: null };
      return {
        opens: addBusinessDaysToDate(review, -5),
        closes: addBusinessDaysToDate(review, -1),
      };
    },
  },
  'mbr': {
    getWindow: (c) => {
      const review = parseDate(c.review_date);
      if (!review) return { opens: null, closes: null };
      return {
        opens: review,
        closes: addBusinessDaysToDate(review, 2),
      };
    },
  },

  // QBR phases
  'qbr-pre': {
    getWindow: (c) => {
      const retro = parseDate(c.retro_date);
      return {
        opens: parseDate(c.planning_date),
        closes: retro ? addBusinessDaysToDate(retro, -1) : null,
      };
    },
  },
  'qbr-pre-clevel': {
    getWindow: (c) => {
      const planning = parseDate(c.planning_date);
      const retro = parseDate(c.retro_date);
      if (!planning) return { opens: null, closes: null };
      return {
        opens: addBusinessDaysToDate(planning, 5),
        closes: retro ? addBusinessDaysToDate(retro, -1) : null,
      };
    },
  },
  'qbr-meeting': {
    getWindow: (c) => {
      const retro = parseDate(c.retro_date);
      if (!retro) return { opens: null, closes: null };
      return {
        opens: retro,
        closes: addBusinessDaysToDate(retro, 2),
      };
    },
  },
  'qbr-post': {
    getWindow: (c) => {
      const retro = parseDate(c.retro_date);
      if (!retro) return { opens: null, closes: null };
      return {
        opens: retro,
        closes: addBusinessDaysToDate(retro, 5),
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

    // ── QBR period block for MBR/MBR-pre ──────────────────────
    // When today >= planning_date, MBR and MBR-pre are blocked
    // because QBR takes over the review function for the 3rd month.
    if (['mbr', 'mbr-pre', 'mbr-first', 'mbr-pre-first'].includes(wizardType)) {
      const planningDate = parseDate(cycle.planning_date);

      if (planningDate) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (today >= planningDate) {
          return {
            isAvailable: false,
            opensAt: null,
            closesAt: null,
            reason: 'qbr_period',
            message: 'Este período é de QBR. O MBR não é realizado no mês de encerramento do quarter.',
          };
        }
      }
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
