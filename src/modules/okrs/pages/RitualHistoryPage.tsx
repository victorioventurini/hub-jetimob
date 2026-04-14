/**
 * RitualHistoryPage - Histórico de rituais/wizards concluídos
 * 
 * Lista sessões concluídas com filtros, detalhe expandido e follow-up de decisões.
 * Suporta deep-link via ?session={id} para abrir automaticamente uma sessão específica.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HubLayout } from '@/components/layout/HubLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PageHeader } from '@/components/ui/page-header';
import { ListPageFilters } from '@/components/ui/list-page-filters';
import { ViewOptionsBar } from '@/components/ui/view-options-bar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  History, ChevronDown, ChevronRight, CalendarIcon, Users, User,
  Lightbulb, Target, CheckCircle2, Clock, FileText, Star, MessageSquare, ThumbsUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUrlState, parsers } from '@/shared/url';
import { useIdentity } from '@/hooks/useIdentity';
import {
  useRitualHistory,
  useRitualDetail,
  useUpdateDecisionFollowUp,
  WIZARD_TYPE_LABELS,
  type RitualHistoryItem,
  type RitualHistoryFilters,
} from '../hooks/useRitualHistory';
import { useOccurrenceBySession } from '../hooks/useRitualOccurrences';
import { useManageableTeamsFlat } from '../hooks';
import { DecisionFollowUpRow } from '../components/wizards/shared/DecisionFollowUpRow';
import { useDecisionThread } from '../hooks/useDecisionThread';
import type { WizardPersona, TeamCheckinDecision, RitualImprovementFeedback } from '../types/wizard';
import { useResolveParticipant } from '@/hooks/useResolveParticipant';
import { SnapshotReportView } from '../components/ritual-report';
import { BuUserSelect } from '@/components/selects/BuUserSelect';

// ============================================================
// CONSTANTS
// ============================================================

const CATEGORY_CONFIG = {
  decision: { label: 'Decisão', icon: Lightbulb, color: 'bg-status-blue-muted text-status-blue' },
  focus_adjustment: { label: 'Ajuste de Foco', icon: Target, color: 'bg-status-purple-muted text-status-purple' },
  next_step: { label: 'Próximo Passo', icon: CheckCircle2, color: 'bg-status-green-muted text-status-green' },
} as const;

const EVALUATED_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'yes', label: 'Avaliados' },
  { value: 'no', label: 'Não avaliados' },
];

/** Checa se o ritual possui avaliações de participantes nos addendums */
function hasParticipantEvaluations(addendums: unknown[] | null): boolean {
  if (!Array.isArray(addendums)) return false;
  const ev = addendums.find((a: any) => a?.type === 'participant_evaluation') as any;
  return Array.isArray(ev?.evaluations) && ev.evaluations.length > 0;
}

const WIZARD_TYPE_OPTIONS: { value: WizardPersona | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os rituais' },
  { value: 'mbr', label: 'MBR' },
  { value: 'mbr-pre', label: 'Pré-MBR' },
  { value: 'team-checkin', label: 'Check-in do Time' },
  { value: 'collaborator', label: 'Check-in Colaborador' },
  { value: 'leader-prep', label: 'Preparação do Líder' },
  { value: 'clevel-checkin', label: 'Check-in C-Level' },
  { value: 'managers-checkin', label: 'Check-in de Gestores' },
  { value: 'qbr-pre', label: 'Pré-QBR (Líder)' },
  { value: 'qbr-pre-clevel', label: 'Pré-QBR (C-Level)' },
  { value: 'qbr-meeting', label: 'Reunião QBR' },
  { value: 'qbr-post', label: 'Pós-QBR' },
];

// ============================================================
// COMPONENT
// ============================================================

