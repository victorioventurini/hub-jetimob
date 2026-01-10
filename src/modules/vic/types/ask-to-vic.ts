/**
 * Ask to Vic - Types for contextual AI assistance
 * 
 * O Ask to Vic é um orquestrador de agentes de IA acionado de forma contextual.
 * Ele escolhe automaticamente qual agente responde baseado no contexto fornecido.
 */

import type { VicAgentSlug, VicActionContext, VicContext } from '../types';

/**
 * Módulos suportados pelo Ask to Vic
 */
export type AskToVicModule = 
  | 'okrs'
  | 'tickets'
  | 'assets'
  | 'financeiro'
  | 'pessoas'
  | 'produto'
  | 'kpis'
  | 'permissions';

/**
 * Wizards de OKRs suportados
 */
export type OkrWizardType =
  | 'creation'           // Criação de OKRs
  | 'team-checkin'       // Check-in de time
  | 'collaborator'       // Check-in individual
  | 'leader-prep'        // Preparação do líder
  | 'managers-checkin'   // Check-in de gestores
  | 'clevel-checkin';    // Check-in C-Level

/**
 * Steps específicos dos wizards de OKRs
 */
export type OkrWizardStep =
  // Creation wizard
  | 'objective'
  | 'kr-type'
  | 'kr-detail'
  | 'initiatives'
  | 'dependencies'
  | 'share'
  // Check-in steps
  | 'kr-review'
  | 'team-decisions'
  | 'reflection'
  | 'overview'
  | 'highlights'
  | 'panorama'
  | 'cross-issues'
  | 'adjustments'
  | 'insights'
  | 'directives';

/**
 * Tipos de KR para contexto
 */
export type KrType = 'fundacional' | 'contribuicao' | 'habilitador';

/**
 * Papel do usuário no contexto
 */
export type UserRole = 'colaborador' | 'lider' | 'gestor' | 'clevel';

/**
 * Contexto completo para o Ask to Vic
 */
export interface AskToVicContext {
  // Contexto base obrigatório
  module: AskToVicModule;
  
  // Contexto específico de OKRs
  wizard?: OkrWizardType;
  step?: OkrWizardStep;
  krType?: KrType;
  
  // Contexto do usuário
  userRole?: UserRole;
  teamId?: string;
  teamName?: string;
  squadId?: string;
  squadName?: string;
  buId?: string;
  buName?: string;
  
  // Contexto de ciclo
  cycleId?: string;
  cycleName?: string;
  
  // Dados adicionais para o agente
  objectiveTitle?: string;
  krTitle?: string;
  currentValue?: number;
  targetValue?: number;
  progress?: number;
  
  // Histórico relevante
  previousOkrsCount?: number;
  linkedKpisCount?: number;
  
  // Dados extras livres
  additionalData?: Record<string, unknown>;
}

/**
 * Mapeamento de contexto para agente
 * O sistema decide qual agente usar baseado no contexto
 */
export interface AgentMapping {
  agentSlug: VicAgentSlug;
  actionContext: VicActionContext;
  priority: number;
}

/**
 * Resultado do orquestrador de agentes
 */
export interface AgentOrchestrationResult {
  primaryAgent: VicAgentSlug;
  actionContext: VicActionContext;
  enrichedContext: VicContext;
  suggestedQuestion?: string;
}

/**
 * Props do componente AskToVic
 */
export interface AskToVicProps {
  /** Contexto para o Ask to Vic */
  context: AskToVicContext;
  
  /** Tamanho do ícone */
  size?: 'sm' | 'md' | 'lg';
  
  /** Variante visual */
  variant?: 'default' | 'subtle' | 'primary';
  
  /** Callback quando o usuário aplica uma sugestão */
  onApply?: (response: string) => void;
  
  /** Classes CSS adicionais */
  className?: string;
  
  /** Desabilitar (ex: quando IA está off) */
  disabled?: boolean;
}

/**
 * Perguntas contextuais pré-definidas por step
 */
export interface ContextualQuestions {
  [key: string]: string[];
}

/**
 * Mapeamento de steps para perguntas sugeridas
 */
