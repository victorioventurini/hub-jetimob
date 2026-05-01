/**
 * Ritual Labels — Single Source of Truth (SSOT)
 *
 * Mapa canônico de labels exibidos ao usuário para cada `WizardPersona`,
 * bem como labels de cada **step** dentro de cada rito (organizados por
 * versão estrutural — v1 = pré-padronização; v2/v3/v4 = ondas do framework
 * unificado de ritos).
 *
 * Todos os hooks, componentes, cards, headers e filtros DEVEM importar
 * `RITUAL_LABELS`, `RITUAL_STEP_LABELS`, `getRitualLabel()` ou
 * `getStepLabel()` deste módulo. Nunca duplicar.
 *
 * IMPORTANTE:
 * - Slugs técnicos (`WizardPersona`) permanecem inalterados.
 * - Labels de personas históricas/descontinuadas mantêm sufixo
 *   identificador para preservar legibilidade do histórico.
 * - Cada step ganha versão (`v1`, `v2`, ...) — sessões antigas continuam
 *   exibindo labels da versão original gravada em
 *   `okr_wizard_sessions.structure_version`.
 */

import type { WizardPersona } from '../types/wizard';

export const RITUAL_LABELS: Record<WizardPersona, string> = {
  // Ativos
  'collaborator': 'Check-in Individual',
  'leader-prep': 'Pré-Check-in do Time',
  'team-checkin': 'Check-in do Time',
  'team-okr-creation': 'Criação de OKRs do Time',
  'team-kr-creation': 'Criação de KRs do Time',
  'pre-weekly': 'Pré-Weekly',
  'weekly': 'Weekly',
  'mbr-pre': 'Pré-MBR',
  'mbr': 'MBR',
  'qbr-pre': 'Pré-QBR',
  'qbr-pre-clevel': 'Pré-QBR Executivo',
  'qbr-meeting': 'QBR',
  'qbr-post': 'Pós-QBR',

  // Históricos / descontinuados (back-compat de registros antigos)
  'managers-checkin': 'Check-in de Gestores (descontinuado)',
  'clevel-checkin': 'Check-in Executivo (descontinuado)',
  'mbr-first': 'MBR (histórico)',
  'mbr-pre-first': 'Pré-MBR (histórico)',
};

/**
 * Retorna o label canônico do rito ou o slug, caso a persona seja desconhecida.
 */
export function getRitualLabel(persona: WizardPersona | string): string {
  return (RITUAL_LABELS as Record<string, string>)[persona] ?? String(persona);
}

// ============================================================
// STEP LABELS — por versão estrutural
// ============================================================

export type StructureVersion = 'v1' | 'v2' | 'v3' | 'v4';

export interface StepLabel {
  /** Título exibido no WizardStepHeader */
  title: string;
  /** Subtítulo/descrição opcional */
  subtitle?: string;
  /** Label curto (badges, breadcrumbs, stepper compacto) */
  shortLabel?: string;
}

/**
 * Mapa: persona → versão estrutural → stepId → label.
 *
 * Convenção:
 * - Sessões `v1` continuam usando os labels históricos definidos em
 *   `WIZARD_CONFIGS` em `types/wizard.ts` (não duplicar aqui).
 * - A partir de `v2`, este SSOT é a fonte canônica para os steps do
 *   framework unificado (`framework/components/`).
 */
export const RITUAL_STEP_LABELS: Partial<
  Record<WizardPersona, Partial<Record<StructureVersion, Record<string, StepLabel>>>>
