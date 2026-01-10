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
  | 'intro'
  | 'context'
  | 'retrospective'
  | 'objective'
  | 'sharing'           // OKRs compartilhadas
  | 'kr-type'
  | 'kr-detail'
  | 'dependencies'
  | 'initiatives'
  | 'share'             // Comunicação final
  // Collaborator check-in
  | 'collaborator-context'
  | 'kr-review'
  | 'reflection'
  // Leader prep
  | 'overview'
  | 'highlights'
  | 'prep'
  | 'alignment'
  // Team check-in
  | 'team-opening'
  | 'team-kr-review'
  | 'team-initiatives'
  | 'team-decisions'
  // Managers check-in
  | 'panorama'
  | 'cross-issues'
  | 'adjustments'
  // C-Level check-in
  | 'company-okrs'
  | 'insights'
  | 'decisions'
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
  // ============================================================
  // CREATION WIZARD
  // ============================================================
  'intro': [
    'O que são OKRs?',
    'Por que usamos OKRs na Jet?',
  ],
  'context': [
    'Onde meu time gera mais impacto nesse ciclo?',
    'Como os OKRs da empresa se conectam com o meu time?',
  ],
  'retrospective': [
    'O que normalmente faz um OKR falhar nesse cenário?',
    'Como aprender com o ciclo anterior?',
  ],
  'objective': [
    'Este objetivo está inspirador ou operacional demais?',
    'Como posso tornar este objetivo mais claro?',
  ],
  'sharing': [
    'Quando faz sentido compartilhar um OKR?',
    'Como definir responsabilidades em OKRs compartilhadas?',
  ],
  'kr-type': [
    'Qual a diferença entre KR fundacional, contribuição e habilitador?',
    'Que tipo de KR devo usar aqui?',
  ],
  'kr-detail': [
    'Este KR está bem escrito?',
    'Como defino uma meta realista para este KR?',
  ],
  'dependencies': [
    'Este KR depende de outro time?',
    'Como lidar com dependências entre áreas?',
  ],
  'initiatives': [
    'Que tipo de iniciativa costuma funcionar para isso?',
    'Quantas iniciativas são ideais por KR?',
  ],
  'share': [
    'Como comunicar esses OKRs para o time?',
    'O que incluir no resumo de OKRs?',
  ],
  
  // ============================================================
  // COLLABORATOR CHECK-IN
  // ============================================================
  'collaborator-context': [
    'Como interpretar meu progresso semanal?',
    'O que devo priorizar esta semana?',
  ],
  'kr-review': [
    'Este progresso está dentro do esperado?',
    'O que pode estar travando este KR?',
  ],
  'reflection': [
    'O que mais impactou meus resultados?',
    'Como posso pedir ajuda de forma efetiva?',
  ],
  
  // ============================================================
  // LEADER PREP
  // ============================================================
  'overview': [
    'Como está o panorama geral do time?',
    'Quais KRs precisam de mais atenção?',
  ],
  'highlights': [
    'Quais são os pontos críticos a abordar?',
    'Como priorizar as conversas 1:1?',
  ],
  'prep': [
    'Quais KRs merecem discussão em grupo?',
    'Como estruturar a pauta da reunião?',
  ],
  'alignment': [
    'O time está alinhado com a estratégia?',
    'Quais dependências precisam de atenção?',
  ],
  
  // ============================================================
  // TEAM CHECK-IN
  // ============================================================
  'team-opening': [
    'Como está a saúde geral dos OKRs do time?',
    'O que priorizar na discussão de hoje?',
  ],
  'team-kr-review': [
    'Este KR precisa de ajuste?',
    'O que o time pode fazer para destravar este KR?',
  ],
  'team-initiatives': [
    'Quais iniciativas estão contribuindo mais?',
    'Devemos pausar alguma iniciativa?',
  ],
  'team-decisions': [
    'Que decisões precisam ser tomadas agora?',
    'Como priorizar entre múltiplos bloqueios?',
  ],
  
  // ============================================================
  // MANAGERS CHECK-IN
  // ============================================================
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
  
  // ============================================================
  // C-LEVEL CHECK-IN
  // ============================================================
  'company-okrs': [
    'Como está o progresso estratégico da empresa?',
    'Quais OKRs precisam de atenção executiva?',
  ],
  'insights': [
    'O que os dados estão mostrando?',
    'Quais tendências merecem atenção?',
  ],
  'decisions': [
    'Quais decisões estratégicas precisam ser tomadas?',
    'Quais trade-offs precisamos fazer?',
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
    'intro': 'onboarding-buddy',
    'context': 'analista-kpis',
    'retrospective': 'analista-kpis',
    'objective': 'coach-okrs',
    'sharing': 'alinhamento-estrategico',
    'kr-type': 'coach-okrs',
    'kr-detail': 'coach-okrs',
    'dependencies': 'alinhamento-estrategico',
    'initiatives': 'coach-okrs',
    'share': 'revisor-comunicacao',
    'default': 'coach-okrs',
  },
  'team-checkin': {
    'team-opening': 'analista-kpis',
    'team-kr-review': 'coach-okrs',
    'team-initiatives': 'coach-okrs',
    'team-decisions': 'facilitador-decisoes',
    'default': 'coach-okrs',
  },
  'collaborator': {
    'collaborator-context': 'analista-kpis',
    'kr-review': 'coach-okrs',
    'reflection': 'cultura',
    'default': 'coach-okrs',
  },
  'leader-prep': {
    'overview': 'analista-kpis',
    'highlights': 'alinhamento-estrategico',
    'prep': 'facilitador-decisoes',
    'alignment': 'alinhamento-estrategico',
    'default': 'coach-okrs',
  },
  'managers-checkin': {
    'panorama': 'analista-kpis',
    'cross-issues': 'alinhamento-estrategico',
    'adjustments': 'facilitador-decisoes',
    'default': 'alinhamento-estrategico',
  },
  'clevel-checkin': {
    'company-okrs': 'analista-kpis',
    'insights': 'analista-kpis',
    'decisions': 'facilitador-decisoes',
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
