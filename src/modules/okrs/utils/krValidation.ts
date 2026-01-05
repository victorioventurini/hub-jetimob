// KR Validation utilities
import type { OkrKrType } from '../types';

export interface KrValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Activity words that suggest this is a task, not a KR
const ACTIVITY_WORDS = [
  'criar',
  'implementar',
  'desenvolver',
  'fazer',
  'construir',
  'desenhar',
  'escrever',
  'configurar',
  'instalar',
  'lançar',
  'publicar',
  'entregar',
  'finalizar',
  'concluir',
  'terminar',
];

// Words that suggest measurable outcomes
const MEASURABLE_WORDS = [
  'aumentar',
  'reduzir',
  'melhorar',
  'atingir',
  'alcançar',
  'manter',
  'gerar',
  'obter',
  'conquistar',
  'elevar',
  'diminuir',
  'crescer',
];

export function validateKrTitle(title: string): KrValidationResult {
  const result: KrValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  const lowerTitle = title.toLowerCase().trim();

  // Check for activity words
  const foundActivityWord = ACTIVITY_WORDS.find((word) =>
    lowerTitle.startsWith(word)
  );

  if (foundActivityWord) {
    result.warnings.push(
      `Dica: "${foundActivityWord}" parece uma atividade. KRs devem descrever resultados mensuráveis, não tarefas.`
    );
  }

  // Check if it has measurable indicators
  const hasMeasurable = MEASURABLE_WORDS.some((word) =>
    lowerTitle.includes(word)
  );
  const hasNumber = /\d/.test(title);

  if (!hasMeasurable && !hasNumber) {
    result.warnings.push(
      'Dica: Considere incluir um verbo de resultado (aumentar, reduzir, atingir) ou um número específico.'
    );
  }

  return result;
}

export function validateKrValues(
  baseline: number,
  target: number,
  direction: 'up' | 'down'
): KrValidationResult {
  const result: KrValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Check if baseline equals target
  if (baseline === target) {
    result.isValid = false;
    result.errors.push('A meta não pode ser igual ao valor inicial.');
  }

  // Check direction coherence
  if (direction === 'up' && target < baseline) {
    result.warnings.push(
      'Atenção: A meta é menor que o valor inicial, mas a direção é crescente. Verifique se está correto.'
    );
  }

  if (direction === 'down' && target > baseline) {
    result.warnings.push(
      'Atenção: A meta é maior que o valor inicial, mas a direção é decrescente. Verifique se está correto.'
    );
  }

  return result;
}

/**
 * Validates if a KR type can contribute to an organizational KR
 * Rules:
 * - contribution: can contribute to org KRs
 * - enabler: cannot directly contribute to org KRs
 * - foundational: never contributes directly to org KRs
 */
export function canKrTypeContributeToOrg(krType: OkrKrType): boolean {
  return krType === 'contribution';
}

/**
 * Get explanation for KR type contribution rules
 */
export function getKrTypeContributionExplanation(krType: OkrKrType): string {
  switch (krType) {
    case 'contribution':
      return 'KRs de contribuição podem ser vinculados a KRs organizacionais.';
    case 'enabler':
      return 'KRs habilitadores não contribuem diretamente para KRs organizacionais, mas apoiam outros KRs do time.';
    case 'foundational':
      return 'KRs fundacionais são métricas de saúde que não contribuem para KRs organizacionais.';
  }
}

export function validateTeamKr(
  title: string,
  baseline: number,
  target: number,
  direction: 'up' | 'down',
  hasOrgObjective: boolean,
  krType?: OkrKrType,
  linkedOrgKrId?: string | null
): KrValidationResult {
  const titleValidation = validateKrTitle(title);
  const valueValidation = validateKrValues(baseline, target, direction);

  const result: KrValidationResult = {
    isValid: titleValidation.isValid && valueValidation.isValid,
    errors: [...titleValidation.errors, ...valueValidation.errors],
    warnings: [...titleValidation.warnings, ...valueValidation.warnings],
  };

  // Team KRs must have an org objective
  if (!hasOrgObjective) {
    result.isValid = false;
    result.errors.push(
      'KRs de time devem estar vinculados a um objetivo organizacional.'
    );
  }

  // Validate KR type and org KR linkage
  if (krType && linkedOrgKrId) {
    if (!canKrTypeContributeToOrg(krType)) {
      result.isValid = false;
      result.errors.push(
        `KRs do tipo "${krType}" não podem contribuir diretamente para KRs organizacionais.`
      );
    }
  }

  return result;
}

export function validateOrgKr(
  title: string,
  baseline: number,
  target: number,
  direction: 'up' | 'down'
): KrValidationResult {
  const titleValidation = validateKrTitle(title);
  const valueValidation = validateKrValues(baseline, target, direction);

  return {
    isValid: titleValidation.isValid && valueValidation.isValid,
    errors: [...titleValidation.errors, ...valueValidation.errors],
    warnings: [...titleValidation.warnings, ...valueValidation.warnings],
  };
}

/**
 * Validate KR metric configuration
 * Rules:
 * - KR must have exactly 1 primary KPI
 * - KR can have 0..N guardrail KPIs
 */
export function validateKrMetrics(
  primaryKpiId: string | null,
  guardrailKpiIds: string[]
): KrValidationResult {
  const result: KrValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  if (!primaryKpiId) {
    result.warnings.push(
      'Recomendado: Vincule um KPI primário para cálculo automático de progresso.'
    );
  }

  // Check for duplicates
  if (primaryKpiId && guardrailKpiIds.includes(primaryKpiId)) {
    result.isValid = false;
    result.errors.push('O KPI primário não pode ser também um guardrail.');
  }

  const uniqueGuardrails = new Set(guardrailKpiIds);
  if (uniqueGuardrails.size !== guardrailKpiIds.length) {
    result.isValid = false;
    result.errors.push('Não é possível adicionar o mesmo KPI guardrail mais de uma vez.');
  }

  return result;
}

// Placeholders for different KR types
export const ORG_KR_PLACEHOLDERS = [
  'Gerar R$ 400 mil de MRR incremental',
  'Atingir NRR médio de 100%',
  'Aumentar NPS para 75 pontos',
  'Reduzir CAC para R$ 500',
];

export const TEAM_KR_PLACEHOLDERS = [
  'Reduzir churn nos primeiros 90 dias para 2%',
  'Resolver 90% dos tickets críticos em até 24h',
  'Aumentar conversão de trial para 25%',
  'Diminuir tempo médio de onboarding para 5 dias',
];

export function getRandomPlaceholder(isOrgKr: boolean): string {
  const placeholders = isOrgKr ? ORG_KR_PLACEHOLDERS : TEAM_KR_PLACEHOLDERS;
  return placeholders[Math.floor(Math.random() * placeholders.length)];
}
