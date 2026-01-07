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
    profile_id: string;
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
  // Use profile_id for bu_user_permission_groups (FK references profiles.id)
  const { userGroups, isLoading: userGroupsLoading, setUserGroups } = useBuUserGroups(user?.profile_id || null);
  // Use user_id for effective permissions (auth context)
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
    // Use profile_id for bu_user_permission_groups (FK references profiles.id)
    setUserGroups.mutate(
      { userId: user.profile_id, groupIds: Array.from(selectedGroupIds) },
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
      <SheetContent className="sm:max-w-md flex flex-col h-full p-0">
        {/* Compact Header */}
        <div className="px-4 py-3 border-b shrink-0">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2.5">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.profiles.photo_url || undefined} />
                <AvatarFallback className="text-sm">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-left min-w-0 flex-1">
                <div className="text-base truncate">{user?.profiles.display_name}</div>
                <div className="text-xs font-normal text-muted-foreground truncate">
                  {user?.profiles.work_email}
                </div>
              </div>
              {isAdmin && (
                <Badge variant="default" className="shrink-0 text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Gerenciar permissões do usuário
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Tabs - more compact */}
        <Tabs defaultValue="groups" className="flex-1 flex flex-col min-h-0">
          <div className="px-4 pt-3 shrink-0">
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="groups" className="gap-1.5 text-sm">
                <Users className="h-3.5 w-3.5" />
                Grupos
                {selectedCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                    {selectedCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="effective" className="gap-1.5 text-sm">
                <Key className="h-3.5 w-3.5" />
                Permissões
                {effectivePermissions.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                    {effectivePermissions.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Groups Tab */}
          <TabsContent value="groups" className="flex-1 flex flex-col min-h-0 mt-0 px-4 pt-3 data-[state=inactive]:hidden">
            {!isAdmin && availableGroups.length > 3 && (
              <div className="relative shrink-0 mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar grupo..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  className="pl-8 pr-7 h-8 text-sm"
                />
                {groupSearch && (
                  <button
                    onClick={() => setGroupSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            <ScrollArea className="flex-1 -mx-4 px-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : isAdmin ? (
                <div className="text-center py-8">
                  <Shield className="h-10 w-10 mx-auto text-primary mb-2" />
                  <p className="font-medium text-sm">Administrador da BU</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[220px] mx-auto">
                    Acesso amplo a todos os recursos da BU.
                  </p>
                </div>
              ) : availableGroups.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum grupo habilitado.</p>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum resultado para "{groupSearch}"
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 pb-2">
                  {filteredGroups.map((group) => (
                    <label
                      key={group.id}
                      className="flex items-start gap-2.5 p-2.5 rounded-md border hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedGroupIds.has(group.id)}
                        onCheckedChange={() => toggleGroup(group.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm leading-tight">{group.name}</div>
                        {group.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
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
              <div className="flex items-center justify-between gap-2 pt-3 pb-4 border-t mt-auto shrink-0">
                <div className="text-xs text-muted-foreground">
                  {selectedCount} selecionado{selectedCount !== 1 ? "s" : ""}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    size="sm"
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
          <TabsContent value="effective" className="flex-1 flex flex-col min-h-0 mt-0 px-4 pt-3 data-[state=inactive]:hidden">
            {effectivePermissions.length > 5 && (
              <div className="relative shrink-0 mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar permissão..."
                  value={permissionSearch}
                  onChange={(e) => setPermissionSearch(e.target.value)}
                  className="pl-8 pr-7 h-8 text-sm"
                />
                {permissionSearch && (
                  <button
                    onClick={() => setPermissionSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            <ScrollArea className="flex-1 -mx-4 px-4 pb-4">
              {effectiveLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : isAdmin ? (
                <div className="text-center py-8">
                  <Shield className="h-10 w-10 mx-auto text-primary mb-2" />
                  <p className="font-medium text-sm">Administrador da BU</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[220px] mx-auto">
                    Acesso amplo a todos os recursos.
                  </p>
                </div>
              ) : effectivePermissions.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma permissão.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Atribua grupos para conceder permissões.
                  </p>
                </div>
              ) : moduleCount === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum resultado para "{permissionSearch}"
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pb-2">
                  {Object.entries(filteredPermissionsByModule)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([module, perms]) => (
                    <div key={module}>
                      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 sticky top-0 bg-background py-0.5 flex items-center gap-1.5">
                        {module}
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          {perms.length}
                        </Badge>
                      </h4>
                      <div className="space-y-0.5">
                        {perms.map((perm) => (
                          <div
                            key={perm.permission_id}
                            className="flex items-center justify-between py-1 px-1.5 rounded bg-muted/40 gap-2"
                          >
                            <code className="text-[11px] truncate flex-1">
                              {perm.permission_key}
                            </code>
                            <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">
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
