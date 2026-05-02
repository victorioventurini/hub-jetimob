/**
 * CollaboratorSummary — Revisão final do Check-in Individual.
 *
 * Espelha TODO o ritual: uma seção por step preenchido, na ordem de
 * `STEP_ORDER` (mem://features/rituals/collaborator-step1-order-mirrors-steps).
 * Mostra preview do que será gravado ao clicar em Concluir — nada é persistido
 * antes desse clique.
 */

import { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  SkipForward,
  AlertTriangle,
  Copy,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  PartyPopper,
  Pencil,
  Activity,
  FolderKanban,
  Lightbulb,
  Target,
  ClipboardCheck,
  MessageSquare,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CONFIDENCE_COLORS } from '@/lib/colors';
import { WizardLastStepFooter } from '@/modules/okrs/components/wizards/shared/WizardStepFooter';
import { WizardStepScaffold } from '@/modules/okrs/components/wizards/shared/WizardStepScaffold';
import type {
  CollaboratorCheckinResult,
  CollaboratorReflection,
  KpiCheckinResult,
  PendingMilestoneStatusChange,
  PendingDecisionFollowUpUpdate,
  PendingDecisionThreadMessage,
} from '@/modules/okrs/types/wizard';
import type { WizardStep } from './wizardSteps';
import type { MilestoneStatus } from '@/modules/projects/types';
import {
  useMilestoneLookupByIds,
  useInitiativeLookupByIds,
} from './hooks/useSummaryLookups';
import { useMyPendingDecisions } from '@/modules/okrs/hooks';

// ============================================================
// LABELS
// ============================================================

const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  todo: 'A fazer',
  in_progress: 'Em andamento',
  done: 'Concluído',
};

const MILESTONE_STATUS_TONE: Record<MilestoneStatus, string> = {
  todo: 'bg-muted text-muted-foreground',
  in_progress: 'bg-status-blue-muted text-status-blue-muted-foreground',
  done: 'bg-status-green-muted text-status-green-muted-foreground',
};

// ============================================================
// TYPES
// ============================================================

export interface CollaboratorSummaryProps {
  results: CollaboratorCheckinResult[];
  kpiResults?: KpiCheckinResult[];
  reflection?: CollaboratorReflection;
  initiativesMarkedAtRisk?: string[];
  pendingMilestoneStatusChanges?: PendingMilestoneStatusChange[];
  pendingFollowUpUpdates?: PendingDecisionFollowUpUpdate[];
  pendingThreadMessages?: PendingDecisionThreadMessage[];
  visibleStepOrder: readonly WizardStep[];
  effectiveUserId: string | null;
  cycleName?: string;
  onViewOkrs: () => void;
  onClose: () => void;
  onBack?: () => void;
  onEditStep?: (stepId: WizardStep) => void;
  isSubmitting?: boolean;
}

// ============================================================
// SECTION SHELL
// ============================================================

interface SectionShellProps {
  id: string;
  icon: React.ElementType;
  title: string;
  count: number;
  emptyText: string;
  onEdit?: () => void;
  children?: React.ReactNode;
}

const SectionShell = memo(function SectionShell({
  id,
  icon: Icon,
  title,
  count,
  emptyText,
  onEdit,
  children,
}: SectionShellProps) {
  const isEmpty = count === 0;
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 id={`${id}-heading`} className="font-medium flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span>{title}</span>
          <Badge variant="secondary" className="text-xs">{count}</Badge>
        </h4>
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 px-2 text-xs">
            <Pencil className="h-3 w-3 mr-1" />
            Editar
          </Button>
        )}
      </div>
      {isEmpty ? (
        <p className="text-sm text-muted-foreground italic">{emptyText}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
});

// ============================================================
// CARDS (memoized)
// ============================================================

