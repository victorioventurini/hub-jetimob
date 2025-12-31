import { useState } from "react";
import { HubLayout } from "@/components/layout/HubLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LayoutGrid, GitBranch, Users, Building2 } from "lucide-react";
import { useTeams, useTeamTree, useTeamStats } from "../hooks/useTeams";
import { CreateTeamDialog } from "../components/CreateTeamDialog";
import { EditTeamDialog } from "../components/EditTeamDialog";
import { TeamCard } from "../components/TeamCard";
import { TeamTreeView } from "../components/TeamTreeView";
import { TeamWithRelations } from "../types";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function TeamsPage() {
  const [showInactive, setShowInactive] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamWithRelations | null>(null);
  const { data: teams, isLoading } = useTeams(showInactive);
  const { tree } = useTeamTree();
  const stats = useTeamStats();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

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
              Estrutura organizacional da Jetimob
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && <CreateTeamDialog />}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalActive}
                </p>
              )}
              <p className="text-sm text-muted-foreground">Times ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalMembers}
                </p>
              )}
              <p className="text-sm text-muted-foreground">Total de pessoas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold text-foreground">
                  {stats.parentTeams}
                </p>
              )}
              <p className="text-sm text-muted-foreground">Times pai</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold text-foreground">
                  {stats.averageMembers}
                </p>
              )}
              <p className="text-sm text-muted-foreground">Média por time</p>
            </CardContent>
          </Card>
        </div>

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
              ) : teams && teams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map((team) => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      onEdit={isAdmin ? setEditingTeam : undefined}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhum time encontrado</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      {showInactive
                        ? "Não há times cadastrados."
                        : "Não há times ativos. Ative a opção para ver times inativos."}
                    </p>
                    {isAdmin && <CreateTeamDialog />}
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
