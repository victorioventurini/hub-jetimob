# Edge Functions Audit Report

**Data:** 2026-01-08  
**Autor:** Auditoria Automatizada  
**Versão:** 1.0

---

## Sumário Executivo

Esta auditoria analisou as Edge Functions do Supabase/Lovable Cloud, identificando funções ativas, legadas e não utilizadas.

**Estatísticas:**
- Total de Edge Functions: 15
- Funções Ativas: 11
- Funções Legacy: 2
- Funções Especiais (hooks/cron): 2

---

## 1. Edge Functions por Status

### 1.1 Funções ATIVAS (Invocadas pelo Frontend)

| Função | Arquivo | Chamador | JWT | Status |
|--------|---------|----------|-----|--------|
| `request-magic-link` | `/request-magic-link/` | `useAuth.tsx:134` | ❌ | ACTIVE |
| `search-address` | `/search-address/` | `AddressAutocomplete.tsx:71` | ❌ | ACTIVE |
| `get-place-details` | `/get-place-details/` | `AddressAutocomplete.tsx:102` | ❌ | ACTIVE |
| `search-cities` | `/search-cities/` | `CityAutocomplete.tsx:64` | ❌ | ACTIVE |
| `audit-permissions` | `/audit-permissions/` | `usePermissionAudit.ts:44` | ✅ | ACTIVE |
| `process-agent-document` | `/process-agent-document/` | `useAgentDocuments.ts:76` | ✅ | ACTIVE |
| `global-search` | `/global-search/` | `useGlobalSearch.ts:62` | ✅ | ACTIVE |
| `get-public-asset` | `/get-public-asset/` | `PublicAsset.tsx:74` | ❌ | ACTIVE |
| `invoke-vic` | `/invoke-vic/` | `useVicAgent.ts:42` | ✅ | ACTIVE |
| `culture-message` | `/culture-message/` | `useCultureMessage.ts` | ✅ | ACTIVE |
| `hub-greeting` | `/hub-greeting/` | `useGreeting.ts` | ✅ | ACTIVE |

### 1.2 Funções DEPRECATED

| Função | Arquivo | Problema | Status | Depreciação |
|--------|---------|----------|--------|-------------|
| `send-magic-link` | `/send-magic-link/` | Substituída por `request-magic-link` | **DEPRECATED** | 2026-01-08 |

**Evidência:** Documentado em `docs/TECHNICAL_CONTEXT_REGISTRY.md:1494` como "(Legado)".  
**Instrumentação:** Função modificada para logar chamadas em `app_error_logs` e retornar HTTP 410 Gone.  
**Remoção:** Após 14 dias sem chamadas (ver `docs/DEPRECATION_SEND_MAGIC_LINK.md`).

### 1.3 Funções ESPECIAIS (Não invocadas diretamente)

| Função | Tipo | Descrição | Status |
|--------|------|-----------|--------|
| `auth-email-hook` | Auth Hook | Hook do Supabase Auth | ACTIVE |
| `process-notification-outbox` | Background | Processador de outbox | ACTIVE |
| `get-tcr` | External API | API para Custom GPTs | ACTIVE |

---

## 2. Análise Detalhada

### 2.1 `request-magic-link` (ACTIVE)
- **Propósito:** Envia magic links via SendGrid
- **JWT:** Não requerido (login)
- **Chamador:** `useAuth.tsx` durante autenticação
- **Dependências:** SendGrid API Key

### 2.2 `send-magic-link` (DEPRECATED ⚠️)
- **Propósito:** Versão antiga de envio de magic link
- **Problema:** Substituída por `request-magic-link`
- **Status:** DEPRECATED desde 2026-01-08
- **Comportamento Atual:** Loga chamadas e retorna HTTP 410 Gone
- **Ação:** Remover após 14 dias sem chamadas (ver `docs/DEPRECATION_SEND_MAGIC_LINK.md`)

### 2.3 `auth-email-hook` (ACTIVE - Hook)
- **Propósito:** Customização de emails do Supabase Auth
- **Configuração:** `supabase/config.toml:9-10`
- **Nota:** Não é invocado pelo frontend, é um hook do Supabase

### 2.4 `search-cities` / `search-address` / `get-place-details` (ACTIVE)
- **Propósito:** Integração com Google Maps/Places
- **JWT:** Não requerido (dados públicos)
- **Dependências:** Google Maps API Key

### 2.5 `global-search` (ACTIVE)
- **Propósito:** Busca unificada em múltiplas entidades
- **JWT:** Requerido
- **Chamadores:** `useGlobalSearch.ts`, `SearchPage.tsx`

