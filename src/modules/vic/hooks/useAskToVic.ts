/**
 * useAskToVic - Hook para orquestração de agentes de IA
 * 
 * O sistema decide qual agente responde baseado no contexto.
 * O usuário escolhe perguntar, não escolhe o agente.
 */

import { useCallback, useMemo } from 'react';
import { useVic } from '../contexts/VicContext';
import { useVicEnabled } from './useVicAgent';
import type { VicAgentSlug, VicActionContext, VicContext } from '../types';
import type { 
  AskToVicContext, 
  AgentOrchestrationResult,
  OkrWizardStep,
} from '../types/ask-to-vic';
import { 
  WIZARD_AGENT_MAP, 
  MODULE_AGENT_MAP,
  STEP_QUESTIONS,
} from '../types/ask-to-vic';

/**
 * Hook para orquestrar o Ask to Vic
 */
export function useAskToVic() {
  const { openPanel, getAgentInfo } = useVic();
  const { isEnabled, isLoading: isCheckingEnabled } = useVicEnabled();

  /**
   * Determina qual agente usar baseado no contexto
   */
  const orchestrateAgent = useCallback((context: AskToVicContext): AgentOrchestrationResult => {
    let agentSlug: VicAgentSlug = 'coach-okrs'; // fallback
    let actionContext: VicActionContext = 'dashboard-okrs';

    // 1. Primeiro, tentar mapear por wizard + step (mais específico)
    if (context.wizard && context.step) {
      const wizardMap = WIZARD_AGENT_MAP[context.wizard];
      if (wizardMap) {
        agentSlug = wizardMap[context.step] || wizardMap['default'] || agentSlug;
      }
    }
    // 2. Se não tem wizard, mapear por módulo
    else if (context.module) {
      agentSlug = MODULE_AGENT_MAP[context.module] || agentSlug;
    }

    // 3. Determinar actionContext baseado no contexto
    if (context.module === 'okrs') {
      if (context.wizard === 'creation') {
        if (context.step === 'objective') {
          actionContext = 'okr-create-objective';
        } else if (context.step === 'kr-detail' || context.step === 'kr-type') {
          actionContext = 'okr-create-kr';
        } else {
          actionContext = 'okr-review-quality';
        }
      } else {
        actionContext = 'okr-review-quality';
      }
    } else if (context.module === 'kpis') {
      actionContext = 'kpi-analyze-variation';
    } else if (context.module === 'permissions') {
      actionContext = 'decision-structure';
    }

    // 4. Construir contexto enriquecido para o Vic
    const enrichedContext: VicContext = {
      type: `ask-to-vic-${context.module}`,
      title: context.objectiveTitle || context.krTitle,
      description: buildContextDescription(context),
      currentValue: context.currentValue,
      targetValue: context.targetValue,
      additionalData: {
        module: context.module,
        wizard: context.wizard,
        step: context.step,
        krType: context.krType,
        userRole: context.userRole,
        teamName: context.teamName,
        cycleName: context.cycleName,
        progress: context.progress,
        ...context.additionalData,
      },
    };

    // 5. Sugerir uma pergunta contextual
    const suggestedQuestion = getSuggestedQuestion(context);

    return {
      primaryAgent: agentSlug,
      actionContext,
      enrichedContext,
      suggestedQuestion,
    };
  }, []);

  /**
   * Abre o painel do Vic com o contexto apropriado
   */
  const ask = useCallback((
    context: AskToVicContext, 
    onApply?: (response: string) => void
  ) => {
    const result = orchestrateAgent(context);
    
    openPanel({
      agentSlug: result.primaryAgent,
      actionContext: result.actionContext,
      context: result.enrichedContext,
      onApply,
    });
  }, [orchestrateAgent, openPanel]);

  /**
   * Retorna informações do agente que seria usado para um contexto
   */
  const getAgentForContext = useCallback((context: AskToVicContext) => {
    const result = orchestrateAgent(context);
    return getAgentInfo(result.primaryAgent);
  }, [orchestrateAgent, getAgentInfo]);

  /**
   * Retorna perguntas sugeridas para o contexto atual
   */
  const getSuggestedQuestions = useCallback((context: AskToVicContext): string[] => {
    if (context.step) {
      return STEP_QUESTIONS[context.step as OkrWizardStep] || [];
    }
    return [];
  }, []);

  return {
    ask,
    orchestrateAgent,
    getAgentForContext,
    getSuggestedQuestions,
    isEnabled,
    isLoading: isCheckingEnabled,
  };
}

/**
 * Constrói uma descrição contextual para o agente
 */
function buildContextDescription(context: AskToVicContext): string {
  const parts: string[] = [];

  if (context.wizard) {
    const wizardNames: Record<string, string> = {
      'creation': 'criação de OKRs',
      'team-checkin': 'check-in de time',
      'collaborator': 'check-in individual',
      'leader-prep': 'preparação do líder',
      'managers-checkin': 'check-in de gestores',
      'clevel-checkin': 'check-in C-Level',
    };
    parts.push(`Wizard: ${wizardNames[context.wizard] || context.wizard}`);
  }

  if (context.step) {
    parts.push(`Etapa: ${context.step}`);
  }

  if (context.teamName) {
    parts.push(`Time: ${context.teamName}`);
  }

  if (context.krType) {
    parts.push(`Tipo de KR: ${context.krType}`);
  }

  if (context.userRole) {
    const roleNames: Record<string, string> = {
      'colaborador': 'Colaborador',
      'lider': 'Líder de time',
      'gestor': 'Gestor de área',
      'clevel': 'C-Level',
    };
    parts.push(`Papel: ${roleNames[context.userRole] || context.userRole}`);
  }

  return parts.join(' | ');
}

/**
 * Retorna uma pergunta sugerida baseada no contexto
 */
function getSuggestedQuestion(context: AskToVicContext): string | undefined {
  if (context.step) {
    const questions = STEP_QUESTIONS[context.step as OkrWizardStep];
    if (questions && questions.length > 0) {
      return questions[0];
    }
  }
  return undefined;
}
