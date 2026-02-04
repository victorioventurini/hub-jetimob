
# Plano: Google Tag Manager via Painel de Integrações

## Contexto

O plano aprovado anteriormente implementou GA4 diretamente no código. Agora o usuário deseja migrar para **Google Tag Manager (GTM)**, onde:
- O GTM Container ID é configurado via painel de integrações (`/hub/integrations`)
- O GA4 Measurement ID será gerenciado **dentro do GTM**, não no código

## Arquitetura Atual

A implementação existente de GA4 (v2.90.0) já está parcialmente funcional:
- `src/lib/analytics/gtag.ts` - Funções de tracking (setTenantId, trackVirtualPageView, etc.)
- `src/hooks/useRouteTracking.ts` - Tracking automático de rotas
- `src/contexts/BuContext.tsx` - Já chama `setTenantId()` ao selecionar BU
- `src/pages/AuthCallback.tsx` - Já chama `initSessionContext()` após login

## Plano de Implementação

### Fase 1: Adicionar GTM ao Catálogo de Integrações

**Migration SQL** para inserir no `hub_integrations_catalog`:

```sql
INSERT INTO hub_integrations_catalog (
  integration_key,
  name,
  description,
  icon,
  color,
  supports_global_config,
  supports_bu_override,
  supports_agents,
  status,
  display_order
) VALUES (
  'google-tag-manager',
  'Google Tag Manager',
  'Gerenciador de tags para analytics, marketing e tracking. Configure GA4, conversões e remarketing.',
  'tag',
  '#4285F4',
  true,
  false,  -- GTM é global, não faz sentido override por BU
  false,
  'active',
  1
);
```

---

### Fase 2: Modificar Módulo Analytics para GTM

#### 2.1 Refatorar `src/lib/analytics/gtag.ts`

Mudar de carregar GA4 diretamente para carregar GTM via `dataLayer.push`:

**Antes:**
- Carrega script gtag.js com GA_MEASUREMENT_ID
- Configura GA4 direto

**Depois:**
- Carrega script do GTM com GTM_CONTAINER_ID
- dataLayer é inicializado para GTM
- GA4 é gerenciado dentro do GTM (sem config direto no código)

```text
FUNÇÕES MANTIDAS (API compatível):
├── initGTM(containerId?)      # Nova - substitui initGA4
├── setTenantId(tenantId)      # Inalterada (push para dataLayer)
├── trackVirtualPageView(...)  # Inalterada (push para dataLayer)
├── trackEvent(...)            # Inalterada (push para dataLayer)
├── pushToDataLayer(...)       # Inalterada
└── initSessionContext(...)    # Inalterada
```

#### 2.2 Criar Hook para Config GTM

Criar `src/lib/analytics/useGtmConfig.ts`:

```typescript
/**
 * Hook para buscar Container ID do GTM da configuração global.
 * Retorna null se não configurado ou desabilitado.
 */
export function useGtmConfig(): string | null {
  const { data } = useQuery({
    queryKey: queryKeys.integrations.globalByKey('google-tag-manager'),
    queryFn: async () => {
      const { data } = await supabase
        .from('hub_integrations_global_config')
        .select('is_enabled_global, config_encrypted')
        .eq('integration_key', 'google-tag-manager')
        .maybeSingle();
      
      if (!data?.is_enabled_global) return null;
      return (data.config_encrypted as any)?.container_id || null;
    },
    staleTime: Infinity, // Container ID não muda frequentemente
  });
  
  return data ?? null;
}
```

---

### Fase 3: Componente de Inicialização Dinâmica

#### 3.1 Criar `GtmInitializer` no App.tsx

Componente que carrega GTM dinamicamente após obter config:

```typescript
function GtmInitializer() {
  const containerId = useGtmConfig();
  const initializedRef = useRef(false);
  
  useEffect(() => {
    if (containerId && !initializedRef.current) {
      initGTM(containerId);
      initializedRef.current = true;
    }
  }, [containerId]);
  
  return null;
}
```

Integrar em `AuthenticatedRoutesWrapper`:
```typescript
function AuthenticatedRoutesWrapper() {
  useRouteTracking();
  
  return (
    <BuProvider>
      <GtmInitializer /> {/* Novo */}
      {/* ... resto */}
    </BuProvider>
  );
}
```

#### 3.2 Remover inicialização estática do `main.tsx`

Remover chamada `initGA4()` que era feita no bootstrap.

---

### Fase 4: Página de Configuração do GTM

O `GlobalIntegrationDetailPage.tsx` já suporta configuração de API Key. Precisamos:

