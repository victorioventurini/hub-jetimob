/**
 * LeaderPrepWizard - Orquestrador do Wizard de Preparação do Líder (Wizard 2)
 * 
 * Fluxo:
 * 1. Overview - Visão geral do time e métricas consolidadas
 * 2. Highlights - Destaques automatizados + insights IA
 * 3. Prep - Preparação da pauta (marcar KRs para discussão)
 * 4. Alignment - Alinhamento com OKRs do nível superior
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { WizardShell } from '../shared/WizardShell';
import { LeaderOverviewStep } from './LeaderOverviewStep';
import { LeaderHighlightsStep } from './LeaderHighlightsStep';
import { LeaderPrepStep } from './LeaderPrepStep';
import { LeaderAlignmentStep, type ParentObjective } from './LeaderAlignmentStep';
import { useTeamOverviewMetrics } from '@/modules/okrs/hooks/useTeamOverviewMetrics';
import { useActiveCycles, useCycle } from '@/modules/okrs/hooks/useCycleData';
import { useTeamPendingKrs } from '@/modules/okrs/hooks/useTeamPendingKrs';
import { useWizardSession } from '@/modules/okrs/hooks/useWizardSession';
import { WIZARD_CONFIGS, type KrAction, type VicInsight } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface LeaderPrepWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  /** Callback when team changes via context selector */
  onTeamChange?: (teamId: string, teamName: string) => void;
}

type WizardStep = 'overview' | 'highlights' | 'prep' | 'alignment';

// ============================================================
// COMPONENT
// ============================================================

