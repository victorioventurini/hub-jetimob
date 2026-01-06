import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Permission, PermissionScope } from "../types";

const SCOPES: PermissionScope[] = [
  "self",
  "self_or_owner",
  "team",
  "team_tree",
  "squad",
  "bu",
  "global",
  "public",
];

const SCOPE_LABELS: Record<PermissionScope, string> = {
  self: "Self (próprio)",
  self_or_owner: "Self ou Owner",
  team: "Time",
  team_tree: "Árvore do Time",
  squad: "Squad",
  bu: "Business Unit",
  global: "Global",
  public: "Público",
};

interface PermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permission?: Permission | null;
  onSave: (data: {
    key: string;
    module: string;
    resource: string;
    action: string;
    scope: PermissionScope;
    description?: string;
  }) => void;
  isPending?: boolean;
}

export function PermissionDialog({
  open,
  onOpenChange,
  permission,
  onSave,
  isPending,
}: PermissionDialogProps) {
  const [module, setModule] = useState(permission?.module || "");
  const [resource, setResource] = useState(permission?.resource || "");
  const [action, setAction] = useState(permission?.action || "");
  const [scope, setScope] = useState<PermissionScope>(permission?.scope || "bu");
  const [description, setDescription] = useState(permission?.description || "");

  const generatedKey = `${module}.${resource}.${action}:${scope}`;
  const isEdit = !!permission;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      key: generatedKey,
      module,
      resource,
      action,
      scope,
      description: description || undefined,
    });
  };

  const isValid = module && resource && action && scope;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Permissão" : "Nova Permissão"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="module">Módulo *</Label>
              <Input
                id="module"
                value={module}
                onChange={(e) => setModule(e.target.value.toLowerCase())}
                placeholder="okrs"
                disabled={isEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resource">Recurso *</Label>
              <Input
                id="resource"
                value={resource}
                onChange={(e) => setResource(e.target.value.toLowerCase())}
                placeholder="kr"
                disabled={isEdit}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="action">Ação *</Label>
              <Input
                id="action"
                value={action}
                onChange={(e) => setAction(e.target.value.toLowerCase())}
                placeholder="read"
                disabled={isEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scope">Escopo *</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as PermissionScope)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SCOPE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-md">
            <Label className="text-xs text-muted-foreground">Key gerada</Label>
            <p className="font-mono text-sm mt-1">{generatedKey || "—"}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição da permissão..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
