// Users page with BU filtering
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HubLayout } from "@/components/layout/HubLayout";
import { Button } from "@/components/ui/button";
import { useBu } from "@/contexts/BuContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  MoreHorizontal,
  Mail,
  Building2,
  MapPin,
  Users,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { JetimoberDialog } from "@/components/users/JetimoberDialog";
import { useHierarchicalTeamList } from "@/modules/teams/hooks/useTeams";

interface ProfileWithTeam {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  display_name: string;
  work_email: string;
  job_title: string;
  photo_url: string | null;
  city: string;
  state: string;
  work_mode: "onsite" | "hybrid" | "remote";
  employment_status: "active" | "vacation" | "terminated";
  team: { id: string; name: string } | null;
  manager: { id: string; display_name: string } | null;
}

const workModeLabels: Record<string, string> = {
  onsite: "Presencial",
  hybrid: "Híbrido",
  remote: "Remoto",
};

const statusLabels: Record<string, string> = {
  active: "Ativo",
  vacation: "Férias",
  terminated: "Desligado",
};

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  vacation: "bg-warning/10 text-warning border-warning/20",
  terminated: "bg-muted text-muted-foreground border-muted",
};

export default function UsersPage() {
  usePageTitle("Jetimobers");
  
  const { isAdmin } = useAuth();
  const { currentBu, isLoading: isBuLoading } = useBu();
  const [searchQuery, setSearchQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProfileWithTeam | null>(null);

  console.log("[UsersPage] currentBu", {
    id: currentBu?.id,
    name: currentBu?.name,
    isBuLoading,
  });

  const { data: profiles, isLoading, error: profilesError } = useQuery({
    queryKey: ["profiles", statusFilter, currentBu?.id],
    queryFn: async () => {
      if (!currentBu?.id) return [];
      
      let query = supabase
        .from("profiles")
        .select(`
          id,
          user_id,
          first_name,
          last_name,
          display_name,
          work_email,
          job_title,
          photo_url,
          city,
          state,
          work_mode,
          employment_status,
          team_id,
          team:teams!fk_profiles_team(id, name),
          manager_user_id
        `)
        .eq("bu_id", currentBu.id)
        .is("deleted_at", null)
        .order("display_name");

      if (statusFilter === "active") {
        query = query.neq("employment_status", "terminated" as const);
      } else if (statusFilter !== "all") {
        query = query.eq("employment_status", statusFilter as "active" | "vacation" | "terminated");
      }

      const { data, error } = await query;
      if (error) throw error;

      console.log("[UsersPage] fetched profiles", {
        buId: currentBu.id,
        count: data?.length ?? 0,
      });

      return (data || []).map((p) => ({
        id: p.id,
        user_id: p.user_id,
        first_name: p.first_name,
        last_name: p.last_name,
        display_name: p.display_name,
        work_email: p.work_email,
        job_title: p.job_title,
        photo_url: p.photo_url,
        city: p.city,
        state: p.state,
        work_mode: p.work_mode,
        employment_status: p.employment_status,
        team: p.team as { id: string; name: string } | null,
        manager: null as { id: string; display_name: string } | null,
      })) as ProfileWithTeam[];
    },
    enabled: !!currentBu?.id,
  });

  const { teams: hierarchicalTeams, isLoading: teamsLoading, error: teamsError } = useHierarchicalTeamList();

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const filteredProfiles = profiles?.filter((profile) => {
    const matchesSearch =
      profile.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.work_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.job_title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTeam =
      teamFilter === "all" || profile.team?.id === teamFilter;

    return matchesSearch && matchesTeam;
  });

  const handleEdit = (profile: ProfileWithTeam) => {
    setEditingProfile(profile);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingProfile(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProfile(null);
  };

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Jetimobers</h1>
            <p className="text-muted-foreground">
              Diretório de colaboradores da Jetimob
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-3">
              <Button variant="accent" className="gap-2" onClick={handleCreate}>
                <Plus className="h-4 w-4" />
                Novo Jetimober
              </Button>
            </div>
          )}
        </div>

        {!isBuLoading && !currentBu && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Nenhuma BU selecionada</AlertTitle>
            <AlertDescription>
              Selecione uma BU no topo (ao lado do seu avatar) e tente novamente.
            </AlertDescription>
          </Alert>
        )}

        {profilesError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro ao carregar usuários</AlertTitle>
            <AlertDescription>
              {(profilesError as Error).message}
            </AlertDescription>
          </Alert>
        )}

        {teamsError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro ao carregar times</AlertTitle>
            <AlertDescription>{(teamsError as Error).message}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou cargo..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os times</SelectItem>
              {hierarchicalTeams?.map((team) => (
                <SelectItem 
                  key={team.id} 
                  value={team.id}
                  className={team.level > 0 ? "text-[13px]" : ""}
                >
                  <span style={{ paddingLeft: `${team.level * 12}px` }}>
                    {team.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="vacation">Férias</SelectItem>
              <SelectItem value="terminated">Desligados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          {isLoading ? (
            <Skeleton className="h-4 w-32 inline-block" />
          ) : (
            <>
              {filteredProfiles?.length || 0}{" "}
              {filteredProfiles?.length === 1
                ? "jetimober encontrado"
                : "jetimobers encontrados"}
            </>
          )}
        </p>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold">Cargo</TableHead>
                <TableHead className="font-semibold">Time</TableHead>
                <TableHead className="font-semibold">Gestor</TableHead>
                <TableHead className="font-semibold">Localização</TableHead>
                <TableHead className="font-semibold">Modalidade</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                {isAdmin && <TableHead className="w-10"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                    {isAdmin && <TableCell></TableCell>}
                  </TableRow>
                ))
              ) : filteredProfiles && filteredProfiles.length > 0 ? (
                filteredProfiles.map((profile) => (
                  <TableRow key={profile.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={profile.photo_url || undefined} />
                          <AvatarFallback className="bg-accent/10 text-accent text-sm font-semibold">
                            {getInitials(profile.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {profile.display_name}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {profile.work_email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{profile.job_title}</TableCell>
                    <TableCell>
                      {profile.team ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {profile.team.name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {profile.manager?.display_name || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {profile.city}, {profile.state}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {workModeLabels[profile.work_mode] || profile.work_mode}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[profile.employment_status]}
                      >
                        {statusLabels[profile.employment_status]}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(profile)}>
                              Editar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} className="h-32">
                    <div className="flex flex-col items-center justify-center text-center">
                      <Users className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="font-medium">Nenhum Jetimober encontrado</p>
                      <p className="text-sm text-muted-foreground">
                        {searchQuery || teamFilter !== "all"
                          ? "Tente ajustar os filtros"
                          : "Adicione o primeiro colaborador"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <JetimoberDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        profile={editingProfile}
      />
    </HubLayout>
  );
}
