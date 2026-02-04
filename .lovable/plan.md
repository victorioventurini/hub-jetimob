
# Plano: Implementação do Google Analytics 4 (GA4) Multi-Tenant

## Objetivo

Implementar rastreamento GA4 completo para um sistema SaaS multi-tenant onde a URL não muda ao trocar de empresa (BU). A implementação será baseada em:
1. **User Properties** para identificar o tenant (BU)
2. **Virtual Page Views** para rastrear navegação sem mudança de URL
3. **Data Layer** para integração opcional com GTM
4. **Logs de desenvolvimento** para validação

---

## Fase 1: Configuração Base do GA4

### 1.1 Criar Secret para Measurement ID

Adicionar secret `GA4_MEASUREMENT_ID` no projeto (ex: `G-XXXXXXXXXX`).

### 1.2 Criar Script de Inicialização

Criar arquivo `src/lib/analytics/gtag.ts` com as funções core:

```typescript
// src/lib/analytics/gtag.ts

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID;
const isDev = import.meta.env.DEV;

/**
 * Inicializa o Google Analytics 4
 * Chamado uma vez no carregamento da aplicação
 */
export function initGA4(): void {
  if (!GA_MEASUREMENT_ID) {
    if (isDev) console.warn('[GA4] Measurement ID não configurado');
    return;
  }

  // Criar script do gtag.js
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Inicializar dataLayer e gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  
  // Config inicial com page_view desabilitado (faremos manualmente)
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false, // Virtual page views manuais
  });

  if (isDev) console.log('[GA4] Inicializado com ID:', GA_MEASUREMENT_ID);
}
```

### 1.3 Adicionar Script ao index.html ou main.tsx

Opção preferida: chamar `initGA4()` no `main.tsx` antes do render.

---

## Fase 2: User Property para Tenant (BU)

### 2.1 Função para Definir Tenant ID

```typescript
// src/lib/analytics/gtag.ts (continuação)

/**
 * Define o tenant_id como User Property no GA4
 * Chamado quando o usuário seleciona uma BU
 * 
 * @param tenantId - ID da Business Unit (bu_id)
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
```

### 2.2 Integrar com BuContext

Modificar `BuContext.tsx` para chamar `setTenantId` quando:
- Usuário seleciona uma BU
- Usuário troca de BU
- Usuário faz logout (limpar)

```typescript
// Em selectBu()
import { setTenantId } from '@/lib/analytics/gtag';

const selectBu = useCallback((buId: string) => {
  // ... código existente ...
  if (hasAccess) {
    setCurrentBuId(buId);
    setTenantId(buId); // <-- Novo
    // ...
  }
}, [userBus, currentBuId, queryClient]);

// Em clearBuSelection()
const clearBuSelection = () => {
  setCurrentBuId(null);
  setTenantId(null); // <-- Novo
  // ...
};
```

---

## Fase 3: Virtual Page Views

### 3.1 Função Global de Page View

```typescript
// src/lib/analytics/gtag.ts (continuação)

/**
 * Dispara um evento de page_view virtual
 * Usar quando a tela muda mas a URL permanece igual
 * 
 * @param screenName - Nome da tela/contexto atual (ex: "dashboard", "okrs/list")
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

  const eventParams: Record<string, any> = {
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
 * @param eventName - Nome do evento (snake_case)
 * @param params - Parâmetros do evento
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
```

### 3.2 Hook para Tracking Automático de Rotas

Criar hook `useRouteTracking` que dispara page_view em mudanças de rota:

```typescript
// src/hooks/useRouteTracking.ts

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackVirtualPageView } from '@/lib/analytics/gtag';
import { useBu } from '@/contexts/BuContext';

/**
 * Hook que rastreia mudanças de rota automaticamente
 * Dispara page_view virtual em cada navegação
 */
export function useRouteTracking() {
  const location = useLocation();
  const { currentBuId } = useBu();

  useEffect(() => {
    // Extrair nome da tela a partir do pathname
    const screenName = location.pathname === '/' 
      ? 'home' 
      : location.pathname.replace(/^\//, '').replace(/\//g, '_');

    trackVirtualPageView(screenName, {
      page_title: document.title,
      custom_params: currentBuId ? { bu_id: currentBuId } : undefined,
    });
  }, [location.pathname, currentBuId]);
}
```

### 3.3 Integrar Hook no App

