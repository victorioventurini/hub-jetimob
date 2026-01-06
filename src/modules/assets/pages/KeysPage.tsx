import { useState } from "react";
import { Key, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useKeys } from "../hooks/useKeys";
import { useAssetPermissions } from "../hooks/useAssetPermissions";
import { KeyringsList } from "../components/keys/KeyringsList";
import { KeyringDialog } from "../components/keys/KeyringDialog";
import { useUrlState } from "@/hooks/useUrlState";

export default function KeysPage() {
  const { keyrings, isLoading } = useKeys();
  const { canManageKeys } = useAssetPermissions();
  const [search, setSearch] = useUrlState<string>({ key: "q", defaultValue: "" });
  const [keyringDialogOpen, setKeyringDialogOpen] = useState(false);

  const filteredKeyrings = keyrings.filter(
    (k) =>
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      k.tag_number.toLowerCase().includes(search.toLowerCase())
  );

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
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar chaveiro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {canManageKeys && (
          <Button onClick={() => setKeyringDialogOpen(true)}>
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
          description={
            search
              ? "Tente ajustar a busca"
              : "Cadastre o primeiro chaveiro"
          }
          actionLabel={canManageKeys && !search ? "Novo Chaveiro" : undefined}
          onAction={canManageKeys && !search ? () => setKeyringDialogOpen(true) : undefined}
        />
      ) : (
        <KeyringsList keyrings={filteredKeyrings} />
      )}

      {/* Dialog */}
      <KeyringDialog open={keyringDialogOpen} onOpenChange={setKeyringDialogOpen} />
    </div>
  );
}