export function LeaderPrepWizard({ 
  open, 
  onOpenChange, 
  teamId,
  teamName,
  onTeamChange,
}: LeaderPrepWizardProps) {
  const navigate = useNavigate();
  const config = WIZARD_CONFIGS['leader-prep'];
  
  // Session persistence
  const { 
    createSession, 
    updateSession, 
    completeSession, 
    saveKrAction,
    isCreating 
  } = useWizardSession();
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // State
  const [currentStep, setCurrentStep] = useState<WizardStep>('overview');
  const [krActions, setKrActions] = useState<KrAction[]>([]);
  const [meetingNotes, setMeetingNotes] = useState('');
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());

  // Get active quarterly cycle
  const { data: activeCycles } = useActiveCycles();
  const quarterlyCycle = useMemo(() => 
    activeCycles?.find(c => c.type === 'quarter') || activeCycles?.[0] || null,
    [activeCycles]
  );
  
  const { data: cycle } = useCycle(quarterlyCycle?.id);

  // Fetch team metrics
  const { 
    data: metricsData, 
    isLoading: metricsLoading 
  } = useTeamOverviewMetrics(quarterlyCycle?.id, teamId ? [teamId] : []);

  // Fetch team KRs for prep step
  const { data: teamKrs = [] } = useTeamPendingKrs(
    quarterlyCycle?.id,
    teamId ? [teamId] : []
  );

  // Step index for progress
  const stepIndex = useMemo(() => {
    switch (currentStep) {
      case 'overview': return 0;
      case 'highlights': return 1;
      case 'prep': return 2;
      case 'alignment': return 3;
      default: return 0;
    }
  }, [currentStep]);

  // AI Insights (mocked for now - will be fetched from Vic)
  const aiInsights = useMemo<VicInsight[]>(() => {
    if (!metricsData?.metrics) return [];
    
    const insights: VicInsight[] = [];
    
    if (metricsData.metrics.krsStagnant > 0) {
      insights.push({
        id: 'insight-stagnant',
        type: 'alert',
        content: `${metricsData.metrics.krsStagnant} KRs estão sem progresso há mais de 2 semanas. Considere perguntar sobre bloqueios.`,
        priority: 'high',
        source: 'coach-okrs',
      });
    }
    
    if (metricsData.metrics.krsAtRisk > 0) {
      insights.push({
        id: 'insight-risk',
        type: 'suggestion',
        content: `Há ${metricsData.metrics.krsAtRisk} KRs em risco. Priorize a discussão destes itens na reunião.`,
        priority: 'medium',
        source: 'coach-okrs',
      });
    }
    
    return insights.filter(i => !dismissedInsights.has(i.id));
  }, [metricsData, dismissedInsights]);

  // Parent objectives (mocked - in real implementation, fetch from API)
  const parentObjectives: ParentObjective[] = useMemo(() => [
    {
      id: 'parent-1',
      title: 'Aumentar receita recorrente em 25%',
      progress: 68,
      status: 'green' as const,
      teamName: 'Área Comercial',
    },
    {
      id: 'parent-2',
      title: 'Melhorar NPS para 72 pontos',
      progress: 45,
      status: 'yellow' as const,
      teamName: 'Área de Produto',
    },
  ], []);

  // Create session when wizard opens
  useEffect(() => {
    if (open && !sessionId && !isCreating) {
      createSession({
        wizardType: 'leader-prep',
        teamId,
        cycleId: quarterlyCycle?.id || null,
      }).then(session => {
        setSessionId(session.id);
      }).catch(err => {
        console.error('Failed to create wizard session:', err);
      });
    }
  }, [open, sessionId, isCreating, createSession, teamId, quarterlyCycle?.id]);

  // Handlers
  const handleClose = useCallback(() => {
    // Reset state
    setCurrentStep('overview');
    setKrActions([]);
    setMeetingNotes('');
    setDismissedInsights(new Set());
    setSessionId(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleOverviewContinue = useCallback(() => {
    setCurrentStep('highlights');
  }, []);

  const handleHighlightsContinue = useCallback(() => {
    setCurrentStep('prep');
  }, []);

  const handleHighlightsBack = useCallback(() => {
    setCurrentStep('overview');
  }, []);

  const handleDismissInsight = useCallback((id: string) => {
    setDismissedInsights(prev => new Set(prev).add(id));
  }, []);

  const handlePrepContinue = useCallback(() => {
    setCurrentStep('alignment');
  }, []);

  const handlePrepBack = useCallback(() => {
    setCurrentStep('highlights');
  }, []);

  const handleAlignmentComplete = useCallback(async () => {
    // Save KR actions to session
    if (sessionId) {
      // Save each KR action
      for (const action of krActions) {
        await saveKrAction({
          sessionId,
          krId: action.krId,
          actionType: action.actionType,
          notes: action.notes,
        }).catch(err => console.error('Failed to save KR action:', err));
      }
      
      // Complete session
      await completeSession({
        sessionId,
        meetingNotes,
        aiInsightsShown: aiInsights,
      }).catch(err => console.error('Failed to complete session:', err));
    }
    
    toast.success('Preparação para check-in do time concluída!');
    
    // Navigate to team OKRs after short delay
    setTimeout(() => {
      handleClose();
      navigate(`/okrs?team=${teamId}`);
    }, 1500);
  }, [sessionId, krActions, saveKrAction, completeSession, meetingNotes, aiInsights, handleClose, navigate, teamId]);

  const handleAlignmentBack = useCallback(() => {
    setCurrentStep('prep');
  }, []);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'overview':
        return (
          <LeaderOverviewStep
            teamName={teamName}
            metrics={metricsData?.metrics || null}
            isLoading={metricsLoading}
            cycleName={cycle?.name}
            onContinue={handleOverviewContinue}
          />
        );

      case 'highlights':
        return (
          <LeaderHighlightsStep
            highlights={metricsData?.highlights || []}
            aiInsights={aiInsights}
            onContinue={handleHighlightsContinue}
            onBack={handleHighlightsBack}
            onDismissInsight={handleDismissInsight}
          />
        );

      case 'prep':
        return (
          <LeaderPrepStep
            krs={teamKrs}
            krActions={krActions}
            onActionsChange={setKrActions}
            meetingNotes={meetingNotes}
            onMeetingNotesChange={setMeetingNotes}
            onContinue={handlePrepContinue}
            onBack={handlePrepBack}
          />
        );

      case 'alignment':
        return (
          <LeaderAlignmentStep
            teamName={teamName}
            teamKrs={teamKrs}
            parentObjectives={parentObjectives}
            onStartCheckin={handleAlignmentComplete}
            onBack={handleAlignmentBack}
          />
        );

      default:
        return null;
    }
  };

  return (
    <WizardShell
      open={open}
      onOpenChange={onOpenChange}
      persona="leader-prep"
      title={config.title}
      subtitle={config.description}
      steps={config.steps}
      currentStepIndex={stepIndex}
      onClose={handleClose}
      context={{
        mode: 'team',
        teamId,
        teamName,
        onTeamChange,
      }}
    >
      {renderStepContent()}
    </WizardShell>
  );
}
