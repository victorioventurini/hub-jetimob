/**
 * LLM Models — Catálogo central de modelos suportados pelo Lovable AI Gateway.
 *
 * Use estes valores em vez de strings literais nas edge functions de IA.
 * Centraliza atualizações de modelo (ex: trocar gemini-2.5-flash por 3-flash)
 * em um único lugar.
 *
 * Para mudar o modelo padrão de uma função, prefira ajustar este arquivo a
 * editar cada função individual.
 *
 * @module _shared/llm-models
 */

/** Família Google Gemini. */
export const GEMINI_MODELS = {
  /** Top-tier — multimodal, contexto enorme, raciocínio complexo. */
  PRO_2_5: "google/gemini-2.5-pro",
  /** Preview da próxima geração. */
  PRO_3_1_PREVIEW: "google/gemini-3.1-pro-preview",
  /** Equilíbrio custo/qualidade — multimodal. */
  FLASH_2_5: "google/gemini-2.5-flash",
  /** Rápido e econômico — geração nova. */
  FLASH_3_PREVIEW: "google/gemini-3-flash-preview",
  /** Mais barato — classificação, resumos curtos. */
  FLASH_LITE_2_5: "google/gemini-2.5-flash-lite",
} as const;

/** Família OpenAI GPT. */
export const OPENAI_MODELS = {
  /** Powerhouse — raciocínio profundo, multimodal. */
  GPT_5: "openai/gpt-5",
  /** Custo médio — performance forte. */
  GPT_5_MINI: "openai/gpt-5-mini",
  /** Mais barato — alto volume, tarefas simples. */
  GPT_5_NANO: "openai/gpt-5-nano",
  /** Última geração — raciocínio aprimorado. */
  GPT_5_2: "openai/gpt-5.2",
} as const;

/**
 * Defaults por caso de uso.
 *
 * Trocar aqui afeta TODAS as funções que usam o default. Para overrides
 * pontuais, passe explicitamente o modelo na chamada.
 */
export const DEFAULT_MODELS = {
  /** Resumos de rituais, e-mails curtos, ata de reunião. */
  SUMMARY: GEMINI_MODELS.FLASH_3_PREVIEW,
  /** Análises profundas (relatório executivo QBR, construction review). */
  ANALYSIS: GEMINI_MODELS.PRO_2_5,
  /** Conversas / agente Vic. */
  CHAT: GEMINI_MODELS.FLASH_2_5,
  /** Classificação rápida (rotular, categorizar). */
  CLASSIFICATION: GEMINI_MODELS.FLASH_LITE_2_5,
} as const;

/** Parâmetros LLM padrão. */
export const LLM_DEFAULTS = {
  /** Temperatura conservadora (resumos factuais). */
  TEMPERATURE_FACTUAL: 0.2,
  /** Temperatura média (análises, planos). */
  TEMPERATURE_BALANCED: 0.5,
  /** Temperatura criativa (sugestões, redação). */
  TEMPERATURE_CREATIVE: 0.8,
  /** Tokens máximos default. */
  MAX_TOKENS: 4096,
  /** Tokens máximos para resumos curtos. */
  MAX_TOKENS_SHORT: 1024,
  /** Tokens máximos para relatórios extensos. */
  MAX_TOKENS_REPORT: 8192,
  /** Retentativas em falha transitória. */
  RETRY_COUNT: 2,
  /** Timeout por chamada (ms). */
  TIMEOUT_MS: 60_000,
} as const;

export type LlmModelId =
  | (typeof GEMINI_MODELS)[keyof typeof GEMINI_MODELS]
  | (typeof OPENAI_MODELS)[keyof typeof OPENAI_MODELS];
