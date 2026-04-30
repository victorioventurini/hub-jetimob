/**
 * QbrPostOkrPromotionStep - Step 1: Promoção de OKRs aprovados
 * 
 * Lista OKRs aprovados na reunião QBR. Permite marcar quais serão promovidos.
 * Exibe flags de calibração C-Level, scorecard de entrega, ciclo de destino,
 * e campo de ajuste estruturado por KR.
 */

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Rocket, Check, Pencil, Clock, X, Flag, AlertTriangle, Target, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardFirstStepFooter,
  WizardStepScaffold,
  TeamDeliveryScorecard,
} from '../shared';
import type { TeamDeliveryScorecardData } from '../shared/TeamDeliveryScorecard';
import { BuUserSelect } from '@/components/selects';
import type {
  QbrApprovalStatus,
  ProposedObjectiveEntry,
  QbrCLevelSnapshot,
  QbrMeetingSnapshot,
  QbrCalibrationFlag,
  QbrKrAdjustment,
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

export interface DestinationCycleOption {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface QbrPostOkrPromotionStepProps {
  approvedOkrs: ApprovedTeamOkr[];
  promotedSessionIds: string[];
  onPromotedSessionIdsChange: (ids: string[]) => void;
  calibrationFlags?: QbrCLevelSnapshot['okrCalibrationFlags'];
  crossCommitments?: QbrMeetingSnapshot['crossCommitments'];
  adjustmentNotes: Record<string, string>;
  onAdjustmentNotesChange: (notes: Record<string, string>) => void;
  krAdjustments?: Record<string, QbrKrAdjustment[]>;
  onKrAdjustmentsChange?: (adjustments: Record<string, QbrKrAdjustment[]>) => void;
  teams?: Array<{ id: string; name: string }>;
  /** Scorecard de entrega por time (derivado de orgObjectives) */
  teamScorecards?: TeamDeliveryScorecardData[];
  /** Ciclos em planejamento disponíveis para promoção */
  destinationCycles?: DestinationCycleOption[];
  destinationCycleId?: string;
  onDestinationCycleIdChange?: (id: string) => void;
  onContinue: () => void;
  /** Slot opcional renderizado no topo do conteúdo (ex.: PreparationStatusCard) */
  topSlot?: ReactNode;
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
// DESTINATION CYCLE BANNER
// ============================================================

function DestinationCycleBanner({
  cycles,
  selectedId,
  onChange,
}: {
  cycles: DestinationCycleOption[];
  selectedId?: string;
  onChange?: (id: string) => void;
}) {
  if (cycles.length === 0) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-md bg-status-amber/10 border border-status-amber/20">
        <AlertTriangle className="h-4 w-4 text-status-amber mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-status-amber">Nenhum ciclo em planejamento encontrado</p>
          <p className="text-muted-foreground text-xs mt-1">
            Configure o próximo quarter em Configurações → OKRs → Ciclos antes de promover.
          </p>
        </div>
      </div>
    );
  }

  if (cycles.length === 1) {
    const cycle = cycles[0];
    const start = new Date(cycle.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    const end = new Date(cycle.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    return (
      <div className="flex items-center gap-2 p-3 rounded-md bg-primary/5 border border-primary/20">
        <Target className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm">
          Os OKRs aprovados serão criados em: <strong>{cycle.name}</strong> · {start} → {end}
        </span>
      </div>
    );
  }

  // Multiple cycles — show select
  return (
    <div className="flex items-center gap-3 p-3 rounded-md bg-primary/5 border border-primary/20">
      <Target className="h-4 w-4 text-primary shrink-0" />
      <span className="text-sm shrink-0">Ciclo de destino:</span>
      <select
        className="text-sm border rounded px-2 py-1 bg-background flex-1"
        value={selectedId || ''}
        onChange={(e) => onChange?.(e.target.value)}
      >
        <option value="">Selecione...</option>
        {cycles.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}

// ============================================================
// STRUCTURED KR ADJUSTMENTS
// ============================================================

function StructuredKrAdjustments({
  sessionId,
  proposedOkrs,
  adjustments,
  onAdjustmentsChange,
}: {
  sessionId: string;
  proposedOkrs: ProposedObjectiveEntry[];
  adjustments: QbrKrAdjustment[];
  onAdjustmentsChange: (sessionId: string, adj: QbrKrAdjustment[]) => void;
}) {
  const allKrs = proposedOkrs.flatMap((entry, _oi) =>
    entry.draftKrs.map((kr, ki) => ({ kr, krIndex: ki, objectiveTitle: entry.objective.title }))
  );

  const getAdj = (krIndex: number): QbrKrAdjustment =>
    adjustments.find(a => a.krIndex === krIndex) || { krIndex, hasAdjustment: false };

  const updateAdj = (krIndex: number, updates: Partial<QbrKrAdjustment>) => {
    const existing = adjustments.filter(a => a.krIndex !== krIndex);
    const current = getAdj(krIndex);
    onAdjustmentsChange(sessionId, [...existing, { ...current, ...updates }]);
  };

  return (
    <div className="space-y-2 mt-2">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Info className="h-3 w-3" />
        Registre exatamente o que muda antes de promover. Esses ajustes serão aplicados ao criar os OKRs no sistema.
      </p>
      {allKrs.map(({ kr, krIndex }) => {
        const adj = getAdj(krIndex);
        return (
          <div key={krIndex} className="border rounded-md p-2 space-y-2 bg-muted/20">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`adj-${sessionId}-${krIndex}`}
                checked={adj.hasAdjustment}
                onCheckedChange={(checked) => updateAdj(krIndex, { hasAdjustment: !!checked })}
              />
              <Label htmlFor={`adj-${sessionId}-${krIndex}`} className="text-xs cursor-pointer flex-1 truncate">
                {kr.title || `KR ${krIndex + 1}`}
              </Label>
            </div>
            {adj.hasAdjustment && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Novo título (opcional)</Label>
                  <Input
                    value={adj.newTitle || ''}
                    onChange={(e) => updateAdj(krIndex, { newTitle: e.target.value || undefined })}
                    placeholder={kr.title}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Nova meta (opcional)</Label>
                  <Input
                    value={adj.newTarget || ''}
                    onChange={(e) => updateAdj(krIndex, { newTarget: e.target.value || undefined })}
                    placeholder={String(kr.target)}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[10px] text-muted-foreground">Novo responsável (opcional)</Label>
                  <BuUserSelect
                    value={adj.newOwnerId || undefined}
                    onValueChange={(val) => {
                      if (!val) {
                        updateAdj(krIndex, { newOwnerId: undefined, newOwnerName: undefined });
                      }
                    }}
                    onUserSelected={(meta) => {
                      if (meta) {
                        updateAdj(krIndex, { newOwnerId: meta.id, newOwnerName: meta.displayName });
                      } else {
                        updateAdj(krIndex, { newOwnerId: undefined, newOwnerName: undefined });
                      }
                    }}
                    placeholder="Selecione..."
                    className="text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
  krAdjustments = {},
  onKrAdjustmentsChange,
  teams = [],
  teamScorecards = [],
  destinationCycles = [],
  destinationCycleId,
  onDestinationCycleIdChange,
  onContinue,
  topSlot,
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
  const getTeamScorecard = (teamId: string) => teamScorecards.find(s => s.teamId === teamId);

  const handleKrAdjustmentsChange = (sessionId: string, adj: QbrKrAdjustment[]) => {
    onKrAdjustmentsChange?.({ ...krAdjustments, [sessionId]: adj });
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
        {topSlot}
        {/* Destination cycle banner */}
        <DestinationCycleBanner
          cycles={destinationCycles}
          selectedId={destinationCycleId}
          onChange={onDestinationCycleIdChange}
        />

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
              const scorecard = getTeamScorecard(okr.teamId);

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

                        {/* Team delivery scorecard (compact) */}
                        {scorecard && (
                          <div className="space-y-1">
                            <TeamDeliveryScorecard data={scorecard} compact />
                            <p className="text-[10px] text-muted-foreground italic">
                              Entrega do quarter que encerrou. Use como contexto ao ajustar e promover.
                            </p>
                          </div>
                        )}

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

                        {/* Structured KR adjustments for approved_with_changes */}
                        {needsAdjustment && onKrAdjustmentsChange && (
                          <StructuredKrAdjustments
                            sessionId={okr.sessionId}
                            proposedOkrs={okr.proposedOkrs}
                            adjustments={krAdjustments[okr.sessionId] || []}
                            onAdjustmentsChange={handleKrAdjustmentsChange}
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
