import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackVirtualPageView } from '@/lib/analytics';
import { BuContext } from '@/contexts/BuContext';
import { useContext } from 'react';

/**
 * Hook que rastreia mudanças de rota automaticamente
 * Dispara page_view virtual em cada navegação
 * 
 * Uso: Adicionar uma vez no AuthenticatedRoutesWrapper
 * 
 * @see src/lib/analytics/gtag.ts
 */
export function useRouteTracking() {
  const location = useLocation();
  // Use optional context access to avoid throwing when BuContext is not available
  const buContext = useContext(BuContext);
  const currentBuId = buContext?.currentBuId ?? null;
  
  // Track previous pathname to avoid duplicate page views
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Avoid duplicate tracking for the same path
    if (previousPathRef.current === location.pathname) {
      return;
    }
    previousPathRef.current = location.pathname;

    // Extrair nome da tela a partir do pathname
    // "/" -> "home"
    // "/okrs" -> "okrs"
    // "/okrs/create" -> "okrs_create"
    const screenName = location.pathname === '/' 
      ? 'home' 
      : location.pathname.replace(/^\//, '').replace(/\//g, '_');

    trackVirtualPageView(screenName, {
      page_title: document.title,
      custom_params: currentBuId ? { bu_id: currentBuId } : undefined,
    });
  }, [location.pathname, currentBuId]);
}
