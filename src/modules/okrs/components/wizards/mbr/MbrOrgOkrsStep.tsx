/**
 * MbrOrgOkrsStep - Etapa 5: OKRs Organizacionais
 * 
 * Validação de prioridades estratégicas com Key Results detalhados.
 * v1.2: Mostra contribuição dos times por KR org.
 * Se "Não é mais prioridade" → exige registro de Decisão/Ajuste de Foco.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Target, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter, WizardStepScaffold, InlineDecisionInput } from '../shared';
import { ObjectiveListItem } from '@/modules/okrs/components/dashboard/ObjectiveListItem';
import type { MbrOrgOkrSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { OrgObjectiveWithKrs } from '@/modules/okrs/hooks/queries';

// ============================================================
// TYPES
// ============================================================

export interface MbrOrgOkrsStepProps {
  orgOkrSnapshots: MbrOrgOkrSnapshot[];
  onOrgOkrSnapshotsChange: (snapshots: MbrOrgOkrSnapshot[]) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  /** v1.2: Live org objectives with team contributions */
  orgObjectives?: OrgObjectiveWithKrs[];
  onContinue: () => void;
  onBack: () => void;
  /** Quando false, oculta o InlineDecisionInput do rodapé. Default: true. */
  showInlineDecisionInput?: boolean;
}

// ============================================================
// COMPONENT
// ============================================================



// ============================================================
// COMPONENT
// ============================================================

export function MbrOrgOkrsStep({
  orgOkrSnapshots,
  onOrgOkrSnapshotsChange,
  decisions,
  onDecisionsChange,
  orgObjectives = [],
  onContinue,
  onBack,
  showInlineDecisionInput = true,
}: MbrOrgOkrsStepProps) {
  const [showTeamKrs, setShowTeamKrs] = useState(true);
  const total = orgOkrSnapshots.length;

  const [currentObjectiveIndex, setCurrentObjectiveIndex] = useState(0);
  useEffect(() => {
    if (currentObjectiveIndex > Math.max(0, total - 1)) {
      setCurrentObjectiveIndex(Math.max(0, total - 1));
    }
  }, [total, currentObjectiveIndex]);

  const currentOkr = total > 0 ? orgOkrSnapshots[currentObjectiveIndex] : undefined;

  // Gate por página: o objetivo atual marcado como "não é mais prioridade"
  // exige decisão registrada com sourceStep="org-okrs" referenciando seu título.
  const currentNeedsDecision = useMemo(() => {
    if (!currentOkr) return false;
    if (currentOkr.remainsStrategicPriority) return false;
    const titleKey = currentOkr.title.toLowerCase().substring(0, 20);
    return !decisions.some(
      (d) => d.sourceStep === 'org-okrs' && d.text.toLowerCase().includes(titleKey),
    );
  }, [currentOkr, decisions]);

  const isFirst = currentObjectiveIndex === 0;
  const isLast = total === 0 || currentObjectiveIndex >= total - 1;

  // Live objective matching the current snapshot (for /okrs-style rendering)
  const liveObjective = useMemo(
    () => orgObjectives.find((o) => o.id === currentOkr?.objectiveId),
    [orgObjectives, currentOkr],
  );

  const handleTogglePriority = (objectiveId: string, remains: boolean) => {
    onOrgOkrSnapshotsChange(
      orgOkrSnapshots.map(o => o.objectiveId === objectiveId ? { ...o, remainsStrategicPriority: remains } : o)
    );
  };

  const handlePrimary = useCallback(() => {
    if (currentNeedsDecision) return;
    if (isLast) onContinue();
    else setCurrentObjectiveIndex((i) => Math.min(total - 1, i + 1));
  }, [currentNeedsDecision, isLast, onContinue, total]);

  const handleBack = useCallback(() => {
    if (isFirst) onBack();
    else setCurrentObjectiveIndex((i) => Math.max(0, i - 1));
  }, [isFirst, onBack]);

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Target}
          title="OKRs Organizacionais"
          tooltip="mbr-org-okrs"
          description="Validação de prioridades estratégicas"
          variant="purple"
          badge={total > 0 ? `${currentObjectiveIndex + 1} / ${total}` : '0'}
        />
      }
      bottomFixed={
        showInlineDecisionInput ? (
          <div className="border-t">
            <InlineDecisionInput
              decisions={decisions}
              onDecisionsChange={onDecisionsChange}
              sourceStep="org-okrs"
              placeholder={
                currentOkr
                  ? `Decisão sobre: ${currentOkr.title}...`
                  : 'Nota geral sobre OKRs organizacionais...'
              }
              subStep={currentOkr?.objectiveId ?? null}
              metadataFactory={
                currentOkr ? () => ({ objective_id: currentOkr.objectiveId }) : undefined
              }
            />
          </div>
        ) : undefined
      }
      footer={
        <>
          <WizardStepFooter
            onBack={handleBack}
            backLabel={isFirst ? 'Voltar' : 'Anterior'}
            onPrimary={handlePrimary}
            primaryLabel={isLast ? 'Consolidar Diretrizes' : 'Próximo Objetivo'}
            primaryDisabled={currentNeedsDecision}
          />
          {currentNeedsDecision && (
            <p className="text-xs text-status-amber text-center pb-2">
              Registre uma decisão para este OKR que não é mais prioridade
            </p>
          )}
        </>
      }
    >
      <div className="p-6 space-y-4 max-w-7xl mx-auto w-full">
        {!currentOkr ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma OKR organizacional carregada. Os snapshots serão preenchidos conforme a integração.
          </p>
        ) : (
          <>
            {/* Priority toggle */}
            <div className={cn(
              'flex items-center justify-between gap-3 rounded-lg border p-3',
              !currentOkr.remainsStrategicPriority && 'border-status-amber/40 bg-status-amber/5'
            )}>
              <p className="text-sm text-muted-foreground">
                Este OKR ainda é prioridade estratégica?
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={currentOkr.remainsStrategicPriority ? 'default' : 'outline'}
                  onClick={() => handleTogglePriority(currentOkr.objectiveId, true)}
                >
                  <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
                  Sim
                </Button>
                <Button
                  size="sm"
                  variant={!currentOkr.remainsStrategicPriority ? 'default' : 'outline'}
                  onClick={() => handleTogglePriority(currentOkr.objectiveId, false)}
                >
                  <ThumbsDown className="h-3.5 w-3.5 mr-1.5" />
                  Não
                </Button>
              </div>
            </div>

            {/* /okrs-style rendering, no action buttons */}
            {liveObjective ? (
              <ObjectiveListItem
                key={liveObjective.id}
                objective={liveObjective as any}
                keyResults={(liveObjective as any).key_results || []}
                type="org"
                canEdit={false}
                canCheckin={false}
              />
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Carregando dados ao vivo do OKR…
              </p>
            )}
          </>
        )}
      </div>
    </WizardStepScaffold>
  );
}

