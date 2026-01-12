/**
 * useWizardAI - Hook para integração de IA nos wizards de check-in
 * 
 * Fornece:
 * - Geração de insights contextuais
 * - Perguntas orientadoras baseadas no contexto
 * - Integração com agentes Vic (coach-okrs, analista-kpis, alinhamento-estrategico)
 * 
 * IDENTITY: Usa BU context para escopo
 */

import { useState, useCallback, useMemo } from 'react';
import { useVicAgent } from '@/modules/vic/hooks/useVicAgent';
import type { VicAgentSlug, VicContext } from '@/modules/vic/types';
import type { 
  WizardPersona, 
  VicInsight, 
  VicGuidingQuestion,
  WIZARD_VIC_ACTION_CONTEXTS,
} from '../types/wizard';
import type { WizardKr } from './useTeamPendingKrs';

// ============================================================
// TYPES
// ============================================================

interface KrAIContext {
  kr: WizardKr;
  linkedInitiativesCount?: number;
  previousCheckinComment?: string;
}

interface TeamAIContext {
  teamId: string;
  teamName: string;
  krsTotal: number;
  krsAtRisk: number;
  krsStagnant: number;
  initiativesCritical: number;
}

interface GenerateInsightsOptions {
  persona: WizardPersona;
  step: string;
  krContext?: KrAIContext;
  teamContext?: TeamAIContext;
  additionalData?: Record<string, unknown>;
}

interface GenerateQuestionsOptions {
  persona: WizardPersona;
  krContext?: KrAIContext;
  situation?: 'low_progress' | 'at_risk' | 'stagnant' | 'no_update' | 'healthy';
}

// ============================================================
// PREDEFINED QUESTIONS (fallback when AI is unavailable)
// ============================================================

const FALLBACK_QUESTIONS: Record<string, VicGuidingQuestion[]> = {
  low_progress: [
    { id: 'lp-1', question: 'O que está impedindo o avanço deste KR?', source: 'coach-okrs' },
    { id: 'lp-2', question: 'Existe alguma dependência ou bloqueio não mapeado?', source: 'coach-okrs' },
  ],
  at_risk: [
    { id: 'ar-1', question: 'Qual ação poderia destravar este KR?', source: 'coach-okrs' },
    { id: 'ar-2', question: 'Precisamos repensar a abordagem?', source: 'coach-okrs' },
  ],
  stagnant: [
    { id: 'st-1', question: 'O que mudou desde o último check-in?', source: 'coach-okrs' },
    { id: 'st-2', question: 'Este KR ainda é prioridade?', source: 'coach-okrs' },
  ],
  no_update: [
    { id: 'nu-1', question: 'Houve algum progresso que ainda não foi registrado?', source: 'coach-okrs' },
    { id: 'nu-2', question: 'Este KR está bloqueado ou aguardando algo?', source: 'coach-okrs' },
  ],
  healthy: [
    { id: 'he-1', question: 'O que fez esse KR avançar?', source: 'coach-okrs' },
    { id: 'he-2', question: 'Esse progresso é sustentável nas próximas semanas?', source: 'coach-okrs' },
  ],
};

// ============================================================
// HOOK
// ============================================================

