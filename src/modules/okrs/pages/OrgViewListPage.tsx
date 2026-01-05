import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ChevronRight, Target, TrendingUp, AlertTriangle, XCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { HubLayout } from '@/components/layout/HubLayout';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAllOrgObjectivesView } from '../hooks/useOrgObjectiveView';

const statusConfig = {
  on_track: {
    label: 'On Track',
    color: 'bg-green-500/10 text-green-700 border-green-200',
    icon: TrendingUp,
  },
  at_risk: {
    label: 'Em Risco',
    color: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
    icon: AlertTriangle,
  },
  off_track: {
    label: 'Off Track',
    color: 'bg-red-500/10 text-red-700 border-red-200',
    icon: XCircle,
  },
};

export default function OrgViewListPage() {
  usePageTitle('Visão Organizacional');
  
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              Visão Organizacional
            </h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe como os OKRs dos times contribuem para os objetivos estratégicos
            </p>
          </div>
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
              <div className="text-2xl font-bold text-green-600">{stats.onTrack}</div>
              <p className="text-sm text-muted-foreground">On Track</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{stats.atRisk}</div>
              <p className="text-sm text-muted-foreground">Em Risco</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.offTrack}</div>
              <p className="text-sm text-muted-foreground">Off Track</p>
            </CardContent>
          </Card>
        </div>

        {/* Objectives List */}
        {isLoading ? (
          <div className="space-y-4">
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
                <Link key={objective.id} to={`/okrs/org-view/${objective.id}`}>
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
