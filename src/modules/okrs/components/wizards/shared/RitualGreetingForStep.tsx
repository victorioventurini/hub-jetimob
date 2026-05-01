/**
 * RitualGreetingForStep — Wrapper opcional usado pelas páginas dos ritos
 * para injetar a saudação contextual acima do conteúdo do Step 1.
 *
 * Resolve o `RitualGreetingContext` via hook e delega ao `<RitualGreeting>`.
 * Se a persona não tiver entrada em `RITUAL_GREETING_PHRASES`, nada é
 * renderizado (ex.: wizards de criação de OKRs).
 */

import { memo } from 'react';
import { RitualGreeting } from './RitualGreeting';
import { useRitualGreetingContext } from '@/modules/okrs/hooks';
import type { WizardPersona } from '@/modules/okrs/types/wizard';

export interface RitualGreetingForStepProps {
  ritualSlug: WizardPersona;
  userName: string | null | undefined;
  /** Para semanais: id do usuário (ordinal de check-in pessoal). */
  effectiveUserId?: string | null;
  /** Para semanais de time: id do time (ordinal por time). */
  teamId?: string | null;
  /** wizard_type custom (default = ritualSlug). */
  wizardType?: string;
  className?: string;
}

function RitualGreetingForStepImpl({
  ritualSlug,
  userName,
  effectiveUserId,
  teamId,
  wizardType,
  className,
}: RitualGreetingForStepProps) {
  const ctx = useRitualGreetingContext({ ritualSlug, effectiveUserId, teamId, wizardType });

  return (
    <RitualGreeting
      ritualSlug={ritualSlug}
      userName={userName}
      cycleName={ctx.cycleName}
      weekNumber={ctx.weekNumber}
      checkInOrdinal={ctx.checkInOrdinal}
      monthLabel={ctx.monthLabel}
      monthInQuarter={ctx.monthInQuarter}
      closingCycleName={ctx.closingCycleName}
      openingCycleName={ctx.openingCycleName}
      className={className}
    />
  );
}

export const RitualGreetingForStep = memo(RitualGreetingForStepImpl);
