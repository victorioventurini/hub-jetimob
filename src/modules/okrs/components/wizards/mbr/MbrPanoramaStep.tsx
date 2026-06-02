/**
 * MbrPanoramaStep - Etapa 1: Panorama Executivo
 * 
 * Visão consolidada da saúde do negócio:
 * - Bloco 1: Scorecard do mês (4 metric cards)
 * - Bloco 2: OKRs organizacionais com contribuições por time
 * - Bloco 3: Agenda da reunião (8 steps)
 * - KPIs mestres agrupados por escopo (existente, reposicionado)
 */

import { useState, useMemo, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AreaBadge } from '@/components/ui/area-badge';
import { formatPercent } from '@/modules/okrs/utils/formatPercent';
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
import { variationVsLast, variationVsTarget as deriveVariationVsTarget, classifyKpiDelta } from '@/modules/okrs/utils/kpiVariations';
import type { MbrKpiSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { OrgObjectiveWithKrs } from '@/modules/okrs/hooks/queries';
import { MbrPanoramaCurationCard } from './MbrPanoramaCurationCard';

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
  /** Slot opcional renderizado no topo do conteúdo (ex.: PreparationStatusCard) */
  topSlot?: ReactNode;
  /** Cobertura: quantos times submeteram pré-MBR neste mês */
  mbrPreSubmittedCount?: number;
  /** Sinalizações: quantos itens pedem decisão coletiva */
  mbrPreNeedsDecisionCount?: number;
  /** Dependências cross-team trazidas pelos times */
  mbrPreCrossDepCount?: number;
  /** Justificativas de KPI registradas no Pré-MBR */
  mbrPreKpiJustifCount?: number;
  /** KPIs cujo valor foi atualizado durante o Pré-MBR */
  mbrPreKpiUpdatedCount?: number;
  /** Justificativas de projeto/milestone atrasados no Pré-MBR */
  mbrPreProjectJustifCount?: number;
  /** Sugestões de pauta agregadas dos pré-MBRs dos times */
  mbrPreAgendaSuggestionCount?: number;
  /** Curadoria executiva opcional (Abertura Executiva curada por IA). */
  curation?: import('@/modules/okrs/types/wizard').MbrPanoramaCuration;
  onCurationChange?: (next: import('@/modules/okrs/types/wizard').MbrPanoramaCuration) => void;
  onGenerateCurationDraft?: () => void | Promise<void>;
  isGeneratingCuration?: boolean;
  onAddSuggestedDecision?: (title: string, category?: string) => void;
  /** Mapa teamId → nome (para badges em itens de pauta vindos de Pré-MBR). */
  teamNamesById?: Record<string, string>;
  /** Itens individuais surgidos no Pré-MBR (decisões pedidas, dependências cross-team). */
  mbrPreSurfacedItems?: Array<{
    key: string;
    teamId: string;
    kind: 'needs_decision' | 'cross_dependency';
    text: string;
  }>;
  /**
   * Submissões Pré-MBR por time. Usado para renderizar painel por time com
   * o que o líder preencheu (Acelerou / Travou / Decisão / Foco do mês).
   */
  mbrPreSubmissionsByTeam?: Record<string, {
    teamId: string;
    submittedByName?: string;
    highlights?: { accelerated?: string; blocked?: string; needsDecision?: string };
    nextSteps?: { focus?: string };
  }>;
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

function TrendIcon({ value, direction }: { value: number | null; direction?: 'up' | 'down' | null }) {
  const klass = classifyKpiDelta(value, direction);
  if (!klass || klass === 'flat') return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  if (klass === 'improvement') return <TrendingUp className="h-3.5 w-3.5 text-status-green" />;
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
              <KpiNameLink kpiId={kpi.kpiId} name={kpi.name} className="text-sm font-medium flex-1" />
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
              {(() => {
                const vsLast = variationVsLast(kpi.currentValue, kpi.previousValue);
                const vsTarget = deriveVariationVsTarget(kpi.currentValue, kpi.target);
                return (
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-1 justify-end">
                      <TrendIcon value={vsLast} direction={kpi.direction} />
                      <span className="text-xs">{formatVariation(vsLast)} vs mês ant.</span>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-xs text-muted-foreground">
                        {formatVariation(vsTarget)} vs meta
                      </span>
                    </div>
                  </div>
                );
              })()}
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
                <span className="text-xs text-muted-foreground shrink-0">{formatPercent(kr.progress)}</span>
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
                          <span className="text-muted-foreground shrink-0">{formatPercent(tkr.progress)}</span>
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
  topSlot,
  mbrPreSubmittedCount = 0,
  mbrPreNeedsDecisionCount = 0,
  mbrPreCrossDepCount = 0,
  mbrPreKpiJustifCount = 0,
  mbrPreKpiUpdatedCount = 0,
  mbrPreProjectJustifCount = 0,
  mbrPreAgendaSuggestionCount = 0,
  curation,
  onCurationChange,
  onGenerateCurationDraft,
  isGeneratingCuration = false,
  onAddSuggestedDecision,
  teamNamesById,
  mbrPreSurfacedItems = [],
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
        title="Panorama & Curadoria do MBR"
        tooltip="mbr-panorama"
        description="Saúde do mês e pauta consolidada da reunião"
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
          {topSlot}

          {curation && onCurationChange && (
            <MbrPanoramaCurationCard
              curation={curation}
              onCurationChange={onCurationChange}
              onGenerateDraft={onGenerateCurationDraft}
              isGenerating={isGeneratingCuration}
              onAddSuggestedDecision={onAddSuggestedDecision}
              teamNamesById={teamNamesById}
            />
          )}

          {/* ── Preparação dos Times (Pré-MBR) ── */}
          {mbrPreSubmittedCount > 0 && (() => {
            const needsDecisionItems = mbrPreSurfacedItems.filter((i) => i.kind === 'needs_decision');
            const crossDepItems = mbrPreSurfacedItems.filter((i) => i.kind === 'cross_dependency');
            const teamLabel = (teamId: string) =>
              teamNamesById?.[teamId] ?? `Time ${teamId.slice(0, 6)}`;
            return (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Preparação dos Times (Pré-MBR)
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{mbrPreSubmittedCount} times submeteram</Badge>
                  {mbrPreNeedsDecisionCount > 0 && (
                    <Badge variant="outline">{mbrPreNeedsDecisionCount} pedem decisão</Badge>
                  )}
                  {mbrPreCrossDepCount > 0 && (
                    <Badge variant="outline">{mbrPreCrossDepCount} dependências cross-team</Badge>
                  )}
                  {mbrPreKpiJustifCount > 0 && (
                    <Badge variant="outline">{mbrPreKpiJustifCount} justificativas de KPI</Badge>
                  )}
                  {mbrPreKpiUpdatedCount > 0 && (
                    <Badge variant="outline">{mbrPreKpiUpdatedCount} KPIs atualizados</Badge>
                  )}
                  {mbrPreProjectJustifCount > 0 && (
                    <Badge variant="outline">{mbrPreProjectJustifCount} justificativas de projeto</Badge>
                  )}
                  {mbrPreAgendaSuggestionCount > 0 && (
                    <Badge variant="outline">{mbrPreAgendaSuggestionCount} sugestões de pauta</Badge>
                  )}
                </div>

                {needsDecisionItems.length > 0 && (
                  <Card className="border-status-amber/30">
                    <CardContent className="p-3 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-status-amber" />
                        Times que pedem decisão
                      </p>
                      <ul className="space-y-2">
                        {needsDecisionItems.map((item) => (
                          <li key={item.key} className="flex gap-2 text-sm">
                            <Badge variant="secondary" className="shrink-0 h-fit">
                              {teamLabel(item.teamId)}
                            </Badge>
                            <span className="text-foreground/90 whitespace-pre-wrap">{item.text}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {crossDepItems.length > 0 && (
                  <Card>
                    <CardContent className="p-3 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        Dependências cross-team
                      </p>
                      <ul className="space-y-2">
                        {crossDepItems.map((item) => (
                          <li key={item.key} className="flex gap-2 text-sm">
                            <Badge variant="secondary" className="shrink-0 h-fit">
                              {teamLabel(item.teamId)}
                            </Badge>
                            <span className="text-foreground/90 whitespace-pre-wrap">{item.text}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}
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