> = {
  // ============= Onda 1 =============
  'collaborator': {
    v2: {
      'opening': { title: 'Abertura', subtitle: 'Como você chega para essa semana?', shortLabel: 'Abertura' },
      'kpis': { title: 'KPIs', subtitle: 'Indicadores que você acompanha', shortLabel: 'KPIs' },
      'krs': { title: 'KRs', subtitle: 'Atualize seus Resultados-Chave', shortLabel: 'KRs' },
      'projects-initiatives': { title: 'Projetos e Iniciativas', subtitle: 'Onde você está envolvido', shortLabel: 'Projetos' },
      'pending-decisions': { title: 'Pendências e Decisões', subtitle: 'Itens pessoais e deliberações', shortLabel: 'Pendências' },
      'reflection': { title: 'Reflexão', subtitle: 'Espaço para introspecção', shortLabel: 'Reflexão' },
      'summary': { title: 'Resumo e Envio', subtitle: 'Revise antes de enviar', shortLabel: 'Resumo' },
    },
  },
  'leader-prep': {
    v2: {
      'balance': { title: 'Balanço da Semana', subtitle: 'Onde seu time chegou essa semana?', shortLabel: 'Balanço' },
      'kpis': { title: 'KPIs do Time', subtitle: 'Sinais vitais do time', shortLabel: 'KPIs' },
      'krs-attention': { title: 'KRs em Atenção', subtitle: 'KRs que mudaram de estado na semana', shortLabel: 'KRs' },
      'projects-initiatives': { title: 'Projetos e Iniciativas', subtitle: 'Execução do time', shortLabel: 'Projetos' },
      'highlights-risks': { title: 'Destaques e Riscos', subtitle: 'Acelerou, travou, atenção', shortLabel: 'Destaques' },
      'leader-insights': { title: 'Insights do Time', subtitle: 'Pontos identificados pelo sistema e pela IA', shortLabel: 'Insights' },
      'prep': { title: 'Preparação da Pauta', subtitle: 'Marque KRs para discutir em grupo ou em 1:1', shortLabel: 'Preparação' },
      'agenda': { title: 'Preparação da Pauta', subtitle: 'Pauta do check-in coletivo', shortLabel: 'Pauta' },
      'summary': { title: 'Resumo e Envio', subtitle: 'Revise antes de compartilhar', shortLabel: 'Resumo' },
    },
  },

  // ============= Onda 2 =============
  'team-checkin': {
    v3: {
      'opening': { title: 'Abertura', subtitle: 'Contexto da reunião', shortLabel: 'Abertura' },
      'kpi-gate': { title: 'KPI Gate', subtitle: 'KPIs em alerta — decidir antes de avançar', shortLabel: 'KPI Gate' },
      'krs-attention': { title: 'KRs em Atenção', subtitle: 'KRs marcados pelo líder ou que mudaram de estado', shortLabel: 'KRs' },
      'projects-initiatives': { title: 'Projetos e Iniciativas', subtitle: 'Execução em foco', shortLabel: 'Projetos' },
      'highlights-risks': { title: 'Destaques e Riscos', subtitle: 'Acelerou, travou, atenção', shortLabel: 'Destaques' },
      'decisions': { title: 'Decisões', subtitle: 'Consolidar deliberações da reunião', shortLabel: 'Decisões' },
      'closing': { title: 'Encerramento', subtitle: 'Checklist e ata', shortLabel: 'Encerramento' },
    },
  },
  'mbr-pre': {
    v3: {
      'balance': { title: 'Balanço do Mês', subtitle: 'Onde seu time chegou neste mês?', shortLabel: 'Balanço' },
      'kpis': { title: 'KPIs do Time', subtitle: 'Indicadores do mês', shortLabel: 'KPIs' },
      'krs': { title: 'KRs', subtitle: 'Resultados-Chave do mês', shortLabel: 'KRs' },
      'projects': { title: 'Projetos', subtitle: 'Projetos do time no mês', shortLabel: 'Projetos' },
      'highlights-risks': { title: 'Destaques e Riscos', subtitle: 'Acelerou, travou, atenção', shortLabel: 'Destaques' },
      'next-steps': { title: 'Próximos Passos', subtitle: 'Plano de ação para o próximo mês', shortLabel: 'Próximos Passos' },
      'summary': { title: 'Resumo e Envio', subtitle: 'Revise antes de enviar para o MBR', shortLabel: 'Resumo' },
    },
  },
  'qbr-pre': {
    v3: {
      'balance': { title: 'Balanço do Ciclo', subtitle: 'Onde seu time chegou neste quarter?', shortLabel: 'Balanço' },
      'kpis-cycle': { title: 'KPIs do Ciclo', subtitle: 'Performance dos indicadores no ciclo', shortLabel: 'KPIs' },
      'krs-cycle': { title: 'KRs do Ciclo', subtitle: 'Resultados-Chave do ciclo', shortLabel: 'KRs' },
      'projects-cycle': { title: 'Projetos do Ciclo', subtitle: 'Projetos do time no ciclo', shortLabel: 'Projetos' },
      'learnings-risks': { title: 'Aprendizados e Riscos', subtitle: 'O que funcionou, o que não funcionou, débitos', shortLabel: 'Aprendizados' },
      'okr-proposal': { title: 'Proposta de OKRs', subtitle: 'OKRs para o próximo ciclo', shortLabel: 'Proposta' },
      'summary': { title: 'Resumo e Envio', subtitle: 'Revise antes de enviar para o QBR', shortLabel: 'Resumo' },
    },
  },

  // ============= Onda 3 =============
  'mbr': {
    v4: {
      'opening-executive': { title: 'Abertura Executiva', subtitle: 'Panorama do mês', shortLabel: 'Abertura' },
      'kpi-gate': { title: 'KPI Gate', subtitle: 'KPIs em alerta — decidir antes de avançar', shortLabel: 'KPI Gate' },
      'teams-overview': { title: 'Overview dos Times', subtitle: 'Triagem visual de saúde por time', shortLabel: 'Overview' },
      'team-analysis': { title: 'Análise por Time', subtitle: 'Aprofundamento time a time', shortLabel: 'Análise' },
      'org-okrs': { title: 'OKRs Organizacionais', subtitle: 'Cobertura e progresso dos OKRs da BU', shortLabel: 'OKRs Org' },
      'strategic-projects': { title: 'Projetos Estratégicos', subtitle: 'Projetos cross-team com impacto estratégico', shortLabel: 'Projetos' },
      'decisions': { title: 'Decisões', subtitle: 'Decisões + carry-over do QBR', shortLabel: 'Decisões' },
      'closing': { title: 'Encerramento', subtitle: 'Checklist, feedback e ata', shortLabel: 'Encerramento' },
    },
  },
  'qbr-meeting': {
    v4: {
      'opening-executive': { title: 'Abertura Executiva', subtitle: 'Contexto e KPIs do ciclo', shortLabel: 'Abertura' },
      'okr-approval': { title: 'Aprovação de OKRs', subtitle: 'Aprovar, ajustar ou descartar OKRs propostos', shortLabel: 'Aprovação' },
      'decisions': { title: 'Decisões', subtitle: 'Decisões + compromissos cross-área', shortLabel: 'Decisões' },
      'closing': { title: 'Encerramento', subtitle: 'Checklist, feedback e próximos 30 dias', shortLabel: 'Encerramento' },
    },
  },
  'qbr-post': {
    v4: {
      'okr-promotion': { title: 'Promoção de OKRs', subtitle: 'Promover OKRs aprovados para o novo ciclo', shortLabel: 'Promoção' },
      'decisions-adjustments': { title: 'Decisões e Ajustes', subtitle: 'Formalizar deliberações e ajustes operacionais', shortLabel: 'Decisões' },
      'commitments-followup': { title: 'Compromissos e Follow-up', subtitle: 'Compromissos cross-time com cadência', shortLabel: 'Compromissos' },
      'closing': { title: 'Encerramento', subtitle: 'Ata executiva e comunicação final', shortLabel: 'Encerramento' },
    },
  },

  // ============= Onda 4 — Ritos semanais =============
  'pre-weekly': {
    v2: {
      'sources': { title: 'Suas fontes desta semana', subtitle: 'O que você já registrou e vai destilar', shortLabel: 'Fontes' },
      'pauta': { title: 'Preparação da Pauta', subtitle: 'Selecione até 3 temas que sobem para a BU', shortLabel: 'Pauta' },
      'pessoas': { title: 'Pessoas', subtitle: 'Sinais estruturais do time para a Weekly', shortLabel: 'Pessoas' },
      'summary': { title: 'Resumo e Envio', subtitle: 'Revise antes de enviar para o Weekly', shortLabel: 'Resumo' },
    },
  },
  'weekly': {
    v2: {
      'executive-opening': { title: 'Abertura Executiva', subtitle: 'Curadoria da pauta consolidada da BU', shortLabel: 'Abertura' },
      'priorities': { title: 'Prioridades da Semana', subtitle: 'Temas cross-times de Performance e Projetos', shortLabel: 'Prioridades' },
      'people': { title: 'Pessoas', subtitle: 'Temas e sinais estruturais sobre o time da BU', shortLabel: 'Pessoas' },
      'closing': { title: 'Encerramento', subtitle: 'Checklist e ata da Weekly', shortLabel: 'Encerramento' },
    },
  },
};

