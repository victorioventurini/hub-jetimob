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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  Shield, 
  Key, 
  Users, 
  Search, 
  X, 
  FileStack,
  Eye,
  Wrench,
  Settings2,
  Plus,
  Minus,
  ArrowRight,
  AlertTriangle
} from "lucide-react";
import { useBuGroupConfigs, useBuUserGroups, useUserEffectivePermissions } from "../hooks/useBuPermissions";
import { usePermissionGroups } from "../hooks/usePermissionGroups";
import { usePermissionTemplatesV2, useUserTemplatesV2, useEffectivePermissionsPreview } from "../hooks/usePermissionsV2";
import { useAuth } from "@/hooks/useAuth";
import type { PermissionGroup } from "../types";
import type { PermissionTemplateV2 } from "../hooks/usePermissionsV2";

const SURFACE_ICONS = {
  view: Eye,
  operate: Wrench,
  administer: Settings2,
  base: Eye,
  restricted: Shield,
};

const SURFACE_COLORS: Record<string, string> = {
  view: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  operate: "bg-green-500/10 text-green-700 border-green-500/30",
  administer: "bg-orange-500/10 text-orange-700 border-orange-500/30",
  base: "bg-gray-500/10 text-gray-700 border-gray-500/30",
  restricted: "bg-red-500/10 text-red-700 border-red-500/30",
};

// Templates allowed for external users
const EXTERNAL_ALLOWED_SLUGS = ['external_contact_base_v2', 'tickets_view_v2'];

interface UserPermissionsV2SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    user_id: string;
    profile_id: string;
    role_in_bu: string | null;
    is_external?: boolean;
    profiles: {
      display_name: string;
      work_email: string;
      photo_url: string | null;
    };
  } | null;
}

