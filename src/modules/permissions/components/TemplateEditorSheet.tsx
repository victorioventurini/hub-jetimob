import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LoadingState } from "@/components/ui/loading-state";
import { 
  Save, 
  Eye, 
  Wrench, 
  Settings2, 
  Search, 
  Check,
  X,
  Lock,
} from "lucide-react";
import { 
  usePermissionTemplatesV2, 
  useTemplateItemsV2, 
  PermissionTemplateV2 
} from "../hooks/usePermissionsV2";
import { usePermissionCatalog } from "../hooks/usePermissionCatalog";
import { cn } from "@/lib/utils";

// Radix SelectItem não permite value="" (string vazia)
const MODULE_GLOBAL_VALUE = "__global__";
const SURFACE_NONE_VALUE = "__none__";

const SURFACE_OPTIONS = [
  { value: SURFACE_NONE_VALUE, label: 'Nenhuma', icon: null, color: 'bg-muted text-muted-foreground' },
  { value: 'base', label: 'Base', icon: Eye, color: 'bg-gray-500/10 text-gray-700' },
  { value: 'view', label: 'View', icon: Eye, color: 'bg-blue-500/10 text-blue-700' },
  { value: 'operate', label: 'Operate', icon: Wrench, color: 'bg-green-500/10 text-green-700' },
  { value: 'administer', label: 'Administer', icon: Settings2, color: 'bg-orange-500/10 text-orange-700' },
  { value: 'restricted', label: 'Restricted', icon: Lock, color: 'bg-red-500/10 text-red-700' },
];

