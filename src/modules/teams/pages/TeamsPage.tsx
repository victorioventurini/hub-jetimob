import { useState, useMemo } from "react";
import { HubLayout } from "@/components/layout/HubLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LayoutGrid, GitBranch, Building2, Users, Network } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useTeams, useTeamTree, useTeamStats, useAvailableLeaders } from "../hooks/useTeams";
import { CreateTeamDialog } from "../components/CreateTeamDialog";
import { EditTeamDialog } from "../components/EditTeamDialog";
import { TeamCard } from "../components/TeamCard";
import { TeamTreeView } from "../components/TeamTreeView";
import { TeamFilters } from "../components/TeamFilters";
import { TeamWithRelations } from "../types";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/ui/empty-state";

export default function TeamsPage() {
  usePageTitle("Times");
  const [showInactive, setShowInactive] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamWithRelations | null>(null);
  const [search, setSearch] = useState("");
  const [parentTeamFilter, setParentTeamFilter] = useState<string | null>(null);
  const [leaderFilter, setLeaderFilter] = useState<string | null>(null);

  const { data: teams, isLoading } = useTeams(showInactive);
  const { tree } = useTeamTree();
  const stats = useTeamStats();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // Get parent teams for filter
  const parentTeams = useMemo(() => {
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

  // Filter teams
  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    return teams.filter((team) => {
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

      return true;
    });
  }, [teams, search, parentTeamFilter, leaderFilter]);

  const filteredTree = showInactive
    ? tree
    : tree.filter((node) => node.status === "active");

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Times</h1>
            <p className="text-muted-foreground">
              Estrutura organizacional
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && <CreateTeamDialog />}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                      {stats.totalActive}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Times ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-accent" />
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

          <Card className="border-l-4 border-l-secondary">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <Network className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">
                      {stats.parentTeams}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Times pai</p>
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
          parentTeams={parentTeams}
          leaders={leaders}
        />

        {/* View Toggle */}
        <div className="flex items-center justify-between">
          <Tabs defaultValue="grid" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="grid" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Grade
                </TabsTrigger>
                <TabsTrigger value="tree" className="gap-2">
                  <GitBranch className="h-4 w-4" />
                  Hierarquia
                </TabsTrigger>
              </TabsList>

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

            {/* Grid View */}
            <TabsContent value="grid">
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
              ) : filteredTeams && filteredTeams.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    {filteredTeams.length} time{filteredTeams.length !== 1 ? "s" : ""} encontrado{filteredTeams.length !== 1 ? "s" : ""}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTeams.map((team) => (
                      <TeamCard
                        key={team.id}
                        team={team}
                        onEdit={isAdmin ? setEditingTeam : undefined}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="py-4">
                    <EmptyState
                      icon={Building2}
                      title="Nenhum time encontrado"
                      description={
                        search || parentTeamFilter || leaderFilter
                          ? "Nenhum time corresponde aos filtros aplicados."
                          : showInactive
                          ? "Não há times cadastrados."
                          : "Não há times ativos. Ative a opção para ver times inativos."
                      }
                      actionLabel={isAdmin && !search ? "Criar Time" : undefined}
                      onAction={undefined}
                    />
                    {isAdmin && !search && (
                      <div className="flex justify-center mt-2">
                        <CreateTeamDialog />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tree View */}
            <TabsContent value="tree">
              <Card>
                <CardContent className="p-4">
                  {isLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Skeleton className="h-5 w-5" />
                          <Skeleton className="h-5 w-40" />
                        </div>
                      ))}
                    </div>
                  ) : filteredTree.length > 0 ? (
                    <TeamTreeView
                      nodes={filteredTree}
                      onSelectTeam={(id) => navigate(`/teams/${id}`)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <GitBranch className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Nenhum time para exibir</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Dialog */}
      <EditTeamDialog
        team={editingTeam}
        open={!!editingTeam}
        onOpenChange={(open) => !open && setEditingTeam(null)}
      />
    </HubLayout>
  );
}
