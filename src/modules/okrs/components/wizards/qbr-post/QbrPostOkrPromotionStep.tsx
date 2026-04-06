/**
 * QbrPostOkrPromotionStep - Step 1: Promoção de OKRs aprovados
 * 
 * Lista OKRs aprovados na reunião QBR. Permite marcar quais serão promovidos.
 * Exibe flags de calibração C-Level, campo de ajuste e indicador de dependências.
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Rocket, Check, Pencil, Clock, X, Flag, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardFirstStepFooter,
  WizardStepScaffold,
} from '../shared';
import type {
  QbrApprovalStatus,
  ProposedObjectiveEntry,
  QbrCLevelSnapshot,
  QbrMeetingSnapshot,
  QbrCalibrationFlag,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface ApprovedTeamOkr {
  teamId: string;
  teamName: string;
  sessionId: string;
  status: QbrApprovalStatus;
  proposedOkrs: ProposedObjectiveEntry[];
}

export interface QbrPostOkrPromotionStepProps {
  approvedOkrs: ApprovedTeamOkr[];
  promotedSessionIds: string[];
  onPromotedSessionIdsChange: (ids: string[]) => void;
  calibrationFlags?: QbrCLevelSnapshot['okrCalibrationFlags'];
  crossCommitments?: QbrMeetingSnapshot['crossCommitments'];
  adjustmentNotes: Record<string, string>;
  onAdjustmentNotesChange: (notes: Record<string, string>) => void;
  teams?: Array<{ id: string; name: string }>;
  onContinue: () => void;
}

// ============================================================
// CONSTANTS
// ============================================================

const STATUS_LABELS: Record<QbrApprovalStatus, { label: string; icon: typeof Check; color: string }> = {
  approved: { label: 'Aprovado', icon: Check, color: 'text-status-green' },
  approved_with_changes: { label: 'Com ajustes', icon: Pencil, color: 'text-status-amber' },
  defer: { label: 'Standby', icon: Clock, color: 'text-muted-foreground' },
  discarded: { label: 'Descartado', icon: X, color: 'text-status-red' },
};

const FLAG_LABELS: Record<QbrCalibrationFlag, string> = {
  too_conservative: '🐢 Muito conservador',
  too_aggressive: '🔥 Muito agressivo',
  gap: '🕳️ Gap estratégico',
  overlap: '🔄 Sobreposição',
};

// ============================================================
// COMPONENT
// ============================================================

export function QbrPostOkrPromotionStep({
  approvedOkrs,
  promotedSessionIds,
  onPromotedSessionIdsChange,
  calibrationFlags = [],
  crossCommitments = [],
  adjustmentNotes,
  onAdjustmentNotesChange,
  teams = [],
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

  const getTeamFlags = (teamId: string) => calibrationFlags.filter(f => f.teamId === teamId);
  const getTeamDependencies = (teamId: string) => {
    return crossCommitments.filter(c => c.toTeamId === teamId).map(c => {
      const fromTeam = teams.find(t => t.id === c.fromTeamId);
      return fromTeam?.name || 'Time';
    });
  };

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Rocket}
          title="Promoção de OKRs"
          tooltip="qbr-post-okr-promotion"
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
              const teamFlags = getTeamFlags(okr.teamId);
              const dependencies = getTeamDependencies(okr.teamId);
              const needsAdjustment = okr.status === 'approved_with_changes';

              return (
                <Card key={okr.sessionId} className={cn(isSelected && 'border-primary/50 bg-primary/5')}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => togglePromotion(okr.sessionId)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{okr.teamName}</span>
                          <Badge variant="outline" className={cn('text-[10px]', cfg.color)}>
                            <Icon className="h-3 w-3 mr-0.5" />
                            {cfg.label}
                          </Badge>
                        </div>

                        {/* C-Level calibration flags */}
                        {teamFlags.length > 0 && (
                          <div className="space-y-1">
                            {teamFlags.map((f, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-xs bg-status-amber/10 rounded px-2 py-1">
                                <Flag className="h-3 w-3 text-status-amber mt-0.5 shrink-0" />
                                <div>
                                  <span className="font-medium">{FLAG_LABELS[f.flag]}</span>
                                  {f.note && <span className="text-muted-foreground"> — {f.note}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Dependency indicators */}
                        {dependencies.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {dependencies.map((name, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] text-status-amber border-status-amber/30">
                                <AlertTriangle className="h-3 w-3 mr-0.5" />
                                Depende de: {name}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Proposed OKRs */}
                        {okr.proposedOkrs.length > 0 && (
                          <div className="space-y-1">
                            {okr.proposedOkrs.map(entry => (
                              <p key={entry.id} className="text-sm text-muted-foreground">{entry.objective.title}</p>
                            ))}
                            <p className="text-xs text-muted-foreground mt-1">
                              {okr.proposedOkrs.reduce((sum, e) => sum + e.draftKrs.length, 0)} KRs total
                            </p>
                          </div>
                        )}

                        {/* Adjustment notes for approved_with_changes */}
                        {needsAdjustment && (
                          <Textarea
                            value={adjustmentNotes[okr.sessionId] || ''}
                            onChange={(e) => onAdjustmentNotesChange({
                              ...adjustmentNotes,
                              [okr.sessionId]: e.target.value,
                            })}
                            placeholder="Descreva os ajustes necessários antes de promover..."
                            className="text-xs min-h-[60px] mt-1"
                          />
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
              <CardTitle className="text-xs text-muted-foreground">Standby ({deferred.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {deferred.map(okr => (
                <div key={okr.sessionId} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{okr.teamName}</span>
                  {okr.proposedOkrs.length > 0 && (
                    <span className="truncate flex-1">— {okr.proposedOkrs[0].objective.title}{okr.proposedOkrs.length > 1 ? ` +${okr.proposedOkrs.length - 1}` : ''}</span>
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
