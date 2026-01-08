import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowRight, Plus, Trash2, Link2 } from "lucide-react";
import { usePermissionAliases } from "../hooks/usePermissionsV2";

export function AliasesTab() {
  const { aliases, isLoading, createAlias, updateAliasStatus, deleteAlias } = usePermissionAliases();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [oldKey, setOldKey] = useState("");
  const [newKey, setNewKey] = useState("");

  const handleCreate = () => {
    if (!oldKey || !newKey) return;
    createAlias.mutate(
      { old_key: oldKey, new_key: newKey },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setOldKey("");
          setNewKey("");
        },
      }
    );
  };

  if (isLoading) {
    return <LoadingState text="Carregando aliases..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Aliases permitem que permission keys antigas continuem funcionando após normalização.
          Keys antigas são automaticamente resolvidas para a key canônica.
        </p>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Alias
        </Button>
      </div>

      {aliases.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="Nenhum alias configurado"
          description="Crie aliases para mapear permission keys antigas para novas"
        />
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key Antiga (old_key)</TableHead>
                <TableHead></TableHead>
                <TableHead>Key Canônica (new_key)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aliases.map((alias) => (
                <TableRow key={alias.id}>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-destructive">
                      {alias.old_key}
                    </code>
                  </TableCell>
                  <TableCell>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-primary">
                      {alias.new_key}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={alias.status === "active"}
                      onCheckedChange={(checked) =>
                        updateAliasStatus.mutate({
                          id: alias.id,
                          status: checked ? "active" : "deprecated",
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAlias.mutate(alias.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Alias de Permission Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Key Antiga (será resolvida)</label>
              <Input
                value={oldKey}
                onChange={(e) => setOldKey(e.target.value)}
                placeholder="ex: okrs.read"
                className="font-mono"
              />
            </div>
            <div className="flex justify-center">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <label className="text-sm font-medium">Key Canônica (destino)</label>
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="ex: okrs.view:bu"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!oldKey || !newKey || createAlias.isPending}>
              Criar Alias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
