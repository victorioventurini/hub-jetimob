/**
 * Hook para buscar configuração do Google Tag Manager
 * 
 * Busca o Container ID da configuração global de integrações.
 * Retorna null se não configurado ou desabilitado.
 * 
 * @see src/lib/analytics/gtag.ts para uso do Container ID
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/globalClient';
import { integrationsKeys } from '@/lib/queryKeys/integrations';

interface GtmConfigResult {
  containerId: string | null;
  isLoading: boolean;
  isEnabled: boolean;
}

/**
 * Hook para buscar Container ID do GTM da configuração global.
 * 
 * @returns containerId se configurado e habilitado, null caso contrário
 * 
 * @example
 * const { containerId, isLoading } = useGtmConfig();
 * 
 * useEffect(() => {
 *   if (containerId) {
 *     initGTM(containerId);
 *   }
 * }, [containerId]);
 */
export function useGtmConfig(): GtmConfigResult {
  const { data, isLoading } = useQuery({
    queryKey: integrationsKeys.globalByKey('google-tag-manager'),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hub_integrations_global_config')
        .select('is_enabled_global, config_encrypted')
        .eq('integration_key', 'google-tag-manager')
        .maybeSingle();
      
      if (error) {
        console.error('[GTM Config] Erro ao buscar configuração:', error);
        return { containerId: null, isEnabled: false };
      }

      if (!data?.is_enabled_global) {
        return { containerId: null, isEnabled: false };
      }

      const config = data.config_encrypted as { container_id?: string } | null;
      return {
        containerId: config?.container_id || null,
        isEnabled: true,
      };
    },
    staleTime: Infinity, // Container ID não muda frequentemente
    gcTime: 30 * 60 * 1000, // 30 minutos
    retry: 1,
  });

  return {
    containerId: data?.containerId ?? null,
    isLoading,
    isEnabled: data?.isEnabled ?? false,
  };
}
