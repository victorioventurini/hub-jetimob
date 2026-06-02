/**
 * numberFormat — helpers de máscara/parse pt-BR para valores de KPI.
 *
 * - `parseBrNumber` tolera tanto pt-BR (`1.234,56`) quanto en-US (`1,234.56` / `1234.56`)
 *   para suportar paste vindo de planilhas.
 * - `formatBrNumber` formata em pt-BR com casas decimais controladas.
 * - `getMaskConfigForUnit` mapeia a unidade textual livre do KPI (`R$`, `%`,
 *   `Clientes`, etc.) para uma config de máscara.
 */

export type KpiMaskStyle = 'currency' | 'percent' | 'decimal';

export interface KpiMaskConfig {
  style: KpiMaskStyle;
  /** Casas decimais a renderizar quando o número é formatado. */
  decimals: number;
  /** Casas decimais máximas que o usuário pode digitar (>= decimals). */
  maxDecimals: number;
  /** Texto que aparece antes do número (ex.: "R$"). */
  prefix?: string;
  /** Texto que aparece depois do número (ex.: "%", "Clientes"). */
  suffix?: string;
}

/**
 * Decide a máscara a aplicar com base na string livre `unit` que o KPI carrega.
 * Comparação case/space-insensitive e tolerante a variações comuns.
 */
export function getMaskConfigForUnit(unit: string | null | undefined): KpiMaskConfig {
  const u = (unit ?? '').trim();
  const lower = u.toLowerCase();

  // Moeda
  if (u === 'R$' || lower === 'r$' || lower === 'brl' || lower === 'reais') {
    return { style: 'currency', decimals: 2, maxDecimals: 2, prefix: 'R$' };
  }

  // Percentual
  if (u === '%' || lower === 'percent' || lower === 'pct' || lower === 'percentual') {
    return { style: 'percent', decimals: 0, maxDecimals: 2, suffix: '%' };
  }

  // Demais — número decimal com sufixo opcional
  return {
    style: 'decimal',
    decimals: 0,
    maxDecimals: 2,
    suffix: u || undefined,
  };
}

/**
 * Converte uma string digitada/colada em número.
 * Retorna `null` quando vazia ou inválida.
 *
 * Heurística:
 * - Remove tudo que não é dígito, `,`, `.` ou `-`.
 * - Se há `,` na string → trata `.` como milhar e `,` como decimal (pt-BR).
 * - Senão → trata `.` como decimal (en-US / dígito puro).
 */
export function parseBrNumber(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;

  const cleaned = String(input).replace(/[^\d,.\-]/g, '').trim();
  if (cleaned === '' || cleaned === '-' || cleaned === ',' || cleaned === '.') return null;

  let normalized: string;
  if (cleaned.includes(',')) {
    // pt-BR: remover separadores de milhar (.) e trocar , por .
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = cleaned;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/**
 * Formata um número em pt-BR. Sem prefixo/sufixo — quem chama monta o display.
 *
 * `decimals` controla o piso de casas decimais; `maxDecimals` o teto. Quando
 * `decimals === 0` e o número é inteiro, retorna sem casas; números com fração
 * são renderizados até `maxDecimals`.
 */
export function formatBrNumber(
  n: number | null | undefined,
  opts: { decimals: number; maxDecimals: number },
): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: opts.decimals,
    maximumFractionDigits: Math.max(opts.decimals, opts.maxDecimals),
  }).format(n);
}

/**
 * Conveniência: aplica `formatBrNumber` + prefixo/sufixo conforme a máscara.
 */
export function formatWithMask(
  n: number | null | undefined,
  cfg: KpiMaskConfig,
): string {
  const body = formatBrNumber(n, { decimals: cfg.decimals, maxDecimals: cfg.maxDecimals });
  if (body === '') return '';
  const prefix = cfg.prefix ? `${cfg.prefix} ` : '';
  const suffix = cfg.suffix ? ` ${cfg.suffix}` : '';
  return `${prefix}${body}${suffix}`;
}
