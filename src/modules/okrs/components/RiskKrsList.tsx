import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, AlertCircle, Users } from 'lucide-react';
import { calculateProgress } from '../types';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { OkrDirection } from '../types';

interface RiskKr {
  id: string;
  title: string;
  team_id: string;
  status: string;
  baseline: number;
  current_value: number;
  target: number;
  direction: OkrDirection;
  unit: string;
}

interface RiskKrsListProps {
  redKrs: RiskKr[];
  yellowKrs: RiskKr[];
  teams: { id: string; name: string }[];
  isLoading: boolean;
}

export function RiskKrsList({ redKrs, yellowKrs, teams, isLoading }: RiskKrsListProps) {
  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Time desconhecido';
  };

  const renderKrItem = (kr: RiskKr, isRed: boolean) => {
    const progress = calculateProgress(
      Number(kr.baseline) || 0,
      Number(kr.current_value) || 0,
      Number(kr.target) || 0,
      kr.direction || 'up'
    );

    return (
      <div
        key={kr.id}
        className={`p-3 rounded-lg border ${
          isRed 
            ? 'border-status-red/30 bg-status-red-muted' 
            : 'border-status-yellow/30 bg-status-yellow-muted'
        }`}
      >
        <div className="flex items-start gap-3">
          {isRed ? (
            <AlertTriangle className="w-4 h-4 text-status-red mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-status-yellow mt-0.5 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight line-clamp-2">
              {kr.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                {getTeamName(kr.team_id)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {progress.toFixed(0)}% • {kr.current_value}/{kr.target} {kr.unit}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const hasRisks = redKrs.length > 0 || yellowKrs.length > 0;

  return (
    <Card className={redKrs.length > 0 ? 'border-destructive/30' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className={`w-5 h-5 ${redKrs.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          Visão de Riscos
        </CardTitle>
        <CardDescription>
          KRs que precisam de atenção imediata
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasRisks ? (
          <div className="text-center py-6 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum KR em risco no momento</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {redKrs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-destructive uppercase tracking-wide">
                    Crítico ({redKrs.length})
                  </p>
                  {redKrs.map(kr => renderKrItem(kr, true))}
                </div>
              )}
              
              {yellowKrs.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-xs font-semibold text-warning uppercase tracking-wide">
                    Atenção ({yellowKrs.length})
                  </p>
                  {yellowKrs.map(kr => renderKrItem(kr, false))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
