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
import { useQuery } from '@tanstack/react-query';
import type { WizardPersona } from '../types/wizard';
import type { CycleWithStatus } from './useActiveCycle';
import { addBusinessDaysToDate } from '../utils/generateCycles';
import { RITUAL_LABELS as SSOT_RITUAL_LABELS } from '../constants/ritualLabels';
import { useAuth } from '@/hooks/useAuth';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';

// ⚠️ TEMPORARY DEV FLAG — remove after QBR flow testing
const DEV_FORCE_QBR_AVAILABLE = new Date() < new Date('2026-04-15');
const DEV_QBR_TYPES: WizardPersona[] = ['qbr-pre', 'qbr-pre-clevel', 'qbr-meeting', 'qbr-post'];

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
// RITUAL LABELS (PT-BR) — proxied from SSOT
// ============================================================

const RITUAL_LABELS: Partial<Record<WizardPersona, string>> = SSOT_RITUAL_LABELS;

// ============================================================
// DATE HELPERS
// ============================================================

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function calendarDaysOffset(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ============================================================
interface WindowDef {
  getWindow: (
    cycle: CycleWithStatus,
    overrides?: RitualWindowOverride[],
  ) => { opens: Date | null; closes: Date | null };
}

export interface RitualWindowOverride {
  wizard_type: string;
  anchor: 'review_date' | 'review_date_first_month';
  opens_date: string;
  closes_date: string;
}

/** Build a business-day window [offsetOpen..offsetClose] relative to a reference ISO date. */
function buildWindow(
  referenceDateStr: string | null | undefined,
  offsetOpen: number,
  offsetClose: number,
): { opens: Date | null; closes: Date | null } {
  const ref = parseDate(referenceDateStr);
  if (!ref) return { opens: null, closes: null };
  return {
    opens: offsetOpen === 0 ? ref : addBusinessDaysToDate(ref, offsetOpen),
    closes: addBusinessDaysToDate(ref, offsetClose),
  };
}

/**
 * Apply optional override for a given (wizard_type, anchor). If an override
 * exists, its dates replace the computed window.
 */
function withOverride(
  defaultWindow: { opens: Date | null; closes: Date | null },
  overrides: RitualWindowOverride[] | undefined,
  wizardType: string,
  anchor: 'review_date' | 'review_date_first_month',
): { opens: Date | null; closes: Date | null } {
  const o = overrides?.find(x => x.wizard_type === wizardType && x.anchor === anchor);
  if (!o) return defaultWindow;
  return {
    opens: parseDate(o.opens_date),
    closes: parseDate(o.closes_date),
  };
}

/**
 * Composite window picker: given 1..N windows (e.g. MBR₁ and MBR₂), return:
 *   1) the active window if `today` is inside it,
 *   2) otherwise the nearest future window (so RitualUnavailableScreen shows correct opening date),
 *   3) otherwise the latest past window (for expired messaging).
 * Null windows are ignored. Returns {null,null} if all are null.
 */
function pickCompositeWindow(
  ...windows: Array<{ opens: Date | null; closes: Date | null }>
): { opens: Date | null; closes: Date | null } {
  const valid = windows.filter(w => w.opens && w.closes) as Array<{ opens: Date; closes: Date }>;
  if (valid.length === 0) return { opens: null, closes: null };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 1) Active window (today within [opens..closesEndOfDay])
  const active = valid.find(w => {
    const closesEOD = new Date(w.closes.getFullYear(), w.closes.getMonth(), w.closes.getDate(), 23, 59, 59);
    return today >= w.opens && now <= closesEOD;
  });
  if (active) return active;

  // 2) Nearest future window
  const future = valid
    .filter(w => today < w.opens)
    .sort((a, b) => a.opens.getTime() - b.opens.getTime())[0];
  if (future) return future;

  // 3) Latest past window
  const past = valid
    .filter(w => {
      const closesEOD = new Date(w.closes.getFullYear(), w.closes.getMonth(), w.closes.getDate(), 23, 59, 59);
      return now > closesEOD;
    })
    .sort((a, b) => b.closes.getTime() - a.closes.getTime())[0];
  return past ?? valid[0];
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
  // 'clevel-checkin' removido — rito descontinuado (sem janela = indisponível).

  // MBR / Pré-MBR — janela composta (MBR₁ sobre review_date_first_month + MBR₂ sobre review_date).
  // Overrides pontuais (tabela ritual_window_overrides) substituem a janela calculada.
  'mbr-pre': {
    getWindow: (c, overrides) => pickCompositeWindow(
      withOverride(buildWindow(c.review_date_first_month, -5, -1), overrides, 'mbr-pre', 'review_date_first_month'),
      withOverride(buildWindow(c.review_date, -5, -1), overrides, 'mbr-pre', 'review_date'),
    ),
  },
  'mbr': {
    getWindow: (c, overrides) => pickCompositeWindow(
      withOverride(buildWindow(c.review_date_first_month, -1, 1), overrides, 'mbr', 'review_date_first_month'),
      withOverride(buildWindow(c.review_date, -1, 1), overrides, 'mbr', 'review_date'),
    ),
  },

  // All Hands — abre logo após o MBR; janela ampla (10 dias úteis) para
  // suportar agendamento na 1ª sexta do mês mesmo quando o MBR roda na 1ª terça.
  'all-hands': {
    getWindow: (c) => pickCompositeWindow(
      buildWindow(c.review_date_first_month, 0, 10),
      buildWindow(c.review_date, 0, 10),
    ),
  },

  // QBR phases
  'qbr-pre': {
    getWindow: (c) => {
      const retro = parseDate(c.retro_date);
      return {
        opens: parseDate(c.planning_date),
        closes: retro ? calendarDaysOffset(retro, -2) : null,
      };
    },
  },
  'qbr-pre-clevel': {
    getWindow: (c) => {
      const planning = parseDate(c.planning_date);
      const retro = parseDate(c.retro_date);
      if (!planning) return { opens: null, closes: null };
      return {
        opens: planning,
        closes: retro ? calendarDaysOffset(retro, -2) : null,
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
  const { isAdmin } = useAuth();

  return useMemo((): RitualAvailability => {
    // 🛡️ Admin/super_admin bypass — acesso irrestrito a qualquer rito,
    // independente de janela ou ciclo. Necessário para preparação e suporte.
    if (isAdmin) {
      return {
        isAvailable: true,
        opensAt: null,
        closesAt: null,
        reason: 'available',
        message: '',
      };
    }

    // ⚠️ TEMPORARY: Force all QBR rituals available for testing
    if (DEV_FORCE_QBR_AVAILABLE && DEV_QBR_TYPES.includes(wizardType)) {
      return {
        isAvailable: true,
        opensAt: null,
        closesAt: null,
        reason: 'available',
        message: '',
      };
    }

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
    if (['mbr', 'mbr-pre'].includes(wizardType)) {
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
  }, [wizardType, cycle, isAdmin]);
}
