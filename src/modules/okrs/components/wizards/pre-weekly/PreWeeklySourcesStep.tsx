/**
 * PreWeeklySourcesStep — Step 1 do Pré-Weekly v2 (enriquecido)
 *
 * "Fontes do time/seu desta semana" — preparação mental do líder antes
 * de destilar a Weekly. Cada rito concluído na semana vira um cartão
 * com timestamp humanizado, contadores rápidos e um botão "Ver conteúdo"
 * que abre o snapshot read-only completo (reuso de SnapshotReportView).
 *
 * Ritos esperados na semana mas ainda não concluídos aparecem como
 * cartões "Pendente" com link direto para preenchimento.
 *
 * SSOTs:
 * - mem://features/rituals/pre-weekly-v2-sources-scope (filtro dual user/team)
 * - mem://features/rituals/pre-weekly-v2-standard (Step 1 = revisão)
 * - mem://features/rituals/ritual-addendum-standard (read-only via SnapshotReportView)
 */

import { memo, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { startOfWeek, endOfWeek, formatDistanceToNow, format, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Inbox,
  Calendar,
  Eye,
  AlertTriangle,
  Users,
  UserCircle,
  ClipboardList,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIdentity } from '@/hooks/useIdentity';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { getRitualLabel } from '@/modules/okrs/constants/ritualLabels';
import { preWeeklyKeys } from '@/lib/queryKeys/okrs';
import { SnapshotReportView } from '@/modules/okrs/components/ritual-report/SnapshotReportView';
import {
  WizardStepHeader,
  WizardFirstStepFooter,
  WizardStepScaffold,
  InlineDecisionInput,
} from '../shared';
import type { TeamCheckinDecision, WizardPersona } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

type ExpectedType = 'team-checkin' | 'leader-prep' | 'collaborator';

const EXPECTED_ICONS: Record<ExpectedType, typeof Users> = {
  'team-checkin': Users,
  'leader-prep': ClipboardList,
  'collaborator': UserCircle,
};

const RITUAL_ROUTE: Record<ExpectedType, string> = {
  'team-checkin': '/rituals/team-checkin',
  'leader-prep': '/rituals/team-checkin-pre',
  'collaborator': '/rituals/collaborator-checkin',
};

interface SourceSummary {
  /** Pares label/valor exibidos como chips no card. */
  chips: { label: string; value: number; tone?: 'default' | 'warning' }[];
}

interface SessionItem {
  id: string;
  wizard_type: ExpectedType | string;
  completed_at: string | null;
  status: string;
  structure_version: string | null;
  reflection_data: { data?: Record<string, unknown> } | null;
  summary: SourceSummary;
}

export interface PreWeeklySourcesStepProps {
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  referenceWeek: string; // YYYY-MM-DD
  /** Quando presente, filtra fontes por time. */
  teamId?: string | null;
  /** Se o usuário logado é membro/líder do time ativo (define se collaborator é esperado). */
  isCollaboratorExpected?: boolean;
  onContinue: () => void;
}

// ============================================================
// SUMMARY BUILDERS — TS puro, sem AI
// ============================================================

function buildSummary(
  type: string,
  data: Record<string, any> | undefined
): SourceSummary {
  if (!data) return { chips: [] };

  if (type === 'team-checkin') {
    const decisions = Array.isArray(data.decisions) ? data.decisions : [];
    const krs = Array.isArray(data.krsToReview) ? data.krsToReview : [];
    const blockers = decisions.filter((d: any) =>
      typeof d?.text === 'string' && /bloque|bloqu|impedimento/i.test(d.text)
    ).length;
    const nextSteps = decisions.filter((d: any) => d?.category === 'next_step').length;
    return {
      chips: [
        { label: 'KRs revisados', value: krs.length },
        { label: 'Decisões', value: decisions.length },
        { label: 'Bloqueios', value: blockers, tone: blockers > 0 ? 'warning' : 'default' },
        { label: 'Próximos passos', value: nextSteps },
      ],
    };
  }

  if (type === 'leader-prep') {
    const highlights = Array.isArray(data.highlights) ? data.highlights : [];
    const krActions = Array.isArray(data.krActions) ? data.krActions : [];
    const highPriority = highlights.filter((h: any) => h?.priority === 'high').length;
    const atRisk = krActions.filter((a: any) => a?.actionType === 'at_risk').length;
    return {
      chips: [
        { label: 'Highlights', value: highlights.length },
        { label: 'Alta prioridade', value: highPriority, tone: highPriority > 0 ? 'warning' : 'default' },
        { label: 'Ações em KR', value: krActions.length },
        { label: 'KRs em risco', value: atRisk, tone: atRisk > 0 ? 'warning' : 'default' },
      ],
    };
  }

  if (type === 'collaborator') {
    const results = Array.isArray(data.results) ? data.results : [];
    const updated = results.filter((r: any) => !r?.skipped).length;
    const lowConfidence = results.filter((r: any) => r?.confidence === 'low').length;
    const blockers = results.filter((r: any) => r?.blocker && String(r.blocker).trim()).length;
    const reflection = data.reflection ?? {};
    const hasReflection =
      (reflection.impactSummary && String(reflection.impactSummary).trim()) ||
      (reflection.helpNeeded && String(reflection.helpNeeded).trim())
        ? 1
        : 0;
    return {
      chips: [
        { label: 'KRs atualizados', value: updated },
        { label: 'Confiança baixa', value: lowConfidence, tone: lowConfidence > 0 ? 'warning' : 'default' },
        { label: 'Bloqueios', value: blockers, tone: blockers > 0 ? 'warning' : 'default' },
        { label: 'Reflexão', value: hasReflection },
      ],
    };
  }

  return { chips: [] };
}

// ============================================================
// HOOK — fontes da semana enriquecidas
// ============================================================

function useWeeklySources(referenceWeek: string, teamId: string | null | undefined) {
  const { profileId } = useIdentity();
  const { currentBuId } = useBu();
  const buSupabase = useBuScopedSupabase();

  const scope: 'team' | 'user' = teamId ? 'team' : 'user';
  const scopeKey = teamId ?? profileId ?? null;
  const enabled = !!currentBuId && (teamId ? true : !!profileId);

  return useQuery({
    queryKey: preWeeklyKeys.sources(currentBuId, scope, scopeKey, referenceWeek),
    enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<SessionItem[]> => {
      const ref = referenceWeek ? new Date(`${referenceWeek}T00:00:00`) : new Date();
      const weekStart = startOfWeek(ref, { weekStartsOn: 1 }).toISOString();
      const weekEnd = endOfWeek(ref, { weekStartsOn: 1 }).toISOString();

      let query = buSupabase
        .from('okr_wizard_sessions')
        .select('id, wizard_type, completed_at, status, structure_version, reflection_data')
        .in('wizard_type', ['collaborator', 'leader-prep', 'team-checkin'])
        .gte('completed_at', weekStart)
        .lte('completed_at', weekEnd)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      } else {
        query = query.eq('started_by', profileId!);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((row: any): SessionItem => {
        const inner = (row.reflection_data?.data ?? {}) as Record<string, any>;
        return {
          id: row.id,
          wizard_type: row.wizard_type,
          completed_at: row.completed_at,
          status: row.status,
          structure_version: row.structure_version ?? 'v1',
          reflection_data: row.reflection_data ?? null,
          summary: buildSummary(row.wizard_type, inner),
        };
      });
    },
  });
}

// ============================================================
// HELPERS
// ============================================================

function humanizeTimestamp(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const hours = differenceInHours(new Date(), d);
  if (hours < 24) {
    return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
  }
  return format(d, "EEEE 'às' HH'h'mm", { locale: ptBR });
}

// ============================================================
// SOURCE CARD (concluída)
// ============================================================

interface SourceCardProps {
  session: SessionItem;
  onView: (session: SessionItem) => void;
}

const SourceCard = memo(function SourceCard({ session, onView }: SourceCardProps) {
  const Icon = EXPECTED_ICONS[session.wizard_type as ExpectedType] ?? Calendar;
  return (
    <div className="rounded-md border bg-card p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {getRitualLabel(session.wizard_type)}
            </p>
            <p className="text-xs text-muted-foreground">
              Concluído {humanizeTimestamp(session.completed_at)}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 h-8"
          onClick={() => onView(session)}
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          Ver conteúdo
        </Button>
      </div>
      {session.summary.chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {session.summary.chips.map((chip) => (
            <Badge
              key={chip.label}
              variant="secondary"
              className={
                chip.value === 0
                  ? 'text-xs font-normal text-muted-foreground bg-muted/40'
                  : chip.tone === 'warning'
                    ? 'text-xs font-normal bg-status-amber-muted text-status-amber'
                    : 'text-xs font-normal'
              }
            >
              <span className="tabular-nums mr-1">{chip.value}</span>
              {chip.label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
});

// ============================================================
// PENDING CARD
// ============================================================

interface PendingCardProps {
  type: ExpectedType;
  teamId: string | null | undefined;
  onDismiss: () => void;
}

const PendingCard = memo(function PendingCard({ type, teamId, onDismiss }: PendingCardProps) {
  const Icon = EXPECTED_ICONS[type];
  const route = teamId
    ? `${RITUAL_ROUTE[type]}?team=${teamId}`
    : RITUAL_ROUTE[type];
  return (
    <div className="rounded-md border border-dashed bg-muted/20 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 text-status-amber shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {getRitualLabel(type)} — pendente
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ainda não foi concluído nesta semana.
          </p>
        </div>
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" className="h-8">
          <Link to={route}>
            Preencher agora
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8" onClick={onDismiss}>
          Prosseguir mesmo assim
        </Button>
      </div>
    </div>
  );
});

// ============================================================
// COMPONENT
// ============================================================

export function PreWeeklySourcesStep({
  decisions,
  onDecisionsChange,
  referenceWeek,
  teamId,
  isCollaboratorExpected = false,
  onContinue,
}: PreWeeklySourcesStepProps) {
  const { data: sessions, isLoading } = useWeeklySources(referenceWeek, teamId);
  const isTeamScope = !!teamId;

  const [viewing, setViewing] = useState<SessionItem | null>(null);
  const [dismissed, setDismissed] = useState<Set<ExpectedType>>(new Set());

  const completedTypes = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions ?? []) set.add(s.wizard_type);
    return set;
  }, [sessions]);

  const expectedTypes: ExpectedType[] = useMemo(() => {
    const base: ExpectedType[] = ['team-checkin', 'leader-prep'];
    if (isCollaboratorExpected) base.push('collaborator');
    return base;
  }, [isCollaboratorExpected]);

  const pendingTypes = useMemo(
    () => expectedTypes.filter((t) => !completedTypes.has(t) && !dismissed.has(t)),
    [expectedTypes, completedTypes, dismissed]
  );

  const hasAnything = (sessions?.length ?? 0) > 0 || pendingTypes.length > 0;

  return (
    <>
      <WizardStepScaffold
        header={
          <WizardStepHeader
            icon={Inbox}
            title={isTeamScope ? 'Fontes do time esta semana' : 'Suas fontes desta semana'}
            description={
              isTeamScope
                ? 'Revise o que aconteceu nos ritos do time antes de destilar a pauta'
                : 'Revise o que você já registrou antes de destilar a pauta da Weekly'
            }
            variant="primary"
          />
        }
        bottomFixed={
          <InlineDecisionInput
            decisions={decisions}
            onDecisionsChange={onDecisionsChange}
            sourceStep="pre-weekly-sources"
            placeholder="Registrar uma decisão ou observação a partir das fontes…"
          />
        }
        footer={
          <WizardFirstStepFooter
            onPrimary={onContinue}
            primaryLabel="Continuar para Pauta"
          />
        }
      >
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {isTeamScope
                  ? 'Ritos do time nesta semana'
                  : 'Seus ritos nesta semana'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading && (
                <p className="text-sm text-muted-foreground">Carregando fontes…</p>
              )}

              {!isLoading && !hasAnything && (
                <p className="text-sm text-muted-foreground">
                  Nenhum rito desta semana encontrado. Você pode seguir adiante — a
                  destilação é livre.
                </p>
              )}

              {!isLoading && (sessions ?? []).map((s) => (
                <SourceCard key={s.id} session={s} onView={setViewing} />
              ))}

              {!isLoading && pendingTypes.map((t) => (
                <PendingCard
                  key={t}
                  type={t}
                  teamId={teamId}
                  onDismiss={() =>
                    setDismissed((prev) => {
                      const next = new Set(prev);
                      next.add(t);
                      return next;
                    })
                  }
                />
              ))}
            </CardContent>
          </Card>
        </div>
      </WizardStepScaffold>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle className="text-base">
              {viewing ? getRitualLabel(viewing.wizard_type) : ''}
              {viewing?.completed_at && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  · {humanizeTimestamp(viewing.completed_at)}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="px-6 py-4">
              {viewing && (
                <SnapshotReportView
                  wizardType={viewing.wizard_type as WizardPersona}
                  data={(viewing.reflection_data?.data ?? {}) as Record<string, any>}
                  structureVersion={viewing.structure_version ?? 'v1'}
                />
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
