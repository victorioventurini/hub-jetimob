import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";
import { usePermissionCatalog } from "../hooks/usePermissionCatalog";
import { useGroupPermissions } from "../hooks/usePermissionGroups";
import type { PermissionGroup } from "../types";

interface GroupPermissionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: PermissionGroup | null;
}

export function GroupPermissionsSheet({
  open,
  onOpenChange,
  group,
}: GroupPermissionsSheetProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { permissions, permissionsByModule, isLoading: catalogLoading } = usePermissionCatalog();
  const { groupPermissions, isLoading: permissionsLoading, setGroupPermissions } = useGroupPermissions(group?.id || null);

  // Initialize selected permissions when sheet opens
  useEffect(() => {
    if (open && groupPermissions.length > 0) {
      setSelectedIds(new Set(groupPermissions.map((gp) => gp.permission_id)));
    } else if (open) {
      setSelectedIds(new Set());
    }
  }, [open, groupPermissions]);

  const isLoading = catalogLoading || permissionsLoading;

  const filteredPermissions = search
    ? permissions.filter(
        (p) =>
          p.key.toLowerCase().includes(search.toLowerCase()) ||
          p.description?.toLowerCase().includes(search.toLowerCase())
      )
    : permissions;

  const filteredByModule = search
    ? { search: filteredPermissions }
    : permissionsByModule;

  const togglePermission = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!group) return;
    setGroupPermissions.mutate(
      { groupId: group.id, permissionIds: Array.from(selectedIds) },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Permissões do Grupo</SheetTitle>
          <SheetDescription>
            {group?.name} — Selecione as permissões que fazem parte deste grupo.
          </SheetDescription>
        </SheetHeader>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar permissões..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(filteredByModule).map(([module, perms]) => (
                <div key={module}>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {module}
                  </h4>
                  <div className="space-y-1">
                    {perms.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-start gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedIds.has(perm.id)}
                          onCheckedChange={() => togglePermission(perm.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {perm.key}
                            </code>
                            <Badge variant="outline" className="text-xs">
                              {perm.scope}
                            </Badge>
                          </div>
                          {perm.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {perm.description}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <p className="text-sm text-muted-foreground">
            {selectedIds.size} permissão(ões) selecionada(s)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={setGroupPermissions.isPending}>
              {setGroupPermissions.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
