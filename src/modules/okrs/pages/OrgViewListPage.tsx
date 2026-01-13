import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ChevronRight, Target, TrendingUp, AlertTriangle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { HubLayout } from '@/components/layout/HubLayout';
import { PageHeader } from '@/components/ui/page-header';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAllOrgObjectivesView } from '../hooks/useOrgObjectiveView';
import { YearSelect } from '@/components/selects';
import { useUrlState, parsers } from '@/shared/url';
import { OkrOrgViewListBreadcrumb } from '../components/ui/OkrBreadcrumb';
import { RAG_STATUS_COLORS } from '@/lib/colors';

const statusConfig = {
  on_track: {
    label: 'No Ritmo',
    color: `${RAG_STATUS_COLORS.green.badge} ${RAG_STATUS_COLORS.green.border}`,
    icon: TrendingUp,
  },
  at_risk: {
    label: 'Em Risco',
    color: `${RAG_STATUS_COLORS.yellow.badge} ${RAG_STATUS_COLORS.yellow.border}`,
    icon: AlertTriangle,
  },
  off_track: {
    label: 'Atrasado',
    color: `${RAG_STATUS_COLORS.red.badge} ${RAG_STATUS_COLORS.red.border}`,
    icon: XCircle,
  },
};

export default function OrgViewListPage() {
  usePageTitle('Visão Organizacional');
  
  const currentYear = new Date().getFullYear();
  
  // URL State - object API
  const yearState = useUrlState<number>({ key: 'year', defaultValue: currentYear, parse: parsers.number });
  const selectedYear = yearState.value;
  const setSelectedYear = yearState.set;
  
  const { data: objectives, isLoading } = useAllOrgObjectivesView(selectedYear);

  const years = [currentYear - 1, currentYear, currentYear + 1];

  // Summary stats
  const stats = useMemo(() => {
    if (!objectives) return { total: 0, onTrack: 0, atRisk: 0, offTrack: 0 };
    return {
      total: objectives.length,
      onTrack: objectives.filter(o => o.aggregatedStatus === 'on_track').length,
      atRisk: objectives.filter(o => o.aggregatedStatus === 'at_risk').length,
      offTrack: objectives.filter(o => o.aggregatedStatus === 'off_track').length,
    };
  }, [objectives]);

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <OkrOrgViewListBreadcrumb />
        
        {/* Header */}
        <PageHeader
          title="Visão Organizacional"
          description="Acompanhe como os OKRs dos times contribuem para os objetivos estratégicos"
          backTo="/okrs"
          backLabel="Voltar para OKRs"
          actions={
            <YearSelect
              value={selectedYear}
              onValueChange={setSelectedYear}
              years={years}
              triggerClassName="w-[120px]"
            />
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Objetivos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className={`text-2xl font-bold ${RAG_STATUS_COLORS.green.text}`}>{stats.onTrack}</div>
              <p className="text-sm text-muted-foreground">No Ritmo</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className={`text-2xl font-bold ${RAG_STATUS_COLORS.yellow.text}`}>{stats.atRisk}</div>
              <p className="text-sm text-muted-foreground">Em Risco</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className={`text-2xl font-bold ${RAG_STATUS_COLORS.red.text}`}>{stats.offTrack}</div>
              <p className="text-sm text-muted-foreground">Atrasado</p>
            </CardContent>
          </Card>
        </div>

        {/* Objectives List */}
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : objectives && objectives.length > 0 ? (
          <div className="space-y-4">
            {objectives.map(objective => {
              const config = statusConfig[objective.aggregatedStatus];
              const StatusIcon = config.icon;
              const totalTeamKrs = objective.orgKrs.reduce((sum, kr) => sum + kr.linkedTeamKrs.length, 0);

              return (
                <Link key={objective.id} to={`/okrs/org-view/${objective.id}`} className="block">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Target className="w-5 h-5 text-primary" />
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-lg">{objective.title}</h3>
                              {objective.description && (
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {objective.description}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className={config.color}>
                              <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                              {config.label}
                            </Badge>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Progresso</span>
                                <span className="font-medium">{objective.aggregatedProgress}%</span>
                              </div>
                              <Progress value={objective.aggregatedProgress} className="h-2" />
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{objective.orgKrs.length} KRs org.</span>
                              <span>{totalTeamKrs} OKRs times</span>
                            </div>
                          </div>
                        </div>

                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum objetivo encontrado</h3>
            <p className="text-muted-foreground">
              Não há objetivos organizacionais cadastrados para {selectedYear}.
            </p>
          </div>
        )}
      </div>
    </HubLayout>
  );
}
