/**
 * CycleCheckinsSummary - Visão agregada por time
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useCycleCheckins } from '../../hooks/useCycleCheckins';
import { useTeams } from '../../hooks';
import { cn } from '@/lib/utils';

interface CycleCheckinsSummaryProps {
  cycleId: string;
  onTeamClick: (teamId: string) => void;
}

export function CycleCheckinsSummary({ 
  cycleId, 
  onTeamClick,
}: CycleCheckinsSummaryProps) {
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: checkinsData, isLoading: checkinsLoading } = useCycleCheckins(cycleId, {});
  
  // Group overdue KRs by team
  const teamStats = useMemo(() => {
    if (!teams || !checkinsData) return [];
    
    const overdueByTeam = new Map<string, number>();
    checkinsData.overdue_krs.forEach(kr => {
      const count = overdueByTeam.get(kr.team_id) || 0;
      overdueByTeam.set(kr.team_id, count + 1);
    });
    
    // Count check-ins by team
    const checkinsByTeam = new Map<string, { total: number; highConf: number; medConf: number; lowConf: number }>();
    checkinsData.checkins.forEach(c => {
      const stats = checkinsByTeam.get(c.team_id) || { total: 0, highConf: 0, medConf: 0, lowConf: 0 };
      stats.total++;
      if (c.confidence === 'high') stats.highConf++;
      else if (c.confidence === 'medium') stats.medConf++;
      else stats.lowConf++;
      checkinsByTeam.set(c.team_id, stats);
    });
    
    return teams
      .filter(team => {
        // Only show teams that have check-ins or overdue KRs
        return checkinsByTeam.has(team.id) || overdueByTeam.has(team.id);
      })
      .map(team => {
        const overdue = overdueByTeam.get(team.id) || 0;
        const stats = checkinsByTeam.get(team.id) || { total: 0, highConf: 0, medConf: 0, lowConf: 0 };
        
        // Calculate dominant confidence
        const dominantConfidence: 'high' | 'medium' | 'low' = 
          stats.highConf >= stats.medConf && stats.highConf >= stats.lowConf ? 'high' :
          stats.medConf >= stats.lowConf ? 'medium' : 'low';
        
        // Estimate on-track percentage (rough)
        // This would be more accurate with per-team KR counts
        const hasRecentActivity = stats.total > 0;
        const onTrackPercent = hasRecentActivity 
          ? Math.max(0, Math.min(100, 100 - (overdue * 20))) 
          : 0;
        
        return {
          id: team.id,
          name: team.name,
          totalCheckins: stats.total,
          overdueCount: overdue,
          onTrackPercent,
          dominantConfidence,
        };
      })
      .sort((a, b) => b.overdueCount - a.overdueCount); // Sort by overdue count desc
  }, [teams, checkinsData]);
  
  const isLoading = teamsLoading || checkinsLoading;
  
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (teamStats.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum dado de time encontrado</h3>
          <p className="text-muted-foreground text-sm">
            Não há check-ins registrados para exibir o resumo por time.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {teamStats.map((team) => (
        <TeamSummaryCard
          key={team.id}
          team={team}
          onClick={() => onTeamClick(team.id)}
        />
      ))}
    </div>
  );
}

// ============================================================
// Team Summary Card
// ============================================================

interface TeamSummaryCardProps {
  team: {
    id: string;
    name: string;
    totalCheckins: number;
    overdueCount: number;
    onTrackPercent: number;
    dominantConfidence: 'high' | 'medium' | 'low';
  };
  onClick: () => void;
}

const confidenceLabels = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

const confidenceColors = {
  high: 'bg-status-green-muted text-status-green',
  medium: 'bg-status-yellow-muted text-status-yellow',
  low: 'bg-status-red-muted text-status-red',
};

function TeamSummaryCard({ team, onClick }: TeamSummaryCardProps) {
  const StatusIcon = team.overdueCount > 0 
    ? AlertTriangle 
    : team.onTrackPercent >= 80 
      ? CheckCircle2 
      : Minus;
  
  const statusColor = team.overdueCount > 0 
    ? 'text-yellow-500' 
    : team.onTrackPercent >= 80 
      ? 'text-green-500' 
      : 'text-muted-foreground';
  
  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium truncate">
            {team.name}
          </CardTitle>
          <StatusIcon className={cn("h-4 w-4 shrink-0", statusColor)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">KRs em dia</span>
              <span className="font-medium">{team.onTrackPercent}%</span>
            </div>
            <Progress 
              value={team.onTrackPercent} 
              className={cn(
                "h-2",
                team.onTrackPercent >= 80 && "[&>div]:bg-green-500",
                team.onTrackPercent >= 50 && team.onTrackPercent < 80 && "[&>div]:bg-yellow-500",
                team.onTrackPercent < 50 && "[&>div]:bg-red-500",
              )}
            />
          </div>
          
          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {team.overdueCount > 0 ? (
                <Badge variant="destructive" className="text-xs">
                  {team.overdueCount} atrasado{team.overdueCount !== 1 ? 's' : ''}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Em dia
                </Badge>
              )}
            </div>
            
            <Badge variant="secondary" className={cn("text-xs", confidenceColors[team.dominantConfidence])}>
              {confidenceLabels[team.dominantConfidence]}
            </Badge>
          </div>
          
          {/* Check-in count */}
          <div className="text-xs text-muted-foreground">
            {team.totalCheckins} check-in{team.totalCheckins !== 1 ? 's' : ''} no ciclo
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
