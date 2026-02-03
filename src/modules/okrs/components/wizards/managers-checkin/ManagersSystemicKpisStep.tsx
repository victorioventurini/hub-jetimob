/**
 * ManagersSystemicKpisStep - Etapa de Indicadores Sistêmicos no Wizard Managers
 * 
 * v2.83.0: Nova seção para visão cross-team de KPIs
 * - Indicadores de eficiência operacional
 * - KPIs que atravessam times/áreas
 * - Padrões e tendências sistêmicas
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  BarChart3,
  Network,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter } from '../shared';
import { AskToVicStepHelper } from '@/modules/vic/components/AskToVic';
import { RAG_STATUS_COLORS } from '@/lib/colors';
import type { KpiForWizardV2 } from '@/modules/kpis/types';

// ============================================================
// TYPES
// ============================================================

export interface SystemicKpiGroup {
  category: 'efficiency' | 'health' | 'cross-team';
  label: string;
  description: string;
  kpis: KpiForWizardV2[];
}

export interface ManagersSystemicKpisStepProps {
  kpisStrategic: KpiForWizardV2[];
  kpisInAlert: KpiForWizardV2[];
  markedForFollowup?: string[];
  onMarkForFollowup?: (kpiId: string) => void;
  isLoading?: boolean;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// HELPERS
// ============================================================

const CATEGORY_CONFIG: Record<SystemicKpiGroup['category'], {
  icon: typeof BarChart3;
  className: string;
}> = {
  efficiency: {
    icon: Target,
    className: 'text-primary',
  },
  health: {
    icon: TrendingUp,
    className: 'text-success',
  },
  'cross-team': {
    icon: Network,
    className: 'text-status-purple',
  },
};

const RAG_CONFIG = {
  on_track: { label: 'No caminho', className: RAG_STATUS_COLORS.green.badge },
  at_risk: { label: 'Em risco', className: RAG_STATUS_COLORS.yellow.badge },
  off_track: { label: 'Fora da meta', className: RAG_STATUS_COLORS.red.badge },
  no_data: { label: 'Sem dados', className: 'bg-muted text-muted-foreground' },
};

function getTrendIcon(kpi: KpiForWizardV2) {
  if (kpi.latest_value === null || kpi.target_value === null) {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
  const percentOfTarget = (kpi.latest_value / kpi.target_value) * 100;
  if (percentOfTarget >= 100) {
    return <TrendingUp className="h-4 w-4 text-success" />;
  }
  if (percentOfTarget < 70) {
    return <TrendingDown className="h-4 w-4 text-destructive" />;
  }
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function groupKpisByCategory(kpis: KpiForWizardV2[]): SystemicKpiGroup[] {
  const groups: SystemicKpiGroup[] = [];

  // Efficiency KPIs (scope = 'org' or tagged as efficiency)
  const efficiencyKpis = kpis.filter(k => 
    k.scope === 'org' || k.name.toLowerCase().includes('eficiência')
  );
  if (efficiencyKpis.length > 0) {
    groups.push({
      category: 'efficiency',
      label: 'Eficiência Operacional',
      description: 'Indicadores de produtividade e eficiência da operação',
      kpis: efficiencyKpis,
    });
  }

  // Health KPIs (NPS, churn, satisfaction)
  const healthKeywords = ['nps', 'churn', 'satisfação', 'health', 'retenção'];
  const healthKpis = kpis.filter(k => 
    healthKeywords.some(keyword => k.name.toLowerCase().includes(keyword))
  );
  if (healthKpis.length > 0) {
    groups.push({
      category: 'health',
      label: 'Saúde do Negócio',
      description: 'Indicadores de saúde e sustentabilidade',
      kpis: healthKpis,
    });
  }

  // Cross-team KPIs (scope = 'area' or linked to multiple teams)
  const crossTeamKpis = kpis.filter(k => 
    k.scope === 'area' || (k.linkedKrIds && k.linkedKrIds.length > 1)
  );
  if (crossTeamKpis.length > 0) {
    groups.push({
      category: 'cross-team',
      label: 'Dependências Cross-Team',
      description: 'Indicadores que atravessam múltiplas áreas',
      kpis: crossTeamKpis,
    });
  }

  // If no categorization, group all as efficiency
  if (groups.length === 0 && kpis.length > 0) {
    groups.push({
      category: 'efficiency',
      label: 'Indicadores Sistêmicos',
      description: 'Visão consolidada dos indicadores organizacionais',
      kpis: kpis,
    });
  }

  return groups;
}

// ============================================================
// COMPONENT
// ============================================================

export function ManagersSystemicKpisStep({
  kpisStrategic,
  kpisInAlert,
  markedForFollowup = [],
  onMarkForFollowup,
  isLoading,
  onContinue,
  onBack,
}: ManagersSystemicKpisStepProps) {
  // Combine and deduplicate KPIs
  const allKpis = useMemo(() => {
    const kpiMap = new Map<string, KpiForWizardV2>();
    [...kpisStrategic, ...kpisInAlert].forEach(kpi => {
      if (!kpiMap.has(kpi.id)) {
        kpiMap.set(kpi.id, kpi);
      }
    });
    return Array.from(kpiMap.values());
  }, [kpisStrategic, kpisInAlert]);

  const groups = useMemo(() => groupKpisByCategory(allKpis), [allKpis]);

  const stats = useMemo(() => ({
    total: allKpis.length,
    inAlert: kpisInAlert.length,
    onTrack: allKpis.filter(k => k.latest_rag_status === 'on_track').length,
    improving: allKpis.filter(k => k.latest_value !== null && k.target_value !== null && k.latest_value >= k.target_value).length,
  }), [allKpis, kpisInAlert]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <WizardStepHeader
        icon={Building2}
        title="Indicadores Sistêmicos"
        description="Visão cross-team de KPIs estratégicos"
        variant="purple"
        rightContent={
          <AskToVicStepHelper
            context={{
              module: 'okrs',
              wizard: 'managers-checkin',
              step: 'panorama', // Using panorama as fallback for now
              userRole: 'gestor',
              additionalData: {
                totalKpis: stats.total,
                inAlert: stats.inAlert,
              },
            }}
          />
        }
      />

      {/* Stats Summary */}
      <div className="px-6 py-4 border-b bg-muted/30 grid grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="text-center">
          <p className={cn("text-2xl font-bold", stats.onTrack > 0 && "text-success")}>
            {stats.onTrack}
          </p>
          <p className="text-xs text-muted-foreground">No caminho</p>
        </div>
        <div className="text-center">
          <p className={cn("text-2xl font-bold", stats.inAlert > 0 && "text-destructive")}>
            {stats.inAlert}
          </p>
          <p className="text-xs text-muted-foreground">Em alerta</p>
        </div>
        <div className="text-center">
          <p className={cn("text-2xl font-bold", stats.improving > 0 && "text-primary")}>
            {stats.improving}
          </p>
          <p className="text-xs text-muted-foreground">Atingindo meta</p>
        </div>
      </div>

      {/* KPI Groups */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {groups.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h4 className="font-medium">Nenhum indicador sistêmico</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Não há KPIs organizacionais ou de área para exibir.
              </p>
            </div>
          ) : (
            groups.map((group) => {
              const CategoryIcon = CATEGORY_CONFIG[group.category].icon;
              const iconClass = CATEGORY_CONFIG[group.category].className;

              return (
                <div key={group.category} className="space-y-3">
                  {/* Group Header */}
                  <div className="flex items-center gap-2">
                    <CategoryIcon className={cn('h-5 w-5', iconClass)} />
                    <div className="flex-1">
                      <h4 className="font-medium">{group.label}</h4>
                      <p className="text-xs text-muted-foreground">{group.description}</p>
                    </div>
                    <Badge variant="secondary">{group.kpis.length}</Badge>
                  </div>

                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.kpis.map((kpi) => {
                      const ragConfig = RAG_CONFIG[kpi.latest_rag_status];
                      const progress = kpi.target_value && kpi.latest_value !== null
                        ? Math.min((kpi.latest_value / kpi.target_value) * 100, 100)
                        : 0;

                      return (
                        <Card
                          key={kpi.id}
                          className={cn(
                            'transition-colors',
                            kpi.displayMode === 'alert' && 'border-destructive/30 bg-destructive/5'
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{kpi.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className={cn('text-xs', ragConfig.className)}>
                                    {ragConfig.label}
                                  </Badge>
                                  {kpi.area?.name && (
                                    <span className="text-xs text-muted-foreground">
                                      {kpi.area.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-1">
                                  <p className="text-lg font-bold">
                                    {kpi.latest_value !== null ? kpi.latest_value : '—'} {kpi.unit}
                                  </p>
                                  {getTrendIcon(kpi)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Meta: {kpi.target_value} {kpi.unit}
                                </p>
                              </div>
                            </div>

                            {kpi.target_value && kpi.latest_value !== null && (
                              <Progress
                                value={progress}
                                className={cn(
                                  'h-1.5 mt-3',
                                  kpi.latest_rag_status === 'off_track' && '[&>div]:bg-status-red',
                                  kpi.latest_rag_status === 'at_risk' && '[&>div]:bg-status-yellow'
                                )}
                              />
                            )}

                            {/* Alert warning */}
                            {kpi.displayMode === 'alert' && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                                <AlertTriangle className="h-3 w-3" />
                                Requer atenção da liderança
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      <WizardStepFooter
        onBack={onBack}
        primaryLabel="Ver dependências"
        onPrimary={onContinue}
      />
    </div>
  );
}