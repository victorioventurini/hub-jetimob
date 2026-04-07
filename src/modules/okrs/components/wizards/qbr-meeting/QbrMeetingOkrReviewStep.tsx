/**
 * QbrMeetingOkrReviewStep - Step 2: Revisão e aprovação de OKRs por time (gate)
 * 
 * Navegação 1-de-N com ações: approved, approved_with_changes, discarded, defer.
 * Gate: não avança sem que todos os times tenham sido revisados.
 * Inclui: flags C-Level, adendos, cobertura de KRs org e cobertura reversa.
 */

import { useState, useMemo } from 'react';
import { ProjectsSummary } from '@/modules/projects/components/ProjectsSummary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  ClipboardCheck, ChevronLeft, ChevronRight, Check, X, Pencil, Clock,
  AlertTriangle, Flag, Target, Link2,
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

// ============================================================
// SUB-COMPONENTS
// ============================================================

/** Shows which org KRs this team's proposals cover */
function OrgKrCoverageSection({
  proposedOkrs,
  orgObjectives,
}: {
  proposedOkrs: ProposedObjectiveEntry[];
  orgObjectives: OrgObjectiveWithKrs[];
}) {
  // Find KRs with linkedOrgKrId in the proposals
  const linkedOrgKrIds = new Set<string>();
  for (const entry of proposedOkrs) {
    for (const kr of entry.draftKrs) {
      if ((kr as any).linkedOrgKrId) {
        linkedOrgKrIds.add((kr as any).linkedOrgKrId);
      }
    }
  }

  // Build org KR name map
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

    // Collect all linkedOrgKrIds from approved teams
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

    // Find uncovered
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
        {uncoveredOrgKrs.slice(0, 5).map(kr => (
          <div key={kr.krId} className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0" />
            <span className="truncate">{kr.krTitle}</span>
          </div>
        ))}
        {uncoveredOrgKrs.length > 5 && (
          <p className="text-[10px] text-muted-foreground">+{uncoveredOrgKrs.length - 5} mais</p>
        )}
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

  const handleSetStatus = (status: QbrApprovalStatus) => {
    if (!current) return;

    if (status === 'discarded' && !discardReason.trim()) return;

    const newApproval = {
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

  const goToTeam = (idx: number) => {
    if (idx >= 0 && idx < teamsForReview.length) onCurrentTeamIndexChange(idx);
  };

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
        {/* Team navigation */}
        {current && (
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => goToTeam(currentTeamIndex - 1)} disabled={currentTeamIndex === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <h4 className="text-sm font-semibold">{current.teamName}</h4>
            <Button variant="ghost" size="sm" onClick={() => goToTeam(currentTeamIndex + 1)} disabled={currentTeamIndex >= teamsForReview.length - 1}>
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
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
                      {entry.draftKrs.map((kr, i) => (
                        <div key={kr.id || i} className="flex items-center gap-2 text-xs">
                          <span className="truncate flex-1">{kr.title}</span>
                          <span className="text-muted-foreground">{kr.baseline} → {kr.target} {kr.unit}</span>
                        </div>
                      ))}
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
