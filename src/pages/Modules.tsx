import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HubLayout } from "@/components/layout/HubLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Target,
  BarChart3,
  Calendar,
  FileText,
  Briefcase,
  Settings,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Shield,
  Plug,
  User,
  Building2,
  LayoutGrid,
  Lock,
  Globe,
  LucideIcon,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";
import { useUrlTab } from "@/shared/url";
import { queryKeys } from "@/lib/queryKeys";

// Mapeamento de ícones
const iconMap: Record<string, LucideIcon> = {
  Target,
  BarChart3,
  Calendar,
  FileText,
  Briefcase,
  Users,
  Shield,
  Plug,
  User,
  Building2,
  LayoutGrid,
};

interface Module {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  route: string | null;
  version: string;
  status: "active" | "inactive" | "coming_soon";
  health_status: "healthy" | "degraded" | "down";
  type: "global" | "operational";
  display_order: number;
  dependencies: string[];
  is_enabled?: boolean;
  config_id?: string;
}

const statusConfig = {
  active: {
    label: "Ativo",
    color: "bg-success/10 text-success border-success/20",
  },
  inactive: {
    label: "Inativo",
    color: "bg-muted text-muted-foreground border-muted",
  },
  coming_soon: {
    label: "Em breve",
    color: "bg-accent/10 text-accent border-accent/20",
  },
};

const healthConfig = {
  healthy: {
    label: "Saudável",
    icon: CheckCircle2,
    color: "text-success",
  },
  degraded: {
    label: "Degradado",
    icon: AlertCircle,
    color: "text-warning",
  },
  down: {
    label: "Fora do ar",
    icon: AlertCircle,
    color: "text-destructive",
  },
};

