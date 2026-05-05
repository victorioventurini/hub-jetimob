/**
 * Formatação canônica de porcentagens (KRs, KPIs, progresso de objetivos).
 *
 * Regra: máximo 2 casas decimais, sem zeros à direita desnecessários.
 * Exemplos:
 *   72.6470588235294  → "72,64%"
 *   50                 → "50%"
 *   33.3               → "33,3%"
 *   100                → "100%"
 */
export function formatPercent(
  value: number | null | undefined,
  options: { fallback?: string; maxDecimals?: number } = {}
): string {
  const { fallback = '—', maxDecimals = 2 } = options;
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
  return `${formatted}%`;
}
