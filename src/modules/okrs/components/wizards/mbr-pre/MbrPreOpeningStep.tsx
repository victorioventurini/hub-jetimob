/**
 * MbrPreOpeningStep — Step 1 do Pré-MBR (Abertura)
 *
 * Análise mais profunda do mês:
 *   1. Saudação contextual + 3 stat tiles (KRs/KPIs/Projetos em atenção)
 *   2. Comparativo vs mês anterior — top KPIs que mais subiram/caíram
 *   3. Card "Análise IA do mês" — narrativa + destaques + ofensores +
 *      riscos + recomendações geradas pelo agente analista-estrategico
 *      (botão "Gerar análise"; resultado fica em cache no draft)
 */

import { useMemo, useCallback } from 'react';
import {
  Sparkles,
  TrendingUp,
  Activity,
  FolderKanban,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  ShieldAlert,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  RitualGreeting,
  ReferenceMonthPicker,
  WizardStepHeader,
  WizardStepScaffold,
} from '../shared';
import { WizardFirstStepFooter } from '../shared/WizardStepFooter';
import {
  defaultReferenceMonth,
  formatMonthLabel,
  formatMonthShort,
} from '@/modules/okrs/utils/mbr/referenceMonth';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useRitualGreetingContext,
  useMbrPreTeamProjects,
  useMbrPreMonthAnalysis,
} from '@/modules/okrs/hooks';
import type {
  MbrKpiSnapshot,
  MbrPreDraftData,
  MbrPreMonthAnalysis,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface MbrPreOpeningStepProps {
  teamId: string | null | undefined;
  teamName?: string | null;
  /** Display name do líder do time (sobrepõe `teamName` na saudação). */
  leaderName?: string | null;
  effectiveUserId?: string | null;
  cycleId?: string | null;
  isLoading?: boolean;
  /** Mês alvo da análise (`YYYY-MM`). Default: mês imediatamente anterior. */
  referenceMonth?: string;
  /** Handler ao trocar o mês alvo (deve invalidar análise IA cacheada). */
  onReferenceMonthChange?: (next: string) => void;
  krFinalStates: MbrPreDraftData['krFinalStates'];
  kpiSnapshots: MbrKpiSnapshot[];
  monthAnalysis?: MbrPreMonthAnalysis | null;
  onMonthAnalysisChange: (analysis: MbrPreMonthAnalysis | null) => void;
  onContinue: () => void;
}

// ============================================================
// HELPERS
// ============================================================

function formatKpiValue(value: number | null | undefined, unit?: string): string {
  if (value == null) return '—';
  const formatted = Math.abs(value) >= 1000
    ? value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
    : value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  if (!unit) return formatted;
  if (unit === '%') return `${formatted}%`;
  if (unit === 'R$') return `R$ ${formatted}`;
  return `${formatted} ${unit}`;
}

interface KpiDelta {
  kpiId: string;
  name: string;
  unit?: string;
  current: number | null;
  previous: number | null;
  deltaPct: number | null;
  ragStatus: string;
}

function computeKpiDeltas(kpis: MbrKpiSnapshot[]): {
  ups: KpiDelta[];
  downs: KpiDelta[];
  withoutComparison: number;
} {
  const deltas: KpiDelta[] = kpis.map((k) => {
    const deltaPct =
      k.previousValue != null && k.currentValue != null && k.previousValue !== 0
        ? ((k.currentValue - k.previousValue) / Math.abs(k.previousValue)) * 100
        : null;
    return {
      kpiId: k.kpiId,
      name: k.name,
      unit: k.unit,
      current: k.currentValue,
      previous: k.previousValue,
      deltaPct: deltaPct != null ? Math.round(deltaPct * 10) / 10 : null,
      ragStatus: k.ragStatus,
    };
  });

  const withDelta = deltas.filter((d) => d.deltaPct != null);
  const ups = [...withDelta]
    .filter((d) => (d.deltaPct ?? 0) > 0)
    .sort((a, b) => (b.deltaPct ?? 0) - (a.deltaPct ?? 0))
    .slice(0, 3);
  const downs = [...withDelta]
    .filter((d) => (d.deltaPct ?? 0) < 0)
    .sort((a, b) => (a.deltaPct ?? 0) - (b.deltaPct ?? 0))
    .slice(0, 3);

  return {
    ups,
    downs,
    withoutComparison: deltas.length - withDelta.length,
  };
}

// ============================================================
// SUBCOMPONENTS
// ============================================================

interface StatTileProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  total: number;
  tone: 'attention' | 'neutral' | 'ok';
}

