/**
 * ENTITY_NAME_LIMITS — Fonte única de verdade dos limites máximos de caracteres
 * para títulos/nomes das principais entidades do Next.
 *
 * ⚠️ REGRA INQUEBRÁVEL:
 * Estes valores DEVEM permanecer sincronizados com os triggers de validação
 * no banco (ver migration `validate_*_name_length`):
 *   - validate_org_objective_title_length      → ORG_OBJECTIVE_TITLE
 *   - validate_team_objective_title_length     → TEAM_OBJECTIVE_TITLE
 *   - validate_kr_title_length                 → KEY_RESULT_TITLE
 *   - validate_initiative_name_length          → INITIATIVE_NAME
 *   - validate_project_name_length             → PROJECT_NAME
 *   - validate_milestone_name_length           → MILESTONE_NAME
 *
 * Qualquer alteração aqui exige migration correspondente nos triggers.
 *
 * Consumidores:
 *   - Schemas Zod nos dialogs/wizards de criação/edição
 *   - Componente <CharCountFeedback> para exibir contador {n}/{max}
 *   - Validação espelhada em Edge Functions (supabase/functions/_shared/schemas.ts)
 *
 * NUNCA hardcode esses números — sempre importe daqui.
 */
export const ENTITY_NAME_LIMITS = {
  /** Objetivo Organizacional (`okr_org_objectives.title`). */
  ORG_OBJECTIVE_TITLE: 120,
  /** Objetivo de Time (`okr_team_objectives.title`). */
  TEAM_OBJECTIVE_TITLE: 120,
  /** Resultado-Chave (`okr_team_key_results.title`). */
  KEY_RESULT_TITLE: 160,
  /** Iniciativa (`okr_initiatives.name`). */
  INITIATIVE_NAME: 120,
  /** Projeto (`projects.name`). */
  PROJECT_NAME: 100,
  /** Milestone de projeto (`project_milestones.name`). */
  MILESTONE_NAME: 80,
} as const;

export type EntityNameLimitKey = keyof typeof ENTITY_NAME_LIMITS;
