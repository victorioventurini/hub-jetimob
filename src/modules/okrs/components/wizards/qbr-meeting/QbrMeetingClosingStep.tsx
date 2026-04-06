/**
 * QbrMeetingClosingStep - Step 5: Checklist de governança e encerramento
 * 
 * Resumo da reunião + checklist dinâmico + feedback do rito via estrelas.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ShieldCheck, Star, Plus, X, MessageSquare, BarChart3, Check, Pencil, Clock, Ban } from 'lucide-react';
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
// GOVERNANCE SUMMARY
// ============================================================

function GovernanceSummary({
  approvals,
  decisions,
  crossCommitments,
}: {
  approvals: QbrMeetingSnapshot['approvals'];
  decisions: TeamCheckinDecision[];
  crossCommitments: QbrMeetingSnapshot['crossCommitments'];
}) {
  const approved = approvals.filter(a => a.status === 'approved').length;
  const withChanges = approvals.filter(a => a.status === 'approved_with_changes').length;
  const deferred = approvals.filter(a => a.status === 'defer').length;
  const discarded = approvals.filter(a => a.status === 'discarded').length;
  const decisionsWithOwner = decisions.filter(d => d.owner?.id).length;

  const items = [
    { icon: Check, label: 'Aprovados', value: approved, color: 'text-status-green' },
    { icon: Pencil, label: 'Com ajustes', value: withChanges, color: 'text-status-amber' },
    { icon: Clock, label: 'Standby', value: deferred, color: 'text-muted-foreground' },
    { icon: Ban, label: 'Descartados', value: discarded, color: 'text-status-red' },
  ];

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Resumo da Reunião</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {items.map(item => {
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

        <div className="flex gap-4 pt-1 border-t text-xs text-muted-foreground">
          <span>{decisionsWithOwner}/{decisions.length} decisões com dono</span>
          <span>{crossCommitments.length} compromisso{crossCommitments.length !== 1 ? 's' : ''} cross-área</span>
        </div>
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
  isCompleting,
  onComplete,
  onBack,
}: QbrMeetingClosingStepProps) {
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');

  // Dynamic conditions
  const allTeamsReviewed = approvals.length >= totalTeamsForReview && totalTeamsForReview > 0;
  const allDecisionsHaveOwners = decisions.length === 0 || decisions.every(d => d.owner?.id);

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
        {/* Governance summary */}
        <GovernanceSummary
          approvals={approvals}
          decisions={decisions}
          crossCommitments={crossCommitments}
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
