/**
 * QbrPostOkrPromotionStep - Step 1: Promoção de OKRs aprovados
 * 
 * Lista OKRs aprovados na reunião QBR. Permite marcar quais serão promovidos
 * (criados como OKRs reais no próximo ciclo).
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Rocket, Check, Pencil, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardFirstStepFooter,
  WizardStepScaffold,
} from '../shared';
import type { QbrApprovalStatus, TeamOkrCreationWizardState } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface ApprovedTeamOkr {
  teamId: string;
  teamName: string;
  sessionId: string;
  status: QbrApprovalStatus;
  proposedOkrs: Partial<TeamOkrCreationWizardState>;
}

export interface QbrPostOkrPromotionStepProps {
  approvedOkrs: ApprovedTeamOkr[];
  promotedSessionIds: string[];
  onPromotedSessionIdsChange: (ids: string[]) => void;
  onContinue: () => void;
}

// ============================================================
// CONSTANTS
// ============================================================

const STATUS_LABELS: Record<QbrApprovalStatus, { label: string; icon: typeof Check; color: string }> = {
  approved: { label: 'Aprovado', icon: Check, color: 'text-status-green' },
  approved_with_changes: { label: 'Com ajustes', icon: Pencil, color: 'text-status-amber' },
  defer: { label: 'Diferido', icon: Clock, color: 'text-muted-foreground' },
  discarded: { label: 'Descartado', icon: X, color: 'text-status-red' },
};

// ============================================================
// COMPONENT
// ============================================================

export function QbrPostOkrPromotionStep({
  approvedOkrs,
  promotedSessionIds,
  onPromotedSessionIdsChange,
  onContinue,
}: QbrPostOkrPromotionStepProps) {
  const promotable = approvedOkrs.filter(o => o.status === 'approved' || o.status === 'approved_with_changes');
  const deferred = approvedOkrs.filter(o => o.status === 'defer');
  const discarded = approvedOkrs.filter(o => o.status === 'discarded');

  const togglePromotion = (sessionId: string) => {
    if (promotedSessionIds.includes(sessionId)) {
      onPromotedSessionIdsChange(promotedSessionIds.filter(id => id !== sessionId));
    } else {
      onPromotedSessionIdsChange([...promotedSessionIds, sessionId]);
    }
  };

  const allPromotableSelected = promotable.every(o => promotedSessionIds.includes(o.sessionId));

  const selectAll = () => {
    if (allPromotableSelected) {
      onPromotedSessionIdsChange([]);
    } else {
      onPromotedSessionIdsChange(promotable.map(o => o.sessionId));
    }
  };

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Rocket}
          title="Promoção de OKRs"
          description={`${promotable.length} OKR${promotable.length !== 1 ? 's' : ''} aprovados para promoção`}
          variant="green"
          badge={`${promotedSessionIds.length}/${promotable.length} selecionados`}
        />
      }
      footer={
        <WizardFirstStepFooter
          onPrimary={onContinue}
          primaryLabel="Continuar"
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* Select all */}
        {promotable.length > 1 && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={allPromotableSelected}
              onCheckedChange={selectAll}
            />
            <Label htmlFor="select-all" className="text-sm cursor-pointer">
              Selecionar todos os aprovados
            </Label>
          </div>
        )}

        {/* Promotable OKRs */}
        {promotable.length > 0 && (
          <div className="space-y-2">
            {promotable.map(okr => {
              const cfg = STATUS_LABELS[okr.status];
              const Icon = cfg.icon;
              const isSelected = promotedSessionIds.includes(okr.sessionId);

              return (
                <Card key={okr.sessionId} className={cn(isSelected && 'border-primary/50 bg-primary/5')}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => togglePromotion(okr.sessionId)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{okr.teamName}</span>
                          <Badge variant="outline" className={cn('text-[10px]', cfg.color)}>
                            <Icon className="h-3 w-3 mr-0.5" />
                            {cfg.label}
                          </Badge>
                        </div>
                        {okr.proposedOkrs?.objective?.title && (
                          <p className="text-sm text-muted-foreground">{okr.proposedOkrs.objective.title}</p>
                        )}
                        {okr.proposedOkrs?.draftKrs && okr.proposedOkrs.draftKrs.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {okr.proposedOkrs.draftKrs.length} KR{okr.proposedOkrs.draftKrs.length > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Deferred */}
        {deferred.length > 0 && (
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Diferidos ({deferred.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {deferred.map(okr => (
                <div key={okr.sessionId} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{okr.teamName}</span>
                  {okr.proposedOkrs?.objective?.title && (
                    <span className="truncate flex-1">— {okr.proposedOkrs.objective.title}</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Discarded */}
        {discarded.length > 0 && (
          <Card className="border-dashed opacity-60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Descartados ({discarded.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {discarded.map(okr => (
                <div key={okr.sessionId} className="flex items-center gap-2 text-xs text-muted-foreground line-through">
                  <X className="h-3 w-3" />
                  <span>{okr.teamName}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {promotable.length === 0 && (
          <div className="text-center py-8">
            <Rocket className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum OKR aprovado para promoção.</p>
          </div>
        )}
      </div>
    </WizardStepScaffold>
  );
}
