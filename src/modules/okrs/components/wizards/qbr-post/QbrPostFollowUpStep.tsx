/**
 * QbrPostFollowUpStep - Step 4: Cadência de acompanhamento
 * 
 * Seção A: Datas de acompanhamento (MBR, primeiro check-in, follow-up)
 * Seção B: Próximos 30 dias por liderança (read-only do meeting)
 * Seção C: Confirmação de notificação para líderes
 */

import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarClock, Bell, Users } from 'lucide-react';
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
  /** Prioridades dos próximos 30 dias capturadas no QBR Meeting (read-only) */
  meetingNextThirtyDays?: { ceo?: string; coo?: string; cpto?: string };
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function QbrPostFollowUpStep({
  followUpCadence,
  onFollowUpCadenceChange,
  meetingNextThirtyDays,
  onContinue,
  onBack,
}: QbrPostFollowUpStepProps) {
  const hasNextThirtyDays = meetingNextThirtyDays && (meetingNextThirtyDays.ceo || meetingNextThirtyDays.coo || meetingNextThirtyDays.cpto);

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={CalendarClock}
          title="Cadência de Acompanhamento"
          tooltip="qbr-post-followup"
          description="Garanta que as decisões do QBR virem ação"
          variant="amber"
        />
      }
      footer={
        <WizardStepFooter onBack={onBack} onPrimary={onContinue} />
      }
    >
      <div className="p-6 space-y-6">
        {/* Seção A — Datas de acompanhamento */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Datas de Acompanhamento</span>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Próximo MBR <span className="text-status-red">*</span>
              </Label>
              <Input
                type="date"
                value={followUpCadence.nextMbrDate || ''}
                onChange={(e) =>
                  onFollowUpCadenceChange({ ...followUpCadence, nextMbrDate: e.target.value || undefined })
                }
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Primeiro check-in do quarter (opcional)</Label>
              <Input
                type="date"
                value={followUpCadence.firstCheckinDate || ''}
                onChange={(e) =>
                  onFollowUpCadenceChange({ ...followUpCadence, firstCheckinDate: e.target.value || undefined })
                }
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Follow-up meeting (opcional)</Label>
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

        {/* Seção B — Próximos 30 dias (read-only do meeting) */}
        {hasNextThirtyDays && (
          <Card className="border-dashed">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Próximos 30 dias por liderança</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Definido na reunião QBR — referência para acompanhamento.
              </p>
              {meetingNextThirtyDays?.ceo && (
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-muted-foreground">CEO</span>
                  <p className="text-sm bg-muted/30 rounded px-3 py-2">{meetingNextThirtyDays.ceo}</p>
                </div>
              )}
              {meetingNextThirtyDays?.coo && (
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-muted-foreground">COO</span>
                  <p className="text-sm bg-muted/30 rounded px-3 py-2">{meetingNextThirtyDays.coo}</p>
                </div>
              )}
              {meetingNextThirtyDays?.cpto && (
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-muted-foreground">CPTO</span>
                  <p className="text-sm bg-muted/30 rounded px-3 py-2">{meetingNextThirtyDays.cpto}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Seção C — Confirmação de notificação */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Comunicação para os Times</span>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="leaders-notified"
                checked={followUpCadence.leadersNotified || false}
                onCheckedChange={(checked) =>
                  onFollowUpCadenceChange({ ...followUpCadence, leadersNotified: !!checked })
                }
              />
              <Label htmlFor="leaders-notified" className="text-sm cursor-pointer">
                Os líderes serão notificados sobre os OKRs ativos após o encerramento
              </Label>
            </div>
            <p className="text-xs text-muted-foreground pl-7">
              Ao concluir o pós-QBR, o sistema envia notificação automática para cada líder com link para seus OKRs promovidos.
            </p>
          </CardContent>
        </Card>
      </div>
    </WizardStepScaffold>
  );
}