function StatTile({ icon: Icon, label, value, total, tone }: StatTileProps) {
  const accent =
    tone === 'attention' && value > 0
      ? 'border-status-amber/40 bg-status-amber-muted/40'
      : tone === 'ok' && total > 0
        ? 'border-status-green/30 bg-status-green-muted/30'
        : 'border-border bg-card';

  return (
    <div className={cn('rounded-lg border p-3 flex items-start gap-3 min-w-0', accent)}>
      <Icon className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-base font-semibold text-foreground">
          {value}
          <span className="text-xs text-muted-foreground font-normal"> / {total}</span>
        </p>
      </div>
    </div>
  );
}

function KpiDeltaRow({ delta, direction }: { delta: KpiDelta; direction: 'up' | 'down' }) {
  const Icon = direction === 'up' ? ArrowUpRight : ArrowDownRight;
  const color = direction === 'up' ? 'text-status-green' : 'text-status-red';

  return (
    <div className="flex items-center justify-between gap-3 py-1.5 min-w-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Icon className={cn('h-4 w-4 shrink-0', color)} />
        <span className="text-sm text-foreground truncate">{delta.name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0 text-xs">
        <span className="text-muted-foreground">
          {formatKpiValue(delta.previous, delta.unit)} → {formatKpiValue(delta.current, delta.unit)}
        </span>
        <span className={cn('font-semibold', color)}>
          {(delta.deltaPct ?? 0) > 0 ? '+' : ''}
          {delta.deltaPct?.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

interface AnalysisListProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{ title: string; detail: string }>;
  toneClass: string;
}

function AnalysisList({ title, icon: Icon, items, toneClass }: AnalysisListProps) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', toneClass)} />
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </div>
      <ul className="space-y-2 pl-6">
        {items.map((item, idx) => (
          <li key={idx} className="text-sm">
            <p className="font-medium text-foreground">{item.title}</p>
            <p className="text-muted-foreground">{item.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export function MbrPreOpeningStep({
  teamId,
  teamName,
  leaderName,
  effectiveUserId = null,
  isLoading,
  referenceMonth: referenceMonthProp,
  onReferenceMonthChange,
  krFinalStates,
  kpiSnapshots,
  monthAnalysis,
  onMonthAnalysisChange,
  onContinue,
}: MbrPreOpeningStepProps) {
  const referenceMonth = referenceMonthProp || defaultReferenceMonth();
  const { isWildcard: canChangeReferenceMonth } = usePermissions();
  const greeting = useRitualGreetingContext({
    ritualSlug: 'mbr-pre',
    effectiveUserId,
  });

  // ── Badges ancorados no mês de referência (não em "hoje") ──
  // O Pré-MBR analisa um mês fechado, então `monthLabel` e `monthInQuarter`
  // devem refletir esse mês — não o mês corrente em que o rito é executado.
  const { monthLabelForGreeting, monthInQuarterForGreeting } = useMemo(() => {
    const m = /^(\d{4})-(\d{2})$/.exec(referenceMonth);
    if (!m) {
      return {
        monthLabelForGreeting: greeting.monthLabel ?? null,
        monthInQuarterForGreeting: greeting.monthInQuarter ?? null,
      };
    }
    const year = Number(m[1]);
    const monthNum = Number(m[2]); // 1..12
    const monthInQuarter = (((monthNum - 1) % 3) + 1) as 1 | 2 | 3;
    return {
      monthLabelForGreeting: `${formatMonthShort(referenceMonth)} ${year}`,
      monthInQuarterForGreeting: monthInQuarter,
    };
  }, [referenceMonth, greeting.monthLabel, greeting.monthInQuarter]);

  const {
    projects,
    overdueProjectIds,
    overdueMilestoneIds,
    isLoading: loadingProjects,
  } = useMbrPreTeamProjects(teamId, referenceMonth);

  const { isGenerating, error: genError, generate } = useMbrPreMonthAnalysis();

  const stats = useMemo(() => {
    const krsTotal = krFinalStates.length;
    const krsAttention = krFinalStates.filter((kr) => {
      const s = (kr.state ?? '').toLowerCase();
      return s.includes('risk') || s.includes('off') || s.includes('stagnant');
    }).length;

    const kpisTotal = kpiSnapshots.length;
    const kpisAttention = kpiSnapshots.filter(
      (k) => k.ragStatus === 'red' || k.ragStatus === 'yellow',
    ).length;

    const projectsTotal = projects.length;
    const projectsAttention = overdueProjectIds.length + overdueMilestoneIds.length;

    return {
      krsTotal, krsAttention,
      kpisTotal, kpisAttention,
      projectsTotal, projectsAttention,
    };
  }, [krFinalStates, kpiSnapshots, projects.length, overdueProjectIds.length, overdueMilestoneIds.length]);

  const kpiDeltas = useMemo(() => computeKpiDeltas(kpiSnapshots), [kpiSnapshots]);

  const overdueProjectsForAi = useMemo(() => {
    const overdueIdSet = new Set(overdueProjectIds);
    const overdueMilestoneSet = new Set(overdueMilestoneIds);
    const items: Array<{ name: string; reason: string }> = [];
    for (const p of projects) {
      if (overdueIdSet.has(p.id)) {
        items.push({ name: p.name, reason: 'projeto atrasado' });
      }
      for (const m of p.milestones) {
        if (overdueMilestoneSet.has(m.id)) {
          items.push({ name: p.name, reason: `marco atrasado: ${m.name}` });
        }
      }
    }
    return items;
  }, [projects, overdueProjectIds, overdueMilestoneIds]);

  // referenceMonth agora vem da prop (default = mês imediatamente anterior).

  const handleGenerate = useCallback(async () => {
    if (!teamName) {
      toast.error('Time não selecionado.');
      return;
    }
    const result = await generate({
      teamName,
      referenceMonth,
      krFinalStates,
      kpis: kpiSnapshots,
      overdueProjects: overdueProjectsForAi,
    });
    if (result) {
      onMonthAnalysisChange(result);
      toast.success('Análise gerada.');
    } else {
      toast.error('Não foi possível gerar a análise. Tente novamente.');
    }
  }, [
    teamName,
    referenceMonth,
    krFinalStates,
    kpiSnapshots,
    overdueProjectsForAi,
    generate,
    onMonthAnalysisChange,
  ]);

  const showLoading = !!isLoading || loadingProjects;
  const hasComparisonData = kpiDeltas.ups.length + kpiDeltas.downs.length > 0;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Sparkles}
          title="Abertura"
          tooltip="team-opening"
          description="Análise do mês — panorama, comparativo e leitura IA antes de começar"
          variant="purple"
        />
      }
      footer={<WizardFirstStepFooter primaryLabel="Começar" onPrimary={onContinue} />}
    >
      <div className="p-4 md:p-6 space-y-6 min-w-0 max-w-full">
        <RitualGreeting
          ritualSlug="mbr-pre"
          userName={teamName ?? null}
          displayName={leaderName ?? teamName ?? null}
          phraseVars={{
            teamName: teamName ?? '',
            monthShort: formatMonthShort(referenceMonth),
          }}
          cycleName={greeting.cycleName}
          weekNumber={greeting.weekNumber}
          checkInOrdinal={greeting.checkInOrdinal}
          monthLabel={monthLabelForGreeting}
          monthInQuarter={monthInQuarterForGreeting}
        />

        {/* ─── Seletor do mês alvo ─── */}
        {onReferenceMonthChange && canChangeReferenceMonth ? (
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium text-foreground">
              Analisando o mês de
            </label>
            <ReferenceMonthPicker
              value={referenceMonth}
              onChange={onReferenceMonthChange}
              className="w-[220px]"
            />
            <span className="text-xs text-muted-foreground">
              Default: mês fechado anterior. Trocar regenera os dados.
            </span>
          </div>
        ) : (
          <p className="text-sm font-medium text-foreground">
            Analisando o mês de{' '}
            <span className="font-semibold capitalize">
              {formatMonthLabel(referenceMonth)}
            </span>
          </p>
        )}

        {/* ─── 1. Resumo do mês (tiles) ─── */}
        {showLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Resumo de {formatMonthLabel(referenceMonth)}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatTile icon={TrendingUp} label="KRs em atenção" value={stats.krsAttention} total={stats.krsTotal} tone="attention" />
              <StatTile icon={Activity} label="KPIs fora da meta" value={stats.kpisAttention} total={stats.kpisTotal} tone="attention" />
              <StatTile icon={FolderKanban} label="Itens de projeto atrasados" value={stats.projectsAttention} total={stats.projectsTotal} tone="attention" />
            </div>
          </div>
        )}

        {/* ─── 2. Comparativo vs mês anterior ─── */}
        {!showLoading && hasComparisonData && (
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Comparativo vs mês anterior
              </p>
              {kpiDeltas.withoutComparison > 0 && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  {kpiDeltas.withoutComparison} sem dado anterior
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <p className="text-xs font-semibold text-status-green mb-1">Maiores avanços</p>
                {kpiDeltas.ups.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhum KPI subiu este mês.</p>
                ) : (
                  kpiDeltas.ups.map((d) => <KpiDeltaRow key={d.kpiId} delta={d} direction="up" />)
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-status-red mb-1">Maiores quedas</p>
                {kpiDeltas.downs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhum KPI caiu este mês.</p>
                ) : (
                  kpiDeltas.downs.map((d) => <KpiDeltaRow key={d.kpiId} delta={d} direction="down" />)
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── 3. Análise IA ─── */}
        {!showLoading && (
          <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-2 min-w-0">
                <Brain className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">
                    Análise IA do mês
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Leitura executiva gerada a partir dos KRs, KPIs e projetos do time.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant={monthAnalysis ? 'outline' : 'default'}
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                    Gerando…
                  </>
                ) : monthAnalysis ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                    Gerar novamente
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-2" />
                    Gerar análise
                  </>
                )}
              </Button>
            </div>

            {genError && !isGenerating && (
              <p className="text-xs text-status-red">
                {genError}
              </p>
            )}

            {!monthAnalysis && !isGenerating && !genError && (
              <p className="text-xs text-muted-foreground italic">
                Clique em "Gerar análise" para receber um resumo executivo, destaques,
                ofensores, riscos e recomendações automáticas com base nos dados do mês.
              </p>
            )}

            {monthAnalysis && (
              <div className="space-y-4 pt-2">
                {monthAnalysis.summary && (
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {monthAnalysis.summary}
                  </p>
                )}

                <AnalysisList
                  title="Destaques"
                  icon={CheckCircle2}
                  items={monthAnalysis.highlights}
                  toneClass="text-status-green"
                />
                <AnalysisList
                  title="Ofensores"
                  icon={AlertTriangle}
                  items={monthAnalysis.offenders}
                  toneClass="text-status-red"
                />
                <AnalysisList
                  title="Riscos para o próximo mês"
                  icon={ShieldAlert}
                  items={monthAnalysis.risks}
                  toneClass="text-status-amber"
                />

                {monthAnalysis.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold text-foreground">Recomendações</h4>
                    </div>
                    <ul className="space-y-1 pl-6 list-disc text-sm text-foreground">
                      {monthAnalysis.recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground pt-1">
                  Gerado em {new Date(monthAnalysis.generatedAt).toLocaleString('pt-BR')} ·
                  análise reflexiva — revise antes de levar ao MBR.
                </p>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Esta é uma visão reflexiva. Você não vai atualizar valores aqui — só
          olhar o que precisa de justificativa nos próximos passos.
        </p>
      </div>
    </WizardStepScaffold>
  );
}
