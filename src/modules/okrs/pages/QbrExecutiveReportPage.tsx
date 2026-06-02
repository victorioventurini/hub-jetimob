/**
 * QbrExecutiveReportPage
 * 
 * AI-generated executive QBR report consolidating OKRs, KPIs,
 * ritual snapshots, and pending decisions.
 * 
 * Route: /okrs/executive/qbr-report
 * Guard: BuAdminRoute (via okrs.routes.tsx)
 */

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  FileText,
  Sparkles,
  Loader2,
  Copy,
  RefreshCw,
  CheckCircle2,
  CircleDot,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  BarChart3,
  Target,
  Users,
  MessageSquare,
} from 'lucide-react';

import { HubLayout } from '@/components/layout/HubLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingState } from '@/components/ui/loading-state';

import { usePageTitle } from '@/hooks/usePageTitle';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { quarterReviewKeys } from '@/lib/queryKeys/okrs';
import { useUrlState } from '@/shared/url';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { useQbrExecutiveReport, type QbrExecutiveReportData } from '../hooks/useQbrExecutiveReport';
import { KpiEvolutionSection } from '../components/qbr-report/KpiEvolutionSection';
import { CriticalKpiComparison } from '../components/qbr-report/CriticalKpiComparison';
import { OrgOkrsReportSection } from '../components/qbr-report/OrgOkrsReportSection';

// ============================================================
// LOADING MESSAGES
// ============================================================

const LOADING_MESSAGES = [
  'Coletando OKRs do ciclo...',
  'Lendo snapshots dos líderes...',
  'Analisando KPIs organizacionais...',
  'Identificando padrões e decisões pendentes...',
  'Gerando narrativa executiva...',
];

// ============================================================
// SUB-COMPONENTS
// ============================================================

function SourceChecklist() {
  const sources = [
    '% de atingimento das OKRs calculado com a Progress Canon (mesma fórmula de /okrs)',
    'KRs com KPI primária usam o valor efetivo da KPI até o fim do ciclo',
    'OKRs do ciclo com entrega real',
    'Propostas de OKRs para o próximo ciclo',
    'KPIs organizacionais',
    'Snapshots do Pré-QBR dos líderes',
    'OKRs organizacionais e contribuições dos times',
    'Decisões pendentes dos rituais do quarter',
  ];

  return (
    <div className="space-y-2">
      {sources.map((source, i) => (
        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
          <span>{source}</span>
        </div>
      ))}
    </div>
  );
}

function GeneratingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="max-w-xl mx-auto">
      <CardContent className="py-12 flex flex-col items-center gap-6">
        <div className="relative">
          <Sparkles className="h-10 w-10 text-primary animate-pulse" />
          <Loader2 className="h-5 w-5 text-primary animate-spin absolute -bottom-1 -right-1" />
        </div>
        <div className="text-center space-y-2">
          <p className="font-medium">Gerando relatório executivo...</p>
          <p className="text-sm text-muted-foreground animate-fade-in">
            {LOADING_MESSAGES[messageIndex]}
          </p>
        </div>
        <div className="flex gap-1.5">
          {LOADING_MESSAGES.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 w-8 rounded-full transition-colors',
                i <= messageIndex ? 'bg-primary' : 'bg-muted',
              )}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReportSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4.5 w-4.5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ReportDisplay({
  report,
  cycleName,
  cycleId,
  generatedAt,
  onRegenerate,
  isRegenerating,
}: {
  report: QbrExecutiveReportData;
  cycleName: string;
  cycleId: string | null;
  generatedAt: string | null;
  onRegenerate: () => void;
  isRegenerating: boolean;
}) {
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado!');
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold">Relatório Executivo de QBR</h2>
              <p className="text-sm text-muted-foreground">
                {cycleName}
                {generatedAt && (
                  <> · Gerado em {format(parseISO(generatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar link
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="gap-1.5"
              >
                {isRegenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Regenerar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 0 — Overall Achievement (deterministic, mesma fórmula de /okrs) */}
      {report.overallAchievement && report.overallAchievement.byObjective.length > 0 && (
        <ReportSection icon={Target} title="% de atingimento das OKRs">
          <div className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-semibold tabular-nums">
                {report.overallAchievement.overallProgress}%
              </span>
              <span className="text-sm text-muted-foreground">
                média dos objetivos do ciclo · {report.overallAchievement.byObjective.length} objetivos · {report.overallAchievement.byTeam.length} times
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Base de cálculo: progresso médio das KRs por objetivo → média dos objetivos. Mesma fórmula da página{' '}
              <a href="/okrs" className="underline">/okrs</a>. KRs com KPI primária usam o valor efetivo da KPI até o fim do ciclo.
            </p>
            {report.overallAchievement.byTeam.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Time</th>
                      <th className="text-right py-2 pr-4 font-medium text-muted-foreground">% atingimento</th>
                      <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Objetivos</th>
                      <th className="text-right py-2 pr-0 font-medium text-muted-foreground">KRs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.overallAchievement.byTeam.map((t) => (
                      <tr key={t.teamId || t.teamName} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <Badge variant="secondary" className="text-xs">{t.teamName}</Badge>
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums font-medium">{t.progress}%</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">{t.objectivesCount}</td>
                        <td className="py-2 pr-0 text-right tabular-nums text-muted-foreground">{t.krCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </ReportSection>
      )}

      {/* Section 1 — Quarter Narrative */}
      <ReportSection icon={BarChart3} title="O que o quarter nos disse">
        <p className="text-sm leading-relaxed whitespace-pre-line">
          {report.quarterNarrative}
        </p>
      </ReportSection>

      {/* Section 1.5 — Org OKRs */}
      <OrgOkrsReportSection cycleId={cycleId} />

      {/* Section 2 — Proposals */}
      <ReportSection icon={Target} title="O que os times propõem para o próximo ciclo">
        {report.teamProposals && report.teamProposals.length > 0 && (
          <div className="mb-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Time</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Objetivo proposto</th>
                </tr>
              </thead>
              <tbody>
                {report.teamProposals.map((proposal, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-4 align-top">
                      <Badge variant="secondary" className="text-xs">{proposal.teamName}</Badge>
                    </td>
                    <td className="py-2 pr-4">
                      <span>{proposal.objectiveTitle}</span>
                      {proposal.krs && proposal.krs.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {proposal.krs.map((kr, idx) => (
                            <div key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <span className="mt-px shrink-0">·</span>
                              <span>{kr}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {report.proposalsAnalysis && (
          <p className="text-sm leading-relaxed whitespace-pre-line">
            {report.proposalsAnalysis}
          </p>
        )}
        {!report.teamProposals?.length && !report.proposalsAnalysis && (
          <p className="text-sm text-muted-foreground">Nenhuma proposta registrada para o próximo ciclo.</p>
        )}
      </ReportSection>

      {/* Section 3 — KPI Insights */}
      <ReportSection icon={Users} title="Os sinais dos KPIs">
        <div className="space-y-3">
          {report.kpiInsights.healthy && (
            <div className="p-3 rounded-lg bg-status-green/5 border border-status-green/20">
              <div className="flex items-center gap-2 mb-1">
                <CircleDot className="h-3.5 w-3.5 text-status-green" />
                <span className="text-xs font-semibold text-status-green">Em boa forma</span>
              </div>
              <p className="text-sm">{report.kpiInsights.healthy}</p>
            </div>
          )}
          {report.kpiInsights.atRisk && (
            <div className="p-3 rounded-lg bg-status-amber/5 border border-status-amber/20">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-status-amber" />
                <span className="text-xs font-semibold text-status-amber">Merecem atenção</span>
              </div>
              <p className="text-sm">{report.kpiInsights.atRisk}</p>
            </div>
          )}
          {report.kpiInsights.critical && (
            <div className="p-3 rounded-lg bg-status-red/5 border border-status-red/20">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-3.5 w-3.5 text-status-red" />
                <span className="text-xs font-semibold text-status-red">Ponto crítico</span>
              </div>
              <p className="text-sm">{report.kpiInsights.critical}</p>
              <CriticalKpiComparison cycleId={cycleId} />
            </div>
          )}
          {!report.kpiInsights.healthy && !report.kpiInsights.atRisk && !report.kpiInsights.critical && (
            <p className="text-sm text-muted-foreground">Sem dados de KPIs disponíveis para análise.</p>
          )}
        </div>
      </ReportSection>

      {/* Section 3.5 — KPI Evolution (data-driven, not AI) */}
      <KpiEvolutionSection />

    </div>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function QbrExecutiveReportPage() {
  usePageTitle('Relatório Executivo de QBR');

  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();

  const cycleState = useUrlState<string>({ key: 'cycle', defaultValue: '' });

  // Fetch quarter cycles
  const { data: quarterCycles, isLoading: isLoadingCycles } = useQuery({
    queryKey: quarterReviewKeys.cycles(currentBuId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycles')
        .select('id, name, start_date, end_date, status')
        .eq('bu_id', currentBuId!)
        .eq('type', 'quarter')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string; start_date: string; end_date: string; status: string }>;
    },
    enabled: !!currentBuId,
    staleTime: 2 * 60 * 1000,
  });

  // Auto-select active cycle
  useEffect(() => {
    if (!quarterCycles?.length || cycleState.value) return;
    const preferred = quarterCycles.find(c => c.status === 'active') ?? quarterCycles[0];
    if (preferred?.id) cycleState.set(preferred.id);
  }, [quarterCycles, cycleState]);

  const selectedCycle = useMemo(
    () => quarterCycles?.find(c => c.id === cycleState.value) ?? null,
    [quarterCycles, cycleState.value],
  );

  const { report, generatedAt, isLoading: isLoadingReport, generate, isGenerating } = useQbrExecutiveReport(
    cycleState.value || null
  );

  if (isLoadingCycles) {
    return (
      <HubLayout>
        <LoadingState fullPage />
      </HubLayout>
    );
  }

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Relatório Executivo de QBR"
          description="Análise consolidada gerada por IA com base nos dados do quarter"
          breadcrumbs={[
            { label: 'OKRs', href: '/okrs' },
            { label: 'Executivo', href: '/okrs/executive' },
            { label: 'Relatório QBR' },
          ]}
          actions={
            quarterCycles && quarterCycles.length > 0 ? (
              <Select value={cycleState.value} onValueChange={cycleState.set}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecionar ciclo" />
                </SelectTrigger>
                <SelectContent>
                  {quarterCycles.map(cycle => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      {cycle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : undefined
          }
        />

        {/* Content based on state */}
        {isLoadingReport ? (
          <LoadingState text="Carregando relatório..." />
        ) : isGenerating ? (
          <GeneratingState />
        ) : report ? (
          <ReportDisplay
            report={report}
            cycleName={selectedCycle?.name || ''}
            cycleId={cycleState.value || null}
            generatedAt={generatedAt}
            onRegenerate={() => generate()}
            isRegenerating={isGenerating}
          />
        ) : (
          /* Initial state — no report yet */
          <>
            <Card className="max-w-xl mx-auto">
              <CardHeader className="text-center">
                <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>
                  Relatório Executivo{selectedCycle ? ` — ${selectedCycle.name}` : ''}
                </CardTitle>
                <CardDescription>
                  Análise consolidada gerada por IA com base nos dados do quarter
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <SourceChecklist />
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={() => generate()}
                  disabled={!cycleState.value || isLoadingReport}
                >
                  <Sparkles className="h-4 w-4" />
                  Gerar relatório
                </Button>
              </CardContent>
            </Card>

            {/* KPI Evolution is always visible (data-driven) */}
            <KpiEvolutionSection />
          </>
        )}
      </div>
    </HubLayout>
  );
}
