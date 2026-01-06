/**
 * LegacyAssetRedirect
 * 
 * Handles legacy routes by selecting the correct BU and redirecting to the asset detail.
 * Now that URLs don't include BU ID, this just ensures the BU context is set correctly.
 */

import { useEffect, useState } from 'react';
import { useParams, Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBu } from '@/contexts/BuContext';
import { LoadingState } from '@/components/ui/loading-state';

export default function LegacyAssetRedirect() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { userBus, isLoading: buLoading, selectBu, currentBuId } = useBu();
  const [targetPath, setTargetPath] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function resolveAssetBu() {
      if (!id || authLoading || buLoading) return;
      
      if (!user) {
        // Not authenticated - redirect to login with return URL
        setTargetPath(`/auth?returnTo=${encodeURIComponent(location.pathname)}`);
        return;
      }

      try {
        // Look up the asset's BU
        const { data: asset, error } = await supabase
          .from('asset_inventory')
          .select('id, bu_id')
          .eq('id', id)
          .is('deleted_at', null)
          .maybeSingle();

        if (error || !asset) {
          console.warn('[LegacyAssetRedirect] Asset not found:', id);
          setNotFound(true);
          return;
        }

        // Check if user has access to this BU
        const hasAccess = userBus.some(m => m.bu_id === asset.bu_id);
        
        if (!hasAccess) {
          // User doesn't have access - redirect to select BU
          setTargetPath('/select-bu');
          return;
        }

        // Switch to the asset's BU if different from current
        if (currentBuId !== asset.bu_id) {
          selectBu(asset.bu_id);
        }

        // Redirect to the asset detail page (simple path, BU from session)
        setTargetPath(`/assets/inventory/${asset.id}`);
      } catch (err) {
        console.error('[LegacyAssetRedirect] Error resolving asset:', err);
        setNotFound(true);
      }
    }

    resolveAssetBu();
  }, [id, user, userBus, authLoading, buLoading, location.pathname, currentBuId, selectBu]);

  if (authLoading || buLoading || (!targetPath && !notFound)) {
    return <LoadingState fullPage text="Carregando..." />;
  }

  if (notFound) {
    return <Navigate to="/404" replace />;
  }

  if (targetPath) {
    return <Navigate to={targetPath} replace />;
  }

  return <LoadingState fullPage text="Redirecionando..." />;
}
