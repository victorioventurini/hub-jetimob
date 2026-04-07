/**
 * QbrMeetingOkrReviewStep - Step 2: Revisão e aprovação de OKRs por time (gate)
 * 
 * Navegação 1-de-N com ações: approved, approved_with_changes, discarded, defer.
 * Gate: não avança sem que todos os times tenham sido revisados.
 * Inclui: flags C-Level, adendos, cobertura de KRs org, timer por time e ajustes estruturados.
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { ProjectsSummary } from '@/modules/projects/components/ProjectsSummary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BuUserSelect } from '@/components/selects';
import { toast } from 'sonner';
import {
  ClipboardCheck, ChevronLeft, ChevronRight, Check, X, Pencil, Clock,
  AlertTriangle, Flag, Target, Link2, Play, Square, Users2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
} from '../shared';
import { AddendumBadge } from '../shared/AddendumBadge';
import type {
  QbrMeetingSnapshot,
  QbrApprovalStatus,
  QbrCLevelSnapshot,
  ProposedObjectiveEntry,
} from '@/modules/okrs/types/wizard';
import type { OrgObjectiveWithKrs } from '@/modules/okrs/hooks/queries/aggregateTypes';

// ============================================================
// TYPES
// ============================================================

export interface TeamForReview {
  teamId: string;
  teamName: string;
  sessionId: string;
  proposedOkrs: ProposedObjectiveEntry[];
  hasSubmission: boolean;
}

interface StructuredChange {
  krIndex: number;
  newTitle?: string;
  newTarget?: string;
  newOwnerId?: string;
  newOwnerName?: string;
}

export interface QbrMeetingOkrReviewStepProps {
  teamsForReview: TeamForReview[];
  approvals: QbrMeetingSnapshot['approvals'];
  onApprovalsChange: (approvals: QbrMeetingSnapshot['approvals']) => void;
  calibrationFlags?: QbrCLevelSnapshot['okrCalibrationFlags'];
  /** Addendums from qbr-pre sessions, keyed by teamId */
  teamAddendums?: Record<string, Array<{ text: string; created_at: string; created_by: string }>>;
  /** Org objectives for coverage analysis */
  orgObjectives?: OrgObjectiveWithKrs[];
  currentTeamIndex: number;
  onCurrentTeamIndexChange: (index: number) => void;
  /** Decisões inline */
  decisions?: TeamCheckinDecision[];
  onDecisionsChange?: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// CONSTANTS
// ============================================================

