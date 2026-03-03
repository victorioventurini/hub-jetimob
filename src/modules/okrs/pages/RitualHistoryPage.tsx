/**
 * RitualHistoryPage - Histórico de rituais/wizards concluídos
 * 
 * Lista sessões concluídas com filtros, detalhe expandido e follow-up de decisões.
 * Suporta deep-link via ?session={id} para abrir automaticamente uma sessão específica.
 */

import { useState, useMemo, useEffect } from 'react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  History, ChevronDown, ChevronRight, CalendarIcon, Users, User,
  Lightbulb, Target, CheckCircle2, Clock, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUrlState, parsers } from '@/shared/url';
import {
  useRitualHistory,
  useRitualDetail,
  useUpdateDecisionFollowUp,
  WIZARD_TYPE_LABELS,
  type RitualHistoryItem,
  type RitualHistoryFilters,
} from '../hooks/useRitualHistory';
import { useManageableTeamsFlat } from '../hooks';
import type { WizardPersona, TeamCheckinDecision } from '../types/wizard';
import { useResolveParticipant } from '@/hooks/useResolveParticipant';

// ============================================================
// CONSTANTS
// ============================================================

const CATEGORY_CONFIG = {
  decision: { label: 'Decisão', icon: Lightbulb, color: 'bg-status-blue-muted text-status-blue' },
  focus_adjustment: { label: 'Ajuste de Foco', icon: Target, color: 'bg-status-purple-muted text-status-purple' },
  next_step: { label: 'Próximo Passo', icon: CheckCircle2, color: 'bg-status-green-muted text-status-green' },
} as const;

const WIZARD_TYPE_OPTIONS: { value: WizardPersona | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os rituais' },
  { value: 'mbr', label: 'MBR' },
  { value: 'team-checkin', label: 'Check-in do Time' },
  { value: 'collaborator', label: 'Check-in Colaborador' },
  { value: 'leader-prep', label: 'Preparação do Líder' },
  { value: 'clevel-checkin', label: 'Check-in C-Level' },
  { value: 'managers-checkin', label: 'Check-in de Gestores' },
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

  const dateFromState = useUrlState<string>({
    key: 'from',
    defaultValue: '',
    parse: parsers.string,
  });
  const dateToState = useUrlState<string>({
    key: 'to',
    defaultValue: '',
    parse: parsers.string,
  });

  const filters: RitualHistoryFilters = useMemo(() => ({
    wizardType: (typeState.value || 'all') as WizardPersona | 'all',
    teamId: teamState.value || null,
    dateFrom: dateFromState.value || null,
    dateTo: dateToState.value || null,
  }), [typeState.value, teamState.value, dateFromState.value, dateToState.value]);

  const { data: rituals, isLoading } = useRitualHistory(filters);
  const { teams } = useManageableTeamsFlat();

  // Deep-link: fetch the specific session if not in the list (e.g. user is recipient but not author)
  const { data: deepLinkSession, isLoading: isLoadingDeepLink } = useRitualDetail(
    // Only fetch if we have a deep-link ID and it's NOT already in the list
    deepLinkSessionId && rituals && !rituals.some(r => r.id === deepLinkSessionId)
      ? deepLinkSessionId
      : null
  );

  // Merge: if deep-link session exists and isn't in the list, prepend it
  const mergedRituals = useMemo(() => {
    if (!rituals) return rituals;
    if (!deepLinkSession) return rituals;
    if (rituals.some(r => r.id === deepLinkSession.id)) return rituals;
    return [deepLinkSession, ...rituals];
  }, [rituals, deepLinkSession]);

  const anyLoading = isLoading || (!!deepLinkSessionId && isLoadingDeepLink);

  return (
    <HubLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <PageHeader
          title="Histórico de Rituais"
          description="Consulte rituais concluídos, decisões registradas e acompanhe pendências."
          breadcrumbs={[
            { label: 'OKRs', href: '/okrs' },
            { label: 'Histórico de Rituais' },
          ]}
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={typeState.value || 'all'} onValueChange={typeState.set}>
            <SelectTrigger className="w-[220px]">
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
              <SelectTrigger className="w-[200px]">
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

          {/* Date filters */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="default" className={cn(
                "w-[180px] justify-start text-left font-normal",
                !dateFromState.value && "text-muted-foreground"
              )}>
                <CalendarIcon className="h-4 w-4 mr-2" />
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
                "w-[180px] justify-start text-left font-normal",
                !dateToState.value && "text-muted-foreground"
              )}>
                <CalendarIcon className="h-4 w-4 mr-2" />
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

          {/* Clear filters */}
          {(dateFromState.value || dateToState.value) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { dateFromState.set(''); dateToState.set(''); }}
              className="text-muted-foreground"
            >
              Limpar datas
            </Button>
          )}
        </div>

        {/* List */}
        {anyLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : !mergedRituals || mergedRituals.length === 0 ? (
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
  const label = WIZARD_TYPE_LABELS[ritual.wizardType] || ritual.wizardType;

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
          <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              {/* Expand icon */}
              <div className="shrink-0">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {/* Type badge */}
              <Badge variant="secondary" className="shrink-0 text-xs">
                {label}
              </Badge>

              {/* Team */}
              {ritual.teamName && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                  <Users className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[150px]">{ritual.teamName}</span>
                </span>
              )}

              {/* Spacer */}
              <div className="flex-1 min-w-0" />

              {/* Decisions count */}
              {hasDecisions && (
                <Badge variant="outline" className="shrink-0 text-xs gap-1">
                  <Lightbulb className="h-3 w-3" />
                  {ritual.decisions.length}
                </Badge>
              )}

              {/* Date */}
              {ritual.completedAt && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <CalendarIcon className="h-3 w-3" />
                  {format(parseISO(ritual.completedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              )}

              {/* Author */}
              {ritual.startedByName && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <User className="h-3 w-3" />
                  <span className="truncate max-w-[120px]">{ritual.startedByName}</span>
                </span>
              )}
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
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Nenhuma decisão registrada neste ritual.
              </p>
            )}

            {/* Snapshot metadata */}
            <SnapshotSummary ritual={ritual} />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ============================================================
