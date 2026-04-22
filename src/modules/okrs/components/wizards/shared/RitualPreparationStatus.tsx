/**
 * RitualPreparationStatus
 *
 * Wrapper de conveniência: une `useRitualPreparationStatus` ao
 * `PreparationStatusCard` para uso direto no Step 1 dos ritos.
 *
 * Comportamento:
 *  - Faz o fetch do status conforme `ritualType` + contexto.
 *  - Renderiza o card no modo apropriado.
 *  - Renderiza nada se o hook indicar `isEmpty` (não polui o passo).
 *  - Renderiza nada enquanto `isLoading=true` na primeira carga (evita flash).
 *
 * Uso típico no topo de um *OpeningStep* ou *PanoramaStep*:
 *
 *   <RitualPreparationStatus
 *     ritualType="qbr-meeting"
 *     cycleId={quarterlyCycle?.id}
 *   />
 *
 * Não introduz lógica de negócio. Não muda completion gates.
 */

import { memo } from 'react';
import { PreparationStatusCard } from './PreparationStatusCard';
import {
  useRitualPreparationStatus,
  type SupportedRitualType,
} from '@/modules/okrs/hooks';

export interface RitualPreparationStatusProps {
  ritualType: SupportedRitualType;
  teamId?: string | null;
  cycleId?: string | null;
  referenceMonth?: string | null;
  /** Renderizar mesmo quando vazio (default: false → oculta) */
  showWhenEmpty?: boolean;
  /** Classes extras no card */
  className?: string;
}

function RitualPreparationStatusInner({
  ritualType,
  teamId,
  cycleId,
  referenceMonth,
  showWhenEmpty = false,
  className,
}: RitualPreparationStatusProps) {
  const status = useRitualPreparationStatus({
    ritualType,
    teamId,
    cycleId,
    referenceMonth,
  });

  if (status.isLoading) return null;
  if (status.isEmpty && !showWhenEmpty) return null;

  return (
    <PreparationStatusCard
      mode={status.mode}
      title={status.title}
      description={status.description}
      participants={status.participants}
      sections={status.sections}
      sourceRitual={status.sourceRitual}
      className={className}
    />
  );
}

export const RitualPreparationStatus = memo(RitualPreparationStatusInner);