export function UserPermissionsV2Sheet({
  open,
  onOpenChange,
  user,
}: UserPermissionsV2SheetProps) {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.is_super_admin ?? false;
  
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [templateSearch, setTemplateSearch] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [previewMode, setPreviewMode] = useState<'v1' | 'v2' | 'both'>('both');

  // V1 hooks (read-only)
  const { groups } = usePermissionGroups();
  const { configs } = useBuGroupConfigs();
  const { userGroups, isLoading: userGroupsLoading } = useBuUserGroups(user?.profile_id || null);
  const { effectivePermissions: v1Permissions, isLoading: v1Loading } = useUserEffectivePermissions(user?.user_id || null);

  // V2 hooks
  const { templates, isLoading: templatesLoading } = usePermissionTemplatesV2();
  const { 
    assignments: v2Assignments, 
    isLoading: v2AssignmentsLoading,
    assignTemplate,
    removeTemplate
  } = useUserTemplatesV2(user?.profile_id || null);

  // Preview hook
  const { permissions: previewPermissions, isLoading: previewLoading } = useEffectivePermissionsPreview(
    user?.user_id || null,
    previewMode
  );

  const isAdmin = user?.role_in_bu === "admin";
  const isExternal = user?.is_external ?? false;

  // Filter templates based on user type
  const availableTemplates = useMemo(() => {
    if (isExternal) {
      return templates.filter(t => EXTERNAL_ALLOWED_SLUGS.includes(t.slug));
    }
    return templates;
  }, [templates, isExternal]);

  // Get current v2 template IDs
  const currentV2TemplateIds = useMemo(() => {
    return new Set(v2Assignments.map(a => a.template_id));
  }, [v2Assignments]);

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return availableTemplates;
    const search = templateSearch.toLowerCase();
    return availableTemplates.filter(
      t =>
        t.name.toLowerCase().includes(search) ||
        t.slug.toLowerCase().includes(search) ||
        t.module?.toLowerCase().includes(search) ||
        t.surface?.toLowerCase().includes(search)
    );
  }, [availableTemplates, templateSearch]);

  // Group templates by module for better organization
  const templatesByModule = useMemo(() => {
    return filteredTemplates.reduce(
      (acc, t) => {
        const key = t.module || 'global';
        if (!acc[key]) acc[key] = [];
        acc[key].push(t);
        return acc;
      },
      {} as Record<string, PermissionTemplateV2[]>
    );
  }, [filteredTemplates]);

  // V1 groups for display
  const v1GroupNames = useMemo(() => {
    return userGroups.map(ug => {
      const group = groups.find(g => g.id === ug.group_id);
      return group?.name || 'Grupo desconhecido';
    });
  }, [userGroups, groups]);

  // Calculate diff for preview
  const permissionDiff = useMemo(() => {
    const v1Keys = new Set(v1Permissions.map(p => p.permission_key));
    const v2Keys = new Set(previewPermissions.filter(p => p.source === 'template_v2').map(p => p.permission_key));
    
    const gained = [...v2Keys].filter(k => !v1Keys.has(k));
    const lost = [...v1Keys].filter(k => !v2Keys.has(k));
    
    return { gained, lost };
  }, [v1Permissions, previewPermissions]);

  // Initialize selected templates when sheet opens
  useEffect(() => {
    if (open && v2Assignments.length > 0) {
      setSelectedTemplateIds(new Set(v2Assignments.map(a => a.template_id)));
    } else if (open) {
      setSelectedTemplateIds(new Set());
    }
  }, [open, v2Assignments]);

  // Reset search when sheet closes
  useEffect(() => {
    if (!open) {
      setTemplateSearch("");
      setPermissionSearch("");
      setPreviewMode('both');
    }
  }, [open]);

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplateIds(prev => {
      const next = new Set(prev);
      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.add(templateId);
      }
      return next;
    });
  };

  const handleApplyV2 = async () => {
    if (!user) return;
    
    // Find templates to add and remove
    const toAdd = [...selectedTemplateIds].filter(id => !currentV2TemplateIds.has(id));
    const toRemove = v2Assignments.filter(a => !selectedTemplateIds.has(a.template_id));
    
    // Remove first, then add
    for (const assignment of toRemove) {
      await removeTemplate.mutateAsync(assignment.id);
    }
    
    for (const templateId of toAdd) {
      await assignTemplate.mutateAsync({ userId: user.profile_id, templateId });
    }
  };

  const hasChanges = useMemo(() => {
    if (selectedTemplateIds.size !== currentV2TemplateIds.size) return true;
    for (const id of selectedTemplateIds) {
      if (!currentV2TemplateIds.has(id)) return true;
    }
    return false;
  }, [selectedTemplateIds, currentV2TemplateIds]);

  const initials = user?.profiles.display_name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const isLoading = userGroupsLoading || templatesLoading || v2AssignmentsLoading;
  const isSaving = assignTemplate.isPending || removeTemplate.isPending;

  // Only super_admin can edit admin users
  const canEdit = !isAdmin || isSuperAdmin;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg flex flex-col h-full p-0">
        {/* Header */}
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
              <div className="flex gap-1 shrink-0">
                {isAdmin && (
                  <Badge variant="default" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                )}
                {isExternal && (
                  <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-700">
                    Externo
                  </Badge>
                )}
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">
              Gerenciar permissões v2 do usuário
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="v2" className="flex-1 flex flex-col min-h-0">
          <div className="px-4 pt-3 shrink-0">
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="v1" className="gap-1 text-xs">
                <Users className="h-3 w-3" />
                v1
                <Badge variant="outline" className="ml-0.5 h-4 px-1 text-[10px]">
                  {v1GroupNames.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="v2" className="gap-1 text-xs">
                <FileStack className="h-3 w-3" />
                v2
                <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
                  {selectedTemplateIds.size}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-1 text-xs">
                <Key className="h-3 w-3" />
                Preview
              </TabsTrigger>
            </TabsList>
          </div>

          {/* V1 Tab - Read Only */}
          <TabsContent value="v1" className="flex-1 flex flex-col min-h-0 mt-0 px-4 pt-3 data-[state=inactive]:hidden">
            <Alert className="mb-3">
              <AlertDescription className="text-xs">
                Templates v1 são somente leitura. Use a aba <strong>v2</strong> para gerenciar permissões.
              </AlertDescription>
            </Alert>

            <ScrollArea className="flex-1 -mx-4 px-4 pb-4">
              {userGroupsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : isAdmin ? (
                <div className="text-center py-8">
                  <Shield className="h-10 w-10 mx-auto text-primary mb-2" />
                  <p className="font-medium text-sm">Administrador da BU</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Acesso amplo (*) a todos os recursos.
                  </p>
                </div>
              ) : v1GroupNames.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum template v1 atribuído.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {v1GroupNames.map((name, i) => (
                    <div key={i} className="p-2 rounded border bg-muted/30">
                      <span className="text-sm">{name}</span>
                      <Badge variant="secondary" className="ml-2 text-xs">v1</Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* V2 Tab - Editable */}
          <TabsContent value="v2" className="flex-1 flex flex-col min-h-0 mt-0 px-4 pt-3 data-[state=inactive]:hidden">
            {isExternal && (
              <Alert className="mb-3 border-amber-500/50 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-700">
                  Usuário externo: apenas templates permitidos estão disponíveis.
                </AlertDescription>
              </Alert>
            )}

            {!canEdit && (
              <Alert className="mb-3">
                <AlertDescription className="text-xs">
                  Somente super_admin pode editar permissões de administradores.
                </AlertDescription>
              </Alert>
            )}

            {availableTemplates.length > 5 && canEdit && (
              <div className="relative shrink-0 mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar template..."
                  value={templateSearch}
                  onChange={e => setTemplateSearch(e.target.value)}
                  className="pl-8 pr-7 h-8 text-sm"
                />
                {templateSearch && (
                  <button
                    onClick={() => setTemplateSearch("")}
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
              ) : isAdmin && !isSuperAdmin ? (
                <div className="text-center py-8">
                  <Shield className="h-10 w-10 mx-auto text-primary mb-2" />
                  <p className="font-medium text-sm">Administrador da BU</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Somente super_admin pode editar.
                  </p>
                </div>
              ) : Object.keys(templatesByModule).length === 0 ? (
                <div className="text-center py-8">
                  <FileStack className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {templateSearch ? `Nenhum resultado para "${templateSearch}"` : "Nenhum template v2 disponível."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pb-2">
                  {Object.entries(templatesByModule).map(([module, moduleTemplates]) => (
                    <div key={module}>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {module}
                      </h4>
                      <div className="space-y-1.5">
                        {moduleTemplates.map(template => {
                          const SurfaceIcon = SURFACE_ICONS[template.surface as keyof typeof SURFACE_ICONS] || Eye;
                          const surfaceColor = SURFACE_COLORS[template.surface || 'base'] || SURFACE_COLORS.base;
                          const isSelected = selectedTemplateIds.has(template.id);
                          
                          return (
                            <label
                              key={template.id}
                              className={`flex items-start gap-2.5 p-2.5 rounded-md border cursor-pointer transition-colors ${
                                isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                              } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => canEdit && toggleTemplate(template.id)}
                                disabled={!canEdit}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm leading-tight">{template.name}</span>
                                  {template.surface && (
                                    <Badge variant="outline" className={`text-[10px] h-5 ${surfaceColor}`}>
                                      <SurfaceIcon className="h-3 w-3 mr-0.5" />
                                      {template.surface.toUpperCase()}
                                    </Badge>
                                  )}
                                </div>
                                {template.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                    {template.description}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {canEdit && !isAdmin && (
              <div className="flex items-center justify-between gap-2 pt-3 pb-4 border-t mt-auto shrink-0">
                <div className="text-xs text-muted-foreground">
                  {selectedTemplateIds.size} template{selectedTemplateIds.size !== 1 ? "s" : ""} v2
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleApplyV2} 
                    disabled={isSaving || !hasChanges}
                  >
                    {isSaving ? "Salvando..." : "Aplicar v2"}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="flex-1 flex flex-col min-h-0 mt-0 px-4 pt-3 data-[state=inactive]:hidden">
            {/* Mode selector */}
            <div className="flex gap-2 mb-3 shrink-0">
              {(['v1', 'v2', 'both'] as const).map(mode => (
                <Button
                  key={mode}
                  variant={previewMode === mode ? "default" : "outline"}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setPreviewMode(mode)}
                >
                  {mode === 'v1' && 'Apenas v1'}
                  {mode === 'v2' && 'Apenas v2'}
                  {mode === 'both' && 'v1 + v2'}
                </Button>
              ))}
            </div>

            {/* Diff summary */}
            {previewMode === 'both' && (permissionDiff.gained.length > 0 || permissionDiff.lost.length > 0) && (
              <div className="flex gap-2 mb-3 shrink-0">
                {permissionDiff.gained.length > 0 && (
                  <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-700 border-green-500/30">
                    <Plus className="h-3 w-3" />
                    {permissionDiff.gained.length} novas
                  </Badge>
                )}
                {permissionDiff.lost.length > 0 && (
                  <Badge variant="outline" className="gap-1 bg-red-500/10 text-red-700 border-red-500/30">
                    <Minus className="h-3 w-3" />
                    {permissionDiff.lost.length} perdidas
                  </Badge>
                )}
              </div>
            )}

            {previewPermissions.length > 5 && (
              <div className="relative shrink-0 mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar permissão..."
                  value={permissionSearch}
                  onChange={e => setPermissionSearch(e.target.value)}
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
              {previewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : isAdmin ? (
                <div className="text-center py-8">
                  <Shield className="h-10 w-10 mx-auto text-primary mb-2" />
                  <p className="font-medium text-sm">Administrador da BU</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Acesso amplo (*) a todos os recursos.
                  </p>
                </div>
              ) : previewPermissions.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma permissão efetiva.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {previewPermissions
                    .filter(p => !permissionSearch || p.permission_key.toLowerCase().includes(permissionSearch.toLowerCase()))
                    .map((perm, i) => {
                      const isGained = permissionDiff.gained.includes(perm.permission_key);
                      const isLost = permissionDiff.lost.includes(perm.permission_key);
                      
                      return (
                        <div
                          key={`${perm.permission_key}-${i}`}
                          className={`flex items-center justify-between py-1.5 px-2 rounded gap-2 ${
                            isGained ? 'bg-green-500/10' : isLost ? 'bg-red-500/10' : 'bg-muted/40'
                          }`}
                        >
                          <code className="text-[11px] truncate flex-1">
                            {perm.permission_key}
                          </code>
                          <div className="flex gap-1 shrink-0">
                            {isGained && <Plus className="h-3 w-3 text-green-600" />}
                            {isLost && <Minus className="h-3 w-3 text-red-600" />}
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] h-4 px-1 ${
                                perm.source === 'template_v2' ? 'border-primary/50' : ''
                              }`}
                            >
                              {perm.source_name}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