// DECISION FOLLOW-UP ROW
// ============================================================

function DecisionFollowUpRow({
  decision,
  sessionId,
}: {
  decision: TeamCheckinDecision & { followUpStatus?: string };
  sessionId: string;
}) {
  const { mutate: updateFollowUp, isPending } = useUpdateDecisionFollowUp();
  const config = CATEGORY_CONFIG[decision.category];
  const Icon = config.icon;
  const isDone = decision.followUpStatus === 'done';

  const handleToggle = () => {
    updateFollowUp({
      sessionId,
      decisionId: decision.id,
      updates: {
        followUpStatus: isDone ? 'pending' : 'done',
      } as any,
    });
  };

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border transition-colors',
      isDone && 'bg-muted/40 opacity-70'
    )}>
      {/* Checkbox */}
      <Checkbox
        checked={isDone}
        onCheckedChange={handleToggle}
        disabled={isPending}
        className="mt-0.5"
      />

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className={cn('text-sm', isDone && 'line-through text-muted-foreground')}>
          {decision.text}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5', config.color)}>
            <Icon className="h-3 w-3 mr-0.5" />
            {config.label}
          </Badge>

          {decision.sourceStep && (
            <span className="text-[10px] text-muted-foreground">
              Etapa: {decision.sourceStep}
            </span>
          )}

          {decision.owner && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <OwnerNameResolved ownerId={decision.owner.id} snapshotName={decision.owner.name} />
            </span>
          )}

          {decision.deadline && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(parseISO(decision.deadline), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          )}
        </div>
      </div>

      {/* Status */}
      <Badge
        variant={isDone ? 'default' : 'outline'}
        className={cn('shrink-0 text-[10px]', isDone && 'bg-status-green text-white')}
      >
        {isDone ? 'Concluído' : 'Pendente'}
      </Badge>
    </div>
  );
}

// ============================================================
// SNAPSHOT SUMMARY
// ============================================================

function SnapshotSummary({ ritual }: { ritual: RitualHistoryItem }) {
  const [showSnapshot, setShowSnapshot] = useState(false);
  const rd = ritual.reflectionData;

  if (!rd) return null;

  // Extract high-level info from reflection_data
  const data = (rd as any)?.data;
  const summaryParts: { label: string; value: string }[] = [];

  if (data?.referenceMonth) {
    summaryParts.push({ label: 'Mês de Referência', value: data.referenceMonth });
  }
  if (Array.isArray(data?.kpiSnapshots)) {
    summaryParts.push({ label: 'KPIs analisados', value: String(data.kpiSnapshots.length) });
  }
  if (Array.isArray(data?.teamOkrSnapshots)) {
    summaryParts.push({ label: 'Times revisados', value: String(data.teamOkrSnapshots.length) });
  }
  if (Array.isArray(data?.orgOkrSnapshots)) {
    summaryParts.push({ label: 'OKRs Org.', value: String(data.orgOkrSnapshots.length) });
  }

  if (summaryParts.length === 0) return null;

  return (
    <div className="space-y-2">
      <Separator />
      <div className="flex flex-wrap gap-4">
        {summaryParts.map((part, i) => (
          <div key={i} className="text-xs">
            <span className="text-muted-foreground">{part.label}: </span>
            <span className="font-medium">{part.value}</span>
          </div>
        ))}
      </div>

      {/* Expandable raw snapshot */}
      <Collapsible open={showSnapshot} onOpenChange={setShowSnapshot}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground">
            <FileText className="h-3 w-3" />
            {showSnapshot ? 'Ocultar snapshot completo' : 'Ver snapshot completo'}
            <ChevronDown className={cn('h-3 w-3 transition-transform', showSnapshot && 'rotate-180')} />
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
// OWNER NAME RESOLVED (fallback for legacy snapshots with empty name)
// ============================================================

function OwnerNameResolved({ ownerId, snapshotName }: { ownerId: string; snapshotName?: string }) {
  const needsResolve = !snapshotName;
  const { data: participant } = useResolveParticipant(needsResolve ? ownerId : null, needsResolve);

  const displayName = snapshotName || participant?.displayName || 'Responsável';
  return <>{displayName}</>;
}
