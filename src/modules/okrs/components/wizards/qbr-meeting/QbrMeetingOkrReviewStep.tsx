/**
 * QbrMeetingOkrReviewStep - Step 2: Revisão e aprovação de OKRs por time (gate)
 * 
 * Navegação 1-de-N com ações: approved, approved_with_changes, discarded, defer.
 * Gate: não avança sem que todos os times tenham sido revisados.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  ClipboardCheck, ChevronLeft, ChevronRight, Check, X, Pencil, Clock,
  AlertTriangle, Flag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
} from '../shared';
import type {
  QbrMeetingSnapshot,
  QbrApprovalStatus,
  QbrCLevelSnapshot,
  TeamOkrCreationWizardState,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface TeamForReview {
  teamId: string;
  teamName: string;
  sessionId: string;
  proposedOkrs: Partial<TeamOkrCreationWizardState>;
  hasSubmission: boolean;
}

export interface QbrMeetingOkrReviewStepProps {
  teamsForReview: TeamForReview[];
  approvals: QbrMeetingSnapshot['approvals'];
  onApprovalsChange: (approvals: QbrMeetingSnapshot['approvals']) => void;
  calibrationFlags?: QbrCLevelSnapshot['okrCalibrationFlags'];
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
  defer: { label: 'Diferido', icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
};

// ============================================================
// COMPONENT
// ============================================================

export function QbrMeetingOkrReviewStep({
  teamsForReview,
  approvals,
  onApprovalsChange,
  calibrationFlags = [],
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

        {/* Proposed OKR */}
        {current?.hasSubmission && current.proposedOkrs?.objective?.title ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Proposta de OKR</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-medium">{current.proposedOkrs.objective.title}</p>
              {current.proposedOkrs.draftKrs && current.proposedOkrs.draftKrs.length > 0 && (
                <div className="space-y-1">
                  {current.proposedOkrs.draftKrs.map((kr, i) => (
                    <div key={kr.id || i} className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-[10px]">{kr.type}</Badge>
                      <span className="truncate flex-1">{kr.title}</span>
                      <span className="text-muted-foreground">{kr.baseline} → {kr.target} {kr.unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">
              {current?.hasSubmission ? 'Nenhum OKR proposto' : 'Pré-QBR não submetido'}
            </CardContent>
          </Card>
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
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className={cn('text-xs gap-1', isActive && cfg.bg)}
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
