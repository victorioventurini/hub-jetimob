import { HubLayout } from '@/components/layout/HubLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plug, Settings, Globe, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBu } from '@/contexts/BuContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { IntegrationIcon } from '../components/IntegrationIcon';
import { TestStatusBadge } from '../components/TestStatusBadge';
import { 
  useIntegrationsCatalog, 
  useGlobalConfigs,
  useBuIntegrationConfigs,
  useUpsertBuIntegrationConfig,
} from '../hooks/useIntegrations';
import { useAuth } from '@/hooks/useAuth';

export default function BuIntegrationsPage() {
  usePageTitle("Integrações");
  
  const navigate = useNavigate();
  const { currentBu } = useBu();
const { isAdmin } = useAuth();
  const canManage = isAdmin; // BU admin check would require additional hook
  
  const { data: catalog, isLoading: loadingCatalog } = useIntegrationsCatalog();
  const { data: globalConfigs, isLoading: loadingGlobal } = useGlobalConfigs();
  const { data: buConfigs, isLoading: loadingBu } = useBuIntegrationConfigs(currentBu?.id);
  
  const upsertBuConfig = useUpsertBuIntegrationConfig();
  
  const getGlobalConfig = (integrationKey: string) => {
    return globalConfigs?.find(c => c.integration_key === integrationKey) || null;
  };
  
  const getBuConfig = (integrationKey: string) => {
    return buConfigs?.find(c => c.integration_key === integrationKey) || null;
  };
  
  const handleToggleBu = (integrationKey: string, enabled: boolean) => {
    if (!currentBu) return;
    
    const existingConfig = getBuConfig(integrationKey);
    
    upsertBuConfig.mutate({
      bu_id: currentBu.id,
      integration_key: integrationKey,
      is_enabled_in_bu: enabled,
      config_mode: existingConfig?.config_mode || 'use_global',
      config_override_encrypted: existingConfig?.config_override_encrypted,
    });
  };
  
  const isLoading = loadingCatalog || loadingGlobal || loadingBu;
  
  if (isLoading) {
    return (
      <HubLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </HubLayout>
    );
  }
  
  // Filter to only show integrations that are globally enabled
  const availableIntegrations = catalog?.filter(integration => {
    const globalConfig = getGlobalConfig(integration.integration_key);
    return globalConfig?.is_enabled_global;
  }) || [];
  
  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Integrações da {currentBu?.name}</h1>
          <p className="text-muted-foreground">
            Ative e configure integrações para esta Business Unit
          </p>
        </div>
        
        {/* Info */}
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              <strong>Autonomia por BU:</strong> Escolha quais integrações ativar e decida entre usar 
              a configuração global ou definir credenciais próprias (override).
            </p>
          </CardContent>
        </Card>
        
        {/* Integrations List */}
        {availableIntegrations.length > 0 ? (
          <div className="space-y-4">
            {availableIntegrations.map((integration) => {
              const globalConfig = getGlobalConfig(integration.integration_key);
              const buConfig = getBuConfig(integration.integration_key);
              const isEnabledInBu = buConfig?.is_enabled_in_bu ?? false;
              const configMode = buConfig?.config_mode ?? 'use_global';
              
              return (
                <Card key={integration.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <IntegrationIcon 
                          icon={integration.icon} 
                          color={integration.color} 
                        />
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            {integration.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {integration.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        {/* Config Mode Badge */}
                        <div className="text-right">
                          <Badge variant={configMode === 'override' ? 'default' : 'outline'}>
                            {configMode === 'override' ? (
                              <><Pencil className="w-3 h-3 mr-1" /> Override</>
                            ) : (
                              <><Globe className="w-3 h-3 mr-1" /> Global</>
                            )}
                          </Badge>
                          {buConfig && (
                            <div className="mt-1">
                              <TestStatusBadge 
                                status={buConfig.last_test_status}
                              />
                            </div>
                          )}
                        </div>
                        
                        {/* Configure Button */}
                        {canManage && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/settings/integrations/${integration.integration_key}`)}
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Configurar
                          </Button>
                        )}
                        
                        {/* Enable Toggle */}
                        {canManage && (
                          <Switch
                            checked={isEnabledInBu}
                            onCheckedChange={(enabled) => handleToggleBu(integration.integration_key, enabled)}
                            disabled={upsertBuConfig.isPending}
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Plug className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma integração disponível</h3>
              <p className="text-muted-foreground text-center">
                Solicite ao administrador global que habilite integrações para sua BU.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </HubLayout>
  );
}
