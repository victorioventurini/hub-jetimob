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
import { AnalyzedTeamsHeader } from '../components/shared/AnalyzedTeamsHeader';


const LOADING_MESSAGES = [
  'Coletando MBR-pré dos líderes...',
  'Lendo KPIs do mês de referência...',
  'Analisando OKRs organizacionais...',
  'Identificando compromissos e decisões pendentes...',
  'Gerando narrativa executiva do mês...',
];

function SourceChecklist() {
  const sources = [
    '% de atingimento das OKRs calculado com a Progress Canon (mesma fórmula de /okrs)',
    'KRs com KPI primária usam o valor efetivo da KPI até o fim do mês',
    'Snapshots do MBR-pré submetidos pelos líderes no mês',
    'KPIs organizacionais consolidados até o mês de referência',
    'OKRs do ciclo trimestral atual',
    'Destaques, riscos e próximos passos por time',
    'Projetos e marcos em atraso justificados pelos líderes',
    'KRs fora da meta com justificativa do time',
    'KPIs com justificativa ou sem dados no mês',
    'Sugestões de pauta e novos KPIs propostos pelos líderes',
    'Análises mensais IA revisadas pelos líderes',
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

      <AnalyzedTeamsHeader teams={report.analyzedTeams || []} ritual="MBR" />



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
              <a href="/okrs" className="underline">/okrs</a>. KRs com KPI primária usam o valor efetivo da KPI até o fim do mês.
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

      {(report.projectsAnalysis || report.projectIssues.length > 0) && (
        <ReportSection icon={FolderKanban} title="Projetos e marcos do mês">
          {report.projectsAnalysis && (
            <p className="text-sm leading-relaxed whitespace-pre-line mb-3">
              {report.projectsAnalysis}
            </p>
          )}
          {report.projectIssues.length > 0 && (
            <div className="space-y-2">
              {report.projectIssues.slice(0, 30).map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Badge variant="secondary" className="text-xs shrink-0">{p.teamName}</Badge>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {p.kind === 'project' ? 'Projeto' : 'Marco'}
                  </Badge>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    {(p.name || p.projectName) && (
                      <span className="font-medium text-foreground">
                        {p.kind === 'milestone' && p.projectName
                          ? `${p.projectName} › ${p.name || p.refId}`
                          : (p.name || p.refId)}
                      </span>
                    )}
                    <span className="text-muted-foreground">{p.justification}</span>
                  </div>
                </div>
              ))}
              {report.projectIssues.length > 30 && (
                <p className="text-xs text-muted-foreground">
                  +{report.projectIssues.length - 30} outros itens não exibidos.
                </p>
              )}
            </div>
          )}
        </ReportSection>
      )}

      {(report.krIssuesAnalysis || report.krIssues.length > 0) && (
        <ReportSection icon={Flag} title="KRs fora da meta — justificativas dos times">
          {report.krIssuesAnalysis && (
            <p className="text-sm leading-relaxed whitespace-pre-line mb-3">
              {report.krIssuesAnalysis}
            </p>
          )}
          {report.krIssues.length > 0 && (
            <div className="space-y-2">
              {report.krIssues.slice(0, 30).map((k, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Badge variant="secondary" className="text-xs shrink-0">{k.teamName}</Badge>
                  {k.paceStatus && (
                    <Badge variant="outline" className="text-xs shrink-0 capitalize">{k.paceStatus}</Badge>
                  )}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    {k.title && (
                      <span className="font-medium text-foreground">{k.title}</span>
                    )}
                    <span className="text-muted-foreground">{k.justification}</span>
                  </div>
                </div>
              ))}
              {report.krIssues.length > 30 && (
                <p className="text-xs text-muted-foreground">
                  +{report.krIssues.length - 30} outros KRs não exibidos.
                </p>
              )}
            </div>
          )}
        </ReportSection>
      )}

      {(report.leaderSignals || report.agendaSuggestions.length > 0 || report.kpisToCreate.length > 0 || report.kpiIssues.length > 0) && (
        <ReportSection icon={Lightbulb} title="Sinais dos líderes">
          {report.leaderSignals && (
            <p className="text-sm leading-relaxed whitespace-pre-line mb-3">
              {report.leaderSignals}
            </p>
          )}
          {report.kpiIssues.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">KPIs com justificativa ou sem dados</p>
              <div className="flex flex-wrap gap-1.5">
                {report.kpiIssues.slice(0, 20).map((k, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {k.teamName} · {k.kind === 'no_data' ? 'sem dados' : 'justificado'}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {report.agendaSuggestions.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Sugestões de pauta</p>
              <ul className="space-y-1">
                {report.agendaSuggestions.slice(0, 10).map((a, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <Badge variant="secondary" className="text-xs shrink-0">{a.teamName}</Badge>
                    <span>{a.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.kpisToCreate.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Novos KPIs sugeridos</p>
              <ul className="space-y-1">
                {report.kpisToCreate.slice(0, 10).map((k, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <Badge variant="secondary" className="text-xs shrink-0">{k.teamName}</Badge>
                    <span>{k.description}{k.suggestedScope ? ` · ${k.suggestedScope}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ReportSection>
      )}


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
