import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { usePermissionCatalog } from "../hooks/usePermissionCatalog";
import { useGroupPermissions } from "../hooks/usePermissionGroups";
import { PermissionMatrix } from "./PermissionMatrix";
import type { PermissionGroup } from "../types";

interface TemplateEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: PermissionGroup | null;
}

/**
 * Sheet for editing template permissions using matrix UI
 */
export function TemplateEditorSheet({
  open,
  onOpenChange,
  group,
}: TemplateEditorSheetProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  const { permissions, isLoading: catalogLoading } = usePermissionCatalog();
  const { groupPermissions, isLoading: permissionsLoading, setGroupPermissions } = 
    useGroupPermissions(group?.id || null);

  // Initialize selected permissions when sheet opens
  useEffect(() => {
    if (open && groupPermissions.length > 0) {
      const initialIds = new Set(groupPermissions.map((gp) => gp.permission_id));
      setSelectedIds(initialIds);
      setHasChanges(false);
    } else if (open) {
      setSelectedIds(new Set());
      setHasChanges(false);
    }
  }, [open, groupPermissions]);

  const isLoading = catalogLoading || permissionsLoading;

  const handleTogglePermission = (permissionId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }
      return next;
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!group) return;
    setGroupPermissions.mutate(
      { groupId: group.id, permissionIds: Array.from(selectedIds) },
      { 
        onSuccess: () => {
          setHasChanges(false);
          onOpenChange(false);
        }
      }
    );
  };

  const handleClose = () => {
    if (hasChanges) {
      // Could add confirmation dialog here
    }
    onOpenChange(false);
  };

  // Filter only active permissions
  const activePermissions = permissions.filter((p) => p.status === "active");

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-[900px] w-full flex flex-col">
        <SheetHeader>
          <SheetTitle>Editor de Permissões</SheetTitle>
          <SheetDescription>
            Selecione as permissões que fazem parte deste template
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <PermissionMatrix
              permissions={activePermissions}
              selectedPermissionIds={selectedIds}
              onPermissionToggle={handleTogglePermission}
              group={group}
            />
          )}
        </div>

        <SheetFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} permissão(ões) selecionada(s)
              {hasChanges && (
                <span className="ml-2 text-amber-600">• Alterações não salvas</span>
              )}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={setGroupPermissions.isPending || !hasChanges}
              >
                {setGroupPermissions.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
