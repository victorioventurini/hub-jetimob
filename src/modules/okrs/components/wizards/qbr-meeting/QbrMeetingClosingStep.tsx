/**
 * QbrMeetingClosingStep - Step 5: Checklist de governança e encerramento
 * 
 * Mapa de cobertura org + resumo detalhado + checklist dinâmico + próximos 30 dias + feedback.
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ShieldCheck, Star, Plus, X, MessageSquare, BarChart3, Check, Pencil, Clock, Ban,
  Target, AlertTriangle, CheckCircle2, Zap, Calendar, Users, Handshake,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardLastStepFooter,
  WizardStepScaffold,
} from '../shared';
import type {
  QbrMeetingGovernanceChecklist,
  RitualImprovementFeedback,
  QbrMeetingSnapshot,
  TeamCheckinDecision,
} from '@/modules/okrs/types/wizard';
import type { OrgObjectiveWithKrs } from '@/modules/okrs/hooks/queries/aggregateTypes';
import type { TeamForReview } from './QbrMeetingOkrReviewStep';

// ============================================================
// TYPES
// ============================================================

export interface QbrMeetingClosingStepProps {
  checklist: QbrMeetingGovernanceChecklist;
  onChecklistChange: (checklist: QbrMeetingGovernanceChecklist) => void;
  ritualFeedback: RitualImprovementFeedback[];
  onRitualFeedbackChange: (feedback: RitualImprovementFeedback[]) => void;
  approvals: QbrMeetingSnapshot['approvals'];
  decisions: TeamCheckinDecision[];
  crossCommitments: QbrMeetingSnapshot['crossCommitments'];
  totalTeamsForReview: number;
  orgObjectives?: OrgObjectiveWithKrs[];
  teamsForReview?: TeamForReview[];
  intentionalGaps?: string[];
  onIntentionalGapsChange?: (gaps: string[]) => void;
  /** Próximos 30 dias */
  nextThirtyDays?: { ceo?: string; coo?: string; cpto?: string };
  onNextThirtyDaysChange?: (data: { ceo?: string; coo?: string; cpto?: string }) => void;
  isCompleting?: boolean;
  onComplete: () => void;
  onBack: () => void;
}

// ============================================================
// STAR RATING
// ============================================================

function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          className="p-0.5 transition-colors"
        >
          <Star className={cn(
            'h-5 w-5',
            star <= (hovered || value) ? 'fill-warning text-warning' : 'text-muted-foreground/30'
          )} />
        </button>
      ))}
    </div>
  );
}

// ============================================================
// ORG COVERAGE MAP
// ============================================================

