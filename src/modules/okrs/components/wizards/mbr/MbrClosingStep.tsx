/**
 * MbrClosingStep - Etapa 8: Encerramento & Governança
 * 
 * v1.2: Resumo de governança + checklist dinâmico (cada item habilitado por condição)
 * + feedback anônimo com rating 1-5 estrelas.
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Plus, X, MessageSquare, CheckCircle2, Star, BarChart3, Users, Target, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardLastStepFooter } from '../shared';
import type {
  MbrGovernanceChecklist,
  RitualImprovementFeedback,
  TeamCheckinDecision,
  MbrTeamOkrSnapshot,
  MbrOrgOkrSnapshot,
  QbrFollowUpItem,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface MbrClosingStepProps {
  decisions: TeamCheckinDecision[];
  onDecisionsChange?: (decisions: TeamCheckinDecision[]) => void;
  checklist: MbrGovernanceChecklist;
  onChecklistChange: (checklist: MbrGovernanceChecklist) => void;
  ritualFeedback: RitualImprovementFeedback[];
  onRitualFeedbackChange: (feedback: RitualImprovementFeedback[]) => void;
  /** v1.2: Team snapshots for dynamic checklist */
  teamOkrSnapshots?: MbrTeamOkrSnapshot[];
  /** v1.2: Org OKR snapshots for dynamic checklist */
  orgOkrSnapshots?: MbrOrgOkrSnapshot[];
  /** v1.2: QBR follow-up items for dynamic checklist */
  qbrFollowUpItems?: QbrFollowUpItem[];
  onComplete: () => void;
  onBack: () => void;
}

// ============================================================
// INLINE STAR RATING
// ============================================================

function StarRatingInput({
  value,
  onChange,
  size = 20,
}: {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
            className="p-0.5 transition-colors"
            onMouseEnter={() => setHovered(star)}
            onClick={() => onChange(star)}
          >
            <Star
              size={size}
              className={cn(
                'transition-colors',
                filled ? 'text-yellow-400' : 'text-muted-foreground',
              )}
              fill={filled ? 'currentColor' : 'none'}
            />
          </button>
        );
      })}
    </div>
  );
}

function StarRatingDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={cn(star <= rating ? 'text-yellow-400' : 'text-muted-foreground/40')}
          fill={star <= rating ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export function MbrClosingStep({
  decisions,
  checklist,
  onChecklistChange,
  ritualFeedback,
  onRitualFeedbackChange,
  teamOkrSnapshots = [],
  orgOkrSnapshots = [],
  qbrFollowUpItems = [],
  onComplete,
  onBack,
}: MbrClosingStepProps) {
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);

  // ── Dynamic checklist conditions ──
  const conditions = useMemo(() => {
    const kpiDecisions = decisions.filter(d => d.sourceStep === 'panorama' || d.sourceStep === 'kpi-gate');
    const teamsWithOkrs = teamOkrSnapshots.filter(t => t.objectives.length > 0);
    const allTeamsReviewed = teamsWithOkrs.length > 0 && teamsWithOkrs.every(t => t.reviewed);
    const orgOkrsAllDecided = orgOkrSnapshots.length === 0 || orgOkrSnapshots.every(o => o.remainsStrategicPriority !== undefined);
    const decisionsWithOwner = decisions.filter(d => d.sourceStep === 'decisions');
    const allDecisionsHaveOwner = decisionsWithOwner.length === 0 || decisionsWithOwner.every(d => (d as any).owner_user_id);
    const overdueItems = qbrFollowUpItems.filter(i => !i.resolved && i.deadline && new Date(i.deadline) < new Date());
    const qbrAddressed = overdueItems.length === 0;

    return {
      kpiGateEnabled: kpiDecisions.length > 0 || decisions.some(d => d.sourceStep === 'kpi-gate'),
      allTeamsReviewedEnabled: allTeamsReviewed,
      orgOkrsVerifiedEnabled: orgOkrsAllDecided,
      decisionsHaveOwnerEnabled: allDecisionsHaveOwner,
      qbrFollowUpAddressedEnabled: qbrAddressed,
      nextMbrScheduledEnabled: true, // always enabled (manual)
    };
  }, [decisions, teamOkrSnapshots, orgOkrSnapshots, qbrFollowUpItems]);

  const handleCheckChange = (key: keyof MbrGovernanceChecklist, value: boolean) => {
    onChecklistChange({ ...checklist, [key]: value });
  };

  const handleAddFeedback = () => {
    if (feedbackRating < 1) return;
    const fb: RitualImprovementFeedback = {
      id: `fb-${Date.now()}`,
      rating: feedbackRating,
      text: feedbackText.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    onRitualFeedbackChange([...ritualFeedback, fb]);
    setFeedbackText('');
    setFeedbackRating(0);
  };

  const handleRemoveFeedback = (id: string) => {
    onRitualFeedbackChange(ritualFeedback.filter(f => f.id !== id));
  };

  // Legacy checklist check (backward compatible)
  const legacyChecked =
    checklist.strategicFocusClear &&
    checklist.nextStepsHaveOwners &&
    checklist.nonPrioritiesClear &&
    checklist.communicateInAllHands;

  // Dynamic checklist check
  const dynamicChecked =
    checklist.kpiGateClear &&
    checklist.allTeamsReviewed &&
    checklist.orgOkrsVerified &&
    checklist.decisionsHaveOwner &&
    checklist.qbrFollowUpAddressed &&
    checklist.nextMbrScheduled;

  const allChecked = legacyChecked && dynamicChecked;
  const hasFeedback = ritualFeedback.length > 0;
  const canComplete = allChecked && hasFeedback;

  // Summary counts
  const decisionCount = decisions.filter(d => d.category === 'decision').length;
  const focusCount = decisions.filter(d => d.category === 'focus_adjustment').length;
  const nextStepCount = decisions.filter(d => d.category === 'next_step').length;
  const reviewedTeams = teamOkrSnapshots.filter(t => t.reviewed).length;
  const totalTeams = teamOkrSnapshots.filter(t => t.objectives.length > 0).length;
  const orgGaps = orgOkrSnapshots.filter(o => !o.remainsStrategicPriority).length;

  // Dynamic checklist items
  const dynamicItems: Array<{
    key: keyof MbrGovernanceChecklist;
    label: string;
    enabled: boolean;
    disabledHint?: string;
  }> = [
    { key: 'kpiGateClear', label: 'KPI Gate concluído — decisões obrigatórias registradas', enabled: conditions.kpiGateEnabled, disabledHint: 'Registre decisões no Step 2' },
    { key: 'allTeamsReviewed', label: `Todos os times revisados (${reviewedTeams}/${totalTeams})`, enabled: conditions.allTeamsReviewedEnabled, disabledHint: 'Revise todos os times no Step 4' },
    { key: 'orgOkrsVerified', label: 'OKRs organizacionais verificadas', enabled: conditions.orgOkrsVerifiedEnabled, disabledHint: 'Confirme todas OKRs no Step 5' },
    { key: 'decisionsHaveOwner', label: 'Decisões estratégicas têm dono', enabled: conditions.decisionsHaveOwnerEnabled, disabledHint: 'Atribua donos às decisões no Step 6' },
    { key: 'qbrFollowUpAddressed', label: 'Follow-up do QBR endereçado', enabled: conditions.qbrFollowUpAddressedEnabled, disabledHint: 'Resolva decisões vencidas no Step 7' },
    { key: 'nextMbrScheduled', label: 'Próximo MBR agendado', enabled: true },
  ];

  return (
    <div className="flex flex-col h-full">
      <WizardStepHeader
        icon={ShieldCheck}
        title="Encerramento & Governança"
        tooltip="mbr-closing"
        description="Confirme o alinhamento antes de finalizar"
        variant="green"
      />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* ── Resumo de governança ── */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-primary" />
              Resumo de Governança
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold">{decisionCount + focusCount + nextStepCount}</p>
                  <p className="text-xs text-muted-foreground">Decisões registradas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold">{reviewedTeams}/{totalTeams}</p>
                  <p className="text-xs text-muted-foreground">Times revisados</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold">{decisionCount}</p>
                  <p className="text-xs text-muted-foreground">Decisões com dono</p>
                </CardContent>
              </Card>
              {orgGaps > 0 && (
                <Card className="border-status-amber/30">
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-bold text-status-amber">{orgGaps}</p>
                    <p className="text-xs text-muted-foreground">OKRs org sem cobertura</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Summary badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" className="bg-status-blue-muted text-status-blue">
              {decisionCount} decisões
            </Badge>
            <Badge variant="secondary" className="bg-status-purple-muted text-status-purple">
              {focusCount} ajustes de foco
            </Badge>
            <Badge variant="secondary" className="bg-status-green-muted text-status-green">
              {nextStepCount} próximos passos
            </Badge>
          </div>

          {/* ── Dynamic governance checklist ── */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Checklist de Governança
            </h4>

            <div className="space-y-3">
              {/* Legacy items */}
              {[
                { key: 'strategicFocusClear' as const, label: 'Está claro o foco estratégico do próximo mês' },
                { key: 'nextStepsHaveOwners' as const, label: 'Todos os próximos passos têm responsável' },
                { key: 'nonPrioritiesClear' as const, label: 'Está claro o que NÃO será prioridade' },
                { key: 'communicateInAllHands' as const, label: 'Se necessário, isso será comunicado no All Hands' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Checkbox
                    id={key}
                    checked={checklist[key]}
                    onCheckedChange={(checked) => handleCheckChange(key, checked as boolean)}
                  />
                  <Label htmlFor={key} className="cursor-pointer text-sm">
                    {label}
                  </Label>
                </div>
              ))}

              <Separator />

              {/* Dynamic items */}
              {dynamicItems.map(({ key, label, enabled, disabledHint }) => (
                <div key={key} className={cn(
                  'flex items-center gap-3 p-3 rounded-lg',
                  enabled ? 'bg-muted/50' : 'bg-muted/20 opacity-60',
                )}>
                  <Checkbox
                    id={key}
                    checked={checklist[key]}
                    disabled={!enabled}
                    onCheckedChange={(checked) => handleCheckChange(key, checked as boolean)}
                  />
                  <Label htmlFor={key} className={cn('text-sm', !enabled && 'cursor-not-allowed')}>
                    {label}
                  </Label>
                  {!enabled && disabledHint && (
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{disabledHint}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Anonymous ritual feedback */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Como podemos melhorar essa reunião?
            </h4>
            <p className="text-xs text-muted-foreground">
              Feedback anônimo — não será associado ao seu nome.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <StarRatingInput value={feedbackRating} onChange={setFeedbackRating} />
                <span className="text-xs text-muted-foreground">
                  {feedbackRating === 0 ? 'Selecione uma nota' : `${feedbackRating}/5`}
                </span>
              </div>

              <div className="flex gap-2">
                <Textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Comentário opcional..."
                  className="text-sm min-h-[48px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddFeedback();
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 flex-shrink-0 self-end"
                  onClick={handleAddFeedback}
                  disabled={feedbackRating < 1}
                  data-testid="add-feedback-btn"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {ritualFeedback.length > 0 && (
              <div className="space-y-2">
                {ritualFeedback.map((fb) => (
                  <Card key={fb.id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <StarRatingDisplay rating={fb.rating} />
                      {fb.text && <p className="text-sm flex-1">{fb.text}</p>}
                      {!fb.text && <span className="flex-1" />}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => handleRemoveFeedback(fb.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <WizardLastStepFooter
        onBack={onBack}
        onPrimary={onComplete}
        primaryDisabled={!canComplete}
      />
      {!canComplete && (
        <p className="text-xs text-muted-foreground text-center pb-2">
          {!allChecked && 'Complete o checklist'}
          {allChecked && !hasFeedback && 'Adicione pelo menos um feedback sobre a reunião'}
        </p>
      )}
    </div>
  );
}
