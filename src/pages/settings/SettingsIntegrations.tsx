import { Puzzle, Search, Zap, CheckCircle2, XCircle, Settings2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IntegrationIcon } from "@/modules/integrations/components/IntegrationIcon";
import { toast } from "sonner";
import { useLocalSearch } from "@/shared/url";
import { queryKeys } from "@/lib/queryKeys";
import { usePageTitle } from "@/hooks/usePageTitle";
import { PageHeader } from "@/components/ui/page-header";

export default function SettingsIntegrations() {
  usePageTitle("Integrações", { 
    skipBu: true, 
    customDescription: "Configure as integrações globais do Hub com APIs e serviços externos." 
  });

  // URL State
  const { value: search, setValue: setSearch } = useLocalSearch("q");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: integrations, isLoading } = useQuery({
    queryKey: queryKeys.settings.integrationsCatalog(),
    queryFn: async () => {
      const { data: catalog, error: catalogError } = await supabase
        .from("hub_integrations_catalog")
        .select("id, integration_key, name, description, icon, color, supports_global_config, supports_bu_override, supports_agents, status, display_order, documentation_url")
        .order("display_order")
        .order("name");
      if (catalogError) throw catalogError;

      const { data: globalConfig, error: globalError } = await supabase
        .from("hub_integrations_global_config")
        .select("id, integration_key, is_enabled_global, config_encrypted, last_test_status, last_test_at, last_test_message");
      if (globalError) throw globalError;

      // Merge catalog with global config
      return catalog.map((integration) => {
        const config = globalConfig?.find(
          (c) => c.integration_key === integration.integration_key
        );
        return {
          ...integration,
          is_enabled_global: config?.is_enabled_global || false,
          last_test_status: config?.last_test_status,
          last_test_at: config?.last_test_at,
          config_id: config?.id,
        };
      });
    },
  });

  const toggleIntegration = useMutation({
    mutationFn: async ({ integrationKey, enabled }: { integrationKey: string; enabled: boolean }) => {
      const { data: existing } = await supabase
        .from("hub_integrations_global_config")
        .select("id")
        .eq("integration_key", integrationKey)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("hub_integrations_global_config")
          .update({ is_enabled_global: enabled })
          .eq("integration_key", integrationKey);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("hub_integrations_global_config")
          .insert({ integration_key: integrationKey, is_enabled_global: enabled });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.integrationsCatalog(), refetchType: 'active' });
      toast.success("Configuração atualizada!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar configuração");
    },
  });

  const filteredIntegrations = integrations?.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.description?.toLowerCase().includes(search.toLowerCase()) ||
    i.integration_key.toLowerCase().includes(search.toLowerCase())
  );

  const enabledCount = integrations?.filter((i) => i.is_enabled_global).length || 0;

  const handleToggle = (integrationKey: string, currentEnabled: boolean) => {
    toggleIntegration.mutate({ integrationKey, enabled: !currentEnabled });
  };

  const handleConfigure = (integrationKey: string) => {
    navigate(`/hub/integrations/${integrationKey}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrações"
        description="Configure as integrações globais do Hub"
        breadcrumbs={[{ label: "Integrações" }]}
      />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar integrações..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Puzzle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{integrations?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{enabledCount}</p>
                <p className="text-sm text-muted-foreground">Habilitadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning-muted">
                <Settings2 className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {integrations?.filter((i) => i.supports_agents).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Com Agentes IA</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Puzzle className="h-5 w-5 text-primary" />
            Catálogo de Integrações
          </CardTitle>
          <CardDescription>
            {isLoading
              ? "Carregando..."
              : `${filteredIntegrations?.length || 0} integrações disponíveis`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredIntegrations?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Puzzle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {search ? "Nenhuma integração encontrada" : "Nenhuma integração cadastrada"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIntegrations?.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Icon */}
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${integration.color}20` }}
                  >
                    <IntegrationIcon
                      icon={integration.icon}
                      color={integration.color || "#6B7280"}
                      size="md"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">{integration.name}</h3>
                      {integration.is_enabled_global ? (
                        <Badge variant="default" className="bg-success-muted text-success">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Habilitada
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Desabilitada
                        </Badge>
                      )}
                      {integration.supports_agents && (
                        <Badge variant="outline" className="text-warning border-warning/30">
                          IA
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {integration.description || "Sem descrição"}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                    {integration.supports_global_config && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">Config Global</span>
                    )}
                    {integration.supports_bu_override && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">Override BU</span>
                    )}
                  </div>

                  {/* Toggle */}
                  <Switch
                    checked={integration.is_enabled_global}
                    onCheckedChange={() => handleToggle(integration.integration_key, integration.is_enabled_global)}
                    disabled={toggleIntegration.isPending}
                    aria-label={`Toggle ${integration.name}`}
                  />

                  {/* Configure Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConfigure(integration.integration_key)}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Configurar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
