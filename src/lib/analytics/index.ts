/**
 * Analytics Module - Barrel Export
 * 
 * @see src/lib/analytics/gtag.ts para implementação completa
 */

export {
  initGA4,
  setTenantId,
  trackVirtualPageView,
  trackEvent,
  pushToDataLayer,
  initSessionContext,
} from './gtag';
