import { HubLayout } from '@/components/layout/HubLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plug } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { IntegrationCard } from '../components/IntegrationCard';
import { useIntegrationsCatalog, useGlobalConfigs, useUpsertGlobalConfig } from '../hooks/useIntegrations';
import { useAuth } from '@/hooks/useAuth';

export default function GlobalIntegrationsPage() {
  usePageTitle("Integrações", { skipBu: true });
  const { isAdmin } = useAuth();
  const { data: catalog, isLoading: loadingCatalog } = useIntegrationsCatalog();
  const { data: globalConfigs, isLoading: loadingConfigs } = useGlobalConfigs();
  const upsertConfig = useUpsertGlobalConfig();
  
  const getGlobalConfig = (integrationKey: string) => {
    return globalConfigs?.find(c => c.integration_key === integrationKey) || null;
  };
  
  const handleToggle = (integrationKey: string, enabled: boolean) => {
    const existingConfig = getGlobalConfig(integrationKey);
    upsertConfig.mutate({
      integration_key: integrationKey,
      is_enabled_global: enabled,
      config_encrypted: existingConfig?.config_encrypted || {},
    });
  };
  
  if (loadingCatalog || loadingConfigs) {
    return (
      <HubLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-56" />
            ))}
          </div>
        </div>
      </HubLayout>
    );
  }
  
  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Integrações Globais</h1>
            <p className="text-muted-foreground">
              Configure integrações disponíveis para todas as Business Units
            </p>
          </div>
        </div>
        
        {/* Info Card */}
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              <strong>Governança centralizada:</strong> Configure credenciais e endpoints globais aqui. 
              Cada BU pode decidir se usa a configuração global ou define suas próprias credenciais (override).
            </p>
          </CardContent>
        </Card>
        
        {/* Integrations Grid */}
        {catalog && catalog.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalog.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                globalConfig={getGlobalConfig(integration.integration_key)}
                isAdmin={isAdmin}
                isLoading={upsertConfig.isPending}
                onToggle={(enabled) => handleToggle(integration.integration_key, enabled)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Plug className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma integração disponível</h3>
              <p className="text-muted-foreground text-center">
                O catálogo de integrações está vazio.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </HubLayout>
  );
}
