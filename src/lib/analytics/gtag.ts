/**
 * Google Analytics 4 (GA4) - Multi-Tenant Implementation
 * 
 * Este módulo implementa rastreamento GA4 para SaaS multi-tenant onde
 * a URL não muda ao trocar de empresa (BU).
 * 
 * Funcionalidades:
 * - User Properties para identificar tenant (BU)
 * - Virtual Page Views para navegação sem mudança de URL
 * - Data Layer para integração com GTM
 * - Logs de desenvolvimento para validação
 * 
 * @see docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md
 * @version 1.0.0
 */

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID;
const isDev = import.meta.env.DEV;

/**
 * Inicializa o Google Analytics 4
 * Chamado uma vez no carregamento da aplicação (main.tsx)
 */
export function initGA4(): void {
  if (!GA_MEASUREMENT_ID) {
    if (isDev) console.warn('[GA4] Measurement ID não configurado');
    return;
  }

  // Evitar inicialização duplicada
  if (window.gtag) {
    if (isDev) console.log('[GA4] Já inicializado, ignorando');
    return;
  }

  // Criar script do gtag.js
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Inicializar dataLayer e gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag('js', new Date());
  
  // Config inicial com page_view desabilitado (faremos manualmente via Virtual Page Views)
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
  });

  if (isDev) console.log('[GA4] Inicializado com ID:', GA_MEASUREMENT_ID);
}

/**
 * Define o tenant_id como User Property no GA4
 * Chamado quando o usuário seleciona uma BU
 * 
 * @param tenantId - ID da Business Unit (bu_id) - UUID interno, não contém PII
 */
export function setTenantId(tenantId: string | null): void {
  if (!window.gtag) return;

  if (tenantId) {
    window.gtag('set', 'user_properties', {
      tenant_id: tenantId,
    });

    // Push para dataLayer (GTM compatibility)
    window.dataLayer?.push({
      event: 'tenant_selected',
      tenant_id: tenantId,
    });

    if (isDev) console.log('[GA4] tenant_id definido:', tenantId);
  } else {
    // Limpar tenant_id no logout/clear
    window.gtag('set', 'user_properties', {
      tenant_id: null,
    });
    
    if (isDev) console.log('[GA4] tenant_id limpo');
  }
}

/**
 * Dispara um evento de page_view virtual
 * Usar quando a tela muda mas a URL permanece igual (ou para navegação normal)
 * 
 * @param screenName - Nome da tela/contexto atual (ex: "dashboard", "okrs_list")
 * @param options - Parâmetros adicionais opcionais
 */
export function trackVirtualPageView(
  screenName: string,
  options?: {
    page_title?: string;
    custom_params?: Record<string, string | number>;
  }
): void {
  if (!window.gtag) return;

  const eventParams: Record<string, unknown> = {
    page_location: window.location.href,
    page_title: options?.page_title || screenName,
    screen_name: screenName,
    ...options?.custom_params,
  };

  window.gtag('event', 'page_view', eventParams);

  if (isDev) {
    console.log('[GA4] Virtual Page View:', screenName, eventParams);
  }
}

/**
 * Dispara um evento customizado genérico
 * 
 * @param eventName - Nome do evento (snake_case, ex: "okr_created", "ticket_opened")
 * @param params - Parâmetros do evento
 * 
 * @example
 * trackEvent('okr_created', { okr_type: 'individual', has_krs: true });
 * trackEvent('ticket_opened', { ticket_id: '123', category: 'support' });
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
): void {
  if (!window.gtag) return;

  window.gtag('event', eventName, params);

  if (isDev) {
    console.log('[GA4] Event:', eventName, params);
  }
}

/**
 * Push de dados para window.dataLayer (GTM)
 * Útil para passar contexto adicional ao Tag Manager
 * 
 * @param data - Objeto a ser adicionado ao dataLayer
 */
export function pushToDataLayer(data: Record<string, unknown>): void {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(data);

  if (isDev) {
    console.log('[GA4] DataLayer push:', data);
  }
}

/**
 * Inicializa o dataLayer com contexto de sessão
 * Chamado após login bem-sucedido (AuthCallback.tsx)
 * 
 * @param params - Dados da sessão (userId é UUID do Supabase Auth, não email)
 */
export function initSessionContext(params: {
  userId?: string;
  tenantId?: string;
  userRole?: string;
}): void {
  pushToDataLayer({
    event: 'session_init',
    user_id: params.userId,
    tenant_id: params.tenantId,
    user_role: params.userRole,
  });

  if (isDev) {
    console.log('[GA4] Session context initialized:', params);
  }
}
