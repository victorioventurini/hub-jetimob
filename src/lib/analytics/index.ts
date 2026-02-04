/**
 * Analytics Module - Barrel Export
 * 
 * @see src/lib/analytics/gtag.ts para implementação GTM
 * @see src/lib/analytics/useGtmConfig.ts para configuração dinâmica
 */

export {
  initGTM,
  isGtmReady,
  setTenantId,
  trackVirtualPageView,
  trackEvent,
  pushToDataLayer,
  initSessionContext,
  // Deprecated
  initGA4,
} from './gtag';

export { useGtmConfig } from './useGtmConfig';
