import { useState } from "react";
import { Key, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useKeys } from "../hooks/useKeys";
import { useAssetPermissions } from "../hooks/useAssetPermissions";
import { ClavicularyBoard } from "../components/keys/ClavicularyBoard";
import { KeyringsList } from "../components/keys/KeyringsList";
import { ClavicularyDialog } from "../components/keys/ClavicularyDialog";
import { KeyringDialog } from "../components/keys/KeyringDialog";

export default function KeysPage() {
  const { clavicularies, keyrings, isLoading } = useKeys();
  const { canManageKeys } = useAssetPermissions();
  const [search, setSearch] = useState("");
  const [clavicularyDialogOpen, setClavicularyDialogOpen] = useState(false);
  const [keyringDialogOpen, setKeyringDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("clavicularies");

  const filteredClavicularies = clavicularies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

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
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64" />
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
            placeholder="Buscar claviculário ou chaveiro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {canManageKeys && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setClavicularyDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Claviculário
            </Button>
            <Button onClick={() => setKeyringDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Chaveiro
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="clavicularies">
            Claviculários ({filteredClavicularies.length})
          </TabsTrigger>
          <TabsTrigger value="keyrings">
            Chaveiros ({filteredKeyrings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clavicularies" className="mt-4">
          {filteredClavicularies.length === 0 ? (
            <EmptyState
              icon={Key}
              title="Nenhum claviculário encontrado"
              description={
                search
                  ? "Tente ajustar a busca"
                  : "Cadastre o primeiro claviculário"
              }
              actionLabel={canManageKeys && !search ? "Novo Claviculário" : undefined}
              onAction={canManageKeys && !search ? () => setClavicularyDialogOpen(true) : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredClavicularies.map((claviculary) => (
                <ClavicularyBoard key={claviculary.id} claviculary={claviculary} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="keyrings" className="mt-4">
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
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ClavicularyDialog open={clavicularyDialogOpen} onOpenChange={setClavicularyDialogOpen} />
      <KeyringDialog open={keyringDialogOpen} onOpenChange={setKeyringDialogOpen} />
    </div>
  );
}
