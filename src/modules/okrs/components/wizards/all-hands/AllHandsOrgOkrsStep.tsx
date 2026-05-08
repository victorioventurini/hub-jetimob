/**
 * AllHandsOrgOkrsStep — Step 3 do All Hands.
 *
 * READ-ONLY: reutiliza a mesma UI da página /okrs (visão Empresa) para
 * exibir os Objetivos Organizacionais e seus KRs, porém SEM os botões
 * de ação (edição, criação, check-in). Serve apenas para apresentação
 * dos OKRs Org no rito All Hands.
 */

import { memo, useMemo, useState, useEffect } from 'react';
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
  const total = objectives.length;

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index > 0 && index >= total) {
      setIndex(Math.max(0, total - 1));
    }
  }, [index, total]);

  const current: any = total > 0 ? objectives[Math.min(index, total - 1)] : null;
  const isFirst = index <= 0;
  const isLast = index >= total - 1;

  const handleBack = () => {
    if (!isFirst) setIndex((i) => i - 1);
    else onBack();
  };

  const handleContinue = () => {
    if (!isLast && total > 0) setIndex((i) => i + 1);
    else onContinue();
  };

  const description = total > 0
    ? `Objetivos estratégicos da ${currentBu?.name || 'BU'} — ${targetYear} · ${Math.min(index + 1, total)} de ${total}`
    : `Objetivos estratégicos da ${currentBu?.name || 'BU'} — ${targetYear}`;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Building2}
          title="OKRs Organizacionais"
          description={description}
          variant="purple"
        />
      }
      footer={
        <WizardStepFooter
          showBack
          onBack={handleBack}
          primaryLabel={isLast || total === 0 ? 'Continuar' : 'Próximo objetivo'}
          onPrimary={handleContinue}
        />
      }
    >
      <div className="p-6 space-y-4 max-w-7xl mx-auto w-full">
        {isLoading ? (
          <ObjectiveListItem
            objective={{ id: '', title: '', year: targetYear, status: 'draft' }}
            isLoading
            type="org"
          />
        ) : !current ? (
          <OkrEmptyState
            title={`Nenhum objetivo da ${currentBu?.name || 'empresa'}`}
            description="Não há OKRs organizacionais cadastrados para este ano."
          />
        ) : (
          <ObjectiveListItem
            key={current.id}
            objective={current}
            keyResults={current.key_results || []}
            type="org"
            canEdit={false}
            canCheckin={false}
          />
        )}
      </div>
    </WizardStepScaffold>
  );
});
