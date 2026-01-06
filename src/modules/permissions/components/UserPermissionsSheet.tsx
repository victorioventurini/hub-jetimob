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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield, Key, Users } from "lucide-react";
import { useBuGroupConfigs, useBuUserGroups, useUserEffectivePermissions } from "../hooks/useBuPermissions";
import { usePermissionGroups } from "../hooks/usePermissionGroups";
import type { PermissionGroup } from "../types";

interface UserPermissionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    user_id: string;
    role_in_bu: string;
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

  const { groups } = usePermissionGroups();
  const { configs, isLoading: configsLoading } = useBuGroupConfigs();
  const { userGroups, isLoading: userGroupsLoading, setUserGroups } = useBuUserGroups(user?.user_id || null);
  const { effectivePermissions, isLoading: effectiveLoading } = useUserEffectivePermissions(user?.user_id || null);

  // Get enabled groups for this BU
  const enabledGroupIds = new Set(
    configs.filter((c) => c.is_enabled).map((c) => c.group_id)
  );

  const availableGroups = groups.filter(
    (g) => g.status === "active" && enabledGroupIds.has(g.id)
  );

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

  const initials = user?.profiles.display_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  // Group effective permissions by module
  const permissionsByModule = effectivePermissions.reduce(
    (acc, p) => {
      if (!acc[p.module]) acc[p.module] = [];
      acc[p.module].push(p);
      return acc;
    },
    {} as Record<string, typeof effectivePermissions>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.profiles.photo_url || undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div>{user?.profiles.display_name}</div>
              <div className="text-sm font-normal text-muted-foreground">
                {user?.profiles.work_email}
              </div>
            </div>
          </SheetTitle>
          <SheetDescription>
            {isAdmin && (
              <Badge variant="default" className="mt-2">
                <Shield className="h-3 w-3 mr-1" />
                Administrador da BU — acesso amplo
              </Badge>
            )}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="groups" className="flex-1 flex flex-col mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="groups" className="gap-2">
              <Users className="h-4 w-4" />
              Grupos
            </TabsTrigger>
            <TabsTrigger value="effective" className="gap-2">
              <Key className="h-4 w-4" />
              Permissões Efetivas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="groups" className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : availableGroups.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum grupo habilitado nesta BU.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableGroups.map((group) => (
                    <label
                      key={group.id}
                      className="flex items-start gap-3 p-3 rounded-md border hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedGroupIds.has(group.id)}
                        onCheckedChange={() => toggleGroup(group.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{group.name}</div>
                        {group.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="flex items-center justify-end gap-2 pt-4 border-t mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={setUserGroups.isPending}>
                {setUserGroups.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="effective" className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 mt-4">
              {effectiveLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : isAdmin ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-primary mb-3" />
                  <p className="font-medium">Administrador da BU</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Este usuário tem acesso amplo a todos os recursos da BU por ser administrador.
                  </p>
                </div>
              ) : effectivePermissions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma permissão atribuída.
                </p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(permissionsByModule).map(([module, perms]) => (
                    <div key={module}>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {module}
                      </h4>
                      <div className="space-y-1">
                        {perms.map((perm) => (
                          <div
                            key={perm.permission_id}
                            className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                          >
                            <code className="text-xs">
                              {perm.permission_key}
                            </code>
                            <Badge variant="outline" className="text-xs">
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