### 2.6 `invoke-vic` (ACTIVE)
- **Propósito:** Invoca agentes de IA (Vic)
- **JWT:** Requerido
- **Chamador:** `useVicAgent.ts`

### 2.7 `get-public-asset` (ACTIVE)
- **Propósito:** Retorna dados públicos de assets (QR codes)
- **JWT:** Não requerido (público)
- **Chamador:** `PublicAsset.tsx`

### 2.8 `process-notification-outbox` (ACTIVE - Background)
- **Propósito:** Processa fila de notificações
- **Trigger:** Cron/Database trigger
- **Documentação:** `docs/NOTIFICATION_SYSTEM_REPORT.md:57-65`

### 2.9 `get-tcr` (ACTIVE - External)
- **Propósito:** API para Custom GPTs externos
- **JWT:** Não requerido (API key própria)
- **Documentação:** `docs/CHATGPT_CUSTOM_GPT_SETUP.md:210-217`

### 2.10 `audit-permissions` (ACTIVE)
- **Propósito:** Auditoria do sistema de permissões
- **JWT:** Requerido
- **Chamador:** `usePermissionAudit.ts`

### 2.11 `process-agent-document` (ACTIVE)
- **Propósito:** Processa documentos de agentes IA
- **JWT:** Requerido
- **Chamador:** `useAgentDocuments.ts`

---

## 3. Configuração (config.toml)

```toml
[functions.send-magic-link]     # LEGACY
verify_jwt = false

[functions.request-magic-link]  # ACTIVE
verify_jwt = false

[functions.auth-email-hook]     # ACTIVE (Hook)
verify_jwt = false

[functions.search-cities]       # ACTIVE
verify_jwt = false

[functions.get-tcr]             # ACTIVE (External)
verify_jwt = false

[functions.process-agent-document]  # ACTIVE
verify_jwt = true

[functions.culture-message]     # ACTIVE
verify_jwt = true

[functions.hub-greeting]        # ACTIVE
verify_jwt = true

[functions.invoke-vic]          # ACTIVE
verify_jwt = true

[functions.global-search]       # ACTIVE
verify_jwt = true

[functions.get-public-asset]    # ACTIVE
verify_jwt = false

[functions.audit-permissions]   # ACTIVE
verify_jwt = true

[functions.process-notification-outbox]  # ACTIVE (Background)
verify_jwt = false
```

---

## 4. Dependências Externas

| Função | Serviço Externo | Secret Necessária |
|--------|-----------------|-------------------|
| `request-magic-link` | SendGrid | `SENDGRID_API_KEY` |
| `send-magic-link` | SendGrid | `SENDGRID_API_KEY` |
| `search-cities` | Google Maps | `GOOGLE_MAPS_API_KEY` |
| `search-address` | Google Places | `GOOGLE_MAPS_API_KEY` |
| `get-place-details` | Google Places | `GOOGLE_MAPS_API_KEY` |
| `invoke-vic` | OpenAI/AI | Via Lovable AI |
| `culture-message` | OpenAI/AI | Via Lovable AI |

---

## 5. Pasta `_shared`

O diretório `supabase/functions/_shared/` contém código compartilhado entre funções:

| Arquivo | Propósito |
|---------|-----------|
| `cors.ts` | Headers CORS padronizados |
| `supabase.ts` | Client Supabase configurado |
| `types.ts` | Tipos compartilhados |

---

## 6. Recomendações

### Wave 1 - Baixo Risco
- ✅ Todas as funções ativas documentadas

### Wave 2 - Médio Risco
1. **Remover `send-magic-link`**
   - Substituída por `request-magic-link`
   - Verificar se não há chamadas residuais
   - Remover de `config.toml`

### Wave 3 - Alto Risco
1. Nenhuma ação necessária

---

## 7. Matriz de Classificação

| Função | Classificação | Risco | Ação |
|--------|---------------|-------|------|
| `request-magic-link` | ACTIVE | - | Manter |
| `send-magic-link` | LEGACY | Baixo | Remover Wave 2 |
| `auth-email-hook` | ACTIVE | - | Manter |
| `search-cities` | ACTIVE | - | Manter |
| `search-address` | ACTIVE | - | Manter |
| `get-place-details` | ACTIVE | - | Manter |
| `audit-permissions` | ACTIVE | - | Manter |
| `process-agent-document` | ACTIVE | - | Manter |
| `global-search` | ACTIVE | - | Manter |
| `get-public-asset` | ACTIVE | - | Manter |
| `invoke-vic` | ACTIVE | - | Manter |
| `culture-message` | ACTIVE | - | Manter |
| `hub-greeting` | ACTIVE | - | Manter |
| `process-notification-outbox` | ACTIVE | - | Manter |
| `get-tcr` | ACTIVE | - | Manter |
