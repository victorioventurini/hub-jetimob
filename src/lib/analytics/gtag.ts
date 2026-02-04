/**
 * Google Tag Manager (GTM) - Multi-Tenant Implementation
 * 
 * Este módulo implementa rastreamento GTM para SaaS multi-tenant onde
 * a URL não muda ao trocar de empresa (BU).
 * 
 * O GA4 é gerenciado dentro do GTM (configurado no painel GTM, não no código).
 * 
 * Funcionalidades:
 * - Carregamento dinâmico do GTM via Container ID
 * - User Properties para identificar tenant (BU) via dataLayer
 * - Virtual Page Views para navegação sem mudança de URL
 * - Data Layer para integração com GTM
 * - Logs de desenvolvimento para validação
 * 
 * @see docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md
 * @version 2.0.0 (GTM-based)
 */

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

const isDev = import.meta.env.DEV;

// Track se GTM já foi inicializado (singleton)
let gtmInitialized = false;

/**
 * Inicializa o Google Tag Manager
 * Chamado dinamicamente após obter Container ID do banco
 * 
 * @param containerId - GTM Container ID (ex: GTM-XXXXXXX)
 */
export function initGTM(containerId: string): void {
  if (!containerId) {
    if (isDev) console.warn('[GTM] Container ID não fornecido');
    return;
  }

  // Evitar inicialização duplicada
  if (gtmInitialized) {
    if (isDev) console.log('[GTM] Já inicializado, ignorando');
    return;
  }

  // Inicializar dataLayer ANTES do script
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js',
  });

  // Carregar script do GTM
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
  document.head.appendChild(script);

  gtmInitialized = true;

  if (isDev) console.log('[GTM] Inicializado com Container ID:', containerId);
}

/**
 * Verifica se o GTM está pronto para receber eventos
 */
export function isGtmReady(): boolean {
  return gtmInitialized && Array.isArray(window.dataLayer);
}

/**
 * Define o tenant_id via dataLayer
 * O GTM captura e repassa para o GA4 como User Property
 * 
 * @param tenantId - ID da Business Unit (bu_id) - UUID interno, não contém PII
 */
export function setTenantId(tenantId: string | null): void {
  if (!isGtmReady()) {
    // Armazenar para quando GTM inicializar
    window.dataLayer = window.dataLayer || [];
  }

  if (tenantId) {
    window.dataLayer.push({
      event: 'tenant_selected',
      tenant_id: tenantId,
    });

    if (isDev) console.log('[GTM] tenant_id definido:', tenantId);
  } else {
    // Limpar tenant_id no logout/clear
    window.dataLayer.push({
      event: 'tenant_cleared',
      tenant_id: null,
    });
    
    if (isDev) console.log('[GTM] tenant_id limpo');
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
  window.dataLayer = window.dataLayer || [];

  const eventData: Record<string, unknown> = {
    event: 'virtual_page_view',
    page_location: window.location.href,
    page_path: window.location.pathname,
    page_title: options?.page_title || screenName,
    screen_name: screenName,
    ...options?.custom_params,
  };

  window.dataLayer.push(eventData);

  if (isDev) {
    console.log('[GTM] Virtual Page View:', screenName, eventData);
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
  window.dataLayer = window.dataLayer || [];

  window.dataLayer.push({
    event: eventName,
    ...params,
  });

  if (isDev) {
    console.log('[GTM] Event:', eventName, params);
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
    console.log('[GTM] DataLayer push:', data);
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
    console.log('[GTM] Session context initialized:', params);
  }
}

// ============================================
// DEPRECATED - Mantido para retrocompatibilidade
// ============================================

/**
 * @deprecated Use initGTM() ao invés. GA4 agora é gerenciado dentro do GTM.
 */
export function initGA4(): void {
  if (isDev) {
    console.warn('[GTM] initGA4() está deprecated. Use initGTM() - o GA4 é configurado dentro do GTM.');
  }
}
