/**
 * LeaderPrepStep - Etapa 3 do Wizard Líder Prep
 * 
 * Preparação da pauta:
 * - Marcar KRs para discussão em grupo
 * - Marcar KRs para follow-up 1:1
 * - Adicionar notas pré-reunião
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ArrowRight,
  ArrowLeft,
  ClipboardList,
  Users,
  UserRound,
  ChevronDown,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardKr } from '@/modules/okrs/hooks/useTeamPendingKrs';
import type { KrAction, KrActionType } from '@/modules/okrs/types/wizard';
import { AskToVicStepHelper } from '@/modules/vic/components/AskToVic';
import { OkrProgressBar } from '@/modules/okrs/components/OkrProgressBar';
import { WizardTooltipInline } from '../shared/WizardTooltips';
import { LatestCheckinSummary } from '../shared/LatestCheckinSummary';

// ============================================================
// TYPES
// ============================================================

export interface LeaderPrepStepProps {
  krs: WizardKr[];
  krActions: KrAction[];
  onActionsChange: (actions: KrAction[]) => void;
  meetingNotes: string;
  onMeetingNotesChange: (notes: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function LeaderPrepStep({
  krs,
  krActions,
  onActionsChange,
  meetingNotes,
  onMeetingNotesChange,
  onContinue,
  onBack,
}: LeaderPrepStepProps) {
  const [expandedKrs, setExpandedKrs] = useState<Set<string>>(new Set());

  // Group KRs by priority (at risk / stagnant first)
  const sortedKrs = useMemo(() => {
    return [...krs].sort((a, b) => {
      // At risk first
      if (a.is_at_risk && !b.is_at_risk) return -1;
      if (!a.is_at_risk && b.is_at_risk) return 1;
      // Then pending
      if (a.is_pending && !b.is_pending) return -1;
      if (!a.is_pending && b.is_pending) return 1;
      // Then by status
      const statusOrder = { red: 0, yellow: 1, not_started: 2, green: 3 };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [krs]);

  // Get actions for a KR
  const getKrAction = (krId: string): KrActionType | null => {
    const action = krActions.find(a => a.krId === krId);
    return action?.actionType || null;
  };

  // Toggle action for a KR
  const toggleAction = (krId: string, actionType: KrActionType) => {
    const existing = krActions.find(a => a.krId === krId);
    
    if (existing?.actionType === actionType) {
      // Remove action
      onActionsChange(krActions.filter(a => a.krId !== krId));
    } else {
      // Add or update action
      const newActions = krActions.filter(a => a.krId !== krId);
      newActions.push({ krId, actionType });
      onActionsChange(newActions);
    }
  };

  // Toggle expand
  const toggleExpand = (krId: string) => {
    const newSet = new Set(expandedKrs);
    if (newSet.has(krId)) {
      newSet.delete(krId);
    } else {
      newSet.add(krId);
    }
    setExpandedKrs(newSet);
  };

  // Count marked KRs
  const discussCount = krActions.filter(a => a.actionType === 'discuss_group').length;
  const followupCount = krActions.filter(a => a.actionType === 'followup_1on1').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">Preparar pauta da reunião</h3>
              <WizardTooltipInline tooltipKey="leader-prep" />
              <AskToVicStepHelper
                context={{
                  module: 'okrs',
                  wizard: 'leader-prep',
                  step: 'prep',
                  userRole: 'lider',
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Defina o que discutir em grupo e o que tratar em 1:1
            </p>
          </div>
        </div>
      </div>

      {/* Summary badges */}
      <div className="px-6 py-3 border-b bg-muted/20 flex items-center gap-3">
        <Badge variant="outline" className="gap-1">
          <Users className="h-3 w-3" />
          {discussCount} em grupo
        </Badge>
        <Badge variant="outline" className="gap-1">
          <UserRound className="h-3 w-3" />
          {followupCount} 1:1
        </Badge>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {/* KR List */}
          {sortedKrs.map((kr) => {
            const action = getKrAction(kr.id);
            const isExpanded = expandedKrs.has(kr.id);

            return (
              <Collapsible
                key={kr.id}
                open={isExpanded}
                onOpenChange={() => toggleExpand(kr.id)}
              >
                <div
                  className={cn(
                    "rounded-lg border p-3 transition-colors",
                    action === 'discuss_group' && "border-info/50 bg-info-muted",
                    action === 'followup_1on1' && "border-status-purple/50 bg-status-purple-muted",
                    !action && kr.is_at_risk && "border-warning/50",
                    !action && kr.is_pending && "border-warning/30"
                  )}
                >
                  {/* Main row */}
                  <div className="flex items-center gap-3">
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAction(kr.id, 'discuss_group');
                        }}
                        className={cn(
                          "p-1.5 rounded-md transition-colors",
                          action === 'discuss_group'
                            ? "bg-info text-white"
                            : "bg-muted hover:bg-muted-foreground/10"
                        )}
                        title="Discutir em grupo"
                      >
                        <Users className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAction(kr.id, 'followup_1on1');
                        }}
                        className={cn(
                          "p-1.5 rounded-md transition-colors",
                          action === 'followup_1on1'
                            ? "bg-status-purple text-white"
                            : "bg-muted hover:bg-muted-foreground/10"
                        )}
                        title="Follow-up 1:1"
                      >
                        <UserRound className="h-4 w-4" />
                      </button>
                    </div>

                    {/* KR info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{kr.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {kr.owner_name || 'Sem responsável'}
                        </span>
                        {kr.is_at_risk && (
                          <Badge variant="destructive" className="text-xs h-5">
                            Em risco
                          </Badge>
                        )}
                        {kr.is_pending && !kr.is_at_risk && (
                          <Badge variant="secondary" className="text-xs h-5">
                            {kr.days_since_checkin}d
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-sm">{Math.round(kr.progress)}%</p>
                    </div>

                    {/* Expand */}
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </Button>
                    </CollapsibleTrigger>
                  </div>

                  {/* Expanded content */}
                  <CollapsibleContent className="mt-3 pt-3 border-t">
                    <div className="space-y-3 text-sm">
                      <p className="text-muted-foreground">
                        <strong>Objetivo:</strong> {kr.objective_title}
                      </p>
                      <OkrProgressBar
                        baseline={kr.baseline}
                        current={kr.current_value}
                        target={kr.target}
                        direction={kr.direction}
                        status={kr.status}
                        unit={kr.unit}
                        size="sm"
                      />
                      <p className="text-muted-foreground text-xs">
                        <strong>Último check-in:</strong>{' '}
                        {kr.last_checkin_at
                          ? `há ${kr.days_since_checkin} dias`
                          : 'Nunca'}
                      </p>
                    </div>
                    {kr.latest_checkin && (
                      <LatestCheckinSummary checkin={kr.latest_checkin} className="mt-3" />
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}

          {krs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum KR para preparar
            </div>
          )}

          {/* Meeting notes */}
          <div className="pt-4 border-t space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <Label className="font-medium">Notas pré-reunião</Label>
              <WizardTooltipInline tooltipKey="leader-notes" />
            </div>
            <Textarea
              value={meetingNotes}
              onChange={(e) => onMeetingNotesChange(e.target.value)}
              placeholder="Adicione anotações para guiar a discussão..."
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <Button
            onClick={onContinue}
            className="flex-1"
            disabled={krActions.length === 0 && krs.length > 0}
          >
            Ver alinhamento
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        {krActions.length === 0 && krs.length > 0 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Marque pelo menos um KR para discussão em grupo ou 1:1
          </p>
        )}
      </div>
    </div>
  );
}
