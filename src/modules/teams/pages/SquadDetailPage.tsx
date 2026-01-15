import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Edit,
  Users,
  Building2,
  Layers,
  UserMinus,
  Plus,
  ChevronRight,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSquad, useUpdateSquadMember, useRemoveSquadMember } from "../hooks";
import { 
  SQUAD_PRODUCT_LABELS, 
  SQUAD_PRODUCT_COLORS,
  SQUAD_ROLE_LABELS,
  SquadRole
} from "../types/squad";
import { AddSquadMemberDialog } from "../components/AddSquadMemberDialog";
import { SquadFormDialog } from "../components/SquadFormDialog";
import { usePermissions } from "@/hooks/usePermissions";

export default function SquadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: squad, isLoading } = useSquad(id);
  const { has, isWildcard } = usePermissions();
  const updateMember = useUpdateSquadMember();
  const removeMember = useRemoveSquadMember();
  
  usePageTitle(squad?.name ? `${squad.name} - Squads` : "Squads");
  
  const canManageSquads = isWildcard || has("teams.squad.update:bu");

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleRoleChange = async (membershipId: string, role: SquadRole) => {
    if (!squad) return;
    await updateMember.mutateAsync({
      membershipId,
      squadId: squad.id,
      role,
    });
  };

  const handleRemoveMember = async (membershipId: string) => {
    if (!squad) return;
    await removeMember.mutateAsync({
      membershipId,
      squadId: squad.id,
    });
  };

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

  if (!squad) {
    return (
      <HubLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Layers className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Squad não encontrado</h2>
          <p className="text-muted-foreground mb-4">
            O squad que você está procurando não existe ou foi removido.
          </p>
          <Button asChild>
            <Link to="/teams">Voltar para Times</Link>
          </Button>
        </div>
      </HubLayout>
    );
  }

  // Group members by role
  const leaders = squad.members?.filter((m) => m.role !== "member") || [];
  const regularMembers = squad.members?.filter((m) => m.role === "member") || [];

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link to="/teams">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <Layers className="h-6 w-6 text-accent" />
                <h1 className="text-2xl font-bold text-foreground">
                  {squad.name}
                </h1>
                {squad.status === "inactive" && (
                  <Badge variant="secondary">Inativo</Badge>
                )}
              </div>
              {squad.description && (
                <p className="text-muted-foreground mt-1">{squad.description}</p>
              )}
            </div>
          </div>
          {canManageSquads && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setEditOpen(true)}
            >
              <Edit className="h-4 w-4" />
              Editar Squad
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-6 w-6 mx-auto mb-2 text-accent" />
                  <p className="text-2xl font-bold">{squad.member_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Membros</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Building2 className="h-6 w-6 mx-auto mb-2 text-accent" />
                  <p className="text-2xl font-bold">{squad.teams?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Times Vinculados</p>
                </CardContent>
              </Card>
            </div>

            {/* Leaders */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Liderança</CardTitle>
              </CardHeader>
              <CardContent>
                {leaders.length > 0 ? (
                  <div className="space-y-2">
                    {leaders.map((member) => (
                      <div 
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <Link
                          to={`/users/${member.user_id}`}
                          className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.user.photo_url || undefined} />
                            <AvatarFallback className="bg-accent/10 text-accent">
                              {getInitials(member.user.display_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.user.display_name}</p>
                            <p className="text-sm text-muted-foreground">{member.user.job_title}</p>
                          </div>
                        </Link>
                        <div className="flex items-center gap-2">
                          {canManageSquads ? (
                            <Select
                              value={member.role}
                              onValueChange={(v: SquadRole) => handleRoleChange(member.id, v)}
                            >
                              <SelectTrigger className="h-8 w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="product_owner">PO</SelectItem>
                                <SelectItem value="tech_lead">Tech Lead</SelectItem>
                                <SelectItem value="ux_ui_lead">UX / UI Lead</SelectItem>
                                <SelectItem value="member">Membro</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline">
                              {SQUAD_ROLE_LABELS[member.role]}
                            </Badge>
                          )}
                          {canManageSquads && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Nenhum líder definido</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Members */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  Membros ({regularMembers.length})
                </CardTitle>
                {canManageSquads && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="gap-1"
                    onClick={() => setAddMemberOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {regularMembers.length > 0 ? (
                  <div className="space-y-2">
                    {regularMembers.map((member) => (
                      <div 
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <Link
                          to={`/users/${member.user_id}`}
                          className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.user.photo_url || undefined} />
                            <AvatarFallback className="bg-accent/10 text-accent">
                              {getInitials(member.user.display_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.user.display_name}</p>
                            <p className="text-sm text-muted-foreground">{member.user.job_title}</p>
                          </div>
                        </Link>
                        {canManageSquads && (
                          <div className="flex items-center gap-2">
                            <Select
                              value={member.role}
                              onValueChange={(v: SquadRole) => handleRoleChange(member.id, v)}
                            >
                              <SelectTrigger className="h-8 w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="product_owner">PO</SelectItem>
                                <SelectItem value="tech_lead">Tech Lead</SelectItem>
                                <SelectItem value="ux_ui_lead">UX / UI Lead</SelectItem>
                                <SelectItem value="member">Membro</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Nenhum membro ainda</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Products */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Produtos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {squad.products.map((product) => (
                    <Badge 
                      key={product} 
                      variant="outline" 
                      className={SQUAD_PRODUCT_COLORS[product]}
                    >
                      {SQUAD_PRODUCT_LABELS[product]}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Linked Teams */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Times Vinculados</CardTitle>
              </CardHeader>
              <CardContent>
                {squad.teams && squad.teams.length > 0 ? (
                  <div className="space-y-2">
                    {squad.teams.map((team) => (
                      <Link
                        key={team.id}
                        to={`/teams/${team.id}`}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{team.name}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-sm">Nenhum time vinculado</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={squad.status === "active" ? "default" : "secondary"}>
                    {squad.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criado em</span>
                  <span>
                    {new Date(squad.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {squad && (
        <>
          <AddSquadMemberDialog
            squadId={squad.id}
            open={addMemberOpen}
            onOpenChange={setAddMemberOpen}
            existingMemberIds={squad.members?.map((m) => m.user_id) || []}
          />
          <SquadFormDialog
            squad={squad}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
        </>
      )}
    </HubLayout>
  );
}
