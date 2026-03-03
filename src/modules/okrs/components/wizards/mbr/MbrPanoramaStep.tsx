/**
 * MbrPanoramaStep - Etapa 1: Panorama Executivo
 * 
 * Visão consolidada da saúde do negócio via KPIs mestres.
 * KPIs agrupados por escopo: Global BU, por Área, por Time.
 * KPIs em risco (amarelo/vermelho) destacados no topo de cada grupo.
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AreaBadge } from '@/components/ui/area-badge';
import { BarChart3, TrendingUp, TrendingDown, Minus, AlertTriangle, Building2, Users, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardFirstStepFooter, InlineDecisionInput, LastCheckinBadge } from '../shared';
import type { MbrKpiSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface MbrPanoramaStepProps {
  kpiSnapshots: MbrKpiSnapshot[];
  onKpiSnapshotsChange: (snapshots: MbrKpiSnapshot[]) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  lastCompletedAt?: string | null;
  onContinue: () => void;
}

interface KpiGroup {
  key: string;
  label: string;
  kpis: MbrKpiSnapshot[];
  areaColor?: string | null;
}

// ============================================================
// HELPERS
// ============================================================

const RAG_PRIORITY: Record<string, number> = { red: 0, yellow: 1, green: 2 };

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
                {kpi.ragStatus === 'green' ? 'OK' : kpi.ragStatus === 'yellow' ? 'Atenção' : 'Crítico'}
              </Badge>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold">{kpi.currentValue ?? '—'}</p>
                <p className="text-xs text-muted-foreground">
                  Meta: {kpi.target ?? '—'}
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
}: MbrPanoramaStepProps) {
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
        description="Saúde consolidada do negócio"
        variant="primary"
        rightContent={
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary">{kpiSnapshots.length} KPIs</Badge>
            <LastCheckinBadge lastCompletedAt={lastCompletedAt ?? null} />
          </div>
        }
      />

      {/* Summary bar */}
      {atRiskCount > 0 && (
        <div className="px-6 py-3 border-b bg-status-amber/5">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-status-amber" />
            <span className="font-medium">{atRiskCount} KPI{atRiskCount !== 1 ? 's' : ''} em atenção</span>
          </div>
        </div>
      )}

      {/* KPI groups */}
      <div className="flex-1 overflow-y-auto p-6">
        {kpiSnapshots.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum KPI organizacional carregado. Os snapshots serão preenchidos conforme a integração.
          </p>
        ) : (
          <Accordion type="multiple" defaultValue={accordionDefaults} className="space-y-1">
            <ScopeSection
              icon={Building2}
              title="KPIs Globais da BU"
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
