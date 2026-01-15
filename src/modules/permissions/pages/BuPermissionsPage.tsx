import { useMemo, useState, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useUrlSearch } from "@/shared/url";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
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
import { Shield, Search, Users, ChevronRight, Crown, ExternalLink, UserCheck } from "lucide-react";
import { useBuUsers, type BuUser } from "../hooks/useBuUsers";
import { UserPermissionsV2Sheet } from "../components/UserPermissionsV2Sheet";
import { cn } from "@/lib/utils";



/**
 * BuPermissionsPage - Gerenciamento de permissões de usuários por BU
 */
export default function BuPermissionsPage() {
  usePageTitle("Permissões da BU", {
    customDescription: "Gerencie as permissões de usuários desta unidade de negócio."
  });

  const { value: urlSearch, set: setUrlSearch } = useUrlSearch("q", 300);
  
  // Estado local para input responsivo - sincroniza com URL após debounce
  const [localSearch, setLocalSearch] = useState(urlSearch);
  
  // Sincroniza estado local quando URL muda (ex: navegação, reload)
  useEffect(() => {
    setLocalSearch(urlSearch);
  }, [urlSearch]);
  
  // Debounce: atualiza URL após 300ms de inatividade
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== urlSearch) {
        setUrlSearch(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, urlSearch, setUrlSearch]);
  
  const [selectedUser, setSelectedUser] = useState<BuUser | null>(null);

  const { users, isLoading: usersLoading } = useBuUsers();

  // Filtra usando o estado local para feedback instantâneo
  const filteredUsers = useMemo(() => {
    if (!localSearch) return users;
    const lowerSearch = localSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.profiles.display_name.toLowerCase().includes(lowerSearch) ||
        u.profiles.work_email.toLowerCase().includes(lowerSearch) ||
        u.profiles.job_title_name?.toLowerCase().includes(lowerSearch) ||
        u.teams.some((t) => t.name.toLowerCase().includes(lowerSearch))
    );
  }, [users, localSearch]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      // Admin by role OR by template first
      const aIsAdmin = a.role_in_bu === "admin" || a.has_admin_template;
      const bIsAdmin = b.role_in_bu === "admin" || b.has_admin_template;
      if (aIsAdmin && !bIsAdmin) return -1;
      if (bIsAdmin && !aIsAdmin) return 1;
      // Leaders second
      if (a.is_team_leader && !b.is_team_leader) return -1;
      if (b.is_team_leader && !a.is_team_leader) return 1;
      // External last
      const aExternal = a.role_in_bu === "external";
      const bExternal = b.role_in_bu === "external";
      if (aExternal && !bExternal) return 1;
      if (!aExternal && bExternal) return -1;
      return a.profiles.display_name.localeCompare(b.profiles.display_name);
    });
  }, [filteredUsers]);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const getRoleBadge = (user: BuUser) => {
    // Show Admin badge if role is admin OR has admin template
    if (user.role_in_bu === "admin" || user.has_admin_template) {
      return <Badge variant="default" className="gap-1"><Crown className="h-3 w-3" />Admin</Badge>;
    }
    // Show Leader badge if user leads any team
    if (user.is_team_leader) {
      const teamNames = user.led_teams.map(t => t.name).join(", ");
      return (
        <Badge variant="secondary" className="gap-1" title={`Líder de: ${teamNames}`}>
          <UserCheck className="h-3 w-3" />Líder
        </Badge>
      );
    }
    if (user.role_in_bu === "external") {
      return <Badge variant="outline" className="gap-1 border-status-amber/50 text-status-amber"><ExternalLink className="h-3 w-3" />Externo</Badge>;
    }
    if (!user.role_in_bu) {
      return <Badge variant="secondary">Perfil</Badge>;
    }
    return <Badge variant="outline">Membro</Badge>;
  };

  const getPermissionIndicator = (user: BuUser) => {
    // Show wildcard indicator if role is admin OR has admin template
    if (user.role_in_bu === "admin" || user.has_admin_template) {
      return <span className="flex items-center gap-1 text-xs text-primary font-medium"><Shield className="h-3 w-3" />Acesso Total (*)</span>;
    }
    return null;
  };

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Permissões da BU"
          description="Gerencie templates e permissões de usuários nesta Business Unit"
          backTo="/settings"
          backLabel="Voltar para Configurações"
        />

        <div className="flex items-center justify-end gap-4 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, cargo ou time..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
        </div>

        <div className="mt-6">
          {usersLoading ? (
            <LoadingState text="Carregando usuários..." />
          ) : sortedUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum usuário encontrado"
              description={localSearch ? "Tente ajustar a busca" : "Nenhum usuário nesta BU"}
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
                        user.role_in_bu === "external" && "bg-amber-500/5"
                      )}
                      onClick={() => setSelectedUser(user)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.profiles.photo_url || undefined} />
                            <AvatarFallback>{getInitials(user.profiles.display_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium block">{user.profiles.display_name}</span>
                            <span className="text-xs text-muted-foreground">{user.profiles.work_email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.profiles.job_title_name || "—"}</TableCell>
                      <TableCell>
                        {user.teams.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.teams.slice(0, 2).map((team) => (
                              <Badge key={team.id} variant="outline" className="text-xs">{team.name}</Badge>
                            ))}
                            {user.teams.length > 2 && <Badge variant="outline" className="text-xs">+{user.teams.length - 2}</Badge>}
                          </div>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>{getRoleBadge(user)}</TableCell>
                      <TableCell>{getPermissionIndicator(user)}</TableCell>
                      <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <UserPermissionsV2Sheet
          open={!!selectedUser}
          onOpenChange={(open) => { if (!open) setSelectedUser(null); }}
          user={selectedUser}
        />
      </div>
    </HubLayout>
  );
}
