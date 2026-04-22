/**
 * Wizard Types — Wizard Configs
 *
 * Definição estática dos passos visíveis e agentes Vic associados a cada
 * persona. Consumido pelos shells dos wizards e pelo registry de rituais.
 */

import type { WizardPersona, WizardConfig } from './core';

export const WIZARD_CONFIGS: Partial<Record<WizardPersona, WizardConfig>> = {
  collaborator: {
    persona: 'collaborator',
    title: 'Check-in Individual',
    description: 'Reflexão individual + atualização consciente',
    steps: [
      { id: 'context', label: 'Contexto da Semana', shortLabel: 'Contexto' },
      { id: 'checkin', label: 'Atualização dos KRs', shortLabel: 'Check-in' },
      { id: 'kpis', label: 'Métricas e KPIs', shortLabel: 'KPIs', optional: true },
      { id: 'initiatives', label: 'Iniciativas', shortLabel: 'Iniciativas', optional: true },
      { id: 'reflection', label: 'Reflexão Final', shortLabel: 'Reflexão' },
    ],
    aiAgents: ['coach-okrs', 'analista-kpis'],
  },
  'leader-prep': {
    persona: 'leader-prep',
    title: 'Pré-Check-in do Time',
    description: 'Prepare-se para conduzir um bom check-in com seu time',
    steps: [
      { id: 'overview', label: 'Visão Geral do Time', shortLabel: 'Visão' },
      { id: 'highlights', label: 'Destaques Automáticos', shortLabel: 'Destaques' },
      { id: 'preparation', label: 'Preparação da Pauta', shortLabel: 'Pauta' },
      { id: 'alignment', label: 'Alinhamento com Área', shortLabel: 'Alinhamento' },
    ],
    aiAgents: ['coach-okrs', 'analista-kpis', 'alinhamento-estrategico'],
  },
  'team-checkin': {
    persona: 'team-checkin',
    title: 'Check-in do Time',
    description: 'Alinhar, aprender e decidir junto com o time',
    steps: [
      { id: 'opening', label: 'Abertura', shortLabel: 'Abertura' },
      { id: 'kr-review', label: 'Revisão dos KRs', shortLabel: 'KRs' },
      { id: 'initiatives', label: 'Iniciativas Relevantes', shortLabel: 'Iniciativas' },
      { id: 'decisions', label: 'Decisões e Próximos Passos', shortLabel: 'Decisões' },
    ],
    aiAgents: ['coach-okrs', 'facilitador-decisoes'],
  },
  'managers-checkin': {
    persona: 'managers-checkin',
    title: 'Check-in de Gestores (descontinuado)',
    description: 'Alinhamento entre áreas',
    steps: [
      { id: 'panorama', label: 'Panorama Geral', shortLabel: 'Panorama' },
      { id: 'cross-issues', label: 'Pontos de Atenção Cruzados', shortLabel: 'Atenção' },
      { id: 'adjustments', label: 'Ajustes de Foco', shortLabel: 'Ajustes' },
    ],
    aiAgents: ['alinhamento-estrategico'],
  },
  'clevel-checkin': {
    persona: 'clevel-checkin',
    title: 'Check-in Executivo',
    description: 'Direção estratégica para a empresa',
    steps: [
      { id: 'company-okrs', label: 'Company OKRs', shortLabel: 'OKRs' },
      { id: 'insights', label: 'Leitura do Sistema', shortLabel: 'Insights' },
      { id: 'decisions', label: 'Decisões Estratégicas', shortLabel: 'Decisões' },
      { id: 'directives', label: 'Direcionamentos', shortLabel: 'Direcionamentos' },
    ],
    aiAgents: ['alinhamento-estrategico', 'analista-kpis'],
  },
  'team-okr-creation': {
    persona: 'team-okr-creation',
    title: 'Criação de OKRs do Time',
    description:
      'Defina os objetivos e resultados-chave do seu time com alinhamento estratégico',
    steps: [
      { id: 'intro', label: 'Alinhamento Inicial', shortLabel: 'Intro' },
      { id: 'context', label: 'Contexto Organizacional', shortLabel: 'Contexto' },
      { id: 'retrospective', label: 'Aprendendo com o Passado', shortLabel: 'Retro' },
      { id: 'objective', label: 'Definindo o Objetivo', shortLabel: 'Objetivo' },
      { id: 'sharing', label: 'Responsabilidade', shortLabel: 'Times' },
      { id: 'kr-type', label: 'Escolhendo KRs', shortLabel: 'KRs' },
      { id: 'kr-detail', label: 'Detalhando KRs', shortLabel: 'Detalhe' },
      { id: 'dependencies', label: 'Dependências e Riscos', shortLabel: 'Deps', optional: true },
      { id: 'initiatives', label: 'Iniciativas', shortLabel: 'Iniciativas', optional: true },
      { id: 'share', label: 'Compartilhar', shortLabel: 'Compartilhar' },
    ],
    aiAgents: [
      'cultura',
      'coach-okrs',
      'analista-kpis',
      'alinhamento-estrategico',
      'facilitador-decisoes',
      'revisor-comunicacao',
    ],
  },
  'team-kr-creation': {
    persona: 'team-kr-creation',
    title: 'Criação de KRs do Time',
    description: 'Defina como medir o sucesso do objetivo do time',
    steps: [
      { id: 'kr-context', label: 'Contexto', shortLabel: 'Contexto' },
      { id: 'kr-alignment', label: 'Alinhamento', shortLabel: 'Alinhamento' },
      { id: 'kr-type', label: 'Tipos de KR', shortLabel: 'Tipos' },
      { id: 'kr-detail', label: 'Detalhamento', shortLabel: 'KRs' },
      { id: 'kr-shared-check', label: 'Validação', shortLabel: 'Validação', optional: true },
      { id: 'kr-dependencies', label: 'Dependências', shortLabel: 'Deps', optional: true },
      { id: 'kr-initiatives', label: 'Iniciativas', shortLabel: 'Iniciativas', optional: true },
      { id: 'kr-review', label: 'Revisão', shortLabel: 'Revisar' },
    ],
    aiAgents: ['coach-okrs', 'analista-kpis', 'alinhamento-estrategico'],
  },
  mbr: {
    persona: 'mbr',
    title: 'MBR',
    description: 'Rito decisório mensal — saúde estratégica do negócio',
    steps: [
      { id: 'panorama', label: 'Panorama Executivo', shortLabel: 'Panorama' },
      { id: 'kpi-gate', label: 'KPI Gate Estratégico', shortLabel: 'KPI Gate' },
      { id: 'team-okrs-overview', label: 'OKRs dos Times', shortLabel: 'Times' },
      { id: 'team-okrs-detail', label: 'Análise por Time', shortLabel: 'Detalhe' },
      { id: 'org-okrs', label: 'OKRs Organizacionais', shortLabel: 'OKRs Org' },
      { id: 'decisions', label: 'Decisões Estratégicas', shortLabel: 'Decisões' },
      { id: 'closing', label: 'Encerramento', shortLabel: 'Encerrar' },
    ],
    aiAgents: ['analista-kpis', 'alinhamento-estrategico', 'facilitador-decisoes'],
  },
  'mbr-pre': {
    persona: 'mbr-pre',
    title: 'Pré-MBR',
    description: 'Preparação individual do líder para o MBR',
    steps: [
      { id: 'balance', label: 'Balanço do Mês', shortLabel: 'Balanço' },
      { id: 'kpi-analysis', label: 'KPIs do Time', shortLabel: 'KPIs' },
      { id: 'highlights', label: 'Destaques e Riscos', shortLabel: 'Destaques' },
      { id: 'next-steps', label: 'Próximos Passos', shortLabel: 'Próximos' },
      { id: 'summary', label: 'Resumo e Envio', shortLabel: 'Enviar' },
    ],
    aiAgents: ['coach-okrs', 'analista-kpis'],
  },
  'qbr-pre': {
    persona: 'qbr-pre',
    title: 'Pré-QBR',
    description:
      'Balanço do ciclo, análise de KPIs e proposta de OKRs para o próximo trimestre',
    steps: [
      { id: 'balance', label: 'Balanço do Ciclo', shortLabel: 'Balanço' },
      { id: 'kpi-analysis', label: 'Análise de KPIs', shortLabel: 'KPIs' },
      { id: 'learnings', label: 'Aprendizados', shortLabel: 'Aprendizados' },
      { id: 'okr-proposal', label: 'Proposta de OKRs', shortLabel: 'OKRs' },
      { id: 'summary', label: 'Resumo e Envio', shortLabel: 'Enviar' },
    ],
    aiAgents: ['coach-okrs', 'analista-kpis', 'alinhamento-estrategico'],
  },
  'qbr-pre-clevel': {
    persona: 'qbr-pre-clevel',
    title: 'Pré-QBR Executivo',
    description: 'Análise estratégica consolidada e direcionamentos para o QBR',
    steps: [
      { id: 'system-read', label: 'Leitura do Sistema', shortLabel: 'Sistema' },
      { id: 'quarter-balance', label: 'Balanço do Quarter', shortLabel: 'Balanço' },
      { id: 'strategic-analysis', label: 'Análise Estratégica', shortLabel: 'Estratégia' },
      { id: 'okr-validation', label: 'Validação de OKRs', shortLabel: 'Validação' },
      { id: 'directives', label: 'Direcionamentos', shortLabel: 'Direcionamentos' },
      { id: 'feedback', label: 'Avaliação do Rito', shortLabel: 'Feedback' },
    ],
    aiAgents: ['alinhamento-estrategico', 'analista-kpis', 'facilitador-decisoes'],
  },
  'qbr-meeting': {
    persona: 'qbr-meeting',
    title: 'QBR',
    description: 'Revisão trimestral com aprovação de OKRs e decisões estratégicas',
    steps: [
      { id: 'opening', label: 'Abertura e Direcionamentos', shortLabel: 'Abertura' },
      { id: 'okr-review', label: 'Revisão de OKRs por Time', shortLabel: 'OKRs' },
      { id: 'decisions', label: 'Decisões Estratégicas', shortLabel: 'Decisões' },
      { id: 'commitments', label: 'Compromissos Cross-Área', shortLabel: 'Compromissos' },
      { id: 'feedback', label: 'Avaliação do Rito', shortLabel: 'Feedback' },
      { id: 'closing', label: 'Encerramento', shortLabel: 'Encerrar' },
    ],
    aiAgents: ['alinhamento-estrategico', 'facilitador-decisoes'],
  },
  'qbr-post': {
    persona: 'qbr-post',
    title: 'Pós-QBR',
    description:
      'Promoção de OKRs aprovados, formalização de decisões e encerramento do ciclo',
    steps: [
      { id: 'okr-promotion', label: 'Promoção de OKRs', shortLabel: 'Promover' },
      { id: 'decisions', label: 'Decisões Complementares', shortLabel: 'Decisões' },
      { id: 'commitments', label: 'Compromissos Formalizados', shortLabel: 'Compromissos' },
      { id: 'follow-up', label: 'Cadência de Acompanhamento', shortLabel: 'Follow-up' },
      { id: 'minutes', label: 'Ata Executiva', shortLabel: 'Ata' },
    ],
    aiAgents: ['facilitador-decisoes', 'alinhamento-estrategico'],
  },
};
