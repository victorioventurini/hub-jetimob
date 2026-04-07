/**
 * MbrPanoramaStep - Etapa 1: Panorama Executivo
 * 
 * Visão consolidada da saúde do negócio:
 * - Bloco 1: Scorecard do mês (4 metric cards)
 * - Bloco 2: OKRs organizacionais com contribuições por time
 * - Bloco 3: Agenda da reunião (8 steps)
 * - KPIs mestres agrupados por escopo (existente, reposicionado)
 */

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AreaBadge } from '@/components/ui/area-badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  BarChart3, TrendingUp, TrendingDown, Minus, AlertTriangle, Building2,
  Users, Layers, RefreshCw, Target, Activity, ListChecks, ChevronDown,
  CheckCircle2, XCircle,
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { KpiNameLink } from '@/modules/kpis/components/KpiNameLink';
import { WizardStepHeader, WizardFirstStepFooter, InlineDecisionInput, LastCheckinBadge, TeamKrsToggle, KpiStatusBlocks } from '../shared';
import { OkrProgressBar } from '../../OkrProgressBar';
import { OkrStatusBadge } from '../../OkrStatusBadge';
import { formatValueWithUnit } from '@/shared/constants/units';
import type { MbrKpiSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { OrgObjectiveWithKrs } from '@/modules/okrs/hooks/queries/aggregateTypes';

// ============================================================
// TYPES
// ============================================================

export interface MbrScorecardMetrics {
  healthy: number;
  atRisk: number;
  offTrack: number;
  noSubmission: number;
}

export interface MbrPanoramaStepProps {
  kpiSnapshots: MbrKpiSnapshot[];
  onKpiSnapshotsChange: (snapshots: MbrKpiSnapshot[]) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  lastCompletedAt?: string | null;
  onContinue: () => void;
  buName?: string;
  /** v1.2: Scorecard metrics */
  scorecardMetrics?: MbrScorecardMetrics;
  /** v1.2: Org objectives with team contributions */
  orgObjectives?: OrgObjectiveWithKrs[];
  /** v1.2: Current step index for agenda */
  currentStepIndex?: number;
}

interface KpiGroup {
  key: string;
  label: string;
  kpis: MbrKpiSnapshot[];
  areaColor?: string | null;
}

// ============================================================
// CONSTANTS
// ============================================================

const MBR_AGENDA = [
  { title: 'Panorama executivo', subtitle: 'Saúde do negócio' },
  { title: 'KPI Gate estratégico', subtitle: 'KPIs críticos' },
  { title: 'Visão geral dos times', subtitle: 'Consolidado' },
  { title: 'Análise detalhada por time', subtitle: 'Drill-down' },
  { title: 'OKRs organizacionais', subtitle: 'Prioridades' },
  { title: 'Decisões estratégicas', subtitle: 'Consolidação' },
  { title: 'Follow-up do QBR', subtitle: 'Decisões pendentes' },
  { title: 'Encerramento', subtitle: 'Governança' },
];

const AGG_STATUS_CONFIG = {
  on_track: { label: 'No ritmo', className: 'bg-status-green-muted text-status-green' },
  at_risk: { label: 'Em risco', className: 'bg-status-yellow-muted text-status-yellow' },
  off_track: { label: 'Fora da meta', className: 'bg-status-red-muted text-status-red' },
} as const;

// ============================================================
// HELPERS
// ============================================================

const RAG_PRIORITY: Record<string, number> = { red: 0, yellow: 1, green: 2, no_data: 3 };

function sortByRag(kpis: MbrKpiSnapshot[]): MbrKpiSnapshot[] {
  return [...kpis].sort(
    (a, b) => (RAG_PRIORITY[a.ragStatus] ?? 3) - (RAG_PRIORITY[b.ragStatus] ?? 3)
  );
}

function ragBadgeClass(rag: string) {
  switch (rag) {
    case 'green': return 'bg-status-green-muted text-status-green';
    case 'yellow': return 'bg-status-yellow-muted text-status-yellow';
    case 'red': return 'bg-status-red-muted text-status-red';
    case 'no_data': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
}

function TrendIcon({ value }: { value: number | null }) {
  if (!value || value === 0) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  if (value > 0) return <TrendingUp className="h-3.5 w-3.5 text-status-green" />;
  return <TrendingDown className="h-3.5 w-3.5 text-status-red" />;
}

function formatVariation(value: number | null) {
  if (value === null || value === undefined) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function KpiLastUpdateLabel({ date }: { date?: string | null }) {
  if (!date) return (
    <div className="inline-flex items-center gap-1 text-xs text-muted-foreground/60">
      <RefreshCw className="h-3 w-3" />
      <span>Sem registro</span>
    </div>
  );
  const relative = formatDistanceToNow(parseISO(date), { addSuffix: true, locale: ptBR });
  return (
    <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <RefreshCw className="h-3 w-3" />
      <span>Atualizado {relative}</span>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function KpiCardGrid({ kpis }: { kpis: MbrKpiSnapshot[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {kpis.map((kpi) => (
        <Card key={kpi.kpiId} className={cn(
          'transition-colors',
          kpi.ragStatus === 'red' && 'border-status-red/30',
          kpi.ragStatus === 'yellow' && 'border-status-amber/30',
        )}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium truncate flex-1">{kpi.name}</p>
              <Badge variant="secondary" className={cn('text-xs ml-2', ragBadgeClass(kpi.ragStatus))}>
                {kpi.ragStatus === 'green' ? 'OK' : kpi.ragStatus === 'yellow' ? 'Atenção' : kpi.ragStatus === 'red' ? 'Crítico' : 'Sem dados'}
              </Badge>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {kpi.currentValue != null ? formatValueWithUnit(kpi.currentValue, kpi.unit ?? '%') : '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Meta: {kpi.target != null ? formatValueWithUnit(kpi.target, kpi.unit ?? '%') : '—'}
                </p>
              </div>
              <div className="text-right space-y-1">
                <div className="flex items-center gap-1 justify-end">
                  <TrendIcon value={kpi.variationVsLastMonth} />
                  <span className="text-xs">{formatVariation(kpi.variationVsLastMonth)} vs mês ant.</span>
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <span className="text-xs text-muted-foreground">
                    {formatVariation(kpi.variationVsTarget)} vs meta
                  </span>
                </div>
              </div>
            </div>
            <KpiLastUpdateLabel date={kpi.lastValueAt} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ScopeSection({ 
  icon: Icon, 
  title, 
  count, 
  groups, 
  accordionValue 
}: { 
  icon: React.ElementType; 
  title: string; 
  count: number; 
  groups: KpiGroup[]; 
  accordionValue: string;
}) {
  if (groups.length === 0) return null;

  const hasSingleGroup = groups.length === 1 && !groups[0].label;

  return (
    <AccordionItem value={accordionValue} className="border-none">
      <AccordionTrigger className="py-3 hover:no-underline">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">{title}</span>
          <Badge variant="secondary" className="text-xs">{count}</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-2">
        {hasSingleGroup ? (
          <KpiCardGrid kpis={groups[0].kpis} />
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  {group.areaColor ? (
                    <AreaBadge area={{ name: group.label, color: group.areaColor }} size="sm" />
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">{group.label}</span>
                  )}
                  <span className="text-xs text-muted-foreground">({group.kpis.length})</span>
                </div>
                <KpiCardGrid kpis={group.kpis} />
              </div>
            ))}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

/** Collapsible card for an org objective with team contributions */
function OrgObjectiveCard({ objective, showTeamKrs }: { objective: OrgObjectiveWithKrs; showTeamKrs: boolean }) {
  const [open, setOpen] = useState(false);
  const statusConfig = AGG_STATUS_CONFIG[objective.aggregatedStatus] ?? AGG_STATUS_CONFIG.on_track;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
          <Target className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium truncate flex-1 text-left">{objective.title}</span>
          <Badge variant="secondary" className={cn('text-xs shrink-0', statusConfig.className)}>
            {statusConfig.label}
          </Badge>
          <span className="text-xs text-muted-foreground shrink-0">{objective.aggregatedProgress}%</span>
          <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-6 pr-3 py-2 space-y-3">
          {objective.orgKrs.map((kr) => (
            <div key={kr.id} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <OkrStatusBadge status={kr.status} type="kr" className="shrink-0 text-[10px]" />
                <span className="text-xs truncate flex-1">{kr.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">{kr.progress}%</span>
              </div>
              <OkrProgressBar
                baseline={kr.baseline}
                current={kr.current_value}
                target={kr.target}
                direction={kr.direction}
                status={kr.status}
                unit={kr.unit}
                size="sm"
                showLabels={false}
              />
              {/* Team contributions */}
              {showTeamKrs && (
                kr.linkedTeamKrs.length > 0 ? (
                  <div className="pl-2 space-y-1">
                    {kr.linkedTeamKrs.map((tkr) => {
                      const s = String(tkr.status);
                      const teamStatus = s === 'on_track' ? '✅' : s === 'at_risk' ? '🟡' : s === 'off_track' ? '🔴' : '⚪';
                      return (
                        <div key={tkr.id} className="flex items-center gap-2 text-xs">
                          <span>{teamStatus}</span>
                          <span className="font-medium truncate">{tkr.team_name}</span>
                          <span className="text-muted-foreground truncate flex-1">{tkr.title}</span>
                          <span className="text-muted-foreground shrink-0">{tkr.progress}%</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground pl-2">
                    ⚪ Sem cobertura de times neste ciclo
                  </p>
                )
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export function MbrPanoramaStep({
  kpiSnapshots,
  onKpiSnapshotsChange,
  decisions,
  onDecisionsChange,
  lastCompletedAt,
  onContinue,
  buName,
  scorecardMetrics,
  orgObjectives,
  currentStepIndex = 0,
}: MbrPanoramaStepProps) {
  const [showTeamKrs, setShowTeamKrs] = useState(true);
  // Group KPIs by scope
  const { orgKpis, areaGroups, teamGroups, accordionDefaults } = useMemo(() => {
    const org: MbrKpiSnapshot[] = [];
    const areaMap = new Map<string, { kpis: MbrKpiSnapshot[]; color: string | null }>();
    const teamMap = new Map<string, MbrKpiSnapshot[]>();

    for (const kpi of kpiSnapshots) {
      const scope = kpi.scope ?? 'org';
      if (scope === 'area' && kpi.areaName) {
        const key = kpi.areaId || kpi.areaName;
        if (!areaMap.has(key)) areaMap.set(key, { kpis: [], color: kpi.areaColor ?? null });
        areaMap.get(key)!.kpis.push(kpi);
      } else if (scope === 'team' && kpi.teamName) {
        const key = kpi.teamId || kpi.teamName;
        if (!teamMap.has(key)) teamMap.set(key, []);
        teamMap.get(key)!.push(kpi);
      } else {
        org.push(kpi);
      }
    }

    const areaGrps: KpiGroup[] = Array.from(areaMap.entries()).map(([key, val]) => ({
      key,
      label: val.kpis[0]?.areaName || key,
      kpis: sortByRag(val.kpis),
      areaColor: val.color,
    }));

    const teamGrps: KpiGroup[] = Array.from(teamMap.entries()).map(([key, kpis]) => ({
      key,
      label: kpis[0]?.teamName || key,
      kpis: sortByRag(kpis),
    }));

    const defaults: string[] = [];
    if (org.length > 0) defaults.push('scope-org');
    if (areaGrps.length > 0) defaults.push('scope-area');
    if (teamGrps.length > 0) defaults.push('scope-team');

    return {
      orgKpis: sortByRag(org),
      areaGroups: areaGrps,
      teamGroups: teamGrps,
      accordionDefaults: defaults,
    };
  }, [kpiSnapshots]);

  const atRiskCount = kpiSnapshots.filter(k => k.ragStatus === 'red' || k.ragStatus === 'yellow').length;

  const orgGroupForSection: KpiGroup[] = orgKpis.length > 0
    ? [{ key: 'org', label: '', kpis: orgKpis }]
    : [];

  return (
    <div className="flex flex-col h-full">
      <WizardStepHeader
        icon={BarChart3}
        title="Panorama Executivo"
        tooltip="mbr-panorama"
        description="Saúde consolidada do negócio"
        variant="primary"
        rightContent={
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary">{kpiSnapshots.length} KPIs</Badge>
            <LastCheckinBadge lastCompletedAt={lastCompletedAt ?? null} />
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* ── Bloco 1: Scorecard do mês ── */}
          {scorecardMetrics && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Scorecard do Mês
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-status-green/30">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-status-green">{scorecardMetrics.healthy}</p>
                    <p className="text-xs text-muted-foreground">No ritmo</p>
                  </CardContent>
                </Card>
                <Card className="border-status-amber/30">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-status-amber">{scorecardMetrics.atRisk}</p>
                    <p className="text-xs text-muted-foreground">Em risco</p>
                  </CardContent>
                </Card>
                <Card className="border-status-red/30">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-status-red">{scorecardMetrics.offTrack}</p>
                    <p className="text-xs text-muted-foreground">Fora da meta</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-muted-foreground">{scorecardMetrics.noSubmission}</p>
                    <p className="text-xs text-muted-foreground">Sem Pré-MBR</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ── Bloco 2: OKRs da empresa neste mês ── */}
          {orgObjectives && orgObjectives.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold">OKRs da Empresa</h4>
                <TeamKrsToggle visible={showTeamKrs} onToggle={() => setShowTeamKrs(v => !v)} />
              </div>
              <div className="space-y-2">
                {orgObjectives.map((obj) => (
                  <OrgObjectiveCard key={obj.id} objective={obj} showTeamKrs={showTeamKrs} />
                ))}
              </div>
            </div>
          )}

          {/* ── Bloco 3: Agenda da reunião ── */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              Agenda da Reunião
            </h4>
            <div className="space-y-1">
              {MBR_AGENDA.map((item, i) => {
                const isCurrent = i === currentStepIndex;
                const isDone = i < currentStepIndex;
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                      isCurrent && 'bg-primary/10 font-medium',
                      isDone && 'text-muted-foreground',
                    )}
                  >
                    <span className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0',
                      isCurrent ? 'bg-primary text-primary-foreground' : isDone ? 'bg-muted' : 'bg-muted/50',
                    )}>
                      {isDone ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                    </span>
                    <span className="flex-1">{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                    {isCurrent && <span className="text-xs text-primary">← atual</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── KPIs (conteúdo existente, reposicionado) ── */}
          {atRiskCount > 0 && (
            <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-status-amber/5 border border-status-amber/20">
              <AlertTriangle className="h-4 w-4 text-status-amber" />
              <span className="font-medium">{atRiskCount} KPI{atRiskCount !== 1 ? 's' : ''} em atenção</span>
            </div>
          )}

          {/* KPIs desatualizados e pendentes */}
          <KpiStatusBlocks kpiSnapshots={kpiSnapshots} />

          {kpiSnapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum KPI organizacional carregado. Os snapshots serão preenchidos conforme a integração.
            </p>
          ) : (
            <Accordion type="multiple" defaultValue={accordionDefaults} className="space-y-1">
              <ScopeSection
                icon={Building2}
                title={buName ? `KPIs Globais da ${buName}` : 'KPIs Globais da BU'}
                count={orgKpis.length}
                groups={orgGroupForSection}
                accordionValue="scope-org"
              />
              <ScopeSection
                icon={Layers}
                title="KPIs por Área"
                count={areaGroups.reduce((s, g) => s + g.kpis.length, 0)}
                groups={areaGroups}
                accordionValue="scope-area"
              />
              <ScopeSection
                icon={Users}
                title="KPIs por Time"
                count={teamGroups.reduce((s, g) => s + g.kpis.length, 0)}
                groups={teamGroups}
                accordionValue="scope-team"
              />
            </Accordion>
          )}
        </div>
      </div>

      {/* Inline decisions */}
      <div className="border-t">
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="panorama"
          placeholder="Nota ou decisão sobre o panorama geral..."
        />
      </div>

      <WizardFirstStepFooter
        primaryLabel="Analisar KPIs Críticos"
        onPrimary={onContinue}
      />
    </div>
  );
}
