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
import { 
  Loader2, 
  Shield, 
  Key, 
  Search, 
  X, 
  FileStack,
  Eye,
  Wrench,
  Settings2,
  AlertTriangle,
  UserX
} from "lucide-react";
import { toast } from "sonner";
import { useUserEffectivePermissions } from "../hooks/useBuPermissions";
import { usePermissionTemplatesV2, useUserTemplatesV2 } from "../hooks/usePermissionsV2";
import { usePermissionDiff, useLogPermissionChange } from "../hooks/usePermissionGovernance";
import { PermissionDiffDialog } from "./PermissionDiffDialog";
import { RevokeAccessDialog } from "./RevokeAccessDialog";
import { useAuth } from "@/hooks/useAuth";
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
  const { isAdmin: currentUserIsAdmin } = useAuth();
  
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [templateSearch, setTemplateSearch] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [showDiffDialog, setShowDiffDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  // Effective permissions - must use profile_id, not user_id
  const { effectivePermissions, isLoading: effectiveLoading } = useUserEffectivePermissions(user?.profile_id || null);

  // V2 hooks
  const { templates, isLoading: templatesLoading } = usePermissionTemplatesV2();
  const { 
    assignments: v2Assignments, 
    isLoading: v2AssignmentsLoading,
    assignTemplate,
    removeTemplate
  } = useUserTemplatesV2(user?.profile_id || null);

  // Governance hooks
  const proposedTemplateIds = useMemo(() => [...selectedTemplateIds], [selectedTemplateIds]);
  const { additions, removals, isLoading: diffLoading } = usePermissionDiff(
    user?.profile_id || null, 
    proposedTemplateIds
  );
  const logPermissionChange = useLogPermissionChange();
  const isAdmin = user?.role_in_bu === "admin";
  const isExternal = user?.role_in_bu === "external";

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

  // Group effective permissions by module
  const permissionsByModule = useMemo(() => {
    let filtered = effectivePermissions;
    if (permissionSearch.trim()) {
      const search = permissionSearch.toLowerCase();
      filtered = effectivePermissions.filter(p => 
        p.permission_key.toLowerCase().includes(search) ||
        p.module.toLowerCase().includes(search)
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

  // Open diff dialog instead of applying directly
  const handleOpenDiffDialog = () => {
    if (!user || !hasChanges) return;
    setShowDiffDialog(true);
  };

  // Apply changes with governance (reason optional)
  const handleApplyWithGovernance = async (reason?: string) => {
    if (!user) return;

    setIsApplying(true);
    
    try {
      // Capture before state
      const beforeTemplateIds = [...currentV2TemplateIds];
      const afterTemplateIds = [...selectedTemplateIds];
      
      // Find templates to add and remove
      const toAdd = afterTemplateIds.filter(id => !currentV2TemplateIds.has(id));
      const toRemove = v2Assignments.filter(a => !selectedTemplateIds.has(a.template_id));
      
      // Remove first, then add
      for (const assignment of toRemove) {
        await removeTemplate.mutateAsync(assignment.id);
      }
      
      for (const templateId of toAdd) {
        await assignTemplate.mutateAsync({ userId: user.profile_id, templateId });
      }

      // Log to audit
      await logPermissionChange.mutateAsync({
        targetUserId: user.profile_id,
        action: toAdd.length > 0 && toRemove.length > 0 
          ? "assign_template" 
          : toAdd.length > 0 
            ? "assign_template" 
            : "remove_template",
        entityType: "template",
        entityName: `${toAdd.length} adicionados, ${toRemove.length} removidos`,
        beforeState: { template_ids: beforeTemplateIds },
        afterState: { template_ids: afterTemplateIds },
        reason,
      });

      toast.success("Permissões atualizadas com sucesso");
      setShowDiffDialog(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao aplicar permissões:", error);
      toast.error("Erro ao aplicar permissões");
    } finally {
      setIsApplying(false);
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

  const isLoading = templatesLoading || v2AssignmentsLoading;
  const isSaving = assignTemplate.isPending || removeTemplate.isPending || isApplying;

  // Only admin (includes super_admin) can edit admin users
  const canEdit = !isAdmin || currentUserIsAdmin;

  return (
    <>
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
              Gerenciar permissões do usuário
            </SheetDescription>
          </SheetHeader>
          
          {/* Revoke Access Button */}
          {user?.role_in_bu && (currentUserIsAdmin || !isAdmin) && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-destructive hover:text-destructive hover:bg-destructive/10 w-full justify-start"
              onClick={() => setShowRevokeDialog(true)}
            >
              <UserX className="h-4 w-4 mr-2" />
              Revogar Acesso à BU
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="templates" className="flex-1 flex flex-col min-h-0">
          <div className="px-4 pt-3 shrink-0">
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="templates" className="gap-1 text-xs">
                <FileStack className="h-3 w-3" />
                Templates
                <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
                  {selectedTemplateIds.size}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="effective" className="gap-1 text-xs">
                <Key className="h-3 w-3" />
                Permissões
                <Badge variant="outline" className="ml-0.5 h-4 px-1 text-[10px]">
                  {effectivePermissions.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Templates Tab */}
          <TabsContent value="templates" className="flex-1 flex flex-col min-h-0 mt-0 px-4 pt-3 data-[state=inactive]:hidden">
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
              ) : isAdmin && !currentUserIsAdmin ? (
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
                    {templateSearch ? `Nenhum resultado para "${templateSearch}"` : "Nenhum template disponível."}
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

            {canEdit && (
              <div className="flex items-center justify-between gap-2 pt-3 pb-4 border-t mt-auto shrink-0">
                <div className="text-xs text-muted-foreground">
                  {selectedTemplateIds.size} template{selectedTemplateIds.size !== 1 ? "s" : ""}
                  {hasChanges && (
                    <span className="ml-2 text-amber-600">
                      • {additions.length} a adicionar, {removals.length} a remover
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleOpenDiffDialog} 
                    disabled={isSaving || !hasChanges || diffLoading}
                  >
                    {diffLoading ? "Calculando..." : isSaving ? "Salvando..." : "Revisar e Aplicar"}
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
              {effectiveLoading ? (
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
              ) : effectivePermissions.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma permissão.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Atribua templates para conceder permissões.
                  </p>
                </div>
              ) : Object.keys(permissionsByModule).length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum resultado para "{permissionSearch}"
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pb-2">
                  {Object.entries(permissionsByModule)
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

    {/* Governance Gate: Diff Dialog with required reason */}
    <PermissionDiffDialog
      open={showDiffDialog}
      onOpenChange={setShowDiffDialog}
      userName={user?.profiles.display_name || ""}
      additions={additions}
      removals={removals}
      onConfirm={handleApplyWithGovernance}
      isPending={isApplying}
    />

    {/* Revoke Access Dialog */}
    <RevokeAccessDialog
      open={showRevokeDialog}
      onOpenChange={setShowRevokeDialog}
      user={user}
      onSuccess={() => onOpenChange(false)}
    />
    </>
  );
}