/**
 * Retorna o label de um step do rito conforme sua versão estrutural.
 *
 * Fallback: se a versão não tiver definição para o step, devolve um label
 * mínimo derivado do `stepId` (sentinel) — útil para evitar renderização
 * vazia em sessões legadas que tentem usar este caminho.
 */
export function getStepLabel(
  persona: WizardPersona | string,
  stepId: string,
  version: StructureVersion = 'v2',
): StepLabel {
  const personaMap = (RITUAL_STEP_LABELS as Record<string, Partial<Record<StructureVersion, Record<string, StepLabel>>>>)[persona];
  const versionMap = personaMap?.[version];
  const label = versionMap?.[stepId];
  if (label) return label;
  return { title: stepId, shortLabel: stepId };
}

// ============================================================
// RITUAL GREETING — Saudação contextual no Step 1
// ============================================================

/**
 * Cadência do rito — define quais badges contextuais aparecem na saudação.
 * - weekly: Semana N · Ciclo · Nº ordinal de check-in
 * - monthly: Mês/Ano · Ciclo · Mês X do quarter
 * - quarterly: Ciclo que encerra → Ciclo que abre
 */
export type RitualCadence = 'weekly' | 'monthly' | 'quarterly';

/**
 * SSOT: frase contextual + cadência por persona, usada por <RitualGreeting>.
 *
 * Wizards de criação (`team-okr-creation`, `team-kr-creation`) e personas
 * descontinuadas não têm entrada — a saudação não é renderizada nesses casos.
 */
