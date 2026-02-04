import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Target, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { RAG_STATUS_COLORS } from '@/lib/colors';
import type { LinkedTeamObjective, TeamKrLinked } from '../../hooks/queries';

interface LinkedTeamObjectivesSectionProps {
  teamObjectives: LinkedTeamObjective[];
}

const statusLabels = {
  green: 'On Track',
  yellow: 'Atenção',
  red: 'Em Risco',
  not_started: 'Não Iniciado',
};

function calculateObjectiveProgress(krs: TeamKrLinked[]): number {
  if (krs.length === 0) return 0;
  const total = krs.reduce((sum, kr) => sum + kr.progress, 0);
  return Math.round(total / krs.length);
}

function TeamObjectiveCard({ objective }: { objective: LinkedTeamObjective }) {
  const [isOpen, setIsOpen] = useState(false);
  const progress = calculateObjectiveProgress(objective.krs);

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-left p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="font-medium">{objective.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span>{objective.team_name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className={cn("font-medium", progress > 100 && "text-status-green")}>
                        {progress}%
                        {progress > 100 && ' 🚀'}
                      </span>
                    </div>
                    {/* Barra visual limitada a 100% */}
                    <Progress value={Math.min(100, progress)} className="h-2" />
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {objective.krs.length} KR{objective.krs.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            <div className="border-t pt-4 ml-7 space-y-2">
              {objective.krs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Este objetivo não possui KRs cadastrados
                </p>
              ) : (
                objective.krs.map((kr) => (
                  <div key={kr.id} className="p-3 bg-muted/30 rounded-lg space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{kr.title}</span>
                      <Badge variant="outline" className={cn(
                        'text-xs shrink-0',
                        RAG_STATUS_COLORS[kr.status]?.badge,
                        RAG_STATUS_COLORS[kr.status]?.border
                      )}>
                        {statusLabels[kr.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={kr.progress} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {Math.round(kr.progress)}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function LinkedTeamObjectivesSection({ teamObjectives }: LinkedTeamObjectivesSectionProps) {
  if (teamObjectives.length === 0) {
    return null;
  }

  // Group by team
  const teamGroups = teamObjectives.reduce((acc, obj) => {
    if (!acc[obj.team_id]) {
      acc[obj.team_id] = {
        team_name: obj.team_name,
        objectives: [],
      };
    }
    acc[obj.team_id].objectives.push(obj);
    return acc;
  }, {} as Record<string, { team_name: string; objectives: LinkedTeamObjective[] }>);

  const teams = Object.entries(teamGroups).sort((a, b) => 
    a[1].team_name.localeCompare(b[1].team_name)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Objetivos de Time Vinculados
          <Badge variant="secondary" className="ml-2">
            {teamObjectives.length} objetivo{teamObjectives.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {teams.map(([teamId, { team_name, objectives }]) => (
          <div key={teamId} className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              {team_name}
              <span className="text-xs">({objectives.length} objetivo{objectives.length !== 1 ? 's' : ''})</span>
            </h4>
            <div className="space-y-2">
              {objectives.map((obj) => (
                <TeamObjectiveCard key={obj.id} objective={obj} />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
