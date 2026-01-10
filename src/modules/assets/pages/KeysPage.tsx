import { useState } from "react";
import { Key, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useKeys } from "../hooks/useKeys";
import { useAssetPermissions } from "../hooks/useAssetPermissions";
import { KeyringsList } from "../components/keys/KeyringsList";
import { KeyringDialog } from "../components/keys/KeyringDialog";
import { UrlSearchInput } from "@/shared/filters";
import { useUrlState } from "@/shared/url";

export default function KeysPage() {
  // URL State for filtering
  const searchState = useUrlState<string>({ key: "q", defaultValue: "" });
  const search = searchState.value;
  const setSearch = searchState.set;
  
  const { keyrings, isLoading: isLoadingKeys } = useKeys({
    search: search || undefined,
  });
  const { canManageKeys, isLoading: isLoadingPermissions } = useAssetPermissions();
  const [keyringDialogOpen, setKeyringDialogOpen] = useState(false);

  const isLoading = isLoadingKeys || isLoadingPermissions;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com busca */}
      <div className="flex flex-col sm:flex-row gap-4">
        <UrlSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar chaveiro..."
          className="flex-1"
          debounceMs={300}
        />
        {canManageKeys && (
          <Button onClick={() => setKeyringDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Chaveiro
          </Button>
        )}
      </div>

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
        <KeyringsList keyrings={keyrings} />
      )}

      {/* Dialog */}
      <KeyringDialog open={keyringDialogOpen} onOpenChange={setKeyringDialogOpen} />
    </div>
  );
}
