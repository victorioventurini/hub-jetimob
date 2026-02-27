/**
 * Jet Experience — Single Source of Truth for all mocked metrics
 *
 * ALL dashboard components, KPI cards, funnel charts, tables, and settings
 * pages MUST import constants from this file to guarantee cross-page consistency.
 *
 * Business rules:
 *   inscritos            = 925
 *   participantes        = 881  (show rate ≈ 95%)
 *   leads                = 176  (20% dos participantes)
 *   oportunidades        = 32   (18% dos leads)
 *   contratos fechados   = 6    (18% das oportunidades)
 *   LTV por contrato     = R$ 147.500
 *   LTV total projetado  = R$ 885.000
 */

// ---------------------------------------------------------------------------
// Absolute totals
// ---------------------------------------------------------------------------
export const EVENT_TOTALS = {
  inscritos: 925,
  participantes: 881,
  leads: 176,
  oportunidades: 32,
  contratos: 6,
} as const;

// ---------------------------------------------------------------------------
// Conversion rates (fraction, not %)
// ---------------------------------------------------------------------------
export const CONVERSION_RATES = {
  /** participantes / inscritos */
  showRate: EVENT_TOTALS.participantes / EVENT_TOTALS.inscritos,       // ≈ 0.9524
  /** leads / participantes */
  leadsRate: EVENT_TOTALS.leads / EVENT_TOTALS.participantes,          // ≈ 0.20
  /** oportunidades / leads */
  oppsRate: EVENT_TOTALS.oportunidades / EVENT_TOTALS.leads,           // ≈ 0.1818
  /** contratos / oportunidades */
  contratosRate: EVENT_TOTALS.contratos / EVENT_TOTALS.oportunidades,  // ≈ 0.1875
} as const;

// ---------------------------------------------------------------------------
// ROI / LTV
// ---------------------------------------------------------------------------
export const ROI_METRICS = {
  ltvPerContrato: 147_500,
  ltvTotal: 885_000,       // 6 × 147 500
  conversionRate: 0.18,    // used in ROI estimates (opp → contrato)
} as const;

// ---------------------------------------------------------------------------
// Funnel stages (ordered, for charts)
// ---------------------------------------------------------------------------
export const FUNNEL_METRICS = [
  { label: "Inscritos",      value: EVENT_TOTALS.inscritos },
  { label: "Participantes",  value: EVENT_TOTALS.participantes },
  { label: "Leads",          value: EVENT_TOTALS.leads },
  { label: "Oportunidades",  value: EVENT_TOTALS.oportunidades },
  { label: "Contratos",      value: EVENT_TOTALS.contratos },
] as const;

// ---------------------------------------------------------------------------
// Per-event distribution (must sum to the totals above)
// ---------------------------------------------------------------------------
export const EVENT_DISTRIBUTION = [
  { eventId: "evt-sm-2026",      registrations: 55,  attendees: 51,  leads: 10, opps: 2 },
  { eventId: "evt-pelotas-2026", registrations: 47,  attendees: 45,  leads: 9,  opps: 1 },
  { eventId: "evt-capao-2026",   registrations: 62,  attendees: 53,  leads: 11, opps: 2 },
  { eventId: "evt-poa-2026",     registrations: 49,  attendees: 45,  leads: 9,  opps: 1 },
  { eventId: "evt-je-2026",      registrations: 712, attendees: 687, leads: 137, opps: 26 },
] as const;
// Verification: 10+9+11+9+137 = 176 leads ✓  |  2+1+2+1+26 = 32 opps ✓

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export const formatCurrencyBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);

export const formatCurrencyCompact = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
  }).format(v);
