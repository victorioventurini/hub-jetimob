/**
 * OKR_LIMITS — Fonte única de verdade dos limites metodológicos de OKRs no Next.
 *
 * ⚠️ REGRA INQUEBRÁVEL:
 * Estes valores DEVEM permanecer sincronizados com os triggers do banco:
 *   - public.validate_max_team_objectives  → MAX_OBJECTIVES_PER_TEAM
 *   - public.validate_max_kr_per_objective → MAX_KRS_PER_OBJECTIVE
 *
 * Qualquer alteração aqui exige migration correspondente nos triggers.
 *
 * Consumidores:
 *   - Wizards (criação/edição de OKRs e KRs)
 *   - Dialogs de formulário (Org/Team KR/Objective)
 *   - Tela de Configurações de OKRs (LimitsTab)
 *   - Validators (validateObjectivesLimit / validateKrsLimit)
 *   - Tooltips e mensagens educacionais
 *
 * NUNCA hardcode os números 3 ou 4 em outros lugares — sempre importe daqui.
 */
export const OKR_LIMITS = {
  /** Máx. objetivos ativos (status != cancelled) por time. */
  MAX_OBJECTIVES_PER_TEAM: 4,
  /** Máx. KRs ativos (deleted_at IS NULL) por objetivo. */
  MAX_KRS_PER_OBJECTIVE: 4,
  /** Máx. entidades de nível superior que um KR pode contribuir. */
  MAX_CONTRIBUTIONS_PER_KR: 3,
} as const;

export type OkrLimitKey = keyof typeof OKR_LIMITS;