export function useWizardAI() {
  const vicAgent = useVicAgent();
  const [insights, setInsights] = useState<VicInsight[]>([]);
  const [questions, setQuestions] = useState<VicGuidingQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Build VicContext from KR data
  const buildKrContext = useCallback((kr: WizardKr, additionalData?: Record<string, unknown>): VicContext => {
    return {
      type: 'kr-checkin',
      title: kr.title,
      description: kr.objective_title,
      currentValue: kr.current_value,
      targetValue: kr.target,
      baselineValue: kr.baseline,
      unit: kr.unit,
      status: kr.status,
      additionalData: {
        progress: kr.progress,
        daysSinceCheckin: kr.days_since_checkin,
        direction: kr.direction,
        teamName: kr.team_name,
        ownerName: kr.owner_name,
        isPending: kr.is_pending,
        isAtRisk: kr.is_at_risk,
        ...additionalData,
      },
    };
  }, []);

  // Generate insights using Vic agent
  const generateInsights = useCallback(async (options: GenerateInsightsOptions): Promise<VicInsight[]> => {
    const { persona, step, krContext, teamContext, additionalData } = options;
    
    setIsGenerating(true);
    
    try {
      // Determine which agent to use based on persona
      let agentSlug: VicAgentSlug = 'coach-okrs';
      if (persona === 'managers-checkin' || persona === 'clevel-checkin') {
        agentSlug = 'alinhamento-estrategico';
      }

      // Build context
      const context: VicContext = krContext 
        ? buildKrContext(krContext.kr, { 
            linkedInitiativesCount: krContext.linkedInitiativesCount,
            ...additionalData 
          })
        : {
            type: `wizard-${persona}`,
            additionalData: {
              step,
              teamContext,
              ...additionalData,
            },
          };

      // Invoke Vic agent
      const response = await vicAgent.invoke(
        agentSlug,
        'okr-review-quality',
        context,
        `Analise este contexto e forneça 1-2 insights breves e acionáveis para o check-in.`,
        { silent: true }
      );

      // Parse response into insights
      const newInsights: VicInsight[] = [{
        id: `insight-${Date.now()}`,
        type: 'insight',
        content: response.response,
        priority: krContext?.kr.is_at_risk ? 'high' : 'medium',
        source: agentSlug,
      }];

      setInsights(prev => [...prev, ...newInsights]);
      return newInsights;
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      // Return empty on error - fallback questions will be used
      return [];
    } finally {
      setIsGenerating(false);
    }
  }, [vicAgent, buildKrContext]);

  // Get guiding questions (with AI or fallback)
  const getGuidingQuestions = useCallback(async (options: GenerateQuestionsOptions): Promise<VicGuidingQuestion[]> => {
    const { persona, krContext, situation = 'healthy' } = options;
    
    // First, try to use fallback questions (faster UX)
    const fallbackQuestions = FALLBACK_QUESTIONS[situation] || FALLBACK_QUESTIONS.healthy;
    setQuestions(fallbackQuestions);

    // Optionally enhance with AI (non-blocking)
    if (krContext) {
      try {
        const context = buildKrContext(krContext.kr);
        
        // Don't await - let it run in background and update later
        vicAgent.invoke(
          'coach-okrs',
          'okr-review-quality',
          context,
          `Sugira 1 pergunta reflexiva específica para este KR.`,
          { silent: true }
        ).then(response => {
          const aiQuestion: VicGuidingQuestion = {
            id: `ai-q-${Date.now()}`,
            question: response.response,
            source: 'coach-okrs',
            context: 'Sugerido pelo Vic',
          };
          setQuestions(prev => [aiQuestion, ...prev.slice(0, 1)]);
        }).catch(() => {
          // Silently fail - fallback questions are already set
        });
      } catch {
        // Use fallback questions
      }
    }

    return fallbackQuestions;
  }, [vicAgent, buildKrContext]);

  // Determine situation based on KR context
  const determineSituation = useCallback((kr: WizardKr): GenerateQuestionsOptions['situation'] => {
    if (kr.days_since_checkin > 14) return 'stagnant';
    if (kr.days_since_checkin > 7) return 'no_update';
    if (kr.status === 'red') return 'at_risk';
    if (kr.progress < 30 && kr.status === 'yellow') return 'low_progress';
    return 'healthy';
  }, []);

  // Get dynamic microcopy for a KR
  const getMicrocopy = useCallback((kr: WizardKr): string => {
    const situation = determineSituation(kr);
    
    const microcopyMap: Record<string, string> = {
      low_progress: 'O que pode estar impedindo o avanço?',
      at_risk: 'Qual ação poderia destravar este KR?',
      stagnant: 'O que mudou desde o último check-in?',
      no_update: 'Houve algum progresso não registrado?',
      healthy: 'O que fez esse KR avançar esta semana?',
    };
    
    return microcopyMap[situation] || microcopyMap.healthy;
  }, [determineSituation]);

  // Dismiss an insight
  const dismissInsight = useCallback((insightId: string) => {
    setInsights(prev => 
      prev.map(i => i.id === insightId ? { ...i, dismissed: true } : i)
    );
  }, []);

  // Clear all insights
  const clearInsights = useCallback(() => {
    setInsights([]);
    setQuestions([]);
  }, []);

  return {
    // State
    insights,
    questions,
    isGenerating,
    isVicLoading: vicAgent.isLoading,
    
    // Actions
    generateInsights,
    getGuidingQuestions,
    getMicrocopy,
    determineSituation,
    dismissInsight,
    clearInsights,
    
    // Direct Vic access for custom calls
    invokeVic: vicAgent.invoke,
  };
}
