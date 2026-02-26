// Users page with BU filtering and server-side pagination
import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
import { queryKeys } from "@/lib/queryKeys";
import { PageHeader } from "@/components/ui/page-header";
import { ListPageFilters } from "@/components/ui/list-page-filters";
import { ViewOptionsBar } from "@/components/ui/view-options-bar";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { useBu } from "@/contexts/BuContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBuBranding } from "@/modules/bu/hooks";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TeamSelect, AreaSelect } from "@/components/selects";
import {
  Plus,
  AlertTriangle,
  X,
  Pencil,
  Network,
} from "lucide-react";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { usePermissions } from "@/hooks/usePermissions";
import { JetimoberDialog } from "@/components/users/JetimoberDialog";
import { BulkEditDialog } from "@/components/users/BulkEditDialog";
import { UsersTable, type ProfileWithTeam } from "@/components/users/UsersTable";
import { useUrlState } from "@/shared/url";

import { useDeleteProfile, useTransferDependencies } from "@/hooks/useProfiles";
import { useUserDependencies } from "@/hooks/useUserDependencies";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { UserDependenciesDialog } from "@/components/users/UserDependenciesDialog";

// Permission management
import { useBuUsers, type BuUser } from "@/modules/permissions/hooks";
import { UserPermissionsV2Sheet } from "@/modules/permissions/components/UserPermissionsV2Sheet";

