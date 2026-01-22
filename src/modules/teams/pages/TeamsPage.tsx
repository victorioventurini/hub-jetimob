import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building2, Users, Network, Layers3, Box } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { PageHeader } from "@/components/ui/page-header";
import { useTeams, useTeamTree, useTeamStats } from "../hooks";
import { useSquads } from "../hooks";
import { TeamFormDialog } from "../components/TeamFormDialog";
import { TeamCard } from "../components/TeamCard";
import { TeamFilters } from "../components/TeamFilters";
import { SquadCard } from "../components/SquadCard";
import { SquadDetailDialog } from "../components/SquadDetailDialog";
import { TeamWithRelations } from "../types";
import { SquadWithRelations } from "../types/squad";
import { usePermissions } from "@/hooks/usePermissions";
import { EmptyState } from "@/components/ui/empty-state";
import { useUrlState, useLocalSearch, parsers } from "@/shared/url";

export default function TeamsPage() {
  usePageTitle("Times");
  
  // URL State - using local state for instant feedback
  const { value: search, setValue: setSearch } = useLocalSearch("q");
  
  const parentTeamState = useUrlState<string | null>({ 
    key: 'parent_team_id', 
    defaultValue: null,
    parse: (v) => v || null,
  });
  const parentTeamFilter = parentTeamState.value;
  const setParentTeamFilter = parentTeamState.set;
  
  const leaderState = useUrlState<string | null>({ 
    key: 'leader_id', 
    defaultValue: null,
    parse: (v) => v || null,
  });
  const leaderFilter = leaderState.value;
  const setLeaderFilter = leaderState.set;

  const areaState = useUrlState<string | null>({ 
    key: 'area_id', 
    defaultValue: null,
    parse: (v) => v || null,
  });
  const areaFilter = areaState.value;
  const setAreaFilter = areaState.set;
  
  
  
  const showInactiveState = useUrlState<boolean>({ 
    key: 'show_inactive', 
    defaultValue: false,
    parse: parsers.boolean,
  });
  const showInactive = showInactiveState.value;
  const setShowInactive = showInactiveState.set;
  
  // Local state
  const [editingTeam, setEditingTeam] = useState<TeamWithRelations | null>(null);
  const [selectedSquad, setSelectedSquad] = useState<SquadWithRelations | null>(null);

  const { data: teams, isLoading } = useTeams(showInactive);
  const { data: squads, isLoading: isLoadingSquads } = useSquads();
  useTeamTree(showInactive); // keep for potential future use
  const stats = useTeamStats();
  const { has, isWildcard } = usePermissions();
  
  // BU admin ou super_admin podem criar times via permission key
  const canCreateTeams = isWildcard || has("teams.team.create:bu");

  // Separate parent teams and sub-teams
  const { parentTeams: mainTeams, subTeams } = useMemo(() => {
    if (!teams) return { parentTeams: [], subTeams: [] };
    return {
      parentTeams: teams.filter((t) => !t.parent_team_id),
      subTeams: teams.filter((t) => t.parent_team_id),
    };
  }, [teams]);

  // Get parent teams for filter dropdown
  const parentTeamsForFilter = useMemo(() => {
    if (!teams) return [];
    return teams
      .filter((t) => !t.parent_team_id && t.child_teams && t.child_teams.length > 0)
      .map((t) => ({ id: t.id, name: t.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teams]);

  // Get unique leaders for filter
  const leaders = useMemo(() => {
    if (!teams) return [];
    const leaderMap = new Map<string, { id: string; display_name: string }>();
    teams.forEach((t) => {
      if (t.leader) {
        leaderMap.set(t.leader.id, {
          id: t.leader.id,
          display_name: t.leader.display_name,
        });
      }
    });
    return Array.from(leaderMap.values()).sort((a, b) =>
      a.display_name.localeCompare(b.display_name)
    );
  }, [teams]);

  // Get unique areas for filter
  const areasForFilter = useMemo(() => {
    if (!teams) return [];
    const areaMap = new Map<string, { id: string; name: string; color: string | null }>();
    teams.forEach((t) => {
      if (t.area) {
        areaMap.set(t.area.id, {
          id: t.area.id,
          name: t.area.name,
          color: t.area.color,
        });
      }
    });
    return Array.from(areaMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [teams]);

  // Filter teams
  const filterTeams = (teamList: TeamWithRelations[]) => {
    return teamList.filter((team) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesName = team.name.toLowerCase().includes(searchLower);
        const matchesLeader = team.leader?.display_name
          ?.toLowerCase()
          .includes(searchLower);
        if (!matchesName && !matchesLeader) return false;
      }

      // Parent team filter
      if (parentTeamFilter === "root") {
        if (team.parent_team_id) return false;
      } else if (parentTeamFilter) {
        if (team.parent_team_id !== parentTeamFilter && team.id !== parentTeamFilter) {
          return false;
        }
      }

      // Leader filter
      if (leaderFilter === "none") {
        if (team.leader) return false;
      } else if (leaderFilter) {
        if (team.leader?.id !== leaderFilter) return false;
      }

      // Area filter
      if (areaFilter === "none") {
        if (team.area) return false;
      } else if (areaFilter) {
        if (team.area?.id !== areaFilter) return false;
      }

      return true;
    });
  };

  const filteredMainTeams = filterTeams(mainTeams);
  const filteredSubTeams = filterTeams(subTeams);
  const filteredSquads = useMemo(() => {
    if (!squads) return [];
    if (!search) return squads;
    const searchLower = search.toLowerCase();
    return squads.filter((squad) =>
      squad.name.toLowerCase().includes(searchLower)
    );
  }, [squads, search]);

  const totalSquads = squads?.length || 0;

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Estrutura Organizacional"
          description="Times, Sub-times e Squads"
          breadcrumbs={[{ label: "Times" }]}
          actions={canCreateTeams && <TeamFormDialog />}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">
                      {mainTeams.filter(t => t.status === 'active').length}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Times</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Layers3 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">
                      {subTeams.filter(t => t.status === 'active').length}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Sub-times</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Box className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  {isLoadingSquads ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">
                      {totalSquads}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Squads</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-info">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-info" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">
                      {stats.totalMembers}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Pessoas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-muted">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">
                      {stats.averageMembers}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Média/time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <TeamFilters
          search={search}
          onSearchChange={setSearch}
          parentTeamId={parentTeamFilter}
          onParentTeamChange={setParentTeamFilter}
          leaderId={leaderFilter}
          onLeaderChange={setLeaderFilter}
          areaId={areaFilter}
          onAreaChange={setAreaFilter}
          parentTeams={parentTeamsForFilter}
          leaders={leaders}
          areas={areasForFilter}
        />

        <div className="flex items-center justify-between">
          <Button variant="outline" asChild>
            <Link to="/teams/org-chart?fullscreen=true" target="_blank" rel="noopener noreferrer">
              <Network className="w-4 h-4 mr-2" />
              Ver Organograma
            </Link>
          </Button>
          
          <div className="flex items-center gap-2">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <Label htmlFor="show-inactive" className="text-sm cursor-pointer">
              Mostrar inativos
            </Label>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* TIMES SECTION */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Times</h2>
                    <p className="text-sm text-muted-foreground">
                      Estrutura organizacional principal • {filteredMainTeams.length} time{filteredMainTeams.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {filteredMainTeams.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMainTeams.map((team) => (
                      <TeamCard
                        key={team.id}
                        team={team}
                        variant="team"
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="bg-muted/30">
                    <CardContent className="py-8">
                      <EmptyState
                        icon={Building2}
                        title="Nenhum time encontrado"
                        description={search ? "Nenhum time corresponde à busca." : "Não há times cadastrados."}
                      />
                    </CardContent>
                  </Card>
                )}
              </section>

              {/* SUB-TIMES SECTION */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Layers3 className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Sub-times</h2>
                    <p className="text-sm text-muted-foreground">
                      Times subordinados a outros times • {filteredSubTeams.length} sub-time{filteredSubTeams.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {filteredSubTeams.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSubTeams.map((team) => (
                      <TeamCard
                        key={team.id}
                        team={team}
                        variant="subteam"
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="bg-muted/30">
                    <CardContent className="py-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        {search ? "Nenhum sub-time corresponde à busca." : "Não há sub-times cadastrados."}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </section>

              {/* SQUADS SECTION */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Box className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Squads</h2>
                    <p className="text-sm text-muted-foreground">
                      Estruturas operacionais de entrega • {filteredSquads.length} squad{filteredSquads.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {isLoadingSquads ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-6 space-y-4">
                          <Skeleton className="h-6 w-32" />
                          <Skeleton className="h-4 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredSquads.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSquads.map((squad) => (
                      <SquadCard
                        key={squad.id}
                        squad={squad}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="bg-muted/30">
                    <CardContent className="py-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        {search ? "Nenhum squad corresponde à busca." : "Não há squads cadastrados."}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {/* Edit Team Dialog */}
      {editingTeam && (
        <TeamFormDialog
          team={editingTeam}
          open={true}
          onOpenChange={(open) => !open && setEditingTeam(null)}
        />
      )}

      {/* Squad Detail Dialog */}
      <SquadDetailDialog
        squad={selectedSquad}
        open={!!selectedSquad}
        onOpenChange={(open) => !open && setSelectedSquad(null)}
      />
    </HubLayout>
  );
}
