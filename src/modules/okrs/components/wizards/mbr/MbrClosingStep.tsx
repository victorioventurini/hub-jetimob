/**
 * MbrClosingStep - Etapa 8: Encerramento & Governança
 *
 * v1.3: Removidos itens de checklist "Follow-up do QBR endereçado" e
 * "Próximo MBR agendado", bloco de avaliação anônima (existe step dedicado)
 * e InlineDecisionInput do rodapé (decisões registradas em steps próprios).
 */

import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, CheckCircle2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardLastStepFooter } from '../shared';
import type {
  MbrGovernanceChecklist,
  RitualImprovementFeedback,
  TeamCheckinDecision,
  MbrTeamOkrSnapshot,
  MbrOrgOkrSnapshot,
  QbrFollowUpItem,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface MbrClosingStepProps {
  decisions: TeamCheckinDecision[];
  /** @deprecated mantido por compatibilidade — não usado neste step. */
  onDecisionsChange?: (decisions: TeamCheckinDecision[]) => void;
  checklist: MbrGovernanceChecklist;
  onChecklistChange: (checklist: MbrGovernanceChecklist) => void;
  /** @deprecated avaliação migrada para EvaluationCollectionStep. */
  ritualFeedback?: RitualImprovementFeedback[];
  /** @deprecated avaliação migrada para EvaluationCollectionStep. */
  onRitualFeedbackChange?: (feedback: RitualImprovementFeedback[]) => void;
  teamOkrSnapshots?: MbrTeamOkrSnapshot[];
  orgOkrSnapshots?: MbrOrgOkrSnapshot[];
  /** @deprecated não mais usado no checklist. */
  qbrFollowUpItems?: QbrFollowUpItem[];
  /** @deprecated avaliação foi removida deste step. */
  hideFeedbackBlock?: boolean;
  onComplete: () => void;
  isCompleting?: boolean;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function MbrClosingStep({
  decisions,
  checklist,
  onChecklistChange,
  teamOkrSnapshots = [],
  orgOkrSnapshots = [],
  onComplete,
  isCompleting = false,
  onBack,
}: MbrClosingStepProps) {
  // ── Dynamic checklist conditions ──
  const conditions = useMemo(() => {
    const kpiDecisions = decisions.filter(d => d.sourceStep === 'panorama' || d.sourceStep === 'kpi-gate');
    const teamsWithOkrs = teamOkrSnapshots.filter(t => t.objectives.length > 0);
    const allTeamsReviewed = teamsWithOkrs.length > 0 && teamsWithOkrs.every(t => t.reviewed);
    const orgOkrsAllDecided = orgOkrSnapshots.length === 0 || orgOkrSnapshots.every(o => o.remainsStrategicPriority !== undefined);
    const decisionsWithOwner = decisions.filter(d => d.sourceStep === 'decisions');
    const allDecisionsHaveOwner = decisionsWithOwner.length === 0 || decisionsWithOwner.every(d => (d as any).owner_user_id);

    return {
      kpiGateEnabled: kpiDecisions.length > 0 || decisions.some(d => d.sourceStep === 'kpi-gate'),
      allTeamsReviewedEnabled: allTeamsReviewed,
      orgOkrsVerifiedEnabled: orgOkrsAllDecided,
      decisionsHaveOwnerEnabled: allDecisionsHaveOwner,
    };
  }, [decisions, teamOkrSnapshots, orgOkrSnapshots]);

  const handleCheckChange = (key: keyof MbrGovernanceChecklist, value: boolean) => {
    onChecklistChange({ ...checklist, [key]: value });
  };

  // Legacy checklist check (backward compatible)
  const legacyChecked =
    checklist.strategicFocusClear &&
    checklist.nextStepsHaveOwners &&
    checklist.nonPrioritiesClear &&
    checklist.communicateInAllHands;

  // Dynamic checklist check
  const dynamicChecked =
    checklist.allTeamsReviewed &&
    checklist.orgOkrsVerified;

  const allChecked = legacyChecked && dynamicChecked;
  const canComplete = allChecked;

  // Summary counts
  const decisionCount = decisions.filter(d => d.category === 'decision').length;
  const focusCount = decisions.filter(d => d.category === 'focus_adjustment').length;
  const nextStepCount = decisions.filter(d => d.category === 'next_step').length;
  const reviewedTeams = teamOkrSnapshots.filter(t => t.reviewed).length;
  const totalTeams = teamOkrSnapshots.filter(t => t.objectives.length > 0).length;
  const orgGaps = orgOkrSnapshots.filter(o => !o.remainsStrategicPriority).length;

  // Dynamic checklist items
  const dynamicItems: Array<{
    key: keyof MbrGovernanceChecklist;
    label: string;
    enabled: boolean;
    disabledHint?: string;
  }> = [
    { key: 'allTeamsReviewed', label: `Todos os times revisados (${reviewedTeams}/${totalTeams})`, enabled: conditions.allTeamsReviewedEnabled, disabledHint: 'Revise todos os times no Step 4' },
    { key: 'orgOkrsVerified', label: 'OKRs organizacionais verificadas', enabled: conditions.orgOkrsVerifiedEnabled, disabledHint: 'Confirme todas OKRs no Step 5' },
  ];


  return (
    <div className="flex flex-col h-full">
      <WizardStepHeader
        icon={ShieldCheck}
        title="Encerramento & Governança"
        tooltip="mbr-closing"
        description="Confirme o alinhamento antes de finalizar"
        variant="green"
      />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* ── Resumo de governança ── */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-primary" />
              Resumo de Governança
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold">{decisionCount + focusCount + nextStepCount}</p>
                  <p className="text-xs text-muted-foreground">Decisões registradas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold">{reviewedTeams}/{totalTeams}</p>
                  <p className="text-xs text-muted-foreground">Times revisados</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold">{decisionCount}</p>
                  <p className="text-xs text-muted-foreground">Decisões com dono</p>
                </CardContent>
              </Card>
              {orgGaps > 0 && (
                <Card className="border-status-amber/30">
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-bold text-status-amber">{orgGaps}</p>
                    <p className="text-xs text-muted-foreground">OKRs org sem cobertura</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Summary badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" className="bg-status-blue-muted text-status-blue">
              {decisionCount} decisões
            </Badge>
            <Badge variant="secondary" className="bg-status-purple-muted text-status-purple">
              {focusCount} ajustes de foco
            </Badge>
            <Badge variant="secondary" className="bg-status-green-muted text-status-green">
              {nextStepCount} próximos passos
            </Badge>
          </div>

          {/* ── Dynamic governance checklist ── */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Checklist de Governança
            </h4>

            <div className="space-y-3">
              {/* Legacy items */}
              {[
                { key: 'strategicFocusClear' as const, label: 'Está claro o foco estratégico do próximo mês' },
                { key: 'nextStepsHaveOwners' as const, label: 'Todos os próximos passos têm responsável' },
                { key: 'nonPrioritiesClear' as const, label: 'Está claro o que NÃO será prioridade' },
                { key: 'communicateInAllHands' as const, label: 'Se necessário, isso será comunicado no All Hands' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Checkbox
                    id={key}
                    checked={checklist[key]}
                    onCheckedChange={(checked) => handleCheckChange(key, checked as boolean)}
                  />
                  <Label htmlFor={key} className="cursor-pointer text-sm">
                    {label}
                  </Label>
                </div>
              ))}

              <Separator />

              {/* Dynamic items */}
              {dynamicItems.map(({ key, label, enabled, disabledHint }) => (
                <div key={key} className={cn(
                  'flex items-center gap-3 p-3 rounded-lg',
                  enabled ? 'bg-muted/50' : 'bg-muted/20 opacity-60',
                )}>
                  <Checkbox
                    id={key}
                    checked={checklist[key]}
                    disabled={!enabled}
                    onCheckedChange={(checked) => handleCheckChange(key, checked as boolean)}
                  />
                  <Label htmlFor={key} className={cn('text-sm', !enabled && 'cursor-not-allowed')}>
                    {label}
                  </Label>
                  {!enabled && disabledHint && (
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{disabledHint}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      <WizardLastStepFooter
        onBack={onBack}
        onPrimary={onComplete}
        primaryDisabled={!canComplete}
      />
      {!canComplete && (
        <p className="text-xs text-muted-foreground text-center pb-2">
          Complete o checklist
        </p>
      )}
    </div>
  );
}