export default function Modules() {
  usePageTitle("Módulos");
  
  const { currentBu } = useBu();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  
  // URL State - object API
  const [activeTab, setActiveTab] = useUrlTab<"all" | "global" | "operational">("all");

  // Buscar todos os módulos
  const { data: modules = [], isLoading } = useQuery({
    queryKey: queryKeys.modulesPage.all(currentBu?.id ?? null),
    queryFn: async () => {
      // Buscar módulos
      const { data: modulesData, error: modulesError } = await supabase
        .from("modules")
        .select("id, name, slug, description, icon, route, version, status, health_status, type, display_order, dependencies")
        .order("display_order");

      if (modulesError) throw modulesError;

      // Se temos BU, buscar configs
      let configs: Record<string, { is_enabled: boolean; id: string }> = {};
      if (currentBu?.id) {
        const { data: configsData } = await supabase
          .from("bu_module_configs")
          .select("id, module_id, is_enabled")
          .eq("bu_id", currentBu.id);

        if (configsData) {
          configs = configsData.reduce((acc, c) => {
            acc[c.module_id] = { is_enabled: c.is_enabled, id: c.id };
            return acc;
          }, {} as Record<string, { is_enabled: boolean; id: string }>);
        }
      }

      return modulesData.map((m) => ({
        ...m,
        type: m.type as "global" | "operational",
        status: m.status as "active" | "inactive" | "coming_soon",
        health_status: m.health_status as "healthy" | "degraded" | "down",
        is_enabled: m.type === "global" ? true : (configs[m.id]?.is_enabled ?? false),
        config_id: configs[m.id]?.id,
      })) as Module[];
    },
  });

  // Mutation para toggle de módulo
  const toggleMutation = useMutation({
    mutationFn: async ({ moduleId, enabled, configId }: { moduleId: string; enabled: boolean; configId?: string }) => {
      if (!currentBu?.id) throw new Error("Nenhuma BU selecionada");

      if (configId) {
        // Atualizar config existente
        const { error } = await supabase
          .from("bu_module_configs")
          .update({
            is_enabled: enabled,
            ...(enabled ? { enabled_at: new Date().toISOString() } : { disabled_at: new Date().toISOString() }),
          })
          .eq("id", configId);

        if (error) throw error;
      } else {
        // Criar nova config
        const { error } = await supabase
          .from("bu_module_configs")
          .insert({
            bu_id: currentBu.id,
            module_id: moduleId,
            is_enabled: enabled,
            enabled_at: enabled ? new Date().toISOString() : null,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.modulesPage.allPrefix() });
      queryClient.invalidateQueries({ queryKey: queryKeys.modulesPage.buModulesPrefix() });
      toast.success("Configuração atualizada");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + (error as Error).message);
    },
  });

  const handleToggle = (module: Module, enabled: boolean) => {
    // Verificar dependências
    if (enabled && module.dependencies.length > 0) {
      const missingDeps = module.dependencies.filter((dep) => {
        const depModule = modules.find((m) => m.slug === dep);
        return depModule && !depModule.is_enabled;
      });

      if (missingDeps.length > 0) {
        toast.error(`Ative primeiro: ${missingDeps.join(", ")}`);
        return;
      }
    }

    toggleMutation.mutate({
      moduleId: module.id,
      enabled,
      configId: module.config_id,
    });
  };

  const filteredModules = modules.filter((m) => {
    if (activeTab === "all") return true;
    return m.type === activeTab;
  });

  const globalCount = modules.filter((m) => m.type === "global").length;
  const operationalCount = modules.filter((m) => m.type === "operational").length;
  const activeCount = modules.filter((m) => m.status === "active").length;
  const enabledCount = modules.filter((m) => m.is_enabled).length;

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Módulos"
          description={`Catálogo de módulos do Hub${currentBu ? ` • ${currentBu.name}` : ''}`}
          breadcrumbs={[{ label: "Módulos" }]}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">{globalCount}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Globe className="h-3 w-3" /> Globais
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">{operationalCount}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Operacionais
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">{enabledCount}</p>
              <p className="text-sm text-muted-foreground">Habilitados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">{activeCount}</p>
              <p className="text-sm text-muted-foreground">Total ativos</p>
            </CardContent>
          </Card>
        </div>

        {/* Info sobre BU */}
        {!currentBu && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Nenhuma BU selecionada</AlertTitle>
            <AlertDescription>
              Selecione uma Business Unit para gerenciar quais módulos operacionais estão habilitados.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList>
            <TabsTrigger value="all">Todos ({modules.length})</TabsTrigger>
            <TabsTrigger value="global">
              <Globe className="h-4 w-4 mr-1" />
              Globais ({globalCount})
            </TabsTrigger>
            <TabsTrigger value="operational">
              <Building2 className="h-4 w-4 mr-1" />
              Operacionais ({operationalCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredModules.map((module) => {
                  const Icon = iconMap[module.icon || "LayoutGrid"] || LayoutGrid;
                  const status = statusConfig[module.status];
                  const health = healthConfig[module.health_status];
                  const HealthIcon = health.icon;
                  const isGlobal = module.type === "global";
                  const canToggle = !isGlobal && currentBu && isAdmin && module.status === "active";

                  return (
                    <Card
                      key={module.id}
                      className={`hover:shadow-lg hover:border-accent/30 transition-all duration-200 ${
                        !module.is_enabled && !isGlobal ? "opacity-60" : ""
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${isGlobal ? "bg-muted" : "bg-accent/10"}`}>
                              <Icon className={`h-6 w-6 ${isGlobal ? "text-muted-foreground" : "text-accent"}`} />
                            </div>
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                {module.name}
                                <Badge variant="outline" className={status.color}>
                                  {status.label}
                                </Badge>
                                {isGlobal && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Lock className="h-3 w-3 mr-1" />
                                    Global
                                  </Badge>
                                )}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                v{module.version}
                                {module.dependencies.length > 0 && (
                                  <span className="ml-2">• Depende: {module.dependencies.join(", ")}</span>
                                )}
                              </p>
                            </div>
                          </div>
                          {canToggle ? (
                            <Switch
                              checked={module.is_enabled}
                              onCheckedChange={(checked) => handleToggle(module, checked)}
                              disabled={toggleMutation.isPending}
                            />
                          ) : isGlobal ? (
                            <Switch checked={true} disabled />
                          ) : null}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{module.description}</p>

                        <div className="flex items-center justify-between pt-3 border-t border-border">
                          <div className="flex items-center gap-2">
                            <HealthIcon className={`h-4 w-4 ${health.color}`} />
                            <span className="text-sm text-muted-foreground">{health.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Ordem: {module.display_order}</span>
                          </div>
                        </div>

                        {module.status === "active" && module.is_enabled && module.route && (
                          <div className="flex gap-2">
                            <Button asChild variant="outline" size="sm" className="flex-1">
                              <Link to={module.route}>Acessar</Link>
                            </Button>
                            {isAdmin && (
                              <Button variant="ghost" size="icon-sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </HubLayout>
  );
}
