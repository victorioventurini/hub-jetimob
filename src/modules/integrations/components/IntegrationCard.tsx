import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Settings, Check, X, Bot, ExternalLink } from 'lucide-react';
import { IntegrationIcon } from './IntegrationIcon';
import { TestStatusBadge } from './TestStatusBadge';
import type { IntegrationCatalogItem, IntegrationGlobalConfig } from '../types';

interface IntegrationCardProps {
  integration: IntegrationCatalogItem;
  globalConfig?: IntegrationGlobalConfig | null;
  onToggle?: (enabled: boolean) => void;
  isAdmin?: boolean;
  isLoading?: boolean;
  showConfigureButton?: boolean;
  navigateToPath?: string;
}

export function IntegrationCard({
  integration,
  globalConfig,
  onToggle,
  isAdmin = false,
  isLoading = false,
  showConfigureButton = true,
  navigateToPath,
}: IntegrationCardProps) {
  const navigate = useNavigate();
  
  const isEnabled = globalConfig?.is_enabled_global ?? false;
  const isConfigured = globalConfig !== null && globalConfig !== undefined;
  
  const handleNavigate = () => {
    if (navigateToPath) {
      navigate(navigateToPath);
    } else {
      navigate(`/settings/integrations/${integration.integration_key}`);
    }
  };
  
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <IntegrationIcon 
              icon={integration.icon} 
              color={integration.color} 
            />
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {integration.name}
                {integration.supports_agents && (
                  <Bot className="w-4 h-4 text-muted-foreground" />
                )}
              </CardTitle>
              <code className="text-xs text-muted-foreground">
                {integration.integration_key}
              </code>
            </div>
          </div>
          <Badge variant={isEnabled ? 'default' : 'secondary'}>
            {isEnabled ? (
              <><Check className="w-3 h-3 mr-1" /> Ativa</>
            ) : (
              <><X className="w-3 h-3 mr-1" /> Inativa</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="line-clamp-2">
          {integration.description}
        </CardDescription>
        
        {/* Features */}
        <div className="flex flex-wrap gap-1.5">
          {integration.supports_global_config && (
            <Badge variant="outline" className="text-xs">Config Global</Badge>
          )}
          {integration.supports_bu_override && (
            <Badge variant="outline" className="text-xs">Override por BU</Badge>
          )}
          {integration.supports_agents && (
            <Badge variant="outline" className="text-xs">Agentes IA</Badge>
          )}
        </div>
        
        {/* Test Status */}
        {isConfigured && (
          <TestStatusBadge 
            status={globalConfig?.last_test_status || null}
            testedAt={globalConfig?.last_test_at}
          />
        )}
        
        <div className="flex items-center justify-between pt-2 border-t">
          {showConfigureButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleNavigate}
            >
              <Settings className="w-4 h-4 mr-1" />
              Configurar
            </Button>
          )}
          
          {isAdmin && onToggle && (
            <div className="flex items-center gap-2">
              <Switch
                checked={isEnabled}
                onCheckedChange={onToggle}
                disabled={isLoading || !isConfigured}
              />
            </div>
          )}
          
          {integration.documentation_url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(integration.documentation_url!, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
