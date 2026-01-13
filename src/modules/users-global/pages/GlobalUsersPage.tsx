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
import { Search, Users, Shield, Building2, CheckCircle, Clock, UserCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useGlobalUsers } from "../hooks/useGlobalUsers";
import { useAllBus } from "../hooks/useAllBus";
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

  const [selectedUser, setSelectedUser] = useState<GlobalUser | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: allBus = [] } = useAllBus();
  const { data: users = [], isLoading } = useGlobalUsers({
    q: search,
    buId: buFilter === "all" ? undefined : buFilter,
    onboardingStatus: onboardingFilter === "all" ? undefined : (onboardingFilter as "completed" | "pending"),
    userType: userTypeFilter,
  });

  const handleOpenUser = (user: GlobalUser) => {
    setSelectedUser(user);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários do Hub"
        description="Gerenciar todos os usuários da plataforma, acessos e configurações"
        breadcrumbs={[{ label: "Usuários" }]}
      />

      {/* Filtros */}
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

      {/* Tabela */}
      {isLoading ? (
        <LoadingState text="Carregando usuários..." />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum usuário encontrado"
          description={
            search || buFilter !== "all" || onboardingFilter !== "all" || userTypeFilter !== "all"
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
                <TableHead>Onboarding</TableHead>
                <TableHead>BU Principal</TableHead>
                <TableHead>BUs com Acesso</TableHead>
                <TableHead>Role Global</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.profile_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleOpenUser(user)}
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {user.display_name || "Sem nome"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.work_email}
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
                    {user.onboarding_completed ? (
                      <Badge
                        variant="outline"
                        className="text-emerald-600 border-emerald-600"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Concluído
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-amber-600 border-amber-600"
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
              ))}
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
