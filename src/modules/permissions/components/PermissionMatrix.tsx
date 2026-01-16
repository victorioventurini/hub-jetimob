import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Permission } from "../types";
import type { PermissionTemplateV2 } from "../hooks";

interface PermissionMatrixProps {
  permissions: Permission[];
  selectedPermissionIds: Set<string>;
  onPermissionToggle: (permissionId: string) => void;
  template?: PermissionTemplateV2 | null;
  readOnly?: boolean;
}

// Module display names and order
const MODULE_CONFIG: Record<string, { label: string; order: number; color: string }> = {
  home: { label: "Home", order: 0, color: "bg-status-slate" },
  users: { label: "Usuários", order: 1, color: "bg-status-blue" },
  teams: { label: "Times", order: 2, color: "bg-status-indigo" },
  okrs: { label: "OKRs", order: 3, color: "bg-status-purple" },
  kpis: { label: "KPIs", order: 4, color: "bg-status-pink" },
  tickets: { label: "Tickets", order: 5, color: "bg-status-orange" },
  assets: { label: "Assets", order: 6, color: "bg-status-green" },
  hub: { label: "Hub/Config", order: 7, color: "bg-status-amber" },
  platform: { label: "Plataforma", order: 8, color: "bg-status-red" },
};

// Action display names
const ACTION_LABELS: Record<string, string> = {
  view: "Visualizar",
  read: "Ler",
  create: "Criar",
  update: "Atualizar",
  delete: "Excluir",
  cancel: "Cancelar",
  manage: "Gerenciar",
  checkout: "Retirar",
  return: "Devolver",
  transfer: "Transferir",
  maintenance: "Manutenção",
  write_off: "Baixa",
  assign: "Atribuir",
  add: "Adicionar",
  invoke: "Invocar",
  override: "Override",
  disable: "Desativar",
  create_internal: "Criar Interno",
  create_external: "Criar Externo",
  update_status: "Atualizar Status",
  update_own: "Atualizar Próprio",
  update_scoped: "Atualizar (escopo)",
};

// Scope display
const SCOPE_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  global: { label: "Global", variant: "default" },
  bu: { label: "BU", variant: "secondary" },
  team: { label: "Time", variant: "outline" },
  team_tree: { label: "Árvore", variant: "outline" },
  squad: { label: "Squad", variant: "outline" },
  self: { label: "Próprio", variant: "outline" },
  self_or_owner: { label: "Próprio/Dono", variant: "outline" },
};

export function PermissionMatrix({
  permissions,
  selectedPermissionIds,
  onPermissionToggle,
  template,
  readOnly = false,
}: PermissionMatrixProps) {
  const [search, setSearch] = useState("");

  // Group permissions by module and resource
  const groupedPermissions = useMemo(() => {
    const filtered = search
      ? permissions.filter(
          (p) =>
            p.key.toLowerCase().includes(search.toLowerCase()) ||
            p.description?.toLowerCase().includes(search.toLowerCase()) ||
            p.resource.toLowerCase().includes(search.toLowerCase()) ||
            p.action.toLowerCase().includes(search.toLowerCase())
        )
      : permissions;

    // Group by module
    const byModule = filtered.reduce(
      (acc, perm) => {
        const module = perm.module;
        if (!acc[module]) acc[module] = {};
        
        const resource = perm.resource;
        if (!acc[module][resource]) acc[module][resource] = [];
        acc[module][resource].push(perm);
        
        return acc;
      },
      {} as Record<string, Record<string, Permission[]>>
    );

    // Sort modules
    const sortedModules = Object.keys(byModule).sort((a, b) => {
      const orderA = MODULE_CONFIG[a]?.order ?? 99;
      const orderB = MODULE_CONFIG[b]?.order ?? 99;
      return orderA - orderB;
    });

    return { byModule, sortedModules };
  }, [permissions, search]);

  const getModuleLabel = (module: string) => MODULE_CONFIG[module]?.label || module;
  const getModuleColor = (module: string) => MODULE_CONFIG[module]?.color || "bg-gray-500";
  const getActionLabel = (action: string) => ACTION_LABELS[action] || action;
  const getScopeConfig = (scope: string) => SCOPE_LABELS[scope] || { label: scope, variant: "outline" as const };

  const selectedCount = selectedPermissionIds.size;
  const totalCount = permissions.filter((p) => p.status === "active").length;

  return (
    <div className="space-y-4">
      {/* Header with template info */}
      {template && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                {template.slug && (
                  <code className="text-xs text-muted-foreground font-mono">{template.slug}</code>
                )}
              </div>
              {template.is_system && (
                <Badge variant="secondary">Template do Sistema</Badge>
              )}
            </div>
            {template.description && (
              <CardDescription>{template.description}</CardDescription>
            )}
          </CardHeader>
        </Card>
      )}

      {/* Search and stats */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar permissões..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{selectedCount}</span> de {totalCount} permissões
        </div>
      </div>

      {/* Matrix grid */}
      <ScrollArea className="h-[60vh] border rounded-lg">
        <div className="p-4 space-y-6">
          {groupedPermissions.sortedModules.map((module) => (
            <div key={module} className="space-y-3">
              {/* Module header */}
              <div className="flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
                <div className={cn("w-2 h-6 rounded-full", getModuleColor(module))} />
                <h3 className="font-semibold text-base">{getModuleLabel(module)}</h3>
                <Badge variant="outline" className="ml-auto">
                  {Object.values(groupedPermissions.byModule[module]).flat().length} permissões
                </Badge>
              </div>

              {/* Resources within module */}
              <div className="space-y-4 pl-4">
                {Object.entries(groupedPermissions.byModule[module])
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([resource, perms]) => (
                    <div key={resource} className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground capitalize">
                        {resource.replace(/_/g, " ")}
                      </h4>
                      
                      {/* Permissions grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                        {perms
                          .sort((a, b) => a.action.localeCompare(b.action))
                          .map((perm) => {
                            const isSelected = selectedPermissionIds.has(perm.id);
                            const scopeConfig = getScopeConfig(perm.scope);
                            const isDisabled = readOnly || perm.status !== "active";

                            return (
                              <label
                                key={perm.id}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg border transition-all",
                                  isSelected && "border-primary bg-primary/5",
                                  !isSelected && "border-border hover:border-muted-foreground/50",
                                  isDisabled && "opacity-50 cursor-not-allowed",
                                  !isDisabled && "cursor-pointer"
                                )}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => !isDisabled && onPermissionToggle(perm.id)}
                                  disabled={isDisabled}
                                  className="shrink-0"
                                />
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium">
                                      {getActionLabel(perm.action)}
                                    </span>
                                    <Badge variant={scopeConfig.variant} className="text-xs h-5">
                                      {scopeConfig.label}
                                    </Badge>
                                  </div>
                                  
                                  {perm.description && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                                          <Info className="h-3 w-3 shrink-0" />
                                          <span className="truncate">{perm.description}</span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="max-w-xs">
                                        <p>{perm.description}</p>
                                        <code className="block mt-1 text-xs opacity-70">{perm.key}</code>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}

          {groupedPermissions.sortedModules.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma permissão encontrada
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
