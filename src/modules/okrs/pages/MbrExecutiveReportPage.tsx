/**
 * MbrExecutiveReportPage
 *
 * AI-generated executive MBR report consolidating MBR-pré snapshots,
 * monthly KPI signals, org OKRs and pending decisions for a given
 * reference month.
 *
 * Route: /okrs/executive/mbr-report
 * Acesso: todos da BU (mesma regra do QBR Executive Report).
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
  BarChart3,
  Target,
  Users,
  CalendarDays,
  FolderKanban,
  Flag,
  Lightbulb,
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
import {
  formatMonthLabel,
  lastNClosedMonths,
  quarterBoundsOfMonth,
} from '@/modules/okrs/utils/mbr/referenceMonth';

import { useMbrExecutiveReport, type MbrExecutiveReportData } from '../hooks/useMbrExecutiveReport';
import { KpiEvolutionSection } from '../components/qbr-report/KpiEvolutionSection';
import { OrgOkrsReportSection } from '../components/qbr-report/OrgOkrsReportSection';

const LOADING_MESSAGES = [
  'Coletando MBR-pré dos líderes...',
  'Lendo KPIs do mês de referência...',
  'Analisando OKRs organizacionais...',
  'Identificando compromissos e decisões pendentes...',
  'Gerando narrativa executiva do mês...',
];

function SourceChecklist() {
  const sources = [
    'Snapshots do MBR-pré submetidos pelos líderes no mês',
    'KPIs organizacionais consolidados até o mês de referência',
    'OKRs do ciclo trimestral atual',
    'Destaques, riscos e próximos passos por time',
    'Decisões pendentes do mês',
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
  monthRef,
  generatedAt,
  onRegenerate,
  isRegenerating,
}: {
  report: MbrExecutiveReportData;
  cycleName: string;
  cycleId: string | null;
  monthRef: string;
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
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold">Relatório Executivo de MBR</h2>
              <p className="text-sm text-muted-foreground">
                {formatMonthLabel(monthRef)} · {cycleName}
                {generatedAt && (
                  <> · Gerado em {format(parseISO(generatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5">
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

      <ReportSection icon={BarChart3} title="O que o mês nos disse">
        <p className="text-sm leading-relaxed whitespace-pre-line">
          {report.monthNarrative}
        </p>
      </ReportSection>

      <OrgOkrsReportSection cycleId={cycleId} />

      <ReportSection icon={Target} title="Compromissos dos times para o próximo mês">
        {report.teamCommitments && report.teamCommitments.length > 0 && (
          <div className="mb-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Time</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Foco e iniciativas</th>
                </tr>
              </thead>
              <tbody>
                {report.teamCommitments.map((c, i) => (
                  <tr key={i} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-4">
                      <Badge variant="secondary" className="text-xs">{c.teamName}</Badge>
                    </td>
                    <td className="py-2 pr-4 space-y-1">
                      {c.focus && <p className="font-medium">{c.focus}</p>}
                      {c.prioritizedItems.length > 0 && (
                        <div className="space-y-0.5">
                          {c.prioritizedItems.map((it, idx) => (
                            <div key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <span className="mt-px shrink-0">{idx + 1}.</span>
                              <span>{it}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {c.crossDependencies.length > 0 && (
                        <div className="space-y-0.5 pt-1">
                          <p className="text-xs font-medium text-muted-foreground">Dependências:</p>
                          {c.crossDependencies.map((d, idx) => (
                            <div key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <span className="mt-px shrink-0">·</span>
                              <span>{d}</span>
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
        {report.commitmentsAnalysis && (
          <p className="text-sm leading-relaxed whitespace-pre-line">
            {report.commitmentsAnalysis}
          </p>
        )}
        {!report.teamCommitments?.length && !report.commitmentsAnalysis && (
          <p className="text-sm text-muted-foreground">Nenhum compromisso registrado pelos times para o próximo mês.</p>
        )}
      </ReportSection>

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
            </div>
          )}
          {!report.kpiInsights.healthy && !report.kpiInsights.atRisk && !report.kpiInsights.critical && (
            <p className="text-sm text-muted-foreground">Sem dados de KPIs disponíveis para análise.</p>
          )}
        </div>
      </ReportSection>

      {report.decisionsNeeded && report.decisionsNeeded.length > 0 && (
        <ReportSection icon={AlertCircle} title="Decisões necessárias">
          <ul className="space-y-2">
            {report.decisionsNeeded.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CircleDot className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </ReportSection>
      )}

      <KpiEvolutionSection />
    </div>
  );
}

export default function MbrExecutiveReportPage() {
  usePageTitle('Relatório Executivo de MBR');

  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();

  const monthOptions = useMemo(() => lastNClosedMonths(12), []);

  const monthState = useUrlState<string>({
    key: 'month',
    defaultValue: monthOptions[0]?.value ?? '',
  });
  const cycleState = useUrlState<string>({ key: 'cycle', defaultValue: '' });

  // Carrega TODOS os ciclos trimestrais da BU para descobrir o ciclo que
  // contém o mês de referência selecionado. Reusa a mesma queryKey do QBR
  // (ambas as páginas listam quarter cycles da BU).
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

  // Resolve automaticamente o ciclo trimestral que contém o monthRef escolhido.
  useEffect(() => {
    if (!quarterCycles?.length || !monthState.value) return;
    const bounds = quarterBoundsOfMonth(monthState.value);
    if (!bounds) return;
    const matching = quarterCycles.find(
      c => c.start_date <= bounds.end && c.end_date >= bounds.start,
    );
    if (matching && matching.id !== cycleState.value) {
      cycleState.set(matching.id);
    }
  }, [quarterCycles, monthState.value, cycleState]);

  const selectedCycle = useMemo(
    () => quarterCycles?.find(c => c.id === cycleState.value) ?? null,
    [quarterCycles, cycleState.value],
  );

  const { report, generatedAt, isLoading: isLoadingReport, generate, isGenerating } =
    useMbrExecutiveReport(cycleState.value || null, monthState.value || null);

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
          title="Relatório Executivo de MBR"
          description="Análise consolidada gerada por IA com base nos MBR-pré submetidos pelos líderes no mês"
          breadcrumbs={[
            { label: 'OKRs', href: '/okrs' },
            { label: 'Executivo', href: '/okrs/executive' },
            { label: 'Relatório MBR' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Select value={monthState.value} onValueChange={monthState.set}>
                <SelectTrigger className="w-[180px]">
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue placeholder="Selecionar mês" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />

        {isLoadingReport ? (
          <LoadingState text="Carregando relatório..." />
        ) : isGenerating ? (
          <GeneratingState />
        ) : report ? (
          <ReportDisplay
            report={report}
            cycleName={selectedCycle?.name || ''}
            cycleId={cycleState.value || null}
            monthRef={monthState.value}
            generatedAt={generatedAt}
            onRegenerate={() => generate()}
            isRegenerating={isGenerating}
          />
        ) : (
          <>
            <Card className="max-w-xl mx-auto">
              <CardHeader className="text-center">
                <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>
                  Relatório Executivo — {formatMonthLabel(monthState.value)}
                </CardTitle>
                <CardDescription>
                  Análise consolidada gerada por IA com base nos MBR-pré do mês
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <SourceChecklist />
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={() => generate()}
                  disabled={!cycleState.value || !monthState.value || isLoadingReport}
                >
                  <Sparkles className="h-4 w-4" />
                  Gerar relatório
                </Button>
              </CardContent>
            </Card>

            <KpiEvolutionSection />
          </>
        )}
      </div>
    </HubLayout>
  );
}
