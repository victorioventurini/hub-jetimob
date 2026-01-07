import { useState, useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Loader2, Shield, Key, Users, Search, X } from "lucide-react";
import { useBuGroupConfigs, useBuUserGroups, useUserEffectivePermissions } from "../hooks/useBuPermissions";
import { usePermissionGroups } from "../hooks/usePermissionGroups";
import type { PermissionGroup } from "../types";

interface UserPermissionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    user_id: string;
    role_in_bu: string | null;
    profiles: {
      display_name: string;
      work_email: string;
      photo_url: string | null;
    };
  } | null;
}

export function UserPermissionsSheet({
  open,
  onOpenChange,
  user,
}: UserPermissionsSheetProps) {
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [groupSearch, setGroupSearch] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");

  const { groups } = usePermissionGroups();
  const { configs, isLoading: configsLoading } = useBuGroupConfigs();
  const { userGroups, isLoading: userGroupsLoading, setUserGroups } = useBuUserGroups(user?.user_id || null);
  const { effectivePermissions, isLoading: effectiveLoading } = useUserEffectivePermissions(user?.user_id || null);

  // Map configs by group_id for quick lookup
  const configByGroupId = configs.reduce(
    (acc, c) => {
      acc[c.group_id] = c;
      return acc;
    },
    {} as Record<string, typeof configs[0]>
  );

  // Get available groups: active AND enabled in this BU (default enabled if no config)
  const availableGroups = useMemo(() => {
    return groups.filter((g) => {
      if (g.status !== "active") return false;
      const config = configByGroupId[g.id];
      return config?.is_enabled ?? true; // Default enabled if no config exists
    });
  }, [groups, configByGroupId]);

  // Filter groups by search
  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return availableGroups;
    const search = groupSearch.toLowerCase();
    return availableGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(search) ||
        g.description?.toLowerCase().includes(search)
    );
  }, [availableGroups, groupSearch]);

  // Filter permissions by search and group by module
  const filteredPermissionsByModule = useMemo(() => {
    let filtered = effectivePermissions;
    
    if (permissionSearch.trim()) {
      const search = permissionSearch.toLowerCase();
      filtered = effectivePermissions.filter(
        (p) =>
          p.permission_key.toLowerCase().includes(search) ||
          p.module.toLowerCase().includes(search) ||
          p.source_name?.toLowerCase().includes(search)
      );
    }

    return filtered.reduce(
      (acc, p) => {
        if (!acc[p.module]) acc[p.module] = [];
        acc[p.module].push(p);
        return acc;
      },
      {} as Record<string, typeof effectivePermissions>
    );
  }, [effectivePermissions, permissionSearch]);

  // Reset search when sheet closes
  useEffect(() => {
    if (!open) {
      setGroupSearch("");
      setPermissionSearch("");
    }
  }, [open]);

  // Initialize selected groups when sheet opens
  useEffect(() => {
    if (open && userGroups.length > 0) {
      setSelectedGroupIds(new Set(userGroups.map((ug) => ug.group_id)));
    } else if (open) {
      setSelectedGroupIds(new Set());
    }
  }, [open, userGroups]);

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!user) return;
    setUserGroups.mutate(
      { userId: user.user_id, groupIds: Array.from(selectedGroupIds) },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const isLoading = configsLoading || userGroupsLoading;
  const isAdmin = user?.role_in_bu === "admin";
  const hasChanges = useMemo(() => {
    const currentIds = new Set(userGroups.map((ug) => ug.group_id));
    if (currentIds.size !== selectedGroupIds.size) return true;
    for (const id of selectedGroupIds) {
      if (!currentIds.has(id)) return true;
    }
    return false;
  }, [userGroups, selectedGroupIds]);

  const initials = user?.profiles.display_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const selectedCount = selectedGroupIds.size;
  const moduleCount = Object.keys(filteredPermissionsByModule).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] flex flex-col h-full p-0">
        {/* Fixed Header */}
        <div className="p-6 pb-4 border-b shrink-0">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.profiles.photo_url || undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="text-left">
                <div>{user?.profiles.display_name}</div>
                <div className="text-sm font-normal text-muted-foreground">
                  {user?.profiles.work_email}
                </div>
              </div>
            </SheetTitle>
            <SheetDescription asChild>
              <div>
                {isAdmin && (
                  <Badge variant="default" className="mt-2">
                    <Shield className="h-3 w-3 mr-1" />
                    Administrador da BU — acesso amplo
                  </Badge>
                )}
              </div>
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Tabs with flex-1 to fill remaining space */}
        <Tabs defaultValue="groups" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4 shrink-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="groups" className="gap-2">
                <Users className="h-4 w-4" />
                Grupos
                {selectedCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {selectedCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="effective" className="gap-2">
                <Key className="h-4 w-4" />
                Permissões
                {effectivePermissions.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {effectivePermissions.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Groups Tab */}
          <TabsContent value="groups" className="flex-1 flex flex-col min-h-0 mt-0 px-6 pt-4">
            {!isAdmin && availableGroups.length > 3 && (
              <div className="relative shrink-0 mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar grupo..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  className="pl-9 pr-8"
                />
                {groupSearch && (
                  <button
                    onClick={() => setGroupSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            <ScrollArea className="flex-1 -mx-6 px-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : isAdmin ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto text-primary mb-3" />
                  <p className="font-medium">Administrador da BU</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                    Como administrador, este usuário já possui acesso amplo a todos os recursos da BU.
                  </p>
                </div>
              ) : availableGroups.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Nenhum grupo habilitado nesta BU.</p>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    Nenhum grupo encontrado para "{groupSearch}"
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pb-4">
                  {filteredGroups.map((group) => (
                    <label
                      key={group.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedGroupIds.has(group.id)}
                        onCheckedChange={() => toggleGroup(group.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{group.name}</div>
                        {group.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>

            {!isAdmin && (
              <div className="flex items-center justify-between gap-2 pt-4 pb-6 border-t mt-auto shrink-0">
                <div className="text-sm text-muted-foreground">
                  {selectedCount} grupo{selectedCount !== 1 ? "s" : ""} selecionado{selectedCount !== 1 ? "s" : ""}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={setUserGroups.isPending || !hasChanges}
                  >
                    {setUserGroups.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Effective Permissions Tab */}
          <TabsContent value="effective" className="flex-1 flex flex-col min-h-0 mt-0 px-6 pt-4">
            {!isAdmin && effectivePermissions.length > 5 && (
              <div className="relative shrink-0 mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar permissão, módulo ou origem..."
                  value={permissionSearch}
                  onChange={(e) => setPermissionSearch(e.target.value)}
                  className="pl-9 pr-8"
                />
                {permissionSearch && (
                  <button
                    onClick={() => setPermissionSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            <ScrollArea className="flex-1 -mx-6 px-6 pb-6">
              {effectiveLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : isAdmin ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto text-primary mb-3" />
                  <p className="font-medium">Administrador da BU</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                    Este usuário tem acesso amplo a todos os recursos da BU por ser administrador.
                  </p>
                </div>
              ) : effectivePermissions.length === 0 ? (
                <div className="text-center py-12">
                  <Key className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Nenhuma permissão atribuída.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Atribua grupos ao usuário para conceder permissões.
                  </p>
                </div>
              ) : moduleCount === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    Nenhuma permissão encontrada para "{permissionSearch}"
                  </p>
                </div>
              ) : (
                <div className="space-y-6 pb-4">
                  {Object.entries(filteredPermissionsByModule)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([module, perms]) => (
                    <div key={module}>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 sticky top-0 bg-background py-1">
                        {module}
                        <Badge variant="outline" className="ml-2 text-xs">
                          {perms.length}
                        </Badge>
                      </h4>
                      <div className="space-y-1">
                        {perms.map((perm) => (
                          <div
                            key={perm.permission_id}
                            className="flex items-center justify-between p-2 rounded-md bg-muted/50 gap-2"
                          >
                            <code className="text-xs truncate flex-1">
                              {perm.permission_key}
                            </code>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {perm.source_name}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
