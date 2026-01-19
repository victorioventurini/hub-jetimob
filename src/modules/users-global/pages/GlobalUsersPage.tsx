// ============================================================
// GLOBAL USERS PAGE - Listagem de todos usuários do sistema
// ============================================================

import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useLocalSearch } from "@/shared/url";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Search, Users, Shield, Building2, CheckCircle, Clock, UserCircle, UserX } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useGlobalUsers, useAllBus } from "@/modules/users-global/hooks";
import { UserGlobalSheet } from "../components/UserGlobalSheet";
import type { GlobalUser, UserTypeFilter } from "../types";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  collaborator: "Colaborador",
};

export default function GlobalUsersPage() {
  usePageTitle("Usuários do Hub", { 
    skipBu: true, 
    customDescription: "Gerencie todos os usuários da plataforma, acessos e configurações." 
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const { value: search, setValue: setSearch } = useLocalSearch("q");
  
  const buFilter = searchParams.get("bu") || "all";
  const onboardingFilter = searchParams.get("onboarding") || "all";
  const userTypeFilter = (searchParams.get("type") || "all") as UserTypeFilter;
  const showTerminated = searchParams.get("showTerminated") === "true";
  
  const setBuFilter = (value: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (value === "all") {
        newParams.delete("bu");
      } else {
        newParams.set("bu", value);
      }
      return newParams;
    }, { replace: true });
  };
  
  const setOnboardingFilter = (value: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (value === "all") {
        newParams.delete("onboarding");
      } else {
        newParams.set("onboarding", value);
      }
      return newParams;
    }, { replace: true });
  };

  const setUserTypeFilter = (value: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (value === "all") {
        newParams.delete("type");
      } else {
        newParams.set("type", value);
      }
      return newParams;
    }, { replace: true });
  };

  const setShowTerminated = (value: boolean) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (value) {
        newParams.set("showTerminated", "true");
      } else {
        newParams.delete("showTerminated");
      }
      return newParams;
    }, { replace: true });
  };

  const [selectedUser, setSelectedUser] = useState<GlobalUser | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: allBus = [] } = useAllBus();
  const { data: users = [], isLoading } = useGlobalUsers({
    q: search,
    buId: buFilter === "all" ? undefined : buFilter,
    onboardingStatus: onboardingFilter === "all" ? undefined : (onboardingFilter as "completed" | "pending"),
    userType: userTypeFilter,
    includeTerminated: showTerminated,
  });

  const handleOpenUser = (user: GlobalUser) => {
    setSelectedUser(user);
    setSheetOpen(true);
  };

  const hasActiveFilters = search || buFilter !== "all" || onboardingFilter !== "all" || userTypeFilter !== "all" || showTerminated;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários do Hub"
        description="Gerenciar todos os usuários da plataforma, acessos e configurações"
        breadcrumbs={[{ label: "Usuários" }]}
      />

      {/* Filtros */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={buFilter} onValueChange={setBuFilter}>
            <SelectTrigger className="w-[200px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Todas as BUs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as BUs</SelectItem>
              {allBus.map((bu) => (
                <SelectItem key={bu.id} value={bu.id}>
                  {bu.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={onboardingFilter} onValueChange={setOnboardingFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Onboarding" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <UserCircle className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="internal">Interno</SelectItem>
              <SelectItem value="external">Externo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Filtro de usuários removidos */}
        <div className="flex items-center gap-2">
          <Switch
            id="show-terminated"
            checked={showTerminated}
            onCheckedChange={setShowTerminated}
          />
          <Label htmlFor="show-terminated" className="text-sm text-muted-foreground cursor-pointer">
            Mostrar usuários removidos
          </Label>
        </div>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <LoadingState text="Carregando usuários..." />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum usuário encontrado"
          description={
            hasActiveFilters
              ? "Tente ajustar os filtros de busca"
              : "Ainda não há usuários cadastrados"
          }
        />
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>BU Principal</TableHead>
                <TableHead>BUs com Acesso</TableHead>
                <TableHead>Role Global</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isTerminated = user.employment_status === "terminated" || !!user.deleted_at;
                
                return (
                  <TableRow
                    key={user.profile_id}
                    className={`cursor-pointer hover:bg-muted/50 ${isTerminated ? "opacity-60" : ""}`}
                    onClick={() => handleOpenUser(user)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {user.display_name || "Sem nome"}
                            {isTerminated && (
                              <Badge variant="destructive" className="text-xs">
                                <UserX className="h-3 w-3 mr-1" />
                                Removido
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.work_email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.last_sign_in_at ? (
                        <span className="text-sm">
                          {format(new Date(user.last_sign_in_at), "dd/MM/yy HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Nunca
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isTerminated ? (
                        <Badge
                          variant="outline"
                          className="text-destructive border-destructive"
                        >
                          <UserX className="h-3 w-3 mr-1" />
                          Removido
                        </Badge>
                      ) : user.onboarding_completed ? (
                        <Badge
                          variant="outline"
                          className="text-status-green border-status-green"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-status-yellow border-status-yellow"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.primary_bu_name ? (
                        <Badge variant="secondary">{user.primary_bu_name}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {user.bu_accesses.length === 0 ? (
                          <span className="text-sm text-muted-foreground">
                            Nenhum
                          </span>
                        ) : user.bu_accesses.length <= 2 ? (
                          user.bu_accesses.map((access) => (
                            <Badge
                              key={access.bu_id}
                              variant="outline"
                              className="text-xs"
                            >
                              {access.bu_name}
                            </Badge>
                          ))
                        ) : (
                          <>
                            <Badge variant="outline" className="text-xs">
                              {user.bu_accesses[0].bu_name}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              +{user.bu_accesses.length - 1}
                            </Badge>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.global_role ? (
                        <Badge
                          variant={
                            user.global_role === "super_admin"
                              ? "default"
                              : "secondary"
                          }
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          {roleLabels[user.global_role] || user.global_role}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <UserGlobalSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        user={selectedUser}
      />
    </div>
  );
}