const STATUS_CONFIG: Record<QbrApprovalStatus, { label: string; icon: typeof Check; color: string; bg: string }> = {
  approved: { label: 'Aprovado', icon: Check, color: 'text-status-green', bg: 'bg-status-green-muted' },
  approved_with_changes: { label: 'Aprovado c/ ajustes', icon: Pencil, color: 'text-status-amber', bg: 'bg-status-amber-muted' },
  discarded: { label: 'Descartado', icon: X, color: 'text-status-red', bg: 'bg-status-red-muted' },
  defer: { label: 'Standby', icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
};

const TIMER_DURATION = 540; // 9 minutes in seconds
const TIMER_WARNING = 120; // 2 minutes remaining

// ============================================================
// SUB-COMPONENTS
// ============================================================

/** Timer local por time — não persiste no draft */
function ReviewTimer({ teamName, teamId }: { teamName: string; teamId: string }) {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(TIMER_DURATION);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasToastedRef = useRef(false);

  // Reset on team change
  useEffect(() => {
    setIsRunning(false);
    setSeconds(TIMER_DURATION);
    hasToastedRef.current = false;
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [teamId]);

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            setIsRunning(false);
            if (!hasToastedRef.current) {
              toast.warning(`Tempo esgotado para ${teamName}`);
              hasToastedRef.current = true;
            }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, seconds, teamName]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isWarning = seconds <= TIMER_WARNING && seconds > 0;
  const isExpired = seconds === 0;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs gap-1"
        onClick={() => setIsRunning(!isRunning)}
      >
        {isRunning ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        {isRunning ? 'Pausar' : seconds < TIMER_DURATION ? 'Retomar' : 'Iniciar timer'}
      </Button>
      {(isRunning || seconds < TIMER_DURATION) && (
        <span className={cn(
          'text-xs font-mono font-medium tabular-nums',
          isExpired ? 'text-status-red' : isWarning ? 'text-status-amber' : 'text-muted-foreground',
        )}>
          {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
      )}
    </div>
  );
}

/** Formulário de ajustes estruturados por KR */
function StructuredChangesForm({
  proposedOkrs,
  changes,
  onChangesUpdate,
}: {
  proposedOkrs: ProposedObjectiveEntry[];
  changes: StructuredChange[];
  onChangesUpdate: (changes: StructuredChange[]) => void;
}) {
  const allKrs = useMemo(() => {
    const result: Array<{ krIndex: number; title: string; target: string; unit: string }> = [];
    let idx = 0;
    for (const entry of proposedOkrs) {
      for (const kr of entry.draftKrs) {
        result.push({ krIndex: idx, title: kr.title, target: String(kr.target), unit: kr.unit });
        idx++;
      }
    }
    return result;
  }, [proposedOkrs]);

  const getChange = (krIndex: number) => changes.find(c => c.krIndex === krIndex);
  const isChecked = (krIndex: number) => !!getChange(krIndex);

  const toggleKr = (krIndex: number) => {
    if (isChecked(krIndex)) {
      onChangesUpdate(changes.filter(c => c.krIndex !== krIndex));
    } else {
      onChangesUpdate([...changes, { krIndex }]);
    }
  };

  const updateChange = (krIndex: number, updates: Partial<StructuredChange>) => {
    onChangesUpdate(changes.map(c => c.krIndex === krIndex ? { ...c, ...updates } : c));
  };

  if (allKrs.length === 0) return null;

  return (
    <Card className="border-status-amber/30">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-xs flex items-center gap-1.5 text-status-amber">
          <Pencil className="h-3 w-3" />
          Ajustes por KR
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {allKrs.map(kr => {
          const change = getChange(kr.krIndex);
          return (
            <div key={kr.krIndex} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`kr-change-${kr.krIndex}`}
                  checked={isChecked(kr.krIndex)}
                  onCheckedChange={() => toggleKr(kr.krIndex)}
                />
                <Label htmlFor={`kr-change-${kr.krIndex}`} className="text-xs cursor-pointer flex-1 truncate">
                  {kr.title} ({kr.target} {kr.unit})
                </Label>
              </div>
              {change && (
                <div className="pl-6 space-y-1.5">
                  <Input
                    value={change.newTitle || ''}
                    onChange={e => updateChange(kr.krIndex, { newTitle: e.target.value })}
                    placeholder="Novo título (opcional)"
                    className="text-xs h-7"
                  />
                  <Input
                    value={change.newTarget || ''}
                    onChange={e => updateChange(kr.krIndex, { newTarget: e.target.value })}
                    placeholder="Nova meta (opcional)"
                    className="text-xs h-7"
                  />
                  <div className="w-[180px]">
                    <BuUserSelect
                      value={change.newOwnerId}
                      onValueChange={() => {}}
                      onUserSelected={(user) => {
                        if (user) {
                          updateChange(kr.krIndex, { newOwnerId: user.id, newOwnerName: user.displayName });
                        } else {
                          updateChange(kr.krIndex, { newOwnerId: undefined, newOwnerName: undefined });
                        }
                      }}
                      placeholder="Novo responsável"
                      allowNone
                      noneLabel="Sem alteração"
                      showSearch
                      showBadges={false}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/** Shows which org KRs this team's proposals cover */
function OrgKrCoverageSection({
  proposedOkrs,
  orgObjectives,
}: {
  proposedOkrs: ProposedObjectiveEntry[];
  orgObjectives: OrgObjectiveWithKrs[];
}) {
  const linkedOrgKrIds = new Set<string>();
  for (const entry of proposedOkrs) {
    for (const kr of entry.draftKrs) {
      if ((kr as any).linkedOrgKrId) {
        linkedOrgKrIds.add((kr as any).linkedOrgKrId);
      }
    }
  }

  const orgKrMap = new Map<string, { krTitle: string; objTitle: string }>();
  for (const obj of orgObjectives) {
    for (const kr of obj.orgKrs) {
      orgKrMap.set(kr.id, { krTitle: kr.title, objTitle: obj.title });
    }
  }

  if (linkedOrgKrIds.size === 0 && orgObjectives.length > 0) {
    return (
      <div className="flex items-start gap-2 text-xs bg-status-amber/10 rounded px-2 py-1.5">
        <AlertTriangle className="h-3 w-3 text-status-amber mt-0.5 shrink-0" />
        <span className="text-muted-foreground">
          Nenhuma KR desta proposta contribui para os OKRs organizacionais.
        </span>
      </div>
    );
  }

  if (linkedOrgKrIds.size === 0) return null;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-1 pt-2 px-3">
        <CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground">
          <Link2 className="h-3 w-3" />
          Contribuições para OKRs organizacionais
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-2 space-y-1">
        {Array.from(linkedOrgKrIds).map(orgKrId => {
          const info = orgKrMap.get(orgKrId);
          if (!info) return null;
          return (
            <div key={orgKrId} className="text-xs flex items-start gap-1.5">
              <Target className="h-3 w-3 text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground">
                Contribui para → <span className="font-medium text-foreground">{info.krTitle}</span>
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/** Shows org KRs not yet covered by any approved team */
function ReverseCoverageSection({
  orgObjectives,
  approvals,
  teamsForReview,
}: {
  orgObjectives: OrgObjectiveWithKrs[];
  approvals: QbrMeetingSnapshot['approvals'];
  teamsForReview: TeamForReview[];
}) {
  const uncoveredOrgKrs = useMemo(() => {
    if (orgObjectives.length === 0) return [];

    const coveredOrgKrIds = new Set<string>();
    const approvedTeamIds = new Set(
      approvals
        .filter(a => a.status === 'approved' || a.status === 'approved_with_changes')
        .map(a => a.teamId)
    );

    for (const team of teamsForReview) {
      if (!approvedTeamIds.has(team.teamId)) continue;
      for (const entry of team.proposedOkrs) {
        for (const kr of entry.draftKrs) {
          if ((kr as any).linkedOrgKrId) {
            coveredOrgKrIds.add((kr as any).linkedOrgKrId);
          }
        }
      }
    }

    const uncovered: Array<{ krId: string; krTitle: string; objTitle: string }> = [];
    for (const obj of orgObjectives) {
      for (const kr of obj.orgKrs) {
        if (!coveredOrgKrIds.has(kr.id)) {
          uncovered.push({ krId: kr.id, krTitle: kr.title, objTitle: obj.title });
        }
      }
    }
    return uncovered;
  }, [orgObjectives, approvals, teamsForReview]);

  if (uncoveredOrgKrs.length === 0) return null;

  return (
    <Card className="border-dashed border-status-amber/30">
      <CardHeader className="pb-1 pt-2 px-3">
        <CardTitle className="text-xs flex items-center gap-1.5 text-status-amber">
          <AlertTriangle className="h-3 w-3" />
          KRs org sem cobertura até agora ({uncoveredOrgKrs.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-2 space-y-0.5">
        {uncoveredOrgKrs.map(kr => (
          <div key={kr.krId} className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0" />
            <span className="truncate">{kr.krTitle}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export function QbrMeetingOkrReviewStep({
  teamsForReview,
  approvals,
  onApprovalsChange,
  calibrationFlags = [],
  teamAddendums = {},
  orgObjectives = [],
  currentTeamIndex,
  onCurrentTeamIndexChange,
  onContinue,
  onBack,
}: QbrMeetingOkrReviewStepProps) {
  const [discardReason, setDiscardReason] = useState('');

  const current = teamsForReview[currentTeamIndex];
  const currentApproval = approvals.find(a => a.teamId === current?.teamId);
  const teamCalibrationFlags = calibrationFlags.filter(f => f.teamId === current?.teamId);

  const reviewedCount = approvals.length;
  const allReviewed = reviewedCount >= teamsForReview.length;

  // Compute shared OKR map across all teams
  const sharedOrgKrMap = useMemo(() => {
    const orgKrTeams = new Map<string, string[]>();
    for (const team of teamsForReview) {
      for (const entry of team.proposedOkrs) {
        for (const kr of entry.draftKrs) {
          const linkedId = (kr as any).linkedOrgKrId;
          if (linkedId) {
            const existing = orgKrTeams.get(linkedId) || [];
            if (!existing.includes(team.teamName)) {
              orgKrTeams.set(linkedId, [...existing, team.teamName]);
            }
          }
        }
      }
    }
    // Only keep entries with 2+ teams
    const shared = new Map<string, string[]>();
    orgKrTeams.forEach((teams, id) => {
      if (teams.length >= 2) shared.set(id, teams);
    });
    return shared;
  }, [teamsForReview]);

  const handleSetStatus = (status: QbrApprovalStatus) => {
    if (!current) return;

    if (status === 'discarded' && !discardReason.trim()) return;

    const newApproval: QbrMeetingSnapshot['approvals'][number] = {
      teamId: current.teamId,
      sessionId: current.sessionId,
      status,
      discardReason: status === 'discarded' ? discardReason.trim() : undefined,
    };

    const existing = approvals.filter(a => a.teamId !== current.teamId);
    onApprovalsChange([...existing, newApproval]);
    setDiscardReason('');

    // Auto-advance to next unreviewed team
    if (currentTeamIndex < teamsForReview.length - 1) {
      onCurrentTeamIndexChange(currentTeamIndex + 1);
    }
  };

  const handleStructuredChangesUpdate = (changes: StructuredChange[]) => {
    if (!current) return;
    const existing = approvals.filter(a => a.teamId !== current.teamId);
    const currentApp = approvals.find(a => a.teamId === current.teamId);
    if (currentApp) {
      onApprovalsChange([...existing, { ...currentApp, changes }]);
    }
  };

  const goToTeam = (idx: number) => {
    if (idx >= 0 && idx < teamsForReview.length) onCurrentTeamIndexChange(idx);
  };

  // Get shared teams for a given KR (excluding current team)
  const getSharedTeams = useCallback((kr: any): string[] => {
    const linkedId = kr.linkedOrgKrId;
    if (!linkedId || !current) return [];
    const teams = sharedOrgKrMap.get(linkedId);
    if (!teams) return [];
    return teams.filter(t => t !== current.teamName);
  }, [sharedOrgKrMap, current]);

  // Get current structured changes
  const currentChanges = useMemo(() => {
    if (!currentApproval?.changes) return [];
    if (Array.isArray(currentApproval.changes)) return currentApproval.changes as StructuredChange[];
    return [];
  }, [currentApproval]);

  // Timer border style
  // (Timer border handled inside ReviewTimer via CSS — not needed at card level for simplicity)

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={ClipboardCheck}
          title="Revisão de OKRs por Time"
          tooltip="qbr-meeting-okr-review"
          description={`${reviewedCount}/${teamsForReview.length} times revisados`}
          variant="amber"
          badge={allReviewed ? '✓ Todos revisados' : `${teamsForReview.length - reviewedCount} pendentes`}
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryDisabled={!allReviewed}
          primaryLabel={allReviewed ? 'Continuar' : `Revise todos os times (${teamsForReview.length - reviewedCount} pendentes)`}
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* Team navigation + timer */}
        {current && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => goToTeam(currentTeamIndex - 1)} disabled={currentTeamIndex === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <h4 className="text-sm font-semibold">{current.teamName}</h4>
              <Button variant="ghost" size="sm" onClick={() => goToTeam(currentTeamIndex + 1)} disabled={currentTeamIndex >= teamsForReview.length - 1}>
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="flex justify-center">
              <ReviewTimer teamName={current.teamName} teamId={current.teamId} />
            </div>
          </div>
        )}

        {/* Calibration flags */}
        {teamCalibrationFlags.length > 0 && (
          <div className="space-y-1">
            {teamCalibrationFlags.map((f, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded bg-status-amber-muted/30 text-xs">
                <Flag className="h-3 w-3 text-status-amber" />
                <Badge variant="outline" className="text-[10px] text-status-amber">{f.flag.replace('_', ' ')}</Badge>
                <span>{f.note}</span>
              </div>
            ))}
          </div>
        )}

        {/* Addendum from qbr-pre */}
        {current && teamAddendums[current.teamId]?.length > 0 && (
          <AddendumBadge addendums={teamAddendums[current.teamId]} />
        )}

        {/* Org KR coverage for this team */}
        {current?.hasSubmission && orgObjectives.length > 0 && (
          <OrgKrCoverageSection
            proposedOkrs={current.proposedOkrs}
            orgObjectives={orgObjectives}
          />
        )}

        {/* Proposed OKRs */}
        {current?.hasSubmission && current.proposedOkrs.length > 0 ? (
          <div className="space-y-3">
            {current.proposedOkrs.map((entry) => (
              <Card key={entry.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Proposta de OKR</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm font-medium">{entry.objective.title}</p>
                  {entry.draftKrs.length > 0 && (
                    <div className="space-y-1">
                      {entry.draftKrs.map((kr, i) => {
                        const shared = getSharedTeams(kr);
                        return (
                          <div key={kr.id || i} className="space-y-0.5">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="truncate flex-1">{kr.title}</span>
                              <span className="text-muted-foreground">{kr.baseline} → {kr.target} {kr.unit}</span>
                            </div>
                            {shared.length > 0 && (
                              <div className="flex items-center gap-1 pl-1">
                                <Badge variant="outline" className="text-[10px] h-5 gap-1 text-primary">
                                  <Users2 className="h-2.5 w-2.5" />
                                  🤝 Compartilhado com: {shared.join(', ')}
                                </Badge>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">
              {current?.hasSubmission ? 'Nenhum OKR proposto' : 'Pré-QBR não submetido'}
            </CardContent>
          </Card>
        )}

        {/* Active projects of the team — read-only context for approval */}
        {current && (
          <ProjectsSummary teamId={current.teamId} mode="checkin" className="mt-2" />
        )}

        {/* Reverse coverage — org KRs not covered by approved teams */}
        {orgObjectives.length > 0 && (
          <ReverseCoverageSection
            orgObjectives={orgObjectives}
            approvals={approvals}
            teamsForReview={teamsForReview}
          />
        )}

        {/* Current status */}
        {currentApproval && (
          <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
            <span className="text-xs text-muted-foreground">Status atual:</span>
            <Badge variant="outline" className={cn('text-xs', STATUS_CONFIG[currentApproval.status].color)}>
              {STATUS_CONFIG[currentApproval.status].label}
            </Badge>
          </div>
        )}

        {/* Structured changes form for approved_with_changes */}
        {currentApproval?.status === 'approved_with_changes' && current?.hasSubmission && (
          <StructuredChangesForm
            proposedOkrs={current.proposedOkrs}
            changes={currentChanges}
            onChangesUpdate={handleStructuredChangesUpdate}
          />
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          {(['approved', 'approved_with_changes', 'defer', 'discarded'] as QbrApprovalStatus[]).map(status => {
            const cfg = STATUS_CONFIG[status];
            const Icon = cfg.icon;
            const isActive = currentApproval?.status === status;
              return (
              <Button
                key={status}
                variant="outline"
                size="sm"
                className={cn('text-xs gap-1', isActive && cn(cfg.bg, cfg.color, 'border-current font-semibold'))}
                onClick={() => status !== 'discarded' ? handleSetStatus(status) : undefined}
                disabled={status === 'discarded' && !discardReason.trim()}
              >
                <Icon className="h-3 w-3" />
                {cfg.label}
              </Button>
            );
          })}
        </div>

        {/* Discard reason input */}
        <div className="space-y-1">
          <Textarea
            value={discardReason}
            onChange={(e) => setDiscardReason(e.target.value)}
            placeholder="Justificativa para descarte (obrigatório para descartar)..."
            className="text-xs min-h-[60px]"
          />
          {discardReason.trim() && (
            <Button
              size="sm"
              variant="destructive"
              className="text-xs"
              onClick={() => handleSetStatus('discarded')}
            >
              <X className="h-3 w-3 mr-1" /> Confirmar descarte
            </Button>
          )}
        </div>

        {/* Team indicators */}
        <div className="flex items-center gap-1 flex-wrap">
          {teamsForReview.map((t, i) => {
            const approval = approvals.find(a => a.teamId === t.teamId);
            return (
              <button
                key={t.teamId}
                onClick={() => goToTeam(i)}
                className={cn(
                  'w-8 h-8 rounded text-xs font-medium transition-colors',
                  i === currentTeamIndex ? 'bg-primary text-primary-foreground' :
                  approval ? cn('text-white', STATUS_CONFIG[approval.status].bg) :
                  'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
                title={`${t.teamName}${approval ? ` (${STATUS_CONFIG[approval.status].label})` : ''}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </WizardStepScaffold>
  );
}
