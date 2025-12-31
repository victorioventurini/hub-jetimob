// KR Validation utilities

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

export function validateTeamKr(
  title: string,
  baseline: number,
  target: number,
  direction: 'up' | 'down',
  hasOrgObjective: boolean
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
