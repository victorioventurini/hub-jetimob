import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Edit,
  Users,
  Building2,
  ChevronRight,
  UserCircle,
  Mail,
  Layers,
  MoreHorizontal,
  Trash2,
  Target,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useTeam, useDeleteTeam } from "../hooks";
import { useSquads } from "../hooks";
import { TeamFormDialog } from "../components/TeamFormDialog";
import { SquadSection } from "../components/SquadSection";
import { TeamMemberRow } from "../components/TeamMemberRow";
import { SubteamMembersBlock } from "../components/SubteamMembersBlock";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { useTeamManagement } from "@/hooks/useTeamManagement";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TeamCheckinSettings } from "@/modules/okrs/components/TeamCheckinSettings";
import { TeamContributionTab } from "../components/contribution/TeamContributionTab";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
// TeamsBreadcrumb removido - usando PageHeader.breadcrumbs (padrão canônico)
import { useUrlTab } from "@/shared/url";
import { useSafeBack } from "@/hooks/useSafeBack";

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: team, isLoading, error } = useTeam(id);
  const { data: squads } = useSquads(id);
  const deleteTeam = useDeleteTeam();
  const goBack = useSafeBack({ moduleRoot: "/teams" });
  
  usePageTitle(team?.name ? `${team.name} - Times` : "Times");
  
  // URL State
  const [activeTab, setActiveTab] = useUrlTab<string>('members');
  
  // Local state
  const [editOpen, setEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSubteamId, setDeletingSubteamId] = useState<string | null>(null);
  const [deletingSubteamName, setDeletingSubteamName] = useState<string>("");
  const { isAdmin, user } = useAuth();
  const { currentBuId } = useBu();
  const { canManageTeam } = useTeamManagement();
  
  // Verificar se usuário pode gerenciar ESTE time específico
  const canManageThisTeam = id ? canManageTeam(id) : false;


  if (isLoading) {
    return (
      <HubLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </HubLayout>
    );
  }

  if (error) {
    return (
      <HubLayout>
        <div className="p-6">
          <ErrorState
            title="Erro ao carregar time"
            description="Não foi possível carregar os dados do time. Tente novamente."
            onBack={goBack}
          />
        </div>
      </HubLayout>
    );
  }

  if (!team) {
    return (
      <HubLayout>
        <div className="p-6 space-y-6">
          <PageHeader
            title="Time não encontrado"
            breadcrumbs={[
              { label: "Times", href: "/teams" },
              { label: "Não encontrado" }
            ]}
          />
          <ErrorState
            title="Time não encontrado"
            description="O time que você está procurando não existe ou foi removido."
            onBack={goBack}
            backLabel="Voltar para Times"
          />
        </div>
      </HubLayout>
    );
  }

  // BU SCOPE GUARD (defense-in-depth): se o cache servir um time de outra BU,
  // recusa renderização enquanto a BU ativa for diferente.
  if (currentBuId && (team as any).bu_id && (team as any).bu_id !== currentBuId) {
    return (
      <HubLayout>
        <div className="p-6 space-y-6">
          <PageHeader
            title="Time de outra BU"
            breadcrumbs={[
              { label: "Times", href: "/teams" },
              { label: "Acesso negado" }
            ]}
          />
          <ErrorState
            title="Esse time pertence a outra BU 🔒"
            description="Você está visualizando o Next em uma BU diferente da BU desse time. Selecione a BU correta no topo da tela para acessá-lo."
            onBack={goBack}
            backLabel="Voltar para Times"
          />
        </div>
      </HubLayout>
    );
  }

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header com breadcrumbs integrados (padrão canônico) */}
        <PageHeader
          title={team.name}
          description={team.description || undefined}
          breadcrumbs={[
            { label: "Times", href: "/teams" },
            { label: team.name }
          ]}
          actions={
            <div className="flex items-center gap-2">
              {team.status === "inactive" && (
                <Badge variant="secondary">Inativo</Badge>
              )}
              {canManageThisTeam && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setEditOpen(true)}
                >
                  <Edit className="h-4 w-4" />
                  Editar Time
                </Button>
              )}
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-6 w-6 mx-auto mb-2 text-accent" />
                  <p className="text-2xl font-bold">{team.member_count}</p>
                  <p className="text-xs text-muted-foreground">Membros</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Building2 className="h-6 w-6 mx-auto mb-2 text-accent" />
                  <p className="text-2xl font-bold">
                    {team.child_teams?.length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Sub-times</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Layers className="h-6 w-6 mx-auto mb-2 text-accent" />
                  <p className="text-2xl font-bold">
                    {squads?.length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Squads</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="members">Membros</TabsTrigger>
                <TabsTrigger value="contribution">Contribuição</TabsTrigger>
                <TabsTrigger value="squads">Squads</TabsTrigger>
                <TabsTrigger value="subteams">Sub-times</TabsTrigger>
                <TabsTrigger value="rituals">Rituais</TabsTrigger>
              </TabsList>

              <TabsContent value="members" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Membros diretos do time ({team.member_count})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {team.members && team.members.length > 0 ? (
                      <div className="space-y-3">
                        {team.members.map((member: any) => (
                          <TeamMemberRow
                            key={member.id}
                            id={member.id}
                            display_name={member.display_name}
                            photo_url={member.photo_url}
                            job_title={member.job_title}
                            work_email={member.work_email}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          Nenhum membro direto neste time
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {team.child_teams && team.child_teams.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Membros dos sub-times ({team.child_teams.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[...team.child_teams]
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((subteam) => (
                            <SubteamMembersBlock
                              key={subteam.id}
                              id={subteam.id}
                              name={subteam.name}
                              status={subteam.status}
                            />
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="contribution" className="mt-4">
                <TeamContributionTab teamId={team.id} teamName={team.name} />
              </TabsContent>

              <TabsContent value="squads" className="mt-4">
                <SquadSection teamId={team.id} teamName={team.name} />
              </TabsContent>

              <TabsContent value="subteams" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Sub-times ({team.child_teams?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {team.child_teams && team.child_teams.length > 0 ? (
                      <div className="space-y-2">
                        {team.child_teams.map((subteam) => (
                          <div
                            key={subteam.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                          >
                            <Link
                              to={`/teams/${subteam.id}`}
                              className="flex items-center gap-3 flex-1"
                            >
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                              <span className="font-medium">{subteam.name}</span>
                              {subteam.status === "inactive" && (
                                <Badge variant="secondary" className="text-xs">
                                  Inativo
                                </Badge>
                              )}
                            </Link>
                            <div className="flex items-center gap-2">
                              {canManageThisTeam && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                      <Link to={`/teams/${subteam.id}`}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Ver detalhes
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setDeletingSubteamId(subteam.id);
                                        setDeletingSubteamName(subteam.name);
                                        setDeleteDialogOpen(true);
                                      }}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          Este time não possui sub-times
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rituals" className="mt-4">
                <TeamCheckinSettings
                  teamId={team.id}
                  teamName={team.name}
                  currentFrequency={(team as any).checkin_frequency || 'weekly'}
                  currentDay={(team as any).checkin_day || 1}
                  currentDeadlineHour={(team as any).checkin_deadline_hour || 18}
                  isLeader={isAdmin || team.leader?.id === user?.id}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Leader Card — alinhado ao padrão dos demais cards da sidebar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Líder do Time</CardTitle>
              </CardHeader>
              <CardContent>
                {team.leader ? (
                  <TeamMemberRow
                    id={team.leader.id}
                    display_name={team.leader.display_name}
                    photo_url={team.leader.photo_url}
                    job_title={team.leader.job_title ?? null}
                    work_email={team.leader.work_email ?? null}
                  />
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-muted-foreground">
                    <UserCircle className="h-5 w-5" />
                    <span className="text-sm">Sem líder definido</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Parent Team */}
            {team.parent_team && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Time Pai</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link
                    to={`/teams/${team.parent_team.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{team.parent_team.name}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                  </Link>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <TeamFormDialog
        team={team}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      {/* Delete Subteam Dialog */}
      <ConfirmDialog variant="destructive"
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setDeletingSubteamId(null);
            setDeletingSubteamName("");
          }
        }}
        onConfirm={async () => {
          if (deletingSubteamId) {
            await deleteTeam.mutateAsync(deletingSubteamId);
            setDeleteDialogOpen(false);
            setDeletingSubteamId(null);
            setDeletingSubteamName("");
          }
        }}
        title="Excluir Sub-time"
        description={`Tem certeza que deseja excluir o sub-time "${deletingSubteamName}"? Esta ação não pode ser desfeita.`}
        isLoading={deleteTeam.isPending}
      />
    </HubLayout>
  );
}
