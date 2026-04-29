/**
 * Wizard Types — Pré-Weekly + Weekly (Onda 4)
 *
 * Pré-Weekly: destilação individual do gestor.
 * Weekly: rito coletivo da BU com curadoria do agente orquestrador.
 */

import type { TeamCheckinDecision } from './shared';
import type {
  PreWeeklyBlock,
  RitualBlock,
  RitualPeopleSignalType,
  RitualThemeActionType,
} from './vocabulary';

// Re-export para retrocompat de imports antigos.
export type { RitualBlock, RitualPeopleSignalType, RitualThemeActionType };
/** @deprecated Use `RitualBlock` from `./vocabulary`. */
export type WeeklyThemeBlock = RitualBlock;
/** @deprecated Use `RitualThemeActionType` from `./vocabulary`. */
export type WeeklyThemeType = RitualThemeActionType;

// ============================================================
// PRÉ-WEEKLY (DESTILAÇÃO INDIVIDUAL DA SEMANA)
// ============================================================

export type PreWeeklyStep = 'sources' | 'pauta' | 'pessoas' | 'summary';

/**
 * Categorização do tema selecionado para subir à Weekly da BU.
 * Performance = números/KPIs/KRs do time. Projetos = entregas estruturais.
 * Pessoas é tratado em etapa dedicada (Step 3) — não aparece como categoria de tema.
 */
export type PreWeeklyTopicCategory = PreWeeklyBlock;
/**
 * @deprecated Removido da Pauta — todos os temas selecionados são, por definição, prioritários.
 * Mantido apenas para compatibilidade de leitura de drafts antigos.
 */
export type PreWeeklyTopicPriority = 'low' | 'medium' | 'high';

export interface PreWeeklyTopic {
  id: string;
  title: string;
  category: PreWeeklyTopicCategory;
  /** @deprecated Removido da UI — drafts antigos podem trazer este campo. */
  priority?: PreWeeklyTopicPriority;
  /** Resumo livre do contexto/decisão proposta */
  context?: string;
}

export interface PreWeeklyPeopleSignal {
  id: string;
  /** Tipo de sinal estrutural */
  type: RitualPeopleSignalType;
  description: string;
}

/** Draft data do Pré-Weekly — escopo individual do gestor */
export interface PreWeeklyDraftData {
  /** Semana de referência (YYYY-MM-DD da segunda-feira) */
  referenceWeek: string;
  /**
   * @deprecated Removido do Step 1 em 2026-04-27 (Reflexão livre não pertence à
   * preparação; a produção começa no Step 2). Mantido como opcional para
   * retrocompat de drafts antigos — não exibido em UI nova.
   */
  sourcesReflection?: string;
  /** Até 3 temas que sobem para a Weekly (Step 2) */
  topics: PreWeeklyTopic[];
  /** Sinais de pessoas (Step 3) */
  peopleSignals: PreWeeklyPeopleSignal[];
  /** Decisões registradas inline ao longo dos steps */
  decisions: TeamCheckinDecision[];
}

// ============================================================
// WEEKLY (RITO EXECUTIVO DA BU)
// ============================================================

export type WeeklyStep =
  | 'executive-opening'
  | 'priorities'
  | 'people'
  | 'closing';

/** Bloco temático curado pelo agente curador-orquestrador.
 *  Aliases `WeeklyThemeBlock` e `WeeklyThemeType` declarados no topo do arquivo. */

export interface WeeklyTheme {
  id: string;
  title: string;
  block: WeeklyThemeBlock;
  type: WeeklyThemeType;
  motivation: string;
  suggestedDecision?: string;
  affectedTeams: string[];
}

/** Estados do rascunho da Abertura Executiva (curadoria IA + revisão humana). */
export type WeeklyOpeningState = 'draft' | 'reviewed' | 'approved';
export type WeeklyOpeningOrigin = 'ai-curated' | 'manual';

export interface WeeklyOpeningTransition {
  state: WeeklyOpeningState;
  at: string;
  by: string | null;
}

export interface WeeklyExecutiveOpening {
  state: WeeklyOpeningState;
  origin: WeeklyOpeningOrigin;
  generatedAt: string | null;
  summary: string;
  themes: WeeklyTheme[];
  alertsByBlock: { performance: string[]; projetos: string[]; pessoas: string[] };
  offAgenda: string[];
  suggestedOrder: { themeId: string; minutes: number }[];
  transitions: WeeklyOpeningTransition[];
}

export interface WeeklyPriorityItem {
  id: string;
  sourcePreWeeklyId: string;
  teamId: string | null;
  /** @deprecated Onda 4 Fase 1 — Resolver via lookup `useTeams` por `teamId`. */
  teamName: string;
  topic: PreWeeklyTopic;
}

export interface WeeklyPeopleSignalAggregated {
  id: string;
  sourcePreWeeklyId: string;
  teamId: string | null;
  /** @deprecated Onda 4 Fase 1 — Resolver via lookup `useTeams` por `teamId`. */
  teamName: string;
  signal: PreWeeklyPeopleSignal;
}

/** Draft data da Weekly — escopo coletivo da BU. */
export interface WeeklyDraftData {
  /** Semana de referência (YYYY-MM-DD da segunda-feira) */
  referenceWeek: string;
  /** Abertura Executiva curada (ou manual) */
  executiveOpening: WeeklyExecutiveOpening;
  /** Notas livres do facilitador no Step de Prioridades */
  prioritiesNotes: string;
  /** Notas livres no Step de Pessoas */
  peopleNotes: string;
  /** Encerramento (checklist + ata) */
  closing: { checklist: Record<string, boolean>; minutes: string };
  /** Decisões registradas inline ao longo dos steps */
  decisions: TeamCheckinDecision[];
}