export default function UsersPage() {
  const { memberDisplayName, buName } = useBuBranding();
  usePageTitle(memberDisplayName);
  
  const { isWildcard, has } = usePermissions();
  const { currentBu, isLoading: isBuLoading } = useBu();
  const { user, isLoading: authLoading } = useAuth();
  const supabase = useBuScopedSupabase();
  const queryClient = useQueryClient();
  
  // Admin de BU ou super_admin podem gerenciar usuários via permission key
  const canManageUsers = isWildcard || has("users.profile.manage:bu");
  const canManagePermissions = isWildcard || has("users.profile.manage:bu");
  
  // Fetch BU users for permission data
  const { users: buUsers } = useBuUsers();
  
  // URL State - object API with pagination
  const searchState = useUrlState<string>({ key: 'q', defaultValue: '' });
  const searchQuery = searchState.value;

  const areaFilterState = useUrlState<string>({ key: 'area_id', defaultValue: 'all' });
  const areaFilter = areaFilterState.value;

  const teamFilterState = useUrlState<string>({ key: 'team_id', defaultValue: 'all' });
  const teamFilter = teamFilterState.value;

  // Handlers
  const setSearchQuery = (v: string) => {
    searchState.set(v);
  };
  const setAreaFilter = (v: string) => {
    areaFilterState.set(v);
  };
  const setTeamFilter = (v: string) => {
    teamFilterState.set(v);
  };
  
  // Local state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProfileWithTeam | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dependenciesDialogOpen, setDependenciesDialogOpen] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState<ProfileWithTeam | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<BuUser | null>(null);

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


  const { data: profilesData, isLoading, error: profilesError } = useQuery({
    queryKey: queryKeys.users.directory(currentBu?.id ?? null, {
      q: searchQuery || undefined,
      areaId: areaFilter !== 'all' ? areaFilter : undefined,
      teamId: teamFilter !== 'all' ? teamFilter : undefined,
      // Regra: /users lista somente usuários internos e ativos
      status: 'active',
      excludeExternal: true,
    }),
    queryFn: async ({ queryKey }): Promise<{ profiles: ProfileWithTeam[]; total: number }> => {
      // Ensure session is loaded before making the RPC call
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }

      if (!currentBu?.id) return { profiles: [], total: 0 };

      // Extract filters from queryKey to ensure fresh values
      const filters = queryKey[3] as { q?: string; teamId?: string } | undefined;
      const qSearch = filters?.q?.trim() || null;
      const qTeamId = filters?.teamId || null;

      // Use RPC - fetch all, then enforce active+internal on client
      const { data, error } = await supabase.rpc('get_bu_users_by_membership', {
        p_bu_id: currentBu.id,
        p_search: qSearch,
        p_team_id: qTeamId,
        p_status: 'active',
        p_limit: 1000,
        p_offset: 0,
      });

      if (error) throw error;

      // Enforce “active” + exclude externals (some datasets may return externals even under active)
      const rows = (data || []).filter((p: { employment_status: string }) => p.employment_status === 'active');

      // Coletar manager_user_ids únicos para buscar em lote
      const managerIds = [
        ...new Set(rows.map((p: { manager_user_id: string | null }) => p.manager_user_id).filter(Boolean)),
      ] as string[];

      // Buscar managers em uma query separada
      let managersMap: Record<string, { id: string; display_name: string | null; photo_url: string | null }> = {};
      if (managerIds.length > 0) {
        const { data: managersData } = await supabase
          .from('profiles')
          .select('id, display_name, photo_url')
          .in('id', managerIds);

        if (managersData) {
          managersMap = Object.fromEntries(managersData.map((m) => [m.id, m]));
        }
      }

      const profiles = rows
        .map(
          (p: {
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
            job_title_name: p.job_title_name || 'Sem cargo',
            job_title_id: p.job_title_id,
            photo_url: p.photo_url,
            city: p.city,
            state: p.state,
            work_mode: p.work_mode,
            employment_status: p.employment_status,
            team: p.team_id && p.team_name ? { id: p.team_id, name: p.team_name } : null,
            manager: p.manager_user_id ? managersMap[p.manager_user_id] ?? null : null,
          }),
        ) as ProfileWithTeam[];

      return { profiles, total: profiles.length };
    },
    enabled: !!currentBu?.id && !!user && !authLoading,
  });

  // Filter by area on frontend (RPC doesn't support area_id yet)
  const { data: teamsData } = useQuery({
    queryKey: queryKeys.teams.byArea(currentBu?.id ?? null, areaFilter !== 'all' ? areaFilter : null),
    queryFn: async () => {
      if (!currentBu?.id) return [];
      const { data } = await supabase
        .from("teams")
        .select("id, area_id")
        .eq("bu_id", currentBu.id)
        .is("deleted_at", null);
      return data ?? [];
    },
    enabled: !!currentBu?.id && areaFilter !== 'all',
    staleTime: 5 * 60 * 1000,
  });

  const profiles = React.useMemo(() => {
    const baseProfiles = profilesData?.profiles ?? [];
    if (areaFilter === 'all' || !teamsData) return baseProfiles;
    
    // Get team IDs that belong to selected area
    const teamIdsInArea = new Set(teamsData.filter(t => t.area_id === areaFilter).map(t => t.id));
    return baseProfiles.filter(p => p.team?.id && teamIdsInArea.has(p.team.id));
  }, [profilesData?.profiles, areaFilter, teamsData]);
  
  const totalProfiles = areaFilter === 'all' ? (profilesData?.total ?? 0) : profiles.length;

  // Build permissions data map for table
  const permissionsData = useMemo(() => {
    const map = new Map<string, { role_in_bu: string | null; has_admin_template: boolean; template_count: number }>();
    for (const bu of buUsers) {
      // Count templates (from bu_user_permission_templates_v2)
      // Note: useBuUsers returns has_admin_template but not template_count
      // For now, we'll estimate based on has_admin_template flag
      map.set(bu.profile_id, {
        role_in_bu: bu.role_in_bu,
        has_admin_template: bu.has_admin_template,
        template_count: bu.has_admin_template ? 1 : 0, // Simplified - could be enhanced
      });
    }
    return map;
  }, [buUsers]);

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

  // Handler para abrir sheet de permissões
  const handleManagePermissions = (profile: ProfileWithTeam) => {
    // Encontrar o BuUser correspondente pelo profile_id
    const buUser = buUsers.find(u => u.profile_id === profile.id);
    if (buUser) {
      setPermissionsUser(buUser);
    }
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
        {/* Header com breadcrumbs integrados */}
        <PageHeader
          title={memberDisplayName}
          description={`Diretório de colaboradores da ${buName}`}
          breadcrumbs={[{ label: memberDisplayName }]}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link to="/teams/org-chart?fullscreen=true" target="_blank" rel="noopener noreferrer">
                  <Network className="h-4 w-4 mr-2" />
                  Organograma
                </Link>
              </Button>
              {canManageUsers && (
                <Button className="gap-2" onClick={handleCreate}>
                  <Plus className="h-4 w-4" />
                  Novo
                </Button>
              )}
            </div>
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
          <ErrorState
            title="Erro ao carregar usuários"
            description={
              profilesError.message.includes('Sessão') 
                ? profilesError.message 
                : "Não foi possível carregar a lista de usuários."
            }
            compact
            onRetry={() => queryClient.invalidateQueries({ 
              queryKey: queryKeys.users.all() 
            })}
          />
        )}

        {/* Linha 1: Busca + Filtros */}
        <ListPageFilters
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Buscar por nome, e-mail ou cargo..."
        >
          <AreaSelect
            value={areaFilter === "all" ? undefined : areaFilter}
            onValueChange={(v) => setAreaFilter(v ?? "all")}
            includeAll
            allLabel="Todas as áreas"
            placeholder="Área"
            triggerClassName="w-[180px]"
          />
          <TeamSelect
            value={teamFilter === "all" ? undefined : teamFilter}
            onValueChange={(v) => setTeamFilter(v ?? "all")}
            includeAll
            allLabel="Todos os times"
            placeholder="Time"
            triggerClassName="w-[220px]"
          />
        </ListPageFilters>

        {/* Linha 2: Contador */}
        <ViewOptionsBar
          resultCount={totalProfiles}
          resultCountLabel={`${memberDisplayName} encontrados`}
          resultCountLabelSingular={`${memberDisplayName} encontrado`}
        />

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
        <UsersTable
          profiles={filteredProfiles}
          isLoading={isLoading}
          canManageUsers={canManageUsers}
          canManagePermissions={canManagePermissions}
          selectedIds={selectedIds}
          onToggleSelection={toggleSelection}
          onToggleSelectAll={toggleSelectAll}
          onEdit={handleEdit}
          onDelete={(profile) => setDeletingProfile(profile)}
          onManagePermissions={handleManagePermissions}
          searchQuery={searchQuery}
          teamFilter={teamFilter}
          permissionsData={permissionsData}
        />

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

      {/* Permissions Sheet - integrado diretamente na página */}
      <UserPermissionsV2Sheet
        open={!!permissionsUser}
        onOpenChange={(open) => { if (!open) setPermissionsUser(null); }}
        user={permissionsUser}
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