interface TemplateEditorSheetProps {
  template: PermissionTemplateV2 | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateEditorSheet({
  template,
  open,
  onOpenChange,
}: TemplateEditorSheetProps) {
  const { updateTemplate } = usePermissionTemplatesV2();
  const templateId = template?.id ?? null;
  const { keys: currentKeys, isLoading: keysLoading, setTemplateItems } = useTemplateItemsV2(templateId);
  const { permissions, permissionsByModule, isLoading: catalogLoading, modules } = usePermissionCatalog();

  // Form state - ALL hooks must be called before any early return
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState<string>(MODULE_GLOBAL_VALUE);
  const [surface, setSurface] = useState<string>(SURFACE_NONE_VALUE);
  
  // Permission keys state
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  
  // Track if form has changes
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when template changes
  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setModule(template.module ?? MODULE_GLOBAL_VALUE);
      setSurface(template.surface || SURFACE_NONE_VALUE);
    }
  }, [template?.id, template?.name, template?.description, template?.module, template?.surface]);

  // Sync selected keys when template items load
  useEffect(() => {
    if (currentKeys.length > 0) {
      setSelectedKeys(new Set(currentKeys));
    } else {
      setSelectedKeys(new Set());
    }
  }, [currentKeys, templateId]);

  // Check if metadata has changes
  const hasMetadataChanges = useMemo(() => {
    if (!template) return false;
    return (
      name !== template.name ||
      description !== (template.description || "") ||
      module !== (template.module ?? MODULE_GLOBAL_VALUE) ||
      surface !== (template.surface || SURFACE_NONE_VALUE)
    );
  }, [template, name, description, module, surface]);

  // Check if keys have changes
  const hasKeyChanges = useMemo(() => {
    if (keysLoading) return false;
    const currentSet = new Set(currentKeys);
    if (selectedKeys.size !== currentSet.size) return true;
    for (const key of selectedKeys) {
      if (!currentSet.has(key)) return true;
    }
    return false;
  }, [currentKeys, selectedKeys, keysLoading]);

  const hasChanges = hasMetadataChanges || hasKeyChanges;

  // Filter permissions by search
  const filteredPermissionsByModule = useMemo(() => {
    if (!searchQuery.trim()) return permissionsByModule;

    const query = searchQuery.toLowerCase();
    const filtered: Record<string, typeof permissions> = {};

    for (const [mod, perms] of Object.entries(permissionsByModule)) {
      const matchingPerms = perms.filter(
        (p) =>
          p.key.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
      if (matchingPerms.length > 0) {
        filtered[mod] = matchingPerms;
      }
    }

    return filtered;
  }, [permissionsByModule, searchQuery, permissions]);

  // Don't render if there's no template (mas somente APÓS declarar todos os hooks)
  if (!template) {
    return null;
  }

  const handleToggleKey = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelectAllModule = (modulePerms: typeof permissions) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      for (const perm of modulePerms) {
        next.add(perm.key);
      }
      return next;
    });
  };

  const handleDeselectAllModule = (modulePerms: typeof permissions) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      for (const perm of modulePerms) {
        next.delete(perm.key);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save metadata if changed
      if (hasMetadataChanges) {
        await updateTemplate.mutateAsync({
          id: template.id,
          name,
          description: description || null,
          module: module === MODULE_GLOBAL_VALUE ? null : module,
          surface: surface === SURFACE_NONE_VALUE ? null : (surface as PermissionTemplateV2['surface']),
        });
      }
      
      // Save keys if changed
      if (hasKeyChanges) {
        await setTemplateItems.mutateAsync({
          templateId: template.id,
          keys: Array.from(selectedKeys),
        });
      }
      
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const isSystemTemplate = template.is_system;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[700px] sm:max-w-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Editar Template
            {isSystemTemplate && (
              <Badge variant="secondary" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Sistema
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            <code className="text-xs font-mono">{template.slug}</code>
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="metadata" className="flex-1 flex flex-col mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="metadata">Metadados</TabsTrigger>
            <TabsTrigger value="keys">
              Permission Keys ({selectedKeys.size})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="metadata" className="flex-1 space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do template"
                disabled={isSystemTemplate}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição do template"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="module">Módulo</Label>
                <Select value={module} onValueChange={setModule} disabled={isSystemTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o módulo" />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={MODULE_GLOBAL_VALUE}>Global</SelectItem>
                      {modules.map((mod) => (
                        <SelectItem key={mod} value={mod}>
                          {mod}
                        </SelectItem>
                      ))}
                    </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="surface">Surface</Label>
                <Select value={surface} onValueChange={setSurface} disabled={isSystemTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a surface" />
                  </SelectTrigger>
                  <SelectContent>
                    {SURFACE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          {opt.icon && <opt.icon className="h-4 w-4" />}
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isSystemTemplate && (
              <p className="text-sm text-muted-foreground">
                Templates de sistema têm metadados protegidos, mas você pode editar as permission keys.
              </p>
            )}
          </TabsContent>

          <TabsContent value="keys" className="flex-1 flex flex-col mt-4 min-h-0">
            {catalogLoading || keysLoading ? (
              <LoadingState text="Carregando permissões..." />
            ) : (
              <>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar permissões..."
                    className="pl-9"
                  />
                </div>

                <ScrollArea className="flex-1 -mx-6 px-6">
                  <Accordion type="multiple" className="w-full">
                    {Object.entries(filteredPermissionsByModule).map(([mod, perms]) => {
                      const selectedCount = perms.filter(p => selectedKeys.has(p.key)).length;
                      const allSelected = selectedCount === perms.length;
                      
                      return (
                        <AccordionItem key={mod} value={mod}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{mod}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {selectedCount}/{perms.length} selecionadas
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2">
                              <div className="flex gap-2 mb-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSelectAllModule(perms)}
                                  disabled={allSelected}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Selecionar todas
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeselectAllModule(perms)}
                                  disabled={selectedCount === 0}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Limpar
                                </Button>
                              </div>
                              
                              {perms.map((perm) => (
                                <label
                                  key={perm.key}
                                  className={cn(
                                    "flex items-start gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                                    selectedKeys.has(perm.key) && "bg-muted"
                                  )}
                                >
                                  <Checkbox
                                    checked={selectedKeys.has(perm.key)}
                                    onCheckedChange={() => handleToggleKey(perm.key)}
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <code className="text-xs font-mono block truncate">
                                      {perm.key}
                                    </code>
                                    {perm.description && (
                                      <span className="text-xs text-muted-foreground line-clamp-1">
                                        {perm.description}
                                      </span>
                                    )}
                                  </div>
                                </label>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </ScrollArea>
              </>
            )}
          </TabsContent>
        </Tabs>

        <SheetFooter className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {hasChanges ? (
                <span className="text-amber-600">Alterações não salvas</span>
              ) : (
                <span>Nenhuma alteração</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? (
                  <>Salvando...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
