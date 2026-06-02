/**
 * MbrOrgOkrsStep - Etapa: OKRs Organizacionais
 *
 * Reusa a mesma UI da página /okrs (ObjectiveListItem), sem botões de ação,
 * com navegação 1 OKR por vez e InlineDecisionInput no rodapé.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Target } from 'lucide-react';
import { useBu } from '@/contexts/BuContext';
import { useOrgObjectives } from '@/modules/okrs/hooks/queries';
import { WizardStepHeader, WizardStepFooter, WizardStepScaffold, InlineDecisionInput } from '../shared';
import { ObjectiveListItem } from '@/modules/okrs/components/dashboard/ObjectiveListItem';
import type { MbrOrgOkrSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { OrgObjectiveWithKrs } from '@/modules/okrs/hooks/queries';

export interface MbrOrgOkrsStepProps {
  orgOkrSnapshots: MbrOrgOkrSnapshot[];
  onOrgOkrSnapshotsChange: (snapshots: MbrOrgOkrSnapshot[]) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  /** Mantido por compat; não usado mais para render. */
  orgObjectives?: OrgObjectiveWithKrs[];
  onContinue: () => void;
  onBack: () => void;
  /** Quando false, oculta o InlineDecisionInput do rodapé. Default: true. */
  showInlineDecisionInput?: boolean;
  /** Ano de referência para o fetch ao vivo. Default: ano corrente. */
  year?: number;
}

export function MbrOrgOkrsStep({
  orgOkrSnapshots,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
  showInlineDecisionInput = true,
  year,
}: MbrOrgOkrsStepProps) {
  const { currentBuId } = useBu();
  const targetYear = year ?? new Date().getFullYear();

  const { data: liveObjectives, isLoading } = useOrgObjectives({
    buId: currentBuId,
    year: targetYear,
  });

  const objectives = useMemo(() => liveObjectives ?? [], [liveObjectives]);
  const total = objectives.length;

  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (index > 0 && index >= total) setIndex(Math.max(0, total - 1));
  }, [index, total]);

  const current = total > 0 ? objectives[Math.min(index, total - 1)] : null;
  const currentSnapshot = useMemo(
    () => (current ? orgOkrSnapshots.find((s) => s.objectiveId === current.id) ?? null : null),
    [current, orgOkrSnapshots],
  );

  const isFirst = index <= 0;
  const isLast = total === 0 || index >= total - 1;

  const handlePrimary = useCallback(() => {
    if (isLast) onContinue();
    else setIndex((i) => Math.min(total - 1, i + 1));
  }, [isLast, onContinue, total]);

  const handleBack = useCallback(() => {
    if (isFirst) onBack();
    else setIndex((i) => Math.max(0, i - 1));
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
          badge={total > 0 ? `${Math.min(index + 1, total)} / ${total}` : '0'}
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
                current
                  ? `Decisão sobre: ${current.title}...`
                  : 'Nota geral sobre OKRs organizacionais...'
              }
              subStep={current?.id ?? currentSnapshot?.objectiveId ?? null}
              metadataFactory={current ? () => ({ objective_id: current.id }) : undefined}
            />
          </div>
        ) : undefined
      }
      footer={
        <WizardStepFooter
          onBack={handleBack}
          backLabel={isFirst ? 'Voltar' : 'Anterior'}
          onPrimary={handlePrimary}
          primaryLabel={isLast ? 'Consolidar Diretrizes' : 'Próximo Objetivo'}
        />
      }
    >
      <div className="p-6 space-y-4 max-w-7xl mx-auto w-full">
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Carregando OKRs organizacionais…
          </p>
        ) : !current ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma OKR organizacional encontrada para {targetYear}.
          </p>
        ) : (
          <ObjectiveListItem
            key={current.id}
            objective={current as any}
            keyResults={(current as any).key_results || []}
            type="org"
            canEdit={false}
            canCheckin={false}
          />
        )}
      </div>
    </WizardStepScaffold>
  );
}
