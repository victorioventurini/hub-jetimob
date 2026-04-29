/**
 * Wizard Vocabulary — SSOT canônico de enums transversais aos ritos.
 *
 * Este módulo concentra os vocabulários compartilhados entre Pré-Weekly,
 * Weekly, MBR, QBR (Pre, C-Level, Meeting, Post) e Team Checkin. Antes,
 * cada enum era declarado inline em `shared.ts`/`qbr.ts`/`weekly.ts` como
 * union de string literals — qualquer renomeio quebrava parcialmente.
 *
 * Princípio: os literais NÃO mudam. Snapshots persistidos em
 * `okr_wizard_sessions.reflection_data` continuam válidos. Esta refatoração
 * é puramente estrutural (centraliza tipos), sem migração de dados.
 *
 * Onda 2 — Fase 4 (vocabulário canônico).
 */

// ============================================================
// DECISÕES (compartilhado entre Team Checkin, MBR, QBR, Weekly)
// ============================================================

/** Categorias possíveis de uma `TeamCheckinDecision`. */
export type DecisionCategory =
  | 'decision'
  | 'focus_adjustment'
  | 'next_step'
  | 'strategic_proposal';

export const DECISION_CATEGORIES: readonly DecisionCategory[] = [
  'decision',
  'focus_adjustment',
  'next_step',
  'strategic_proposal',
] as const;

// ============================================================
// DIRETIVAS C-LEVEL (QBR Pre C-Level)
// ============================================================

/** Categorias de diretiva emitida pelo C-Level no QBR Pre. */
export type DirectiveCategory =
  | 'strategic_question'
  | 'hypothesis'
  | 'non_priority'
  | 'challenge';

export const DIRECTIVE_CATEGORIES: readonly DirectiveCategory[] = [
  'strategic_question',
  'hypothesis',
  'non_priority',
  'challenge',
] as const;

/**
 * Mapeamento canônico para promover uma diretiva C-Level a decisão durante
 * o QBR Meeting. Derivado da semântica atual:
 * - `strategic_question` → `next_step` (questão exige investigação/ação)
 * - `hypothesis` → `strategic_proposal` (hipótese vira proposta a validar)
 * - `non_priority` → `focus_adjustment` (despriorização ajusta foco)
 * - `challenge` → `decision` (desafio direto exige decisão)
 *
 * Consumidores podem importar e aplicar quando promoverem
 * `directive → TeamCheckinDecision`. Não há UI consumindo este map ainda.
 */
export const DIRECTIVE_TO_DECISION_MAP: Record<DirectiveCategory, DecisionCategory> = {
  strategic_question: 'next_step',
  hypothesis: 'strategic_proposal',
  non_priority: 'focus_adjustment',
  challenge: 'decision',
};

// ============================================================
// BLOCOS TEMÁTICOS (Pré-Weekly + Weekly)
// ============================================================

/**
 * Bloco temático canônico de um item de pauta de rito recorrente.
 * Substitui o antigo `WeeklyThemeBlock`.
 */
export type RitualBlock = 'performance' | 'projetos' | 'pessoas';

export const RITUAL_BLOCKS: readonly RitualBlock[] = [
  'performance',
  'projetos',
  'pessoas',
] as const;

/**
 * Subset de `RitualBlock` aplicável aos temas selecionados pelo gestor no
 * Pré-Weekly. Pessoas é tratado em etapa dedicada (Step 3) e não aparece
 * como categoria de tema na Pauta. Mantemos o tipo `PreWeeklyTopicCategory`
 * em `weekly.ts` como alias para retrocompat de imports existentes.
 */
export type PreWeeklyBlock = Exclude<RitualBlock, 'pessoas'>;

// ============================================================
// SINAIS DE PESSOAS (Pré-Weekly Step 3)
// ============================================================

/** Tipo de sinal estrutural reportado no Step Pessoas do Pré-Weekly. */
export type RitualPeopleSignalType =
  | 'celebracao'
  | 'risco'
  | 'mudanca'
  | 'feedback';

export const RITUAL_PEOPLE_SIGNAL_TYPES: readonly RitualPeopleSignalType[] = [
  'celebracao',
  'risco',
  'mudanca',
  'feedback',
] as const;

// ============================================================
// AÇÕES TEMÁTICAS (Weekly — curadoria do orquestrador)
// ============================================================

/**
 * Tipo de ação/sinalização aplicado a um tema curado da Weekly.
 * Substitui o antigo `WeeklyThemeType`.
 */
export type RitualThemeActionType =
  | 'risco'
  | 'oportunidade'
  | 'decisao'
  | 'celebracao'
  | 'alerta';

export const RITUAL_THEME_ACTION_TYPES: readonly RitualThemeActionType[] = [
  'risco',
  'oportunidade',
  'decisao',
  'celebracao',
  'alerta',
] as const;