1. Detectar quando `integration_key === 'google-tag-manager'`
2. Trocar label de "API Key" para "Container ID"
3. Ajustar placeholder e validação (formato `GTM-XXXXXXX`)
4. Trocar `config.api_key` para `config.container_id`

**Modificações em GlobalIntegrationDetailPage.tsx:**

```typescript
// Detectar tipo de campo baseado na integração
const isGtmIntegration = integrationKey === 'google-tag-manager';
const fieldLabel = isGtmIntegration ? 'Container ID' : 'API Key';
const fieldPlaceholder = isGtmIntegration ? 'GTM-XXXXXXX' : 'sk-...';
const fieldKey = isGtmIntegration ? 'container_id' : 'api_key';
```

---

### Fase 5: Atualização de Documentação

#### 5.1 TECHNICAL_CONTEXT_REGISTRY.md → v2.91.0

Atualizar seção "Analytics (GA4)" para "Analytics (GTM → GA4)":

```markdown
### 1.7 Analytics (GTM → GA4 Multi-Tenant)

O Hub utiliza **Google Tag Manager** para gerenciar rastreamento analytics.

| Configuração | Local |
|--------------|-------|
| GTM Container ID | `/hub/integrations/google-tag-manager` |
| GA4 Measurement ID | Configurado dentro do GTM |

**Fluxo de Dados:**
```text
Hub → dataLayer.push() → GTM → GA4
```

**User Property:** `tenant_id` (bu_id) é enviado como User Property para segmentação por BU.
```

---

## Resumo de Arquivos

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `hub_integrations_catalog` | **MIGRATION** | Inserir registro do GTM |
| `src/lib/analytics/gtag.ts` | **MODIFICAR** | Refatorar para GTM (initGTM ao invés de initGA4) |
| `src/lib/analytics/index.ts` | **MODIFICAR** | Exportar `initGTM` ao invés de `initGA4` |
| `src/lib/analytics/useGtmConfig.ts` | **CRIAR** | Hook para buscar Container ID |
| `src/main.tsx` | **MODIFICAR** | Remover `initGA4()` |
| `src/App.tsx` | **MODIFICAR** | Adicionar `GtmInitializer` |
| `src/modules/integrations/pages/GlobalIntegrationDetailPage.tsx` | **MODIFICAR** | Suportar campo Container ID para GTM |
| `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` | **ATUALIZAR** | v2.91.0 - Documentar GTM |

---

## Diagrama de Fluxo

```text
┌──────────────────────────────────────────────────────────────┐
│  Painel de Integrações (/hub/integrations/google-tag-manager) │
│  └── Admin configura Container ID (GTM-XXXXXXX)               │
│       └── Salvo em hub_integrations_global_config             │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  App Inicializa                                               │
│  └── useGtmConfig() busca container_id do banco              │
│       └── initGTM(containerId) carrega script do GTM         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  Eventos são enviados via dataLayer                          │
│  ├── setTenantId(buId) → { event: 'tenant_selected', ... }   │
│  ├── trackVirtualPageView() → { event: 'virtual_page_view' } │
│  └── trackEvent() → { event: 'nome_do_evento', ... }         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  GTM captura eventos do dataLayer                            │
│  └── Repassa para GA4 (configurado dentro do GTM)            │
│       └── User Property: tenant_id para segmentação por BU   │
└──────────────────────────────────────────────────────────────┘
```

---

## Notas Importantes

1. **API Compatível**: As funções `trackEvent()`, `setTenantId()`, etc. continuam funcionando - só mudam internamente para `dataLayer.push`

2. **GA4 gerenciado no GTM**: A chave do GA4 será configurada dentro do painel do Google Tag Manager, não no Hub

3. **Flexibilidade**: O GTM permite adicionar outros scripts (Meta Pixel, LinkedIn, etc.) sem deploy de código

4. **Retrocompatibilidade**: Se não houver GTM configurado, o sistema continua funcionando (sem tracking)

5. **Padrões seguidos**:
   - ✅ Query keys via `queryKeys.integrations.globalByKey()`
   - ✅ Global client para dados PRE-BU (catálogo de integrações)
   - ✅ Componente existente estendido (GlobalIntegrationDetailPage)
   - ✅ Documentação canônica atualizada

---

## Configuração Pós-Implementação

Após deploy, o admin deve:

1. Acessar `/hub/integrations/google-tag-manager`
2. Inserir Container ID (ex: `GTM-ABC123`)
3. Habilitar globalmente
4. Salvar configuração

No GTM:
1. Criar tag do GA4 com o Measurement ID
2. Criar triggers para os eventos customizados
3. Publicar container