Adicionar `useRouteTracking()` no `AuthenticatedRoutesWrapper`:

```typescript
function AuthenticatedRoutesWrapper() {
  useRouteTracking(); // <-- Novo
  
  return (
    <BuProvider>
      {/* ... */}
    </BuProvider>
  );
}
```

---

## Fase 4: Data Layer para GTM (Opcional)

### 4.1 Função de Push para Data Layer

```typescript
// src/lib/analytics/gtag.ts (continuação)

/**
 * Push de dados para window.dataLayer (GTM)
 * Útil para passar contexto adicional ao Tag Manager
 * 
 * @param data - Objeto a ser adicionado ao dataLayer
 */
export function pushToDataLayer(data: Record<string, any>): void {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(data);

  if (isDev) {
    console.log('[GA4] DataLayer push:', data);
  }
}

/**
 * Inicializa o dataLayer com contexto de sessão
 * Chamado após login bem-sucedido
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
}
```

---

## Fase 5: Pontos de Integração

### 5.1 Mapa de Onde Disparar Eventos

| Local | Evento | Dados |
|-------|--------|-------|
| `main.tsx` | `initGA4()` | Inicialização |
| `AuthCallback.tsx` | `initSessionContext()` | Após login bem-sucedido |
| `BuContext.tsx` → `selectBu` | `setTenantId(buId)` | Seleção de BU |
| `BuContext.tsx` → `clearBuSelection` | `setTenantId(null)` | Logout |
| `AuthenticatedRoutesWrapper` | `useRouteTracking()` | Cada navegação |
| Componentes específicos | `trackEvent()` | Ações importantes |

### 5.2 Integração no AuthCallback

Após login bem-sucedido, inicializar contexto:

```typescript
// AuthCallback.tsx
import { initSessionContext } from '@/lib/analytics/gtag';

// Após session estabelecida:
initSessionContext({
  userId: data.session.user.id,
});
```

---

## Fase 6: Estrutura de Arquivos

```
src/lib/analytics/
├── gtag.ts          # Funções core do GA4
├── index.ts         # Barrel export
└── events.ts        # Constantes de nomes de eventos (opcional)

src/hooks/
└── useRouteTracking.ts  # Hook de tracking de rotas
```

---

## Fase 7: Documentação

### 7.1 Atualizar TCR

Adicionar seção "Analytics (GA4)" documentando:
- Configuração do Measurement ID
- User Properties configuradas
- Eventos padrão disparados
- Como adicionar novos eventos

### 7.2 Exemplo de Uso

```typescript
// Disparar evento customizado em qualquer componente
import { trackEvent } from '@/lib/analytics/gtag';

// Quando usuário cria um OKR
trackEvent('okr_created', {
  okr_type: 'individual',
  has_krs: true,
});

// Virtual page view manual (se necessário)
import { trackVirtualPageView } from '@/lib/analytics/gtag';

trackVirtualPageView('okr_wizard_step_2', {
  page_title: 'Criando OKR - Passo 2',
});
```

---

## Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| `src/lib/analytics/gtag.ts` | **CRIAR** - Funções core GA4 |
| `src/lib/analytics/index.ts` | **CRIAR** - Barrel export |
| `src/hooks/useRouteTracking.ts` | **CRIAR** - Hook de tracking automático |
| `src/main.tsx` | **MODIFICAR** - Chamar initGA4() |
| `src/contexts/BuContext.tsx` | **MODIFICAR** - Chamar setTenantId() |
| `src/pages/AuthCallback.tsx` | **MODIFICAR** - Chamar initSessionContext() |
| `src/App.tsx` | **MODIFICAR** - Adicionar useRouteTracking |
| `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` | **ATUALIZAR** - Documentar GA4 |
| `.env` | Adicionar `VITE_GA4_MEASUREMENT_ID` |

---

## Notas de Segurança

- O `tenant_id` (bu_id) é um UUID interno, não contém PII
- O `user_id` enviado é o UUID do Supabase Auth, não email
- Nenhum dado sensível (CPF, email, etc.) é enviado ao GA4
- Logs de console só aparecem em `import.meta.env.DEV`

---

## Próximos Passos (Pós-Implementação)

1. Configurar User Property `tenant_id` no painel do GA4
2. Criar segmentos por tenant para análise
3. Configurar conversões para eventos importantes
4. Testar com GA4 DebugView
