/**
 * AllHandsOrgOkrsStep — Step 3 do All Hands.
 *
 * READ-ONLY: reutiliza a mesma UI da página /okrs (visão Empresa) para
 * exibir os Objetivos Organizacionais e seus KRs, porém SEM os botões
 * de ação (edição, criação, check-in). Serve apenas para apresentação
 * dos OKRs Org no rito All Hands.
 */

import { memo, useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { useBu } from '@/contexts/BuContext';
import { useOrgObjectives } from '@/modules/okrs/hooks/queries';
import { ObjectiveListItem } from '@/modules/okrs/components/dashboard/ObjectiveListItem';
import { OkrEmptyState } from '@/modules/okrs/components/OkrEmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import {
  WizardStepFooter,
  WizardStepScaffold,
  WizardStepHeader,
} from '@/modules/okrs/components/wizards/shared';

export interface AllHandsOrgOkrsStepProps {
  /** Ano de referência para os Objetivos Org. Default: ano corrente. */
  year?: number;
  onContinue: () => void;
  onBack: () => void;
}

export const AllHandsOrgOkrsStep = memo(function AllHandsOrgOkrsStep({
  year,
  onContinue,
  onBack,
}: AllHandsOrgOkrsStepProps) {
  const { currentBu, currentBuId } = useBu();
  const targetYear = year ?? new Date().getFullYear();

  const { data: orgObjectives, isLoading } = useOrgObjectives({
    buId: currentBuId,
    year: targetYear,
  });

  const objectives = useMemo(() => orgObjectives ?? [], [orgObjectives]);

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Building2}
          title="OKRs Organizacionais"
          description={`Objetivos estratégicos da ${currentBu?.name || 'BU'} — ${targetYear}`}
          variant="purple"
        />
      }
      footer={
        <WizardStepFooter
          showBack
          onBack={onBack}
          primaryLabel="Continuar"
          onPrimary={onContinue}
        />
      }
    >
      <div className="p-6 space-y-4 max-w-7xl mx-auto w-full">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <ObjectiveListItem
                key={i}
                objective={{ id: '', title: '', year: targetYear, status: 'draft' }}
                isLoading
                type="org"
              />
            ))}
          </div>
        ) : objectives.length === 0 ? (
          <OkrEmptyState
            title={`Nenhum objetivo da ${currentBu?.name || 'empresa'}`}
            description="Não há OKRs organizacionais cadastrados para este ano."
          />
        ) : (
          <div className="space-y-6">
            {objectives.map((objective: any) => (
              <ObjectiveListItem
                key={objective.id}
                objective={objective}
                keyResults={objective.key_results || []}
                type="org"
                canEdit={false}
                canCheckin={false}
              />
            ))}
          </div>
        )}
      </div>
    </WizardStepScaffold>
  );
});