export const STEP_QUESTIONS: Record<OkrWizardStep, string[]> = {
  // Creation
  'objective': [
    'Este objetivo está inspirador ou operacional demais?',
    'Como posso tornar este objetivo mais claro?',
  ],
  'kr-type': [
    'Qual a diferença entre KR fundacional, contribuição e habilitador?',
    'Que tipo de KR devo usar aqui?',
  ],
  'kr-detail': [
    'Este KR está bem escrito?',
    'Como defino uma meta realista para este KR?',
  ],
  'initiatives': [
    'Que tipo de iniciativa costuma funcionar para isso?',
    'Quantas iniciativas são ideais por KR?',
  ],
  'dependencies': [
    'Este KR depende de outro time?',
    'Como lidar com dependências entre áreas?',
  ],
  'share': [
    'Como comunicar esses OKRs para o time?',
    'O que incluir no resumo de OKRs?',
  ],
  // Check-in
  'kr-review': [
    'Este progresso está dentro do esperado?',
    'O que pode estar travando este KR?',
  ],
  'team-decisions': [
    'Que decisões precisam ser tomadas agora?',
    'Como priorizar entre múltiplos bloqueios?',
  ],
  'reflection': [
    'O que mais impactou meus resultados?',
    'Como posso pedir ajuda de forma efetiva?',
  ],
  'overview': [
    'Como está o panorama geral do time?',
    'Quais KRs precisam de mais atenção?',
  ],
  'highlights': [
    'Quais são os pontos críticos a abordar?',
    'Como priorizar as conversas 1:1?',
  ],
  'panorama': [
    'Como as áreas estão performando?',
    'Onde estão os maiores riscos?',
  ],
  'cross-issues': [
    'Como resolver dependências entre times?',
    'Quais bloqueios precisam de escalação?',
  ],
  'adjustments': [
    'Que ajustes estratégicos são necessários?',
    'Como comunicar mudanças de prioridade?',
  ],
  'insights': [
    'O que os dados estão mostrando?',
    'Quais tendências merecem atenção?',
  ],
  'directives': [
    'Quais diretrizes precisam ser reforçadas?',
    'Como alinhar a organização?',
  ],
};

/**
 * Mapeamento de wizard+step para agente primário
 */
export const WIZARD_AGENT_MAP: Record<OkrWizardType, Record<string, VicAgentSlug>> = {
  'creation': {
    'objective': 'coach-okrs',
    'kr-type': 'coach-okrs',
    'kr-detail': 'coach-okrs',
    'initiatives': 'coach-okrs',
    'dependencies': 'alinhamento-estrategico',
    'share': 'revisor-comunicacao',
    'default': 'coach-okrs',
  },
  'team-checkin': {
    'kr-review': 'coach-okrs',
    'team-decisions': 'facilitador-decisoes',
    'default': 'coach-okrs',
  },
  'collaborator': {
    'kr-review': 'coach-okrs',
    'reflection': 'cultura',
    'default': 'coach-okrs',
  },
  'leader-prep': {
    'overview': 'analista-kpis',
    'highlights': 'alinhamento-estrategico',
    'default': 'coach-okrs',
  },
  'managers-checkin': {
    'panorama': 'analista-kpis',
    'cross-issues': 'alinhamento-estrategico',
    'adjustments': 'facilitador-decisoes',
    'default': 'alinhamento-estrategico',
  },
  'clevel-checkin': {
    'insights': 'analista-kpis',
    'directives': 'alinhamento-estrategico',
    'default': 'alinhamento-estrategico',
  },
};

/**
 * Mapeamento de módulo para agente padrão
 */
export const MODULE_AGENT_MAP: Record<AskToVicModule, VicAgentSlug> = {
  'okrs': 'coach-okrs',
  'tickets': 'facilitador-decisoes',
  'assets': 'facilitador-decisoes',
  'financeiro': 'analista-kpis',
  'pessoas': 'cultura',
  'produto': 'analista-kpis',
  'kpis': 'analista-kpis',
  'permissions': 'facilitador-decisoes',
};
