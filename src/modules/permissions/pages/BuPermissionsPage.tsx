import { useMemo, useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useUrlTab, useUrlSearch } from "@/shared/url";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { HubLayout } from "@/components/layout/HubLayout";
import { Shield, Search, Users, Settings, ChevronRight, Crown, FileStack, ExternalLink } from "lucide-react";
import { usePermissionGroups } from "../hooks/usePermissionGroups";
import { useBuGroupConfigs } from "../hooks/useBuPermissions";
import { useBuUsers, type BuUser } from "../hooks/useBuUsers";
import { UserPermissionsV2Sheet } from "../components/UserPermissionsV2Sheet";
import { cn } from "@/lib/utils";

type PermissionTab = "users" | "groups";

/**
 * BuPermissionsPage - Gerenciamento de permissões de usuários por BU
 * 
 * Esta página é acessível por admin da BU e super_admin.
 * Gerencia quais permissões cada usuário possui dentro da BU ativa.
 * 
 * Rota: /hub/permissions
 */
export default function BuPermissionsPage() {
  usePageTitle("Permissões da BU");

  // URL State para tab e busca
  const [activeTab, setActiveTab] = useUrlTab<PermissionTab>("users");
  const { value: search, set: setSearch } = useUrlSearch("q");
  
  const [selectedUser, setSelectedUser] = useState<BuUser | null>(null);

  const { groups, isLoading: groupsLoading } = usePermissionGroups();
  const { configs, isLoading: configsLoading, toggleGroupEnabled } = useBuGroupConfigs();
  const { users, isLoading: usersLoading } = useBuUsers();

  // Map configs by group_id for quick lookup
  const configByGroupId = useMemo(() => 
    configs.reduce(
      (acc, c) => {
        acc[c.group_id] = c;
        return acc;
      },
      {} as Record<string, typeof configs[0]>
    ),
    [configs]
  );

  const activeGroups = groups.filter((g) => g.status === "active");

  const filteredGroups = search
    ? activeGroups.filter(
        (g) =>
          g.name.toLowerCase().includes(search.toLowerCase()) ||
          g.description?.toLowerCase().includes(search.toLowerCase())
      )
    : activeGroups;

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const lowerSearch = search.toLowerCase();
    return users.filter(
      (u) =>
        u.profiles.display_name.toLowerCase().includes(lowerSearch) ||
        u.profiles.work_email.toLowerCase().includes(lowerSearch) ||
        u.profiles.job_title_name?.toLowerCase().includes(lowerSearch) ||
        u.teams.some((t) => t.name.toLowerCase().includes(lowerSearch))
    );
  }, [users, search]);

  // Sort users: admins first, externals last, then by name
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      // Admins first
      if (a.role_in_bu === "admin" && b.role_in_bu !== "admin") return -1;
      if (b.role_in_bu === "admin" && a.role_in_bu !== "admin") return 1;
      
      // Externals last
      const aExternal = a.is_external ?? false;
      const bExternal = b.is_external ?? false;
      if (aExternal && !bExternal) return 1;
      if (!aExternal && bExternal) return -1;
      
      // Then alphabetically
      return a.profiles.display_name.localeCompare(b.profiles.display_name);
    });
  }, [filteredUsers]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const getRoleBadge = (user: BuUser) => {
    if (user.role_in_bu === "admin") {
      return (
        <Badge variant="default" className="gap-1">
          <Crown className="h-3 w-3" />
          Admin
        </Badge>
      );
    }
    
    if (user.is_external) {
      return (
        <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-700">
          <ExternalLink className="h-3 w-3" />
          Externo
        </Badge>
      );
    }
    
    if (!user.role_in_bu) {
      return <Badge variant="secondary">Perfil</Badge>;
    }
    
    return <Badge variant="outline">Membro</Badge>;
  };

  const getPermissionIndicator = (user: BuUser) => {
    if (user.role_in_bu === "admin") {
      return (
        <span className="flex items-center gap-1 text-xs text-primary font-medium">
          <Shield className="h-3 w-3" />
          Acesso Total (*)
        </span>
      );
    }
    
    // Show v2 indicator if user has v2 templates
    // This would require fetching v2 assignments - for now just show nothing
    return null;
  };

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Permissões da BU"
          description="Gerencie grupos habilitados e permissões de usuários nesta Business Unit"
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Usuários
              </TabsTrigger>
              <TabsTrigger value="groups" className="gap-2">
                <Settings className="h-4 w-4" />
                Grupos Habilitados
              </TabsTrigger>
            </TabsList>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, cargo ou time..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
          </div>

          <TabsContent value="users" className="mt-6">
            {usersLoading ? (
              <LoadingState text="Carregando usuários..." />
            ) : sortedUsers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nenhum usuário encontrado"
                description={search ? "Tente ajustar a busca" : "Nenhum usuário nesta BU"}
              />
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Times</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Permissões</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedUsers.map((user) => (
                      <TableRow
                        key={user.user_id}
                        className={cn(
                          "cursor-pointer hover:bg-muted/50 transition-colors",
                          user.role_in_bu === "admin" && "bg-primary/5",
                          user.is_external && "bg-amber-500/5"
                        )}
                        onClick={() => setSelectedUser(user)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.profiles.photo_url || undefined} />
                              <AvatarFallback>
                                {getInitials(user.profiles.display_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium block">
                                {user.profiles.display_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {user.profiles.work_email}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.profiles.job_title_name || "—"}
                        </TableCell>
                        <TableCell>
                          {user.teams.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.teams.slice(0, 2).map((team) => (
                                <Badge key={team.id} variant="outline" className="text-xs">
                                  {team.name}
                                </Badge>
                              ))}
                              {user.teams.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{user.teams.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>{getRoleBadge(user)}</TableCell>
                        <TableCell>{getPermissionIndicator(user)}</TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="groups" className="mt-6">
            {groupsLoading || configsLoading ? (
              <LoadingState text="Carregando grupos..." />
            ) : filteredGroups.length === 0 ? (
              <EmptyState
                icon={Settings}
                title="Nenhum grupo encontrado"
                description={
                  search
                    ? "Tente ajustar a busca"
                    : "Nenhum grupo global ativo. Grupos são criados em /settings/permissions"
                }
              />
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Habilite ou desabilite grupos globais para esta BU. Usuários só
                  podem receber grupos habilitados.
                </p>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Grupo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-32 text-center">Habilitado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGroups.map((group) => {
                        const config = configByGroupId[group.id];
                        const isEnabled = config?.is_enabled ?? true; // Default enabled

                        return (
                          <TableRow key={group.id}>
                            <TableCell className="font-medium">{group.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {group.description || "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) =>
                                  toggleGroupEnabled.mutate({
                                    groupId: group.id,
                                    isEnabled: checked,
                                  })
                                }
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* User Permissions V2 Sheet */}
        <UserPermissionsV2Sheet
          open={!!selectedUser}
          onOpenChange={(open) => {
            if (!open) setSelectedUser(null);
          }}
          user={selectedUser}
        />
      </div>
    </HubLayout>
  );
}
