/**
 * TeamSummaryList - Lista de times com resumo de saúde das OKRs
 * Clique abre a página de qualidade do time em nova aba
 */

import { ExternalLink, Users, Target, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { TeamSummary } from "../../hooks";

interface TeamSummaryListProps {
  teams: TeamSummary[];
  cycleId?: string | null;
  className?: string;
}

const healthStatusConfig = {
  healthy: {
    label: 'Saudável',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: null,
  },
  attention: {
    label: 'Atenção',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: null,
  },
  risk: {
    label: 'Risco',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: AlertTriangle,
  },
};

export function TeamSummaryList({ 
  teams, 
  cycleId,
  className 
}: TeamSummaryListProps) {
  const handleOpenQuality = (teamId: string) => {
    const params = new URLSearchParams();
    params.set('team', teamId);
    if (cycleId) params.set('cycle', cycleId);
    
    window.open(`/okrs/quality?${params.toString()}`, '_blank');
  };

  // Sort teams: those with OKRs first, then by health score
  const sortedTeams = [...teams].sort((a, b) => {
    if (a.hasOkrs !== b.hasOkrs) return b.hasOkrs ? 1 : -1;
    return b.healthScore - a.healthScore;
  });

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Resumo por Time
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="divide-y">
            {sortedTeams.map((team) => {
              const statusConfig = healthStatusConfig[team.healthStatus];
              const StatusIcon = statusConfig.icon;

              return (
                <div 
                  key={team.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={team.leaderPhoto || undefined} />
                      <AvatarFallback className="text-xs">
                        {team.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{team.name}</p>
                      {team.leaderName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {team.leaderName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {team.hasOkrs ? (
                      <>
                        <div className="text-right hidden sm:block">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Target className="h-3 w-3" />
                            <span>{team.objectiveCount} OKRs</span>
                          </div>
                        </div>
                        
                        <Badge 
                          variant="secondary" 
                          className={cn("gap-1", statusConfig.color)}
                        >
                          {StatusIcon && <StatusIcon className="h-3 w-3" />}
                          {team.healthScore}%
                        </Badge>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleOpenQuality(team.id)}
                          title="Ver análise do time"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Sem OKRs
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}

            {teams.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum time encontrado</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