export default function RitualHistoryPage() {
  usePageTitle('Histórico de Rituais');

  // Deep-link: ?session={id}
  const sessionState = useUrlState<string>({
    key: 'session',
    defaultValue: '',
    parse: parsers.string,
  });
  const deepLinkSessionId = sessionState.value || null;

  // Filters
  const typeState = useUrlState<string>({
    key: 'type',
    defaultValue: 'all',
    parse: parsers.string,
  });
  const teamState = useUrlState<string>({
    key: 'team',
    defaultValue: '',
    parse: parsers.string,
  });

  const userState = useUrlState<string>({
    key: 'user',
    defaultValue: '',
    parse: parsers.string,
  });

  const evaluatedState = useUrlState<string>({
    key: 'evaluated',
    defaultValue: 'all',
    parse: parsers.string,
  });

  // Default: last 30 days
  const default30DaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const dateFromState = useUrlState<string>({
    key: 'from',
    defaultValue: default30DaysAgo,
    parse: parsers.string,
  });
  const dateToState = useUrlState<string>({
    key: 'to',
    defaultValue: '',
    parse: parsers.string,
  });

  // Pagination
  const pageState = useUrlState<number>({
    key: 'page',
    defaultValue: 1,
    parse: parsers.numberWithDefault(1),
  });
  const pageSize = 25;

  // Atomic page reset: track filter changes and reset page via effect
  const filterFingerprint = `${typeState.value}|${teamState.value}|${userState.value}|${dateFromState.value}|${dateToState.value}|${evaluatedState.value}`;
  const prevFilterRef = useRef(filterFingerprint);

  useEffect(() => {
    if (prevFilterRef.current !== filterFingerprint) {
      prevFilterRef.current = filterFingerprint;
      if (pageState.value !== 1) {
        pageState.set(1);
      }
    }
  }, [filterFingerprint, pageState]);

  const filters: RitualHistoryFilters = useMemo(() => ({
    wizardType: (typeState.value || 'all') as WizardPersona | 'all',
    teamId: teamState.value || null,
    userId: userState.value || null,
    dateFrom: dateFromState.value || null,
    dateTo: dateToState.value || null,
    page: pageState.value,
    pageSize,
  }), [typeState.value, teamState.value, userState.value, dateFromState.value, dateToState.value, pageState.value]);

  const { data: result, isLoading } = useRitualHistory(filters);
  const rituals = result?.items ?? [];
  const totalCount = result?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const { teams } = useManageableTeamsFlat();

  // Deep-link: fetch the specific session if not in the list
  const { data: deepLinkSession, isLoading: isLoadingDeepLink } = useRitualDetail(
    deepLinkSessionId && !rituals.some(r => r.id === deepLinkSessionId)
      ? deepLinkSessionId
      : null
  );

  // Merge deep-link + client-side evaluated filter
  const mergedRituals = useMemo(() => {
    let list = rituals;
    if (deepLinkSession && !rituals.some(r => r.id === deepLinkSession.id)) {
      list = [deepLinkSession, ...rituals];
    }
    // Client-side filter: evaluated
    if (evaluatedState.value === 'yes') {
      list = list.filter(r => hasParticipantEvaluations(r.addendums));
    } else if (evaluatedState.value === 'no') {
      list = list.filter(r => !hasParticipantEvaluations(r.addendums));
    }
    return list;
  }, [rituals, deepLinkSession, evaluatedState.value]);

  const anyLoading = isLoading || (!!deepLinkSessionId && isLoadingDeepLink);

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Histórico de Rituais"
          description="Consulte rituais concluídos, decisões registradas e acompanhe pendências."
          breadcrumbs={[
            { label: 'OKRs', href: '/okrs' },
            { label: 'Histórico de Rituais' },
          ]}
        />

        {/* Filters */}
        <ListPageFilters hideSearch>
          <Select value={typeState.value || 'all'} onValueChange={(v) => typeState.set(v)}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Tipo de ritual" />
            </SelectTrigger>
            <SelectContent>
              {WIZARD_TYPE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {teams && teams.length > 0 && (
            <Select value={teamState.value || 'all'} onValueChange={(v) => teamState.set(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os times</SelectItem>
                {teams.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Evaluated filter */}
          <Select value={evaluatedState.value || 'all'} onValueChange={(v) => evaluatedState.set(v)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Avaliação" />
            </SelectTrigger>
            <SelectContent>
              {EVALUATED_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* User filter */}
          <BuUserSelect
            value={userState.value || undefined}
            onValueChange={(v) => userState.set(v || '')}
            placeholder="Usuário"
            className="w-full sm:w-[220px]"
          />

          {/* Date filters */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="default" className={cn(
                  "flex-1 sm:flex-none sm:w-[180px] justify-start text-left font-normal",
                  !dateFromState.value && "text-muted-foreground"
                )}>
                  <CalendarIcon className="h-4 w-4 mr-2 shrink-0" />
                  {dateFromState.value
                    ? format(parseISO(dateFromState.value), 'dd/MM/yyyy', { locale: ptBR })
                    : 'Data início'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFromState.value ? parseISO(dateFromState.value) : undefined}
                  onSelect={(date) => dateFromState.set(date ? format(date, 'yyyy-MM-dd') : '')}
                  className="p-3 pointer-events-auto"
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="default" className={cn(
                  "flex-1 sm:flex-none sm:w-[180px] justify-start text-left font-normal",
                  !dateToState.value && "text-muted-foreground"
                )}>
                  <CalendarIcon className="h-4 w-4 mr-2 shrink-0" />
                  {dateToState.value
                    ? format(parseISO(dateToState.value), 'dd/MM/yyyy', { locale: ptBR })
                    : 'Data fim'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateToState.value ? parseISO(dateToState.value) : undefined}
                  onSelect={(date) => dateToState.set(date ? format(date, 'yyyy-MM-dd') : '')}
                  className="p-3 pointer-events-auto"
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Clear filters */}
          {(dateFromState.value !== default30DaysAgo || dateToState.value) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { dateFromState.set(default30DaysAgo); dateToState.set(''); }}
              className="text-muted-foreground"
            >
              Limpar datas
            </Button>
          )}
        </ListPageFilters>

        {/* Result count */}
        {!anyLoading && (
          <ViewOptionsBar
            resultCount={mergedRituals.length}
            resultCountLabel="rituais encontrados"
            resultCountLabelSingular="ritual encontrado"
          />
        )}

        {/* List */}
        {anyLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : mergedRituals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <History className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum ritual concluído encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {mergedRituals.map(ritual => (
              <RitualHistoryCard
                key={ritual.id}
                ritual={ritual}
                autoExpand={ritual.id === deepLinkSessionId}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={pageState.value <= 1}
              onClick={() => pageState.set(pageState.value - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {pageState.value} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pageState.value >= totalPages}
              onClick={() => pageState.set(pageState.value + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </HubLayout>
  );
}

// ============================================================
// RITUAL CARD
// ============================================================

function RitualHistoryCard({ ritual, autoExpand = false }: { ritual: RitualHistoryItem; autoExpand?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  const hasDecisions = ritual.decisions.length > 0;
  const isEvaluated = hasParticipantEvaluations(ritual.addendums);
  const label = WIZARD_TYPE_LABELS[ritual.wizardType] || ritual.wizardType;
  const { data: occurrence } = useOccurrenceBySession(ritual.id);
  const { mutate: updateFollowUp, isPending: isUpdatingFollowUp } = useUpdateDecisionFollowUp();
  const { mutate: addThreadMessage, isPending: isAddingMessage } = useDecisionThread();

  // Auto-expand when deep-linked
  useEffect(() => {
    if (autoExpand) setIsExpanded(true);
  }, [autoExpand]);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className={cn(
        'transition-shadow',
        isExpanded && 'shadow-md',
        autoExpand && 'ring-2 ring-primary/30',
      )}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-3 sm:p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
              {/* Row 1: Type badge + team + expand icon */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                <Badge variant="secondary" className="shrink-0 text-xs">
                  {label}
                </Badge>

                {ritual.status === 'in_progress' && (
                  <Badge variant="outline" className="shrink-0 text-[10px] border-status-yellow text-status-yellow">
                    Rascunho
                  </Badge>
                )}

                {isEvaluated && (
                  <Badge variant="outline" className="shrink-0 text-[10px] gap-1 border-status-green text-status-green">
                    <Star className="h-3 w-3" />
                    Avaliado
                  </Badge>
                )}

                {ritual.teamName && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground min-w-0">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{ritual.teamName}</span>
                  </span>
                )}

                {/* Desktop spacer + decisions count */}
                <div className="hidden sm:flex flex-1 min-w-0" />

                {hasDecisions && (
                  <Badge variant="outline" className="shrink-0 text-xs gap-1 hidden sm:inline-flex">
                    <Lightbulb className="h-3 w-3" />
                    {ritual.decisions.length}
                  </Badge>
                )}
              </div>

              {/* Row 2 (mobile) / inline (desktop): metadata */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 sm:pl-0">
                {occurrence ? (
                  <Badge variant="outline" className="shrink-0 text-[10px] gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    Previsto {format(parseISO(occurrence.planned_date), 'dd/MM', { locale: ptBR })}
                    {occurrence.actual_date && ` · Realizado ${format(parseISO(occurrence.actual_date), 'dd/MM', { locale: ptBR })}`}
                  </Badge>
                ) : ritual.completedAt ? (
                  <Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground">
                    Execução avulsa
                  </Badge>
                ) : null}

                {hasDecisions && (
                  <Badge variant="outline" className="shrink-0 text-xs gap-1 sm:hidden">
                    <Lightbulb className="h-3 w-3" />
                    {ritual.decisions.length}
                  </Badge>
                )}

                {ritual.completedAt ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <CalendarIcon className="h-3 w-3" />
                    {format(parseISO(ritual.completedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                ) : ritual.startedAt ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                    Iniciado {format(parseISO(ritual.startedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                ) : null}

                {ritual.startedByName && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[120px]">{ritual.startedByName}</span>
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <Separator />
          <CardContent className="p-4 space-y-4">
            {/* Decisions */}
            {hasDecisions ? (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Decisões e Registros ({ritual.decisions.length})
                </h4>
                <div className="space-y-2">
                  {ritual.decisions.map(decision => (
                    <DecisionFollowUpRow
                      key={decision.id}
                      decision={decision}
                      sessionId={ritual.id}
                      onUpdate={({ sessionId, decisionId, updates }) => {
                        updateFollowUp({ sessionId, decisionId, updates });
                      }}
                      isPending={isUpdatingFollowUp}
                      onAddMessage={({ sessionId, decisionId, content }) => {
                        addThreadMessage({ sessionId, decisionId, content });
                      }}
                      isAddingMessage={isAddingMessage}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Nenhuma decisão registrada neste ritual.
              </p>
            )}

            {/* Participant Evaluations (from addendums) */}
            <ParticipantEvaluationsSection addendums={ritual.addendums} />

            {/* Feedback */}
            <RitualFeedbackSection reflectionData={ritual.reflectionData} />

            {/* Snapshot metadata */}
            <SnapshotSummary ritual={ritual} />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ============================================================
// SNAPSHOT SUMMARY
// ============================================================

function SnapshotSummary({ ritual }: { ritual: RitualHistoryItem }) {
  const [showRawSnapshot, setShowRawSnapshot] = useState(false);
  const rd = ritual.reflectionData;

  if (!rd) return null;

  const data = (rd as any)?.data;

  return (
    <div className="space-y-4">
      <Separator />

      {/* Formatted report */}
      {data && (
        <SnapshotReportView wizardType={ritual.wizardType} data={data} />
      )}

      {/* Raw JSON (debug) */}
      <Collapsible open={showRawSnapshot} onOpenChange={setShowRawSnapshot}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground">
            <FileText className="h-3 w-3" />
            {showRawSnapshot ? 'Ocultar dados brutos' : 'Ver dados brutos'}
            <ChevronDown className={cn('h-3 w-3 transition-transform', showRawSnapshot && 'rotate-180')} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ScrollArea className="h-[300px] mt-2">
            <pre className="text-[11px] bg-muted/50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-words">
              {JSON.stringify(rd, null, 2)}
            </pre>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ============================================================
// PARTICIPANT EVALUATIONS SECTION (from addendums)
// ============================================================

function ParticipantEvaluationsSection({ addendums }: { addendums: unknown[] | null }) {
  const evaluationAddendum = (addendums ?? []).find(
    (a: any) => a?.type === 'participant_evaluation'
  ) as { evaluations?: Array<{ score: number; feedback: string }> } | undefined;

  const evaluations = evaluationAddendum?.evaluations ?? [];
  if (evaluations.length === 0) return null;

  const avgScore = evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Star className="h-4 w-4" />
        Avaliações do Ritual ({evaluations.length})
        <span className="text-xs font-normal text-muted-foreground ml-1">
          — Média: {avgScore.toFixed(1)}/5
        </span>
      </h4>

      <div className="space-y-2">
        {evaluations.map((ev, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20"
          >
            {/* Stars */}
            <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    'h-3.5 w-3.5',
                    s <= ev.score
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/30'
                  )}
                />
              ))}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              {ev.feedback?.trim() ? (
                <p className="text-sm text-foreground">{ev.feedback}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Sem comentário</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// RITUAL FEEDBACK SECTION
// ============================================================

function RitualFeedbackSection({ reflectionData }: { reflectionData: any }) {
  const feedbacks: RitualImprovementFeedback[] =
    (reflectionData as any)?.data?.ritualFeedback ?? [];

  if (feedbacks.length === 0) return null;

  const avgRating = feedbacks.reduce((sum, fb) => sum + fb.rating, 0) / feedbacks.length;
  const feedbacksWithText = feedbacks.filter((fb) => fb.text?.trim());

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Star className="h-4 w-4" />
        Feedback do Ritual ({feedbacks.length})
        <span className="text-xs font-normal text-muted-foreground ml-1">
          — Média: {avgRating.toFixed(1)}
        </span>
      </h4>

      <div className="space-y-2">
        {feedbacks.map((fb) => (
          <div
            key={fb.id}
            className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20"
          >
            {/* Stars */}
            <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    'h-3.5 w-3.5',
                    s <= fb.rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/30'
                  )}
                />
              ))}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              {fb.text?.trim() ? (
                <p className="text-sm text-foreground">{fb.text}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Sem comentário</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// OWNER NAME RESOLVED (fallback for legacy snapshots with empty name)
// ============================================================

function OwnerNameResolved({ ownerId, snapshotName }: { ownerId: string; snapshotName?: string }) {
  const needsResolve = !snapshotName;
  const { data: participant } = useResolveParticipant(needsResolve ? ownerId : null, needsResolve);

  const displayName = snapshotName || participant?.displayName || 'Responsável';
  return <>{displayName}</>;
}
