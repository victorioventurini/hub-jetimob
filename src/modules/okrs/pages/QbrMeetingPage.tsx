/**
 * QbrMeetingPage - Wizard da reunião QBR (tela compartilhada)
 * 
 * Revisão e aprovação de OKRs, decisões estratégicas e compromissos cross-área.
 * @see docs/HUB_TECHNICAL_DEEP_DIVE.md — QBR Ritual
 */

import { useActiveCycle } from '@/modules/okrs/hooks';
import { useRitualAvailability } from '@/modules/okrs/hooks/useRitualAvailability';
import { RitualUnavailableScreen } from '@/modules/okrs/components/wizards/shared/RitualUnavailableScreen';

export default function QbrMeetingPage() {
  const { activeQuarterlyCycle: quarterlyCycle } = useActiveCycle();
  const availability = useRitualAvailability('qbr-meeting', quarterlyCycle);

  if (!availability.isAvailable) {
    return <RitualUnavailableScreen wizardType="qbr-meeting" availability={availability} />;
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">QBR Meeting — Em construção</p>
    </div>
  );
}
