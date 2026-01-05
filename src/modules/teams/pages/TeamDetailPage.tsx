import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useTeam, useDeleteTeam } from "../hooks/useTeams";
import { useSquads } from "../hooks/useSquads";
import { EditTeamDialog } from "../components/EditTeamDialog";
import { SquadSection } from "../components/SquadSection";
import { useAuth } from "@/hooks/useAuth";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { TeamCheckinSettings } from "@/modules/okrs/components/TeamCheckinSettings";

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: team, isLoading } = useTeam(id);
  const { data: squads } = useSquads(id);
  const deleteTeam = useDeleteTeam();
  
  usePageTitle(team?.name ? `${team.name} - Times` : "Times");
  
  const [editOpen, setEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSubteamId, setDeletingSubteamId] = useState<string | null>(null);
  const [deletingSubteamName, setDeletingSubteamName] = useState<string>("");
  const { isAdmin, user } = useAuth();

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

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

  if (!team) {
    return (
      <HubLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Time não encontrado</h2>
          <p className="text-muted-foreground mb-4">
            O time que você está procurando não existe ou foi removido.
          </p>
          <Button onClick={() => navigate("/teams")}>Voltar para Times</Button>
        </div>
      </HubLayout>
    );
  }

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/teams")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">
                  {team.name}
                </h1>
                {team.status === "inactive" && (
                  <Badge variant="secondary">Inativo</Badge>
                )}
              </div>
              {team.description && (
                <p className="text-muted-foreground">{team.description}</p>
              )}
            </div>
          </div>
          {isAdmin && (
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
            <Tabs defaultValue="members">
              <TabsList>
                <TabsTrigger value="members">Membros</TabsTrigger>
                <TabsTrigger value="contribution">Contribuição</TabsTrigger>
                <TabsTrigger value="squads">Squads</TabsTrigger>
                <TabsTrigger value="subteams">Sub-times</TabsTrigger>
                <TabsTrigger value="rituals">Rituais</TabsTrigger>
              </TabsList>

              <TabsContent value="members" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Membros do Time ({team.member_count})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {team.members && team.members.length > 0 ? (
                      <div className="space-y-3">
                        {team.members.map((member: any) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  src={member.photo_url || undefined}
                                />
                                <AvatarFallback className="bg-accent/10 text-accent">
                                  {getInitials(member.display_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {member.display_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {member.job_title}
                                </p>
                              </div>
                            </div>
                            <a
                              href={`mailto:${member.work_email}`}
                              className="text-muted-foreground hover:text-accent"
                            >
                              <Mail className="h-4 w-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          Nenhum membro neste time
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contribution" className="mt-4">
                <Card>
                  <CardContent className="p-6 text-center">
                    <Target className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <h3 className="font-medium mb-2">Visualizar Contribuição Organizacional</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Veja como este time contribui para os Objetivos Organizacionais através de seus OKRs.
                    </p>
                    <Button onClick={() => navigate(`/okrs/team-contribution/${team.id}`)}>
                      Ver Contribuição Completa
                    </Button>
                  </CardContent>
                </Card>
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
                              {isAdmin && (
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
            {/* Leader Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Líder do Time</CardTitle>
              </CardHeader>
              <CardContent>
                {team.leader ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={team.leader.photo_url || undefined} />
                      <AvatarFallback className="bg-accent/10 text-accent text-lg">
                        {getInitials(team.leader.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{team.leader.display_name}</p>
                      {(team.leader as any).job_title && (
                        <p className="text-sm text-muted-foreground">
                          {(team.leader as any).job_title}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <UserCircle className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Sem líder definido</p>
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

            {/* Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant={
                      team.status === "active" ? "default" : "secondary"
                    }
                  >
                    {team.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criado em</span>
                  <span>
                    {new Date(team.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Atualizado em</span>
                  <span>
                    {new Date(team.updated_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <EditTeamDialog
        team={team}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      {/* Delete Subteam Dialog */}
      <DeleteConfirmDialog
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
