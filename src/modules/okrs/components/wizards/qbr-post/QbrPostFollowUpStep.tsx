/**
 * QbrPostFollowUpStep - Step 4: Cadência de acompanhamento
 * 
 * Configures follow-up scheduling and MBR review flag.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarClock } from 'lucide-react';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
} from '../shared';
import type { QbrPostSnapshot } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

type FollowUpCadence = QbrPostSnapshot['followUpCadence'];

export interface QbrPostFollowUpStepProps {
  followUpCadence: FollowUpCadence;
  onFollowUpCadenceChange: (cadence: FollowUpCadence) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function QbrPostFollowUpStep({
  followUpCadence,
  onFollowUpCadenceChange,
  onContinue,
  onBack,
}: QbrPostFollowUpStepProps) {
  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={CalendarClock}
          title="Cadência de Acompanhamento"
          description="Configure o acompanhamento pós-QBR"
          variant="amber"
        />
      }
      footer={
        <WizardStepFooter onBack={onBack} onPrimary={onContinue} />
      }
    >
      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="mbr-scheduled"
                checked={followUpCadence.mbrReviewScheduled}
                onCheckedChange={(checked) =>
                  onFollowUpCadenceChange({ ...followUpCadence, mbrReviewScheduled: !!checked })
                }
              />
              <Label htmlFor="mbr-scheduled" className="text-sm cursor-pointer">
                Próximo MBR já está agendado
              </Label>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Data do follow-up meeting (opcional)</Label>
              <Input
                type="date"
                value={followUpCadence.followUpMeetingDate || ''}
                onChange={(e) =>
                  onFollowUpCadenceChange({ ...followUpCadence, followUpMeetingDate: e.target.value || undefined })
                }
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </WizardStepScaffold>
  );
}
