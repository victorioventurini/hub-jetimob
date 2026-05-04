/**
 * Ritual Evaluation Query Keys
 *
 * Chaves canônicas para o sistema de avaliação anônima de ritos coletivos
 * (MBR, MBR-first, QBR-Meeting, QBR-Post). Padrão:
 *   ['ritualEvaluation', <subdomain>, ...args].
 */

export const ritualEvaluationKeys = {
  /** Prefixo global */
  all: () => ['ritualEvaluation'] as const,

  /** Prefixo de formulário público */
  formPrefix: () => ['ritualEvaluation', 'form'] as const,
  /** Form público resolvido por short-code */
  form: (shortCode: string | null) =>
    ['ritualEvaluation', 'form', shortCode] as const,

  /** Prefixo de contador ao vivo */
  liveCountPrefix: () => ['ritualEvaluation', 'liveCount'] as const,
  /** Contador ao vivo X de Y */
  liveCount: (sessionId: string | null) =>
    ['ritualEvaluation', 'liveCount', sessionId] as const,

  /** Prefixo de resumo agregado */
  summaryPrefix: () => ['ritualEvaluation', 'summary'] as const,
  /** Médias agregadas das 4 dimensões + counts */
  summary: (sessionId: string | null) =>
    ['ritualEvaluation', 'summary', sessionId] as const,

  /** Prefixo de respostas abertas */
  openAnswersPrefix: () => ['ritualEvaluation', 'openAnswers'] as const,
  /** Lista de citações anônimas (só pós-fechamento) */
  openAnswers: (sessionId: string | null) =>
    ['ritualEvaluation', 'openAnswers', sessionId] as const,
} as const;
