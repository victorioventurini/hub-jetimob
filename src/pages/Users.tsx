// Users page with BU filtering and server-side pagination
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
import { queryKeys } from "@/lib/queryKeys";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { useBu } from "@/contexts/BuContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TeamSelect, SimpleSelect } from "@/components/selects";
import {
  Search,
  Plus,
  MoreHorizontal,
  Mail,
  Building2,
  MapPin,
  Users,
  AlertTriangle,
  Pencil,
  X,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { JetimoberDialog } from "@/components/users/JetimoberDialog";
import { BulkEditDialog } from "@/components/users/BulkEditDialog";
import { UrlPagination } from "@/shared/filters";
import { useUrlState, parsers } from "@/shared/url";
import { UserHoverCard } from "@/components/user/UserHoverCard";

import { useDeleteProfile, useTransferDependencies } from "@/hooks/useProfiles";
import { useUserDependencies } from "@/hooks/useUserDependencies";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { UserDependenciesDialog } from "@/components/users/UserDependenciesDialog";

interface ProfileWithTeam {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  display_name: string;
  work_email: string;
  job_title_name: string;
  job_title_id: string | null;
  photo_url: string | null;
  city: string;
  state: string;
  work_mode: "onsite" | "hybrid" | "remote";
  employment_status: "active" | "vacation" | "terminated" | "external";
  team: { id: string; name: string } | null;
  manager: { id: string; display_name: string; photo_url: string | null } | null;
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
  
  const { isWildcard, has } = usePermissions();
  const { currentBu, isLoading: isBuLoading } = useBu();
  
  // Admin de BU ou super_admin podem gerenciar usuários via permission key
  const canManageUsers = isWildcard || has("users.profile.manage:bu");
  
  // URL State - object API with pagination
  const searchState = useUrlState<string>({ key: 'q', defaultValue: '' });
  const searchQuery = searchState.value;
  
  const teamFilterState = useUrlState<string>({ key: 'team_id', defaultValue: 'all' });
  const teamFilter = teamFilterState.value;
  
  const statusFilterState = useUrlState<string>({ key: 'status', defaultValue: 'active' });
  const statusFilter = statusFilterState.value;
  
  // Pagination URL state
  const pageState = useUrlState<number>({ key: "page", defaultValue: 1, parse: parsers.number });
  const pageSizeState = useUrlState<number>({ key: "pageSize", defaultValue: 25, parse: parsers.number });
  const page = pageState.value;
  const pageSize = pageSizeState.value;
  
  // Handlers that reset page
  const setSearchQuery = (v: string) => {
    searchState.set(v);
    pageState.set(1);
  };
  const setTeamFilter = (v: string) => {
    teamFilterState.set(v);
    pageState.set(1);
  };
  const setStatusFilter = (v: string) => {
    statusFilterState.set(v);
    pageState.set(1);
  };
  const setPage = pageState.set;
  const handlePageSizeChange = (newSize: number) => {
    pageSizeState.set(newSize);
    pageState.set(1);
  };
  
  // Local state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProfileWithTeam | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dependenciesDialogOpen, setDependenciesDialogOpen] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState<ProfileWithTeam | null>(null);

  const deleteProfile = useDeleteProfile();
  const transferDependencies = useTransferDependencies();

  // Check dependencies for the profile being deleted
  const deps = useUserDependencies(deletingProfile?.id ?? null);

  // Open the correct dialog based on dependencies when deletingProfile is set
  useEffect(() => {
    if (deletingProfile && !deps.isLoading) {
      if (deps.hasMandatoryDependencies) {
        setDependenciesDialogOpen(true);
      } else {
        setDeleteDialogOpen(true);
      }
    }
  }, [deletingProfile, deps.isLoading, deps.hasMandatoryDependencies]);

  // Pagination calc
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: profilesData, isLoading, error: profilesError } = useQuery({
    queryKey: queryKeys.users.directory(currentBu?.id ?? null, { 
      q: searchQuery || undefined, 
      teamId: teamFilter !== 'all' ? teamFilter : undefined,
      status: statusFilter,
      page,
      pageSize,
    }),
    queryFn: async (): Promise<{ profiles: ProfileWithTeam[]; total: number }> => {
      if (!currentBu?.id) return { profiles: [], total: 0 };
      
      // Use RPC that filters by bu_user_memberships (consistent with /hub/users)
      const { data, error } = await supabase.rpc("get_bu_users_by_membership", {
        p_bu_id: currentBu.id,
        p_search: searchQuery?.trim() || null,
        p_team_id: teamFilter !== 'all' ? teamFilter : null,
        p_status: statusFilter || 'active',
        p_limit: pageSize,
        p_offset: from,
      });

      if (error) throw error;

      const totalCount = (data && data.length > 0) ? Number(data[0].total_count) : 0;

      // Coletar manager_user_ids únicos para buscar em lote
      const managerIds = [...new Set((data || []).map((p: { manager_user_id: string | null }) => p.manager_user_id).filter(Boolean))] as string[];
      
      // Buscar managers em uma query separada
      let managersMap: Record<string, { id: string; display_name: string | null; photo_url: string | null }> = {};
      if (managerIds.length > 0) {
        const { data: managersData } = await supabase
          .from("profiles")
          .select("id, display_name, photo_url")
          .in("id", managerIds);
        
        if (managersData) {
          managersMap = Object.fromEntries(managersData.map(m => [m.id, m]));
        }
      }

      const profiles = (data || []).map((p: {
        profile_id: string;
        user_id: string | null;
        first_name: string;
        last_name: string;
        display_name: string;
        work_email: string;
        job_title_name: string | null;
        job_title_id: string | null;
        photo_url: string | null;
        city: string;
        state: string;
        work_mode: string;
        employment_status: string;
        team_id: string | null;
        team_name: string | null;
        manager_user_id: string | null;
      }) => ({
        id: p.profile_id,
        user_id: p.user_id,
        first_name: p.first_name,
        last_name: p.last_name,
        display_name: p.display_name,
        work_email: p.work_email,
        job_title_name: p.job_title_name || "Sem cargo",
        job_title_id: p.job_title_id,
        photo_url: p.photo_url,
        city: p.city,
        state: p.state,
        work_mode: p.work_mode,
        employment_status: p.employment_status,
        team: p.team_id && p.team_name ? { id: p.team_id, name: p.team_name } : null,
        manager: p.manager_user_id ? managersMap[p.manager_user_id] ?? null : null,
      })) as ProfileWithTeam[];

      return { profiles, total: totalCount };
    },
    enabled: !!currentBu?.id,
  });

  const profiles = profilesData?.profiles ?? [];
  const totalProfiles = profilesData?.total ?? 0;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // Filtering is now fully server-side via RPC
  // No client-side filter needed - this was causing search to break
  const filteredProfiles = profiles;

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

  // Selection handlers
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (!filteredProfiles) return;
    
    if (selectedIds.size === filteredProfiles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProfiles.map((p) => p.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const allSelected =
    filteredProfiles && filteredProfiles.length > 0 && selectedIds.size === filteredProfiles.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Jetimobers"
          description="Diretório de colaboradores da Jetimob"
          actions={
            canManageUsers && (
              <Button variant="accent" className="gap-2" onClick={handleCreate}>
                <Plus className="h-4 w-4" />
                Novo Jetimober
              </Button>
            )
          }
        />

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
          <TeamSelect
            value={teamFilter === "all" ? undefined : teamFilter}
            onValueChange={(v) => setTeamFilter(v ?? "all")}
            includeAll
            allLabel="Todos os times"
            placeholder="Time"
            triggerClassName="w-[220px]"
          />
          <SimpleSelect
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={[
              { value: "all", label: "Todos" },
              { value: "active", label: "Ativos" },
              { value: "vacation", label: "Férias" },
              { value: "terminated", label: "Desligados" },
            ]}
            placeholder="Status"
            triggerClassName="w-[180px]"
          />
        </div>

        {/* Bulk action bar */}
        {canManageUsers && selectedIds.size > 0 && (
          <div className="flex items-center gap-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
            <span className="text-sm font-medium">
              {selectedIds.size} {selectedIds.size === 1 ? "selecionado" : "selecionados"}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                className="gap-1.5"
                onClick={() => setBulkEditOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar em massa
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSelection}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}


        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {canManageUsers && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      ref={(el) => {
                        if (el) {
                          (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected;
                        }
                      }}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                )}
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold">Cargo</TableHead>
                <TableHead className="font-semibold">Time</TableHead>
                <TableHead className="font-semibold">Gestor</TableHead>
                <TableHead className="font-semibold">Localização</TableHead>
                <TableHead className="font-semibold">Modalidade</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                {canManageUsers && <TableHead className="w-10"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {canManageUsers && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
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
                    {canManageUsers && <TableCell></TableCell>}
                  </TableRow>
                ))
              ) : filteredProfiles && filteredProfiles.length > 0 ? (
                filteredProfiles.map((profile) => (
                  <TableRow 
                    key={profile.id} 
                    className={`hover:bg-muted/30 ${selectedIds.has(profile.id) ? "bg-accent/5" : ""}`}
                  >
                    {canManageUsers && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(profile.id)}
                          onCheckedChange={() => toggleSelection(profile.id)}
                          aria-label={`Selecionar ${profile.display_name}`}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Link 
                        to={`/users/${profile.id}`}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={profile.photo_url || undefined} />
                          <AvatarFallback className="bg-accent/10 text-accent text-sm font-semibold">
                            {getInitials(profile.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground hover:text-accent transition-colors">
                            {profile.display_name}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {profile.work_email}
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{profile.job_title_name}</TableCell>
                    <TableCell>
                      {profile.team ? (
                        <Link
                          to={`/teams/${profile.team.id}`}
                          className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity"
                        >
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-foreground hover:text-accent transition-colors">{profile.team.name}</span>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {profile.manager ? (
                        <UserHoverCard profileId={profile.manager.id}>
                          <Link
                            to={`/users/${profile.manager.id}`}
                            className="inline-block hover:opacity-80 transition-opacity"
                          >
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={profile.manager.photo_url || undefined} />
                              <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                                {getInitials(profile.manager.display_name)}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                        </UserHoverCard>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
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
                    {canManageUsers && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(profile)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setDeletingProfile(profile);
                                // Will check dependencies after state is set
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={canManageUsers ? 9 : 7} className="h-32">
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

        {/* Pagination - no final da lista */}
        {totalProfiles > 0 && (
          <UrlPagination
            page={page}
            pageSize={pageSize}
            totalItems={totalProfiles}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>

      <JetimoberDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        profile={editingProfile}
      />

      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        selectedIds={Array.from(selectedIds)}
        onComplete={clearSelection}
      />

      {/* Dependencies Dialog - shown when user has mandatory dependencies */}
      <UserDependenciesDialog
        open={dependenciesDialogOpen}
        onOpenChange={(open) => {
          setDependenciesDialogOpen(open);
          if (!open) setDeletingProfile(null);
        }}
        profileId={deletingProfile?.id ?? null}
        profileName={deletingProfile?.display_name ?? ""}
        onTransfer={async (config) => {
          await transferDependencies.mutateAsync(config);
          setDependenciesDialogOpen(false);
          setDeletingProfile(null);
        }}
        isTransferring={transferDependencies.isPending}
      />

      {/* Simple Delete Dialog - shown when user has NO mandatory dependencies */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeletingProfile(null);
        }}
        onConfirm={async () => {
          if (deletingProfile) {
            await deleteProfile.mutateAsync(deletingProfile.id);
            setDeleteDialogOpen(false);
            setDeletingProfile(null);
          }
        }}
        title="Excluir Jetimober"
        description={`Tem certeza que deseja excluir "${deletingProfile?.display_name}"?${deps.totalOptional > 0 ? ` A liderança de ${deps.totalOptional} time(s) será removida automaticamente.` : ""} O registro será marcado como desligado.`}
        isLoading={deleteProfile.isPending}
      />
    </HubLayout>
  );
}
