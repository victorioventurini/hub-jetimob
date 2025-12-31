import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, ChevronRight, Users, Target } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

interface OrgObjective {
  id: string;
  title: string;
  status: string;
}

interface TeamObjective {
  id: string;
  title: string;
  team_id: string;
  org_objective_id: string;
  status: string;
}

interface Team {
  id: string;
  name: string;
}

interface AlignmentMapProps {
  orgObjectives: OrgObjective[];
  teamObjectives: TeamObjective[];
  teams: Team[];
  isLoading: boolean;
}

export function AlignmentMap({ orgObjectives, teamObjectives, teams, isLoading }: AlignmentMapProps) {
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Time desconhecido';
  };

  const getLinkedTeamObjectives = (orgId: string) => {
    return teamObjectives.filter(to => to.org_objective_id === orgId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-700 border-green-500/30';
      case 'draft':
        return 'bg-muted text-muted-foreground';
      case 'completed':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Rascunho';
      case 'active': return 'Ativo';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="w-5 h-5" />
          Mapa de Alinhamento
        </CardTitle>
        <CardDescription>
          Como os objetivos dos times se conectam aos objetivos organizacionais
        </CardDescription>
      </CardHeader>
      <CardContent>
        {orgObjectives.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum objetivo organizacional definido</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orgObjectives.map((orgObj) => {
              const linkedTeams = getLinkedTeamObjectives(orgObj.id);
              const isExpanded = expandedOrg === orgObj.id;
              
              return (
                <Collapsible
                  key={orgObj.id}
                  open={isExpanded}
                  onOpenChange={() => setExpandedOrg(isExpanded ? null : orgObj.id)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-sm line-clamp-1">{orgObj.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-xs ${getStatusColor(orgObj.status)}`}>
                              {getStatusLabel(orgObj.status)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {linkedTeams.length} time{linkedTeams.length !== 1 ? 's' : ''} vinculado{linkedTeams.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="border-t bg-muted/30">
                        {linkedTeams.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground text-sm">
                            Nenhum time vinculado a este objetivo
                          </div>
                        ) : (
                          <div className="p-2 space-y-1">
                            {linkedTeams.map((teamObj) => (
                              <div
                                key={teamObj.id}
                                className="flex items-center gap-3 p-3 rounded-md hover:bg-background transition-colors"
                              >
                                <div className="w-4 h-px bg-border" />
                                <div className="p-1.5 rounded bg-secondary">
                                  <Users className="w-3 h-3 text-secondary-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium line-clamp-1">{teamObj.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {getTeamName(teamObj.team_id)}
                                  </p>
                                </div>
                                <Badge variant="outline" className={`text-xs shrink-0 ${getStatusColor(teamObj.status)}`}>
                                  {getStatusLabel(teamObj.status)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