export const RITUAL_GREETING_PHRASES: Partial<
  Record<WizardPersona, { phrase: string; cadence: RitualCadence }>
> = {
  'collaborator':     { phrase: 'Vamos revisar sua semana?',                       cadence: 'weekly' },
  'leader-prep':      { phrase: 'Hora de preparar o check-in do seu time.',        cadence: 'weekly' },
  'team-checkin':     { phrase: 'Vamos alinhar o time esta semana.',               cadence: 'weekly' },
  'pre-weekly':       { phrase: 'O que do seu time precisa da atenção da BU?',     cadence: 'weekly' },
  'weekly':           { phrase: 'Vamos alinhar a BU esta semana.',                 cadence: 'weekly' },
  'mbr-pre':          { phrase: 'Como seu time chega neste mês?',                  cadence: 'monthly' },
  'mbr':              { phrase: 'Vamos revisar o mês da BU.',                      cadence: 'monthly' },
  'qbr-pre':          { phrase: 'Hora de fechar o ciclo do seu time.',             cadence: 'quarterly' },
  'qbr-pre-clevel':   { phrase: 'Hora da leitura estratégica do ciclo.',           cadence: 'quarterly' },
  'qbr-meeting':      { phrase: 'Vamos revisar e planejar o próximo ciclo.',       cadence: 'quarterly' },
  'qbr-post':         { phrase: 'Hora de formalizar o que foi decidido.',          cadence: 'quarterly' },
};

export function getRitualGreetingConfig(persona: WizardPersona | string) {
  return (RITUAL_GREETING_PHRASES as Record<string, { phrase: string; cadence: RitualCadence } | undefined>)[persona];
}

// ============================================================
// AGENDA SUGGESTION TRIGGER LABELS (rodapé dos steps preparatórios)
// ============================================================

/**
 * Texto do trigger collapsible exibido no `bottomFixed` dos steps que
 * permitem o usuário registrar sugestões de pauta para o rito-mãe.
 *
 * SSOT — qualquer mudança aqui se propaga para todos os steps do rito.
 */
export const COLLABORATOR_AGENDA_TRIGGER_LABEL =
  'Registrar sugestão de pauta para o Check-in do Time';
