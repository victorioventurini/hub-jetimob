import { useState, useMemo } from "react";
import { Key, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPageFilters } from "@/components/ui/list-page-filters";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useKeys, useAssetPermissionsV2 } from "@/modules/assets/hooks";
import { KeyringsTable } from "../components/keys/KeyringsTable";
import { KeyringDialog } from "../components/keys/KeyringDialog";
import { useUrlState } from "@/shared/url";
import type { KeyringStatus } from "../types";

export default function KeysPage() {
  usePageTitle("Chaveiros", {
    customDescription: "Gerencie chaveiros, chaves e controle de acessos físicos."
  });

  // URL State for filtering
  const searchState = useUrlState<string>({ key: "q", defaultValue: "" });
  const statusState = useUrlState<string>({ key: "status", defaultValue: "all" });
  const search = searchState.value;
  const setSearch = searchState.set;
  const statusFilter = statusState.value as "all" | KeyringStatus;
  
  const { keyrings, isLoading: isLoadingKeys } = useKeys({
    search: search || undefined,
  });
  const { canManageKeys, isLoading: isLoadingPermissions } = useAssetPermissionsV2();
  const [keyringDialogOpen, setKeyringDialogOpen] = useState(false);

  // Client-side filter for status (hook doesn't support status filter yet)
  const filteredKeyrings = useMemo(() => {
    if (statusFilter === "all") return keyrings;
    return keyrings.filter(k => k.status === statusFilter);
  }, [keyrings, statusFilter]);

  const isLoading = isLoadingKeys || isLoadingPermissions;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com busca e ação */}
      <div className="flex flex-col sm:flex-row gap-4">
        <ListPageFilters
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar chaveiro..."
          className="flex-1"
        />
        {canManageKeys && (
          <Button onClick={() => setKeyringDialogOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Novo Chaveiro
          </Button>
        )}
      </div>

      {/* Lista de chaveiros */}
      {filteredKeyrings.length === 0 ? (
        <EmptyState
          icon={Key}
          title="Nenhum chaveiro encontrado"
          description={search || statusFilter !== "all"
            ? "Tente ajustar os filtros" 
            : "Cadastre o primeiro chaveiro"}
          actionLabel={canManageKeys && !search && statusFilter === "all" ? "Novo Chaveiro" : undefined}
          onAction={canManageKeys && !search && statusFilter === "all" ? () => setKeyringDialogOpen(true) : undefined}
        />
      ) : (
        <KeyringsTable keyrings={filteredKeyrings} />
      )}

      {/* Dialog */}
      <KeyringDialog open={keyringDialogOpen} onOpenChange={setKeyringDialogOpen} />
    </div>
  );
}
