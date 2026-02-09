// ============================================================
// UNIT CONSTANTS - Shared across KRs, KPIs, and Wizards
// ============================================================

/**
 * Canonical unit option structure
 */
export interface UnitOption {
  value: string;
  label: string;
  category: string;
}

/**
 * Canonical unit category structure
 */
export interface UnitCategory {
  label: string;
  options: UnitOption[];
}

/**
 * Unified unit categories for OKRs, KPIs, and Metrics
 * 
 * 6 categories with 18+ options:
 * - Financeiro: R$, R$ mil, R$ milhão
 * - Volume/Quantidade: Número, Clientes, Contas, etc.
 * - Experiência/Qualidade: Pontos (NPS), Score, Índice
 * - Tempo: Dias, Horas, Minutos
 * - Taxas e Proporções: %, p.p.
 * - Customizada: Unidade personalizada
 */
export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    label: 'Financeiro',
    options: [
      { value: 'R$', label: 'R$', category: 'Financeiro' },
      { value: 'R$ mil', label: 'R$ mil', category: 'Financeiro' },
      { value: 'R$ milhão', label: 'R$ milhão', category: 'Financeiro' },
    ],
  },
  {
    label: 'Volume / Quantidade',
    options: [
      { value: 'Número', label: 'Número', category: 'Volume / Quantidade' },
      { value: 'Clientes', label: 'Clientes', category: 'Volume / Quantidade' },
      { value: 'Contas', label: 'Contas', category: 'Volume / Quantidade' },
      { value: 'Usuários', label: 'Usuários', category: 'Volume / Quantidade' },
      { value: 'Leads', label: 'Leads', category: 'Volume / Quantidade' },
      { value: 'Tickets', label: 'Tickets', category: 'Volume / Quantidade' },
      { value: 'Features', label: 'Features', category: 'Volume / Quantidade' },
      { value: 'Projetos', label: 'Projetos', category: 'Volume / Quantidade' },
    ],
  },
  {
    label: 'Experiência / Qualidade',
    options: [
      { value: 'Pontos', label: 'Pontos (NPS, eNPS)', category: 'Experiência / Qualidade' },
      { value: 'Score', label: 'Score', category: 'Experiência / Qualidade' },
      { value: 'Índice', label: 'Índice', category: 'Experiência / Qualidade' },
    ],
  },
  {
    label: 'Tempo',
    options: [
      { value: 'Dias', label: 'Dias', category: 'Tempo' },
      { value: 'Horas', label: 'Horas', category: 'Tempo' },
      { value: 'Minutos', label: 'Minutos', category: 'Tempo' },
    ],
  },
  {
    label: 'Taxas e Proporções',
    options: [
      { value: '%', label: '%', category: 'Taxas e Proporções' },
      { value: 'p.p.', label: 'p.p. (pontos percentuais)', category: 'Taxas e Proporções' },
    ],
  },
  {
    label: 'Customizada',
    options: [
      { value: 'custom', label: 'Unidade personalizada', category: 'Customizada' },
    ],
  },
];

/**
 * Flat list of all unit options
 */
export const ALL_UNITS = UNIT_CATEGORIES.flatMap((cat) => cat.options);

/**
 * Get the display label for a unit value
 */
export function getUnitLabel(value: string): string {
  const unit = ALL_UNITS.find((u) => u.value === value);
  return unit?.label || value;
}

/**
 * Formats a numeric value with its unit.
 * Returns fallback '—' for null/undefined values.
 */
export function formatValueWithUnit(
  value: number | null | undefined,
  unit: string,
  showPrefix = true
): string {
  // Null-safe: return fallback for missing values
  if (value === null || value === undefined) {
    return '—';
  }

  const numStr = value.toLocaleString('pt-BR');
  
  // Units that come before the number
  const prefixUnits = ['R$', 'R$ mil', 'R$ milhão'];
  
  if (prefixUnits.includes(unit) && showPrefix) {
    return `${unit} ${numStr}`;
  }
  
  return `${numStr} ${unit}`;
}

/**
 * Check if a value is a known unit (not custom)
 */
export function isKnownUnit(value: string): boolean {
  return ALL_UNITS.some((u) => u.value === value && u.value !== 'custom');
}
