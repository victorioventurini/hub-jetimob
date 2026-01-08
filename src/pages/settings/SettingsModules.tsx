import { Blocks, Search, CheckCircle2, XCircle, Clock, MoreVertical, Building2, ToggleLeft, ToggleRight, Settings, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { icons, LucideIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlTab, useUrlState } from "@/shared/url";

interface Module {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  route: string | null;
  type: string;
  status: string;
  version: string;
  display_order: number;
}

interface BuUnit {
  id: string;
  name: string;
}

interface BuModuleConfig {
  id: string;
  bu_id: string;
  module_id: string;
  is_enabled: boolean;
  enabled_at: string | null;
  bu_units?: BuUnit;
}

function getIconComponent(iconName: string | null): LucideIcon {
  if (!iconName) return Blocks;
  const formattedName = iconName.charAt(0).toUpperCase() + iconName.slice(1);
  return (icons as Record<string, LucideIcon>)[formattedName] || Blocks;
}

// Módulos globais que possuem página de configurações
const MODULES_WITH_SETTINGS = ["okrs"];

export default function SettingsModules() {
  const searchState = useUrlState<string>({ key: "q", defaultValue: "" });
  const search = searchState.value;
  const setSearch = searchState.set;
  
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  
  const buIdState = useUrlState<string>({ key: "bu_id", defaultValue: "all" });
  const selectedBuId = buIdState.value;
  const setSelectedBuId = buIdState.set;
  
  const [activeTab, setActiveTab] = useUrlTab("bu-config");
  const queryClient = useQueryClient();

  const hasSettings = (slug: string) => MODULES_WITH_SETTINGS.includes(slug);

  // Fetch all modules
  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ["settings-modules-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .order("display_order")
        .order("name");
      if (error) throw error;
      return data as Module[];
    },
  });

  // Fetch all BUs
  const { data: bus } = useQuery({
    queryKey: ["settings-bus-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bu_units")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data as BuUnit[];
    },
  });

  // Fetch module configs for all BUs
  const { data: moduleConfigs, isLoading: configsLoading } = useQuery({
    queryKey: ["settings-module-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bu_module_configs")
        .select("id, bu_id, module_id, is_enabled, enabled_at, bu_units(id, name)");
      if (error) throw error;
      return data as BuModuleConfig[];
    },
  });

  // Toggle module mutation
  const toggleModuleMutation = useMutation({
    mutationFn: async ({ 
      buId, 
      moduleId, 
      isEnabled 
    }: { 
      buId: string; 
      moduleId: string; 
      isEnabled: boolean 
    }) => {
      // Check if config exists
      const existingConfig = moduleConfigs?.find(
        c => c.bu_id === buId && c.module_id === moduleId
      );

      if (existingConfig) {
        const { error } = await supabase
          .from("bu_module_configs")
          .update({ 
            is_enabled: isEnabled,
            enabled_at: isEnabled ? new Date().toISOString() : null,
            disabled_at: !isEnabled ? new Date().toISOString() : null,
          })
          .eq("id", existingConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("bu_module_configs")
          .insert({
            bu_id: buId,
            module_id: moduleId,
            is_enabled: isEnabled,
            enabled_at: isEnabled ? new Date().toISOString() : null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-module-configs"] });
      queryClient.invalidateQueries({ queryKey: ["bu-modules"] });
      toast.success("Configuração atualizada");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar configuração");
      console.error(error);
    },
  });

  const isLoading = modulesLoading || configsLoading;

  const filteredModules = modules?.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.description?.toLowerCase().includes(search.toLowerCase()) ||
    m.slug.toLowerCase().includes(search.toLowerCase())
  );

  const operationalModules = filteredModules?.filter(m => m.type === "operational" && m.status === "active");
  const globalModules = filteredModules?.filter(m => m.type === "global" && m.status === "active");

  const getModuleConfigForBu = (moduleId: string, buId: string) => {
    return moduleConfigs?.find(c => c.module_id === moduleId && c.bu_id === buId);
  };

  const isModuleEnabledForBu = (moduleId: string, buId: string) => {
    const config = getModuleConfigForBu(moduleId, buId);
    return config?.is_enabled ?? false;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ativo
          </Badge>
        );
      case "inactive":
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            Inativo
          </Badge>
        );
      case "coming_soon":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            <Clock className="h-3 w-3 mr-1" />
            Em breve
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === "global" ? (
      <Badge variant="outline" className="text-blue-600 border-blue-300">
        Global
      </Badge>
    ) : (
      <Badge variant="outline" className="text-purple-600 border-purple-300">
        Operacional
      </Badge>
    );
  };

  const getEnabledBusCount = (moduleId: string) => {
    return moduleConfigs?.filter(c => c.module_id === moduleId && c.is_enabled).length ?? 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Módulos</h1>
        <p className="text-muted-foreground">
          Configure os módulos disponíveis no Hub e gerencie a ativação por Business Unit
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="bu-config" className="gap-2">
            <Building2 className="h-4 w-4" />
            Configuração por BU
          </TabsTrigger>
          <TabsTrigger value="catalog" className="gap-2">
            <Blocks className="h-4 w-4" />
            Catálogo
          </TabsTrigger>
        </TabsList>

        {/* Tab: Configuração por BU */}
        <TabsContent value="bu-config" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar módulos..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={selectedBuId} onValueChange={setSelectedBuId}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por BU" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as BUs</SelectItem>
                {bus?.map((bu) => (
                  <SelectItem key={bu.id} value={bu.id}>
                    {bu.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operational Modules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ToggleRight className="h-5 w-5 text-primary" />
                Módulos Operacionais
              </CardTitle>
              <CardDescription>
                Módulos que podem ser habilitados/desabilitados por Business Unit
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : operationalModules?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Blocks className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Nenhum módulo operacional encontrado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {operationalModules?.map((module) => {
                    const IconComponent = getIconComponent(module.icon);
                    const filteredBus = selectedBuId === "all" 
                      ? bus 
                      : bus?.filter(b => b.id === selectedBuId);

                    return (
                      <div key={module.id} className="border rounded-lg overflow-hidden">
                        {/* Module Header */}
                        <div className="p-4 bg-muted/30 flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{module.name}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {getEnabledBusCount(module.id)} BU(s) ativas
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {module.description || module.route}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedModule(module)}
                          >
                            Ver detalhes
                          </Button>
                        </div>

                        {/* BU Toggles */}
                        <div className="divide-y">
                          {filteredBus?.map((bu) => {
                            const isEnabled = isModuleEnabledForBu(module.id, bu.id);
                            return (
                              <div
                                key={bu.id}
                                className="flex items-center justify-between px-4 py-3 hover:bg-muted/20"
                              >
                                <div className="flex items-center gap-3">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{bu.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-muted-foreground">
                                    {isEnabled ? "Habilitado" : "Desabilitado"}
                                  </span>
                                  <Switch
                                    checked={isEnabled}
                                    onCheckedChange={(checked) => {
                                      toggleModuleMutation.mutate({
                                        buId: bu.id,
                                        moduleId: module.id,
                                        isEnabled: checked,
                                      });
                                    }}
                                    disabled={toggleModuleMutation.isPending}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Global Modules Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ToggleLeft className="h-5 w-5 text-blue-500" />
                Módulos Globais
              </CardTitle>
              <CardDescription>
                Módulos globais estão sempre habilitados para todas as BUs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {globalModules?.map((module) => {
                  const IconComponent = getIconComponent(module.icon);
                  const moduleHasSettings = hasSettings(module.slug);
                  
                  const content = (
                    <>
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <IconComponent className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{module.name}</p>
                        <p className="text-xs text-muted-foreground">Sempre ativo</p>
                      </div>
                      {moduleHasSettings && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </>
                  );
                  
                  return moduleHasSettings ? (
                    <Link
                      key={module.id}
                      to={`/hub/modules/${module.slug}/settings`}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      key={module.id}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20"
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Catálogo */}
        <TabsContent value="catalog" className="space-y-6">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar módulos..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Blocks className="h-5 w-5 text-primary" />
                Catálogo de Módulos
              </CardTitle>
              <CardDescription>
                {isLoading ? "Carregando..." : `${filteredModules?.length || 0} módulos disponíveis`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="p-4 border rounded-lg space-y-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))}
                </div>
              ) : filteredModules?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Blocks className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {search ? "Nenhum módulo encontrado" : "Nenhum módulo cadastrado"}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredModules?.map((module) => {
                    const IconComponent = getIconComponent(module.icon);
                    return (
                      <div
                        key={module.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2.5 rounded-lg bg-primary/10">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem onClick={() => setSelectedModule(module)}>
                                Ver detalhes
                              </DropdownMenuItem>
                              {hasSettings(module.slug) && (
                                <DropdownMenuItem asChild>
                                  <Link to={`/hub/modules/${module.slug}/settings`}>
                                    <Settings className="h-4 w-4 mr-2" />
                                    Configurações
                                  </Link>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <h3 className="font-medium text-foreground mb-1">{module.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {module.description || "Sem descrição"}
                        </p>

                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(module.status)}
                          {getTypeBadge(module.type)}
                        </div>

                        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                          <span>v{module.version}</span>
                          {module.route && (
                            <span className="ml-2">• {module.route}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Module Detail Dialog */}
      <Dialog open={!!selectedModule} onOpenChange={(open) => !open && setSelectedModule(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedModule && (
                <>
                  {(() => {
                    const IconComponent = getIconComponent(selectedModule.icon);
                    return <IconComponent className="h-5 w-5 text-primary" />;
                  })()}
                  {selectedModule.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedModule?.description || "Sem descrição"}
            </DialogDescription>
          </DialogHeader>
          {selectedModule && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(selectedModule.status)}
                {getTypeBadge(selectedModule.type)}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Slug</p>
                  <p className="font-mono">{selectedModule.slug}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Versão</p>
                  <p>{selectedModule.version}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Rota</p>
                  <p className="font-mono">{selectedModule.route || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">BUs ativas</p>
                  <p>{getEnabledBusCount(selectedModule.id)}</p>
                </div>
              </div>

              {hasSettings(selectedModule.slug) && (
                <div className="pt-4 border-t">
                  <Button 
                    className="w-full" 
                    asChild
                    onClick={() => setSelectedModule(null)}
                  >
                    <Link to={`/hub/modules/${selectedModule.slug}/settings`}>
                      <Settings className="h-4 w-4 mr-2" />
                      Configurações do Módulo
                    </Link>
                  </Button>
                </div>
              )}

              {selectedModule.type === "operational" && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-3">Status por BU</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {bus?.map((bu) => {
                      const isEnabled = isModuleEnabledForBu(selectedModule.id, bu.id);
                      return (
                        <div
                          key={bu.id}
                          className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg"
                        >
                          <span className="text-sm">{bu.name}</span>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => {
                              toggleModuleMutation.mutate({
                                buId: bu.id,
                                moduleId: selectedModule.id,
                                isEnabled: checked,
                              });
                            }}
                            disabled={toggleModuleMutation.isPending}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
