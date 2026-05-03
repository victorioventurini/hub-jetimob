/**
 * Helpers SSOT para o conceito de "mês de referência" (referenceMonth) dos
 * ritos MBR-Pre e MBR.
 *
 * Convenção:
 * - `referenceMonth` é uma string `YYYY-MM` que representa o **mês analisado**
 *   pelo rito — sempre um mês fechado (mês imediatamente anterior à data de
 *   execução do rito, por padrão).
 * - O default `defaultReferenceMonth()` é o mês anterior ao mês corrente,
 *   pois pré-MBR/MBR são executados no início do mês seguinte ao mês analisado.
 * - Admins podem sobrepor via `ReferenceMonthPicker` (seletor compacto com os
 *   últimos N meses fechados).
 */

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});

/** Retorna o mês corrente (`YYYY-MM`) no fuso local. */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Retorna o mês imediatamente anterior a um `YYYY-MM`. */
export function previousMonthOf(yyyymm: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(yyyymm);
  if (!m) return yyyymm;
  const year = Number(m[1]);
  const month = Number(m[2]);
  // Day=0 ⇒ último dia do mês anterior — robusto contra rollovers.
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Mês alvo padrão do MBR-Pre/MBR: mês imediatamente anterior ao corrente. */
export function defaultReferenceMonth(): string {
  return previousMonthOf(currentMonth());
}

/** Formata `YYYY-MM` como rótulo amigável em pt-BR (ex.: "abril de 2026"). */
export function formatMonthLabel(yyyymm: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(yyyymm);
  if (!m) return yyyymm;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return MONTH_LABEL_FORMATTER.format(d);
}

/** Bounds ISO (UTC) do mês — útil para filtros `gte/lte` em colunas DATE. */
export function monthBoundsISO(yyyymm: string): { start: string; end: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(yyyymm);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0)).toISOString();
  // Último ms do mês: começo do próximo mês menos 1 ms.
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0) - 1).toISOString();
  return { start, end };
}

/** Bounds em formato `YYYY-MM-DD` (para colunas DATE puras como `kpi_values.reference_date`). */
export function monthBoundsDate(yyyymm: string): { start: string; end: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(yyyymm);
  if (!m) return null;
  const year = Number(m[1]);
  const monthIdx = Number(m[2]) - 1;
  const startDate = new Date(year, monthIdx, 1);
  const endDate = new Date(year, monthIdx + 1, 0); // último dia do mês
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(startDate), end: fmt(endDate) };
}

/**
 * Lista os últimos N meses fechados (do mais recente ao mais antigo), começando
 * pelo `defaultReferenceMonth()` (mês anterior ao corrente).
 */
export function lastNClosedMonths(n: number): Array<{ value: string; label: string }> {
  const result: Array<{ value: string; label: string }> = [];
  let cursor = defaultReferenceMonth();
  for (let i = 0; i < n; i++) {
    result.push({ value: cursor, label: formatMonthLabel(cursor) });
    cursor = previousMonthOf(cursor);
  }
  return result;
}