function OrgCoverageMap({
  orgObjectives,
  approvals,
  teamsForReview,
  intentionalGaps,
  onIntentionalGapsChange,
}: {
  orgObjectives: OrgObjectiveWithKrs[];
  approvals: QbrMeetingSnapshot['approvals'];
  teamsForReview: TeamForReview[];
  intentionalGaps: string[];
  onIntentionalGapsChange: (gaps: string[]) => void;
}) {
  const coverageData = useMemo(() => {
    const approvedTeamIds = new Set(
      approvals
        .filter(a => a.status === 'approved' || a.status === 'approved_with_changes')
        .map(a => a.teamId)
    );

    const orgKrCoverage = new Map<string, string[]>();
    for (const team of teamsForReview) {
      if (!approvedTeamIds.has(team.teamId)) continue;
      for (const entry of team.proposedOkrs) {
        for (const kr of entry.draftKrs) {
          const linkedId = (kr as any).linkedOrgKrId;
          if (linkedId) {
            const existing = orgKrCoverage.get(linkedId) || [];
            if (!existing.includes(team.teamName)) {
              orgKrCoverage.set(linkedId, [...existing, team.teamName]);
            }
          }
        }
      }
    }

    return orgObjectives.map(obj => ({
      objTitle: obj.title,
      krs: obj.orgKrs.map(kr => ({
        krId: kr.id,
        krTitle: kr.title,
        coveringTeams: orgKrCoverage.get(kr.id) || [],
        isIntentional: intentionalGaps.includes(kr.id),
      })),
    }));
  }, [orgObjectives, approvals, teamsForReview, intentionalGaps]);

  if (coverageData.length === 0) return null;

  const toggleIntentional = (krId: string) => {
    if (intentionalGaps.includes(krId)) {
      onIntentionalGapsChange(intentionalGaps.filter(id => id !== krId));
    } else {
      onIntentionalGapsChange([...intentionalGaps, krId]);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Cobertura de OKRs Organizacionais</span>
        </div>

        {coverageData.map((obj, i) => (
          <div key={i} className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{obj.objTitle}</p>
            {obj.krs.map(kr => {
              const isCovered = kr.coveringTeams.length > 0;
              return (
                <div key={kr.krId} className="flex items-center gap-2 text-xs pl-2">
                  {isCovered ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-status-green shrink-0" />
                  ) : kr.isIntentional ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-status-amber shrink-0" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-status-red shrink-0" />
                  )}
                  <span className={cn('flex-1 truncate', !isCovered && !kr.isIntentional && 'text-status-red')}>
                    {kr.krTitle}
                  </span>
                  {isCovered ? (
                    <span className="text-muted-foreground shrink-0">
                      — {kr.coveringTeams.join(', ')}
                    </span>
                  ) : (
                    <button
                      onClick={() => toggleIntentional(kr.krId)}
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded border shrink-0 transition-colors',
                        kr.isIntentional
                          ? 'bg-status-amber/10 border-status-amber/30 text-status-amber'
                          : 'border-muted-foreground/30 text-muted-foreground hover:bg-muted/50'
                      )}
                    >
                      {kr.isIntentional ? '✓ Intencional' : 'Marcar como intencional'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        <p className="text-[10px] text-muted-foreground pt-1 border-t">
          ✅ coberta / ⚠️ intencional / ❌ sem cobertura
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================
// GOVERNANCE SUMMARY (EXPANDED)
// ============================================================

function GovernanceSummary({
  approvals,
  decisions,
  crossCommitments,
  orgObjectives,
  teamsForReview,
  intentionalGaps,
}: {
  approvals: QbrMeetingSnapshot['approvals'];
  decisions: TeamCheckinDecision[];
  crossCommitments: QbrMeetingSnapshot['crossCommitments'];
  orgObjectives: OrgObjectiveWithKrs[];
  teamsForReview: TeamForReview[];
  intentionalGaps: string[];
}) {
  const approved = approvals.filter(a => a.status === 'approved').length;
  const withChanges = approvals.filter(a => a.status === 'approved_with_changes').length;
  const deferred = approvals.filter(a => a.status === 'defer').length;
  const discarded = approvals.filter(a => a.status === 'discarded').length;
  const decisionsWithOwner = decisions.filter(d => d.owner?.id).length;
  const commitmentsWithResponsible = crossCommitments.filter(c => c.responsibleUserId).length;

  // Org KR coverage
  const orgKrCoverage = useMemo(() => {
    if (orgObjectives.length === 0) return { covered: 0, uncovered: 0 };
    const approvedTeamIds = new Set(
      approvals
        .filter(a => a.status === 'approved' || a.status === 'approved_with_changes')
        .map(a => a.teamId)
    );
    const coveredIds = new Set<string>();
    for (const team of teamsForReview) {
      if (!approvedTeamIds.has(team.teamId)) continue;
      for (const entry of team.proposedOkrs) {
        for (const kr of entry.draftKrs) {
          if ((kr as any).linkedOrgKrId) coveredIds.add((kr as any).linkedOrgKrId);
        }
      }
    }
    let totalKrs = 0;
    let covered = 0;
    for (const obj of orgObjectives) {
      for (const kr of obj.orgKrs) {
        totalKrs++;
        if (coveredIds.has(kr.id) || intentionalGaps.includes(kr.id)) covered++;
      }
    }
    return { covered, uncovered: totalKrs - covered };
  }, [orgObjectives, approvals, teamsForReview, intentionalGaps]);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Resumo desta Reunião</span>
        </div>

        {/* OKRs section */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">OKRs:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { icon: Check, label: 'Aprovados', value: `${approved} time${approved !== 1 ? 's' : ''}`, color: 'text-status-green' },
              { icon: Pencil, label: 'Com ajustes', value: `${withChanges} time${withChanges !== 1 ? 's' : ''}`, color: 'text-status-amber' },
              { icon: Clock, label: 'Standby', value: `${deferred} time${deferred !== 1 ? 's' : ''}`, color: 'text-muted-foreground' },
              { icon: Ban, label: 'Descartados', value: `${discarded} time${discarded !== 1 ? 's' : ''}`, color: 'text-status-red' },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-1.5 text-xs">
                  <Icon className={cn('h-3.5 w-3.5', item.color)} />
                  <span className="font-medium">{item.value}</span>
                  <span className="text-muted-foreground">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Decisions section */}
        <div className="space-y-1 pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground">Decisões:</p>
          <p className="text-xs">{decisions.length} decisões registradas</p>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>· {decisionsWithOwner} com dono definido</span>
            {decisions.length - decisionsWithOwner > 0 && (
              <span className="text-status-amber">· {decisions.length - decisionsWithOwner} sem dono ⚠️</span>
            )}
          </div>
        </div>

        {/* Commitments section */}
        <div className="space-y-1 pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground">Compromissos:</p>
          <p className="text-xs">{crossCommitments.length} compromisso{crossCommitments.length !== 1 ? 's' : ''} cross-área formalizados</p>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>· {commitmentsWithResponsible} com responsável definido</span>
            {crossCommitments.length - commitmentsWithResponsible > 0 && (
              <span>· {crossCommitments.length - commitmentsWithResponsible} sem responsável</span>
            )}
          </div>
        </div>

        {/* Org KR coverage */}
        {(orgKrCoverage.covered > 0 || orgKrCoverage.uncovered > 0) && (
          <div className="space-y-1 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground">KRs org:</p>
            <div className="flex gap-3 text-xs">
              <span>{orgKrCoverage.covered} KRs org com cobertura ✅</span>
              {orgKrCoverage.uncovered > 0 && (
                <span className="text-status-amber">{orgKrCoverage.uncovered} KRs org sem cobertura</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// NEXT 30 DAYS
// ============================================================

function NextThirtyDaysSection({
  data,
  onChange,
}: {
  data: { ceo?: string; coo?: string; cpto?: string };
  onChange: (data: { ceo?: string; coo?: string; cpto?: string }) => void;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">O que acontece nos próximos 30 dias</span>
        </div>
        {[
          { key: 'ceo' as const, label: 'CEO' },
          { key: 'coo' as const, label: 'COO' },
          { key: 'cpto' as const, label: 'CPTO' },
        ].map(item => (
          <div key={item.key} className="space-y-1">
            <Label className="text-xs font-medium">{item.label}:</Label>
            <Input
              value={data[item.key] || ''}
              onChange={e => onChange({ ...data, [item.key]: e.target.value })}
              placeholder={`Prioridade do ${item.label} nos próximos 30 dias...`}
              maxLength={200}
              className="text-xs"
            />
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground">Opcional — não bloqueia o encerramento.</p>
      </CardContent>
    </Card>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export function QbrMeetingClosingStep({
  checklist,
  onChecklistChange,
  ritualFeedback,
  onRitualFeedbackChange,
  approvals,
  decisions,
  crossCommitments,
  totalTeamsForReview,
  orgObjectives = [],
  teamsForReview = [],
  intentionalGaps = [],
  onIntentionalGapsChange,
  nextThirtyDays,
  onNextThirtyDaysChange,
  isCompleting,
  onComplete,
  onBack,
}: QbrMeetingClosingStepProps) {
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');

  // Dynamic conditions
  const allTeamsReviewed = approvals.length >= totalTeamsForReview && totalTeamsForReview > 0;
  const allDecisionsHaveOwners = decisions.length === 0 || decisions.every(d => d.owner?.id);

  // Org coverage condition
  const orgCoverageComplete = useMemo(() => {
    if (orgObjectives.length === 0) return true;

    const approvedTeamIds = new Set(
      approvals
        .filter(a => a.status === 'approved' || a.status === 'approved_with_changes')
        .map(a => a.teamId)
    );

    for (const obj of orgObjectives) {
      for (const kr of obj.orgKrs) {
        if (intentionalGaps.includes(kr.id)) continue;
        let covered = false;
        for (const team of teamsForReview) {
          if (!approvedTeamIds.has(team.teamId)) continue;
          for (const entry of team.proposedOkrs) {
            for (const draftKr of entry.draftKrs) {
              if ((draftKr as any).linkedOrgKrId === kr.id) {
                covered = true;
                break;
              }
            }
            if (covered) break;
          }
          if (covered) break;
        }
        if (!covered) return false;
      }
    }
    return true;
  }, [orgObjectives, approvals, teamsForReview, intentionalGaps]);

  const checklistItems: Array<{
    key: keyof QbrMeetingGovernanceChecklist;
    label: string;
    disabled: boolean;
    tooltip?: string;
  }> = [
    {
      key: 'allTeamsReviewed',
      label: 'Todos os times tiveram OKRs revisados?',
      disabled: !allTeamsReviewed,
      tooltip: !allTeamsReviewed ? `${approvals.length}/${totalTeamsForReview} times revisados` : undefined,
    },
    {
      key: 'orgCoverageClear',
      label: 'OKRs organizacionais cobertos ou gaps intencionais?',
      disabled: !orgCoverageComplete,
      tooltip: !orgCoverageComplete ? 'Há KRs organizacionais sem cobertura e sem confirmação intencional' : undefined,
    },
    {
      key: 'decisionsHaveOwners',
      label: 'Toda decisão tem dono e prazo?',
      disabled: !allDecisionsHaveOwners,
      tooltip: !allDecisionsHaveOwners ? 'Há decisões sem dono atribuído' : undefined,
    },
    {
      key: 'dependenciesFormalized',
      label: 'Dependências cross-área registradas?',
      disabled: false,
    },
    {
      key: 'feedbackLinkSent',
      label: 'Link de avaliação enviado para participantes?',
      disabled: false,
    },
  ];

  const allChecked = checklistItems.every(item => checklist[item.key]);

  const handleToggle = (key: keyof QbrMeetingGovernanceChecklist) => {
    onChecklistChange({ ...checklist, [key]: !checklist[key] });
  };

  const handleAddFeedback = () => {
    if (feedbackRating < 1) return;
    const fb: RitualImprovementFeedback = {
      id: `fb-${Date.now()}`,
      rating: feedbackRating,
      text: feedbackText.trim() || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    onRitualFeedbackChange([...ritualFeedback, fb]);
    setFeedbackRating(0);
    setFeedbackText('');
  };

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={ShieldCheck}
          title="Encerramento"
          tooltip="qbr-meeting-closing"
          description="Checklist de governança e feedback do rito"
          variant="green"
        />
      }
      footer={
        <WizardLastStepFooter
          onBack={onBack}
          onPrimary={onComplete}
          primaryDisabled={!allChecked}
          primaryLoading={isCompleting}
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* Org coverage map */}
        {orgObjectives.length > 0 && onIntentionalGapsChange && (
          <OrgCoverageMap
            orgObjectives={orgObjectives}
            approvals={approvals}
            teamsForReview={teamsForReview}
            intentionalGaps={intentionalGaps}
            onIntentionalGapsChange={onIntentionalGapsChange}
          />
        )}

        {/* Expanded governance summary */}
        <GovernanceSummary
          approvals={approvals}
          decisions={decisions}
          crossCommitments={crossCommitments}
          orgObjectives={orgObjectives}
          teamsForReview={teamsForReview}
          intentionalGaps={intentionalGaps}
        />

        {/* Governance checklist */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <TooltipProvider>
              {checklistItems.map(item => (
                <div key={item.key} className="flex items-center gap-3">
                  {item.disabled && item.tooltip ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Checkbox
                            id={item.key}
                            checked={checklist[item.key]}
                            onCheckedChange={() => handleToggle(item.key)}
                            disabled={item.disabled}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="text-xs">{item.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Checkbox
                      id={item.key}
                      checked={checklist[item.key]}
                      onCheckedChange={() => handleToggle(item.key)}
                      disabled={item.disabled}
                    />
                  )}
                  <Label
                    htmlFor={item.key}
                    className={cn(
                      'text-sm cursor-pointer flex-1',
                      item.disabled && 'text-muted-foreground opacity-60 cursor-not-allowed',
                    )}
                  >
                    {item.label}
                  </Label>
                </div>
              ))}
            </TooltipProvider>
          </CardContent>
        </Card>

        {/* Next 30 days */}
        {onNextThirtyDaysChange && (
          <NextThirtyDaysSection
            data={nextThirtyDays || {}}
            onChange={onNextThirtyDaysChange}
          />
        )}

        {/* Ritual feedback */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Feedback do Rito</span>
            </div>

            <div className="flex items-center gap-3">
              <StarRatingInput value={feedbackRating} onChange={setFeedbackRating} />
              {feedbackRating > 0 && (
                <span className="text-xs text-muted-foreground">{feedbackRating}/5</span>
              )}
            </div>

            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Sugestão de melhoria (opcional)..."
              className="text-xs min-h-[60px]"
            />

            <Button
              size="sm"
              variant="outline"
              onClick={handleAddFeedback}
              disabled={feedbackRating < 1}
            >
              <Plus className="h-3 w-3 mr-1" /> Adicionar feedback
            </Button>

            {ritualFeedback.length > 0 && (
              <div className="space-y-1 mt-2">
                {ritualFeedback.map((fb) => (
                  <div key={fb.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/50">
                    <span className="font-medium">{fb.rating}★</span>
                    {fb.text && <span className="flex-1 truncate">{fb.text}</span>}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => onRitualFeedbackChange(ritualFeedback.filter(f => f.id !== fb.id))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </WizardStepScaffold>
  );
}
