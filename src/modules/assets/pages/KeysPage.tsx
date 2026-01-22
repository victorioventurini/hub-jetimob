import { useState } from "react";
import { Key, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPageFilters } from "@/components/ui/list-page-filters";
import { useKeys, useAssetPermissionsV2 } from "@/modules/assets/hooks";
import { KeyringsTable } from "../components/keys/KeyringsTable";
import { KeyringDialog } from "../components/keys/KeyringDialog";
import { useUrlState } from "@/shared/url";

export default function KeysPage() {
  // URL State for filtering
  const searchState = useUrlState<string>({ key: "q", defaultValue: "" });
  const search = searchState.value;
  const setSearch = searchState.set;
  
  const { keyrings, isLoading: isLoadingKeys } = useKeys({
    search: search || undefined,
  });
  const { canManageKeys, isLoading: isLoadingPermissions } = useAssetPermissionsV2();
  const [keyringDialogOpen, setKeyringDialogOpen] = useState(false);

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
      {/* Header com busca - usando ListPageFilters canônico */}
      <ListPageFilters
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar chaveiro..."
        actions={
          canManageKeys && (
            <Button onClick={() => setKeyringDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Chaveiro
            </Button>
          )
        }
      />

      {/* Lista de chaveiros */}
      {keyrings.length === 0 ? (
        <EmptyState
          icon={Key}
          title="Nenhum chaveiro cadastrado"
          description={search 
            ? "Tente ajustar a busca" 
            : "Cadastre o primeiro chaveiro"}
          actionLabel={canManageKeys && !search ? "Novo Chaveiro" : undefined}
          onAction={canManageKeys && !search ? () => setKeyringDialogOpen(true) : undefined}
        />
      ) : (
        <KeyringsTable keyrings={keyrings} />
      )}

      {/* Dialog */}
      <KeyringDialog open={keyringDialogOpen} onOpenChange={setKeyringDialogOpen} />
    </div>
  );
}