const KrCard = memo(function KrCard({ result }: { result: CollaboratorCheckinResult }) {
  const change = result.newValue - result.previousValue;
  const isPositive = change > 0;
  return (
    <div className="rounded-lg border p-3 bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{result.krTitle ?? 'KR'}</p>
          {result.objectiveTitle && (
            <p className="text-xs text-muted-foreground truncate">{result.objectiveTitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm">
            {result.previousValue} → <span className="font-bold">{result.newValue}</span>
          </span>
          {change !== 0 && (
            <Badge
              variant="secondary"
              className={cn(
                'text-xs',
                isPositive
                  ? 'bg-status-green-muted text-status-green-muted-foreground'
                  : 'bg-status-red-muted text-status-red-muted-foreground',
              )}
            >
              {isPositive ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
              {isPositive ? '+' : ''}{change}
            </Badge>
          )}
          <Badge
            variant="secondary"
            className={cn(
              'text-xs',
              result.confidence && CONFIDENCE_COLORS[result.confidence as keyof typeof CONFIDENCE_COLORS]?.badge,
            )}
          >
            {result.confidence === 'high' ? '🟢' : result.confidence === 'medium' ? '🟡' : '🔴'}
          </Badge>
        </div>
      </div>
      {result.comment && (
        <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">{result.comment}</p>
      )}
    </div>
  );
});

const KpiCard = memo(function KpiCard({ kpi }: { kpi: KpiCheckinResult }) {
  return (
    <div className="rounded-lg border p-3 bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            <a
              href={`/kpis/${kpi.kpiId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="hover:underline"
            >
              {kpi.kpiName ?? 'KPI'}
            </a>
          </p>
          <p className="text-xs text-muted-foreground">
            Ref: {new Date(kpi.referenceDate).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm">
            {kpi.previousValue ?? '—'} → <span className="font-bold">{kpi.newValue}</span>
          </span>
          {kpi.inputType && (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              {kpi.inputType === 'consolidated' ? 'Consolidado' : 'Parcial'}
            </Badge>
          )}
        </div>
      </div>
      {kpi.notes && (
        <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">{kpi.notes}</p>
      )}
    </div>
  );
});

const MilestoneCard = memo(function MilestoneCard({
  change,
  name,
  projectName,
  previousStatus,
}: {
  change: PendingMilestoneStatusChange;
  name: string;
  projectName: string;
  previousStatus?: MilestoneStatus;
}) {
  return (
    <div className="rounded-lg border p-3 bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate">{projectName}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {previousStatus && previousStatus !== change.status && (
            <Badge variant="secondary" className={cn('text-xs', MILESTONE_STATUS_TONE[previousStatus])}>
              {MILESTONE_STATUS_LABEL[previousStatus]}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">→</span>
          <Badge variant="secondary" className={cn('text-xs', MILESTONE_STATUS_TONE[change.status])}>
            {MILESTONE_STATUS_LABEL[change.status]}
          </Badge>
        </div>
      </div>
    </div>
  );
});

const InitiativeCard = memo(function InitiativeCard({ name }: { name: string }) {
  return (
    <div className="rounded-lg border border-status-orange/30 bg-status-orange-muted p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm truncate flex-1">{name}</p>
        <Badge variant="secondary" className="text-xs bg-status-orange-muted text-status-orange-muted-foreground">
          Em risco
        </Badge>
      </div>
    </div>
  );
});

interface PendencyGroupProps {
  decisionTitle: string;
  followUpStatus?: 'pending' | 'done';
  messageCount: number;
  lastMessage?: string;
}

const PendencyCard = memo(function PendencyCard({
  decisionTitle,
  followUpStatus,
  messageCount,
  lastMessage,
}: PendencyGroupProps) {
  return (
    <div className="rounded-lg border p-3 bg-card">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm flex-1">{decisionTitle}</p>
        {followUpStatus && (
          <Badge
            variant="secondary"
            className={cn(
              'text-xs',
              followUpStatus === 'done'
                ? 'bg-status-green-muted text-status-green-muted-foreground'
                : 'bg-status-blue-muted text-status-blue-muted-foreground',
            )}
          >
            {followUpStatus === 'done' ? 'Resolvida' : 'Em acompanhamento'}
          </Badge>
        )}
      </div>
      {messageCount > 0 && (
        <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <span className="font-medium">{messageCount} mensagem{messageCount > 1 ? 's' : ''}</span>
            {lastMessage && <p className="truncate italic">"{lastMessage}"</p>}
          </div>
        </div>
      )}
    </div>
  );
});

// ============================================================
// MAIN COMPONENT
// ============================================================

export function CollaboratorSummary({
  results,
  kpiResults = [],
  reflection,
  initiativesMarkedAtRisk = [],
  pendingMilestoneStatusChanges = [],
  pendingFollowUpUpdates = [],
  pendingThreadMessages = [],
  visibleStepOrder,
  effectiveUserId,
  cycleName,
  onViewOkrs,
  onClose,
  onBack,
  onEditStep,
  isSubmitting = false,
}: CollaboratorSummaryProps) {
  // Lookups (read-only)
  const milestoneIds = useMemo(
    () => pendingMilestoneStatusChanges.map((c) => c.milestoneId),
    [pendingMilestoneStatusChanges],
  );
  const { data: milestoneMap = {} } = useMilestoneLookupByIds(milestoneIds);

  const { data: initiativeMap = {} } = useInitiativeLookupByIds(initiativesMarkedAtRisk);

  const { data: pendingDecisions = [] } = useMyPendingDecisions(effectiveUserId);
  const decisionTitleMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const item of pendingDecisions) {
      m[`${item.sessionId}::${item.decision.id}`] = item.decision.text || item.decision.title || 'Decisão';
    }
    return m;
  }, [pendingDecisions]);

  // Pendências agrupadas por (session, decision)
  const pendencyGroups = useMemo(() => {
    type Group = {
      key: string;
      sessionId: string;
      decisionId: string;
      title: string;
      followUpStatus?: 'pending' | 'done';
      messages: string[];
    };
    const map = new Map<string, Group>();

    const ensure = (sessionId: string, decisionId: string): Group => {
      const key = `${sessionId}::${decisionId}`;
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          sessionId,
          decisionId,
          title: decisionTitleMap[key] ?? 'Decisão',
          messages: [],
        };
        map.set(key, g);
      }
      return g;
    };

    for (const u of pendingFollowUpUpdates) {
      const g = ensure(u.sessionId, u.decisionId);
      if (u.updates?.followUpStatus) g.followUpStatus = u.updates.followUpStatus;
    }
    for (const msg of pendingThreadMessages) {
      const g = ensure(msg.sessionId, msg.decisionId);
      g.messages.push(msg.content);
    }
    return Array.from(map.values());
  }, [pendingFollowUpUpdates, pendingThreadMessages, decisionTitleMap]);

  // Stats
  const stats = useMemo(() => {
    const completed = results.filter((r) => !r.skipped);
    const skipped = results.filter((r) => r.skipped);
    const withBlockers = results.filter((r) => r.blocker);
    const kpisCompleted = kpiResults.filter((k) => !k.skipped);
    const kpisSkipped = kpiResults.filter((k) => k.skipped);
    return {
      krsTotal: results.length,
      krsCompleted: completed.length,
      krsSkipped: skipped.length,
      withBlockers: withBlockers.length,
      kpisTotal: kpiResults.length,
      kpisCompleted: kpisCompleted.length,
      kpisSkipped: kpisSkipped.length,
      milestoneChanges: pendingMilestoneStatusChanges.length,
      initiativesAtRisk: initiativesMarkedAtRisk.length,
      pendencies: pendencyGroups.length,
    };
  }, [
    results,
    kpiResults,
    pendingMilestoneStatusChanges.length,
    initiativesMarkedAtRisk.length,
    pendencyGroups.length,
  ]);

  // Copy summary to clipboard (Markdown atualizado com novas seções)
  const handleCopy = () => {
    const completedKrs = results.filter((r) => !r.skipped);
    const skippedKrs = results.filter((r) => r.skipped);
    const blockers = results.filter((r) => r.blocker);
    const kpisCompletedList = kpiResults.filter((k) => !k.skipped);

    const lines: string[] = [];
    lines.push(`# Check-in Individual — ${new Date().toLocaleDateString('pt-BR')}`);
    if (cycleName) lines.push(`**Ciclo:** ${cycleName}`);
    lines.push('');
    lines.push('## Resumo');
    lines.push(`- ✅ ${stats.krsCompleted} KRs atualizados`);
    lines.push(`- ⏭️ ${stats.krsSkipped} KRs pulados`);
    lines.push(`- 📊 ${stats.kpisCompleted} KPIs atualizados`);
    lines.push(`- 🎯 ${stats.milestoneChanges} marcos alterados`);
    lines.push(`- ⚠️ ${stats.initiativesAtRisk} iniciativas sinalizadas`);
    lines.push(`- 💬 ${stats.pendencies} pendências respondidas`);
    lines.push(`- 🚧 ${stats.withBlockers} bloqueadores`);

    if (kpisCompletedList.length > 0) {
      lines.push('\n## KPIs Atualizados');
      for (const k of kpisCompletedList) {
        lines.push(`- **${k.kpiName ?? 'KPI'}**: ${k.previousValue ?? '—'} → ${k.newValue} (${k.inputType ?? 'consolidated'})`);
      }
    }

    if (pendingMilestoneStatusChanges.length > 0) {
      lines.push('\n## Marcos Alterados');
      for (const c of pendingMilestoneStatusChanges) {
        const m = milestoneMap[c.milestoneId];
        lines.push(`- **${m?.name ?? c.milestoneId}** (${m?.projectName ?? ''}) → ${MILESTONE_STATUS_LABEL[c.status]}`);
      }
    }

    if (initiativesMarkedAtRisk.length > 0) {
      lines.push('\n## Iniciativas Sinalizadas');
      for (const id of initiativesMarkedAtRisk) {
        lines.push(`- ${initiativeMap[id]?.name ?? id} (em risco)`);
      }
    }

    if (completedKrs.length > 0) {
      lines.push('\n## KRs Atualizados');
      for (const r of completedKrs) {
        const conf = r.confidence === 'high' ? '🟢' : r.confidence === 'medium' ? '🟡' : '🔴';
        lines.push(`- **${r.krTitle ?? 'KR'}**: ${r.previousValue} → ${r.newValue} (${conf})${r.comment ? `\n  > ${r.comment}` : ''}`);
      }
    }

    if (skippedKrs.length > 0) {
      lines.push('\n## KRs Pulados');
      for (const r of skippedKrs) lines.push(`- ${r.krTitle ?? r.krId}`);
    }

    if (blockers.length > 0) {
      lines.push('\n## Bloqueadores');
      for (const r of blockers) lines.push(`- **${r.krTitle ?? r.krId}**: ${r.blocker}`);
    }

    if (pendencyGroups.length > 0) {
      lines.push('\n## Pendências');
      for (const g of pendencyGroups) {
        const status = g.followUpStatus ? ` [${g.followUpStatus === 'done' ? 'Resolvida' : 'Em acompanhamento'}]` : '';
        lines.push(`- **${g.title}**${status}${g.messages.length > 0 ? ` — ${g.messages.length} mensagem(ns)` : ''}`);
      }
    }

    if (reflection?.impactSummary) {
      lines.push('\n## Reflexão');
      lines.push(reflection.impactSummary);
    }
    if (reflection?.helpNeeded) {
      lines.push('\n## Preciso de ajuda');
      lines.push(reflection.helpNeeded);
    }

    navigator.clipboard.writeText(lines.join('\n').trim());
    toast.success('Resumo copiado!');
  };

  // ============================================================
  // SECTION RENDERERS — chaveados por step
  // ============================================================

  const renderSection = (step: WizardStep): React.ReactNode => {
    switch (step) {
      case 'kpis':
        return (
          <SectionShell
            key="kpis"
            id="section-kpis"
            icon={Activity}
            title="Indicadores operacionais"
            count={stats.kpisCompleted + stats.kpisSkipped}
            emptyText="Nenhum KPI atualizado."
            onEdit={onEditStep ? () => onEditStep('kpis') : undefined}
          >
            {kpiResults.filter((k) => !k.skipped).map((kpi) => (
              <KpiCard key={kpi.kpiId} kpi={kpi} />
            ))}
            {stats.kpisSkipped > 0 && (
              <details className="rounded-md border border-dashed p-2 mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer">
                  {stats.kpisSkipped} KPI{stats.kpisSkipped > 1 ? 's' : ''} pulado{stats.kpisSkipped > 1 ? 's' : ''}
                </summary>
                <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                  {kpiResults.filter((k) => k.skipped).map((k) => (
                    <li key={k.kpiId}>• {k.kpiName ?? k.kpiId}</li>
                  ))}
                </ul>
              </details>
            )}
          </SectionShell>
        );

      case 'projects':
        return (
          <SectionShell
            key="projects"
            id="section-projects"
            icon={FolderKanban}
            title="Projetos / Marcos"
            count={stats.milestoneChanges}
            emptyText="Nenhum marco alterado."
            onEdit={onEditStep ? () => onEditStep('projects') : undefined}
          >
            {pendingMilestoneStatusChanges.map((change) => {
              const m = milestoneMap[change.milestoneId];
              return (
                <MilestoneCard
                  key={change.milestoneId}
                  change={change}
                  name={m?.name ?? 'Marco'}
                  projectName={m?.projectName ?? ''}
                  previousStatus={m?.status}
                />
              );
            })}
          </SectionShell>
        );

      case 'initiatives':
        return (
          <SectionShell
            key="initiatives"
            id="section-initiatives"
            icon={Lightbulb}
            title="Iniciativas"
            count={stats.initiativesAtRisk}
            emptyText="Nenhuma iniciativa sinalizada."
            onEdit={onEditStep ? () => onEditStep('initiatives') : undefined}
          >
            {initiativesMarkedAtRisk.map((id) => (
              <InitiativeCard key={id} name={initiativeMap[id]?.name ?? 'Iniciativa'} />
            ))}
          </SectionShell>
        );

      case 'checkin': {
        const completedKrs = results.filter((r) => !r.skipped);
        const skippedKrs = results.filter((r) => r.skipped);
        const blockers = results.filter((r) => r.blocker);
        return (
          <div key="checkin" className="space-y-6">
            <SectionShell
              id="section-krs"
              icon={Target}
              title="KRs atualizados"
              count={completedKrs.length}
              emptyText="Nenhum KR atualizado."
              onEdit={onEditStep ? () => onEditStep('checkin') : undefined}
            >
              {completedKrs.map((r) => (
                <KrCard key={r.krId} result={r} />
              ))}
              {skippedKrs.length > 0 && (
                <details className="rounded-md border border-dashed p-2 mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer">
                    {skippedKrs.length} KR{skippedKrs.length > 1 ? 's' : ''} pulado{skippedKrs.length > 1 ? 's' : ''}
                  </summary>
                  <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                    {skippedKrs.map((r) => (
                      <li key={r.krId}>• {r.krTitle ?? r.krId}</li>
                    ))}
                  </ul>
                </details>
              )}
            </SectionShell>

            {blockers.length > 0 && (
              <SectionShell
                id="section-blockers"
                icon={AlertTriangle}
                title="Bloqueadores"
                count={blockers.length}
                emptyText=""
              >
                {blockers.map((r) => (
                  <div
                    key={r.krId}
                    className="rounded-lg border border-status-orange/30 bg-status-orange-muted p-3"
                  >
                    <p className="font-medium text-sm">{r.krTitle ?? r.krId}</p>
                    <p className="text-sm mt-1">{r.blocker}</p>
                  </div>
                ))}
              </SectionShell>
            )}
          </div>
        );
      }

      case 'decisions':
        return (
          <SectionShell
            key="decisions"
            id="section-pendencies"
            icon={ClipboardCheck}
            title="Pendências"
            count={stats.pendencies}
            emptyText="Sem atualizações em pendências."
            onEdit={onEditStep ? () => onEditStep('decisions') : undefined}
          >
            {pendencyGroups.map((g) => (
              <PendencyCard
                key={g.key}
                decisionTitle={g.title}
                followUpStatus={g.followUpStatus}
                messageCount={g.messages.length}
                lastMessage={g.messages[g.messages.length - 1]}
              />
            ))}
          </SectionShell>
        );

      case 'reflection':
        if (!reflection?.impactSummary && !reflection?.helpNeeded) {
          return (
            <SectionShell
              key="reflection"
              id="section-reflection"
              icon={MessageSquare}
              title="Reflexão"
              count={0}
              emptyText="Sem reflexão registrada."
              onEdit={onEditStep ? () => onEditStep('reflection') : undefined}
            />
          );
        }
        return (
          <SectionShell
            key="reflection"
            id="section-reflection"
            icon={MessageSquare}
            title="Reflexão"
            count={(reflection.impactSummary ? 1 : 0) + (reflection.helpNeeded ? 1 : 0)}
            emptyText=""
            onEdit={onEditStep ? () => onEditStep('reflection') : undefined}
          >
            {reflection.impactSummary && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">O que mais impactou</p>
                <p className="text-sm">{reflection.impactSummary}</p>
              </div>
            )}
            {reflection.helpNeeded && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <p className="text-xs font-medium text-primary mb-1">Pedido de ajuda</p>
                <p className="text-sm">{reflection.helpNeeded}</p>
              </div>
            )}
          </SectionShell>
        );

      // 'context' e 'summary' não geram seções no resumo
      default:
        return null;
    }
  };

  const orderedSections = visibleStepOrder
    .map((step) => renderSection(step))
    .filter(Boolean);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <WizardStepScaffold
      header={
        <div className="px-6 py-6 bg-gradient-to-r from-primary/10 to-transparent border-b">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <PartyPopper className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-semibold">Revisão final</h3>
              <p className="text-sm text-muted-foreground truncate">
                {cycleName && <span>{cycleName} • </span>}
                {new Date().toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">
                Nada foi gravado ainda. Revise abaixo e clique em <strong>Concluir</strong> para
                registrar tudo de uma vez.
              </p>
            </div>
          </div>
        </div>
      }
      topFixed={
        <div className="px-6 py-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 border-b bg-muted/20">
          <a href="#section-krs" className="text-center hover:opacity-70 transition-opacity">
            <div className="flex items-center justify-center gap-1 text-success">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xl font-bold">{stats.krsCompleted}</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">KRs</p>
          </a>
          <a href="#section-krs" className="text-center hover:opacity-70 transition-opacity">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <SkipForward className="h-4 w-4" />
              <span className="text-xl font-bold">{stats.krsSkipped}</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pulados</p>
          </a>
          <a href="#section-kpis" className="text-center hover:opacity-70 transition-opacity">
            <div className="flex items-center justify-center gap-1 text-primary">
              <Activity className="h-4 w-4" />
              <span className="text-xl font-bold">{stats.kpisCompleted}</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">KPIs</p>
          </a>
          <a href="#section-projects" className="text-center hover:opacity-70 transition-opacity">
            <div className="flex items-center justify-center gap-1 text-status-blue">
              <FolderKanban className="h-4 w-4" />
              <span className="text-xl font-bold">{stats.milestoneChanges}</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Marcos</p>
          </a>
          <a href="#section-pendencies" className="text-center hover:opacity-70 transition-opacity">
            <div className="flex items-center justify-center gap-1 text-status-blue">
              <ClipboardCheck className="h-4 w-4" />
              <span className="text-xl font-bold">{stats.pendencies}</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pendências</p>
          </a>
          <a href="#section-blockers" className="text-center hover:opacity-70 transition-opacity">
            <div
              className={cn(
                'flex items-center justify-center gap-1',
                stats.withBlockers > 0 ? 'text-warning' : 'text-muted-foreground',
              )}
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xl font-bold">{stats.withBlockers}</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Bloqueadores</p>
          </a>
        </div>
      }
      footer={
        <WizardLastStepFooter
          showBack={!!onBack}
          onBack={onBack}
          backDisabled={isSubmitting}
          onPrimary={onClose}
          primaryLoading={isSubmitting}
        />
      }
    >
      <div className="p-4 md:p-6 space-y-8">
        {orderedSections.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhum bloco preenchido neste check-in.</p>
          </div>
        ) : (
          orderedSections.map((node, idx) => (
            <div key={idx}>
              {node}
              {idx < orderedSections.length - 1 && <Separator className="mt-8" />}
            </div>
          ))
        )}

        <Separator />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar resumo
          </Button>
          <Button variant="outline" size="sm" onClick={onViewOkrs}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver OKRs
          </Button>
        </div>
      </div>
    </WizardStepScaffold>
  );
}
