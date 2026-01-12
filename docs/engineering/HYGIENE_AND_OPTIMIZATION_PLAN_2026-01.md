# 🔧 Plano de Higienização e Otimização — Hub da Jet

**Data:** 2026-01-12  
**Versão:** 1.0.0  
**Baseado em:** TCR v2.17.0, HEALTH_REPORT_2026-01-11

---

## 📋 Sumário Executivo

Análise completa do projeto identificou oportunidades de melhoria em 5 categorias:

| Categoria | Prioridade | Itens Identificados |
|-----------|------------|---------------------|
| 2. Higienização | P1-P2 | 47 tabelas vazias, índices não utilizados, código legacy |
| 3. Refatoração | P2-P3 | Módulo OKRs fragmentado, hooks dispersos |
| 4. Centralização | P2 | Componentes duplicados, patterns inconsistentes |
| 5. Performance | P2-P3 | Índices redundantes, queries sem cache |

---

## 2. HIGIENIZAÇÃO — Código/Arquivos Desnecessários

### 2.1 Banco de Dados

#### 2.1.1 Tabelas Vazias (39 identificadas)

| Categoria | Tabelas | Ação Recomendada |
|-----------|---------|------------------|
| **Em Uso (Schema Pronto)** | `kpi_metrics`, `kpi_values`, `okr_dependencies`, `okr_kr_metrics`, `okr_insights`, `okr_coaching_events` | ✅ Manter — aguardando dados de produção |
| **Automação (Não Ativado)** | `automation_connections`, `automation_connection_events`, `automation_incoming_tokens`, `automation_logs` | ⚠️ Avaliar — módulo não lançado |
| **Assets (Sub-módulos)** | `asset_gift_*`, `asset_groups`, `asset_group_items`, `asset_keys`, `asset_key_movements` | ✅ Manter — módulos ativos |
| **Notificações** | `notification_deliveries`, `notification_health_*`, `notification_template_audit_log`, `user_notification_preferences_v2` | ✅ Manter — infra de observabilidade |
| **Legacy/Descontinuado** | `mentions` | ❌ **DROP** — ticket_mentions é canônico |

**Ação Imediata:**
```sql
-- Remover tabela mentions (substitída por ticket_mentions)
DROP TABLE IF EXISTS public.mentions CASCADE;
```

#### 2.1.2 Índices Não Utilizados (25 com 0 scans)

| Índice | Tabela | Tamanho | Ação |
|--------|--------|---------|------|
| `idx_ai_agent_logs_user_bu_created` | ai_agent_logs | 5.3 MB | ⚠️ Monitorar |
| `idx_ai_agent_logs_bu_created` | ai_agent_logs | 3.6 MB | ⚠️ Monitorar |
| `idx_bu_units_domains` | bu_units | 24 KB | ✅ Manter (auth) |
| `idx_bu_units_cnpj` | bu_units | 16 KB | ✅ Manter (validação) |
| `idx_asset_inventory_bu_status` | asset_inventory | 16 KB | ⚠️ Monitorar |
| `idx_okr_checkins_*` (3 índices) | okr_checkins | 48 KB | ⚠️ Monitorar |

**Recomendação:** Monitorar por 30 dias antes de remover. Índices em `ai_agent_logs` podem ser úteis para queries futuras.

#### 2.1.3 Funções SQL Redundantes

| Função | Problema | Ação |
|--------|----------|------|
| `_identity_dual_mode_deadline` | Deadline expirado (era para cutover) | ❌ DROP |
| `count_bu_calls_today` / `count_user_calls_today` | Possivelmente não usado | ⚠️ Auditar uso |

#### 2.1.4 Dados de Log Acumulados

| Tabela | Linhas | Tamanho | Ação |
|--------|--------|---------|------|
| `ai_agent_logs` | 51.054 | 21 MB | ⚠️ Implementar retenção (90 dias) |
| `cron_execution_logs` | 3.389 | 744 KB | ⚠️ Implementar retenção (30 dias) |
| `audit_logs` | 637 | 1.2 MB | ✅ OK por enquanto |

---

### 2.2 Backend (Edge Functions)

#### 2.2.1 Funções Ativas

| Função | Status | Notas |
|--------|--------|-------|
| `auth-email-hook` | ✅ Crítica | Validação de domínio |
| `request-magic-link` | ✅ Crítica | Auth flow |
| `invoke-vic` | ✅ Ativa | IA principal |
| `culture-message` | ⚠️ Fallback | Frontend usa pool local |
| `process-notification-outbox` | ✅ Crítica | Outbox pattern |
| `cron-dispatcher` | ✅ Crítica | Orquestração de crons |
| `get-public-asset` | ✅ Ativa | QR codes |
| `audit-permissions` | ⚠️ Dev-only | Considerar remover em prod |

#### 2.2.2 Código Shared Não Utilizado

```
supabase/functions/_shared/
├── cors.ts          ✅ Usado
├── supabaseClient.ts ✅ Usado
├── auth.ts          ⚠️ Auditar uso
└── types.ts         ⚠️ Auditar uso
```

---

### 2.3 Frontend

#### 2.3.1 Componentes UI Já Removidos (sessões anteriores)

✅ `carousel.tsx`, `menubar.tsx`, `context-menu.tsx`, `toggle-group.tsx`, `navigation-menu.tsx`, `input-otp.tsx`, `aspect-ratio.tsx`, `resizable.tsx`, `toggle.tsx`

#### 2.3.2 Hooks Legacy/Mock Já Removidos

✅ `useMockOkrData.ts`, `useMockKpiData.ts`

#### 2.3.3 Arquivos Candidatos a Revisão

| Arquivo | Problema | Ação |
|---------|----------|------|
| `src/data/cultureMessages.ts` | 100+ mensagens hardcoded | ✅ Manter (fallback) |
| `src/hooks/useGreeting.ts` | Simples, poderia ser util | ⚠️ Mover para shared/utils |

#### 2.3.4 Dependências NPM (Verificar Uso)

Todas as dependências atuais estão em uso. Nenhuma remoção necessária.

---

## 3. REFATORAÇÃO — Plano de Otimização Estrutural

### 3.1 Banco de Dados

#### 3.1.1 Normalização de Identity Map

**Problema:** Algumas colunas ainda não têm FK explícita para `profiles.id`.

| Tabela | Coluna | Ação |
|--------|--------|------|
| `asset_inventory` | `created_by`, `updated_by` | Adicionar FK |
| `asset_keyrings` | `current_user_id` | Adicionar FK |
| `asset_key_movements` | `user_id`, `performed_by_user_id`, `authorized_by_user_id` | Adicionar FK |
| `profiles` | `manager_user_id` | Adicionar FK (self-reference) |

#### 3.1.2 Política de Retenção de Logs

```sql
-- Criar policy de retenção para ai_agent_logs (90 dias)
CREATE OR REPLACE FUNCTION cleanup_old_agent_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_agent_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar policy de retenção para cron_execution_logs (30 dias)
CREATE OR REPLACE FUNCTION cleanup_old_cron_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM cron_execution_logs 
  WHERE executed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

### 3.2 Backend (Edge Functions)

#### 3.2.1 Consolidação de Helpers

**Problema:** Código repetido entre funções.

**Solução:**
```
supabase/functions/_shared/
├── cors.ts           ✅ Existente
├── supabaseClient.ts ✅ Existente
├── auth.ts           → Consolidar validação JWT
├── logging.ts        → NOVO: Structured logging
├── errors.ts         → NOVO: Error handling padrão
└── types.ts          → Consolidar tipos comuns
```

#### 3.2.2 Padrão de Logging Estruturado

```typescript
// _shared/logging.ts
export function logRequest(functionName: string, correlationId: string, payload: unknown) {
  console.log(JSON.stringify({
    level: "info",
    function: functionName,
    correlationId,
    timestamp: new Date().toISOString(),
    payload
  }));
}
```

---

### 3.3 Frontend

#### 3.3.1 Módulo OKRs — Crítico (Refatoração Necessária)

**Problemas Identificados:**

| Problema | Impacto | Prioridade |
|----------|---------|------------|
| Wizard fragmentado em muitos componentes | Manutenção difícil | P1 |
| 15+ hooks dispersos | Duplicação de lógica | P1 |
| Lógica de cálculo duplicada | Inconsistência | P2 |

**Estrutura Atual:**
```
src/modules/okrs/
├── components/        # 30+ arquivos
├── hooks/             # 15+ arquivos
├── pages/             # 8+ arquivos
├── utils/             # Disperso
└── types.ts           # Tipos duplicados
```

**Estrutura Proposta:**
```
src/modules/okrs/
├── features/
│   ├── objectives/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types.ts
│   ├── key-results/
│   ├── checkins/
│   └── wizard/
├── shared/
│   ├── components/   # ProgressBar, ConfidenceIcon, etc.
│   ├── hooks/        # useOkrCalculations
│   └── utils/        # Cálculos de progresso
└── pages/
```

#### 3.3.2 Hooks Dispersos — Consolidação

| Hook Atual | Proposta |
|------------|----------|
| `useTeamObjectives`, `useOrgObjectives` | → `useObjectives({ scope: 'team' | 'org' })` |
| `useTeamKrs`, `useOrgKrs` | → `useKeyResults({ scope })` |
| `useCheckins`, `useTeamCheckins` | → `useCheckins({ teamId? })` |

---

## 4. CENTRALIZAÇÃO — Plano de Consolidação

### 4.1 Banco de Dados

#### 4.1.1 Catálogos Globais (Já Centralizados) ✅

- `permission_catalog` — 160 keys
- `permission_templates_v2` — 27 templates
- `notification_events` — 18 eventos
- `notification_channels` — 5 canais
- `hub_integrations_catalog` — Integrações

#### 4.1.2 Oportunidade: Consolidar Categorias

| Tabela | Alternativa |
|--------|-------------|
| `asset_categories` | ✅ Manter (hierárquica) |
| `ticket_categories` | ✅ Manter |
| `ticket_subcategories` | → Migrar para coluna `parent_id` em `ticket_categories` |

---

### 4.2 Backend

#### 4.2.1 Padrão de Response

```typescript
// Proposta: _shared/response.ts
export function successResponse<T>(data: T, meta?: Record<string, unknown>) {
  return new Response(JSON.stringify({ success: true, data, meta }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}

export function errorResponse(message: string, status = 400, code?: string) {
  return new Response(JSON.stringify({ success: false, error: { message, code } }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}
```

---

### 4.3 Frontend

#### 4.3.1 Componentes a Centralizar

| Componente | Duplicações | Ação |
|------------|-------------|------|
| `PageHeader` | 3+ variações | → `src/shared/components/PageHeader.tsx` |
| `EmptyState` | 5+ variações | → `src/shared/components/EmptyState.tsx` |
| `LoadingState` | 4+ variações | → `src/shared/components/LoadingState.tsx` |
| `ConfirmDialog` | 3+ variações | → `src/shared/components/ConfirmDialog.tsx` |

#### 4.3.2 Utilitários a Centralizar

| Utilitário | Localização Atual | Destino |
|------------|-------------------|---------|
| `formatDate`, `formatCurrency` | Disperso | → `src/lib/formatters.ts` |
| `cn`, `cva` | `src/lib/utils.ts` | ✅ Já centralizado |
| `queryKeys` | `src/lib/queryKeys.ts` | ✅ Já centralizado |
| `shareableLinks` | `src/lib/shareableLinks.ts` | ✅ Já centralizado |

#### 4.3.3 Tipos Compartilhados

```
src/shared/types/
├── pagination.ts     # PaginationParams, PaginatedResponse
├── filters.ts        # BaseFilters, DateRangeFilter
├── entities.ts       # BaseEntity, SoftDeletable
└── api.ts            # ApiResponse, ApiError
```

---

## 5. PERFORMANCE — Plano de Otimização

### 5.1 Banco de Dados

#### 5.1.1 Índices Críticos (Já Implementados) ✅

```sql
-- Tickets (paginação)
CREATE INDEX idx_tickets_bu_status_created ON tickets(bu_id, status, created_at DESC);

-- Asset Inventory (paginação)
CREATE INDEX idx_asset_inventory_bu_status_updated ON asset_inventory(bu_id, status, updated_at DESC);

-- Profiles (diretório)
CREATE INDEX idx_profiles_bu_employment_name ON profiles(bu_id, employment_status, first_name, last_name);
```

#### 5.1.2 Índices Pendentes (Recomendados)

```sql
-- OKR Team Objectives (queries frequentes)
CREATE INDEX IF NOT EXISTS idx_okr_team_objectives_bu_team_status 
ON okr_team_objectives(bu_id, team_id, status);

-- Notifications (inbox do usuário)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
ON notifications(user_id, read_at NULLS FIRST, created_at DESC);

-- Notification Outbox (processamento)
CREATE INDEX IF NOT EXISTS idx_notification_outbox_status_retry 
ON notification_outbox(status, next_retry_at) WHERE status IN ('pending', 'retrying');
```

#### 5.1.3 Particionamento (Futuro — P3)

| Tabela | Critério | Benefício |
|--------|----------|-----------|
| `ai_agent_logs` | Por mês (created_at) | Cleanup eficiente |
| `cron_execution_logs` | Por mês | Cleanup eficiente |
| `audit_logs` | Por mês | Query range scans |

---

### 5.2 Backend

#### 5.2.1 RPCs Agregadoras (Pendentes)

| RPC | Objetivo | Queries Consolidadas |
|-----|----------|---------------------|
| `rpc_home_dashboard_data` | Dashboard home | 5 queries → 1 |
| `rpc_tickets_summary` | Resumo tickets | 3 queries → 1 |
| `rpc_okr_team_summary` | Resumo OKRs time | 4 queries → 1 |

#### 5.2.2 Cache em Edge Functions

```typescript
// Usar cache-control para respostas estáveis
const headers = {
  ...corsHeaders,
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
};
```

---

### 5.3 Frontend

#### 5.3.1 staleTime por Domínio

| Domínio | staleTime | Justificativa |
|---------|-----------|---------------|
| `profiles` | 5 min | Dados estáveis |
| `teams` | 5 min | Dados estáveis |
| `bu_units` | 10 min | Raramente muda |
| `permissions` | 5 min | Após login |
| `tickets` | 30 seg | Dados dinâmicos |
| `notifications` | 0 (realtime) | Crítico |

#### 5.3.2 Code Splitting (Lazy Loading)

```typescript
// Já implementado para rotas principais
// Candidatos adicionais:
const OkrWizard = lazy(() => import("@/modules/okrs/pages/OkrWizardPage"));
const ReportsPage = lazy(() => import("@/modules/okrs/pages/ReportsPage"));
const IntegrationsPage = lazy(() => import("@/modules/integrations/pages"));
```

#### 5.3.3 Prefetch de Rotas Críticas

```typescript
// Em hover de menu, prefetch dados da próxima rota
queryClient.prefetchQuery({
  queryKey: queryKeys.okrs.teamObjectives(buId, teamId),
  queryFn: fetchTeamObjectives,
  staleTime: 5 * 60 * 1000
});
```

---

## 📊 Priorização de Execução

### Wave 1 — Higienização Crítica (P1) ✅ CONCLUÍDA

| Item | Esforço | Impacto | Status |
|------|---------|---------|--------|
| DROP tabela `mentions` | 5 min | Segurança | ✅ Feito (migration anterior) |
| DROP função `_identity_dual_mode_deadline` | 5 min | Cleanup | ✅ Feito (migration anterior) |
| Implementar retenção de logs | 30 min | Storage | ✅ Feito (`cleanup_old_agent_logs`, `cleanup_old_cron_logs`) |
| Índices de performance | 10 min | Query speed | ✅ Feito (3 índices criados) |

### Wave 2 — Centralização (P2)

| Item | Esforço | Impacto | Status |
|------|---------|---------|--------|
| Consolidar PageHeader/EmptyState/LoadingState | 2h | DX | 🔲 Pendente |
| Criar `_shared/logging.ts` para Edge Functions | 1h | Observabilidade | 🔲 Pendente |
| Adicionar FKs faltantes no Identity Map | 1h | Integridade | 🔲 Pendente |

### Wave 3 — Refatoração OKRs (P2-P3)

| Item | Esforço | Impacto | Status |
|------|---------|---------|--------|
| Reorganizar estrutura de pastas | 4h | Manutenção | 🔲 Pendente |
| Consolidar hooks de objectives | 3h | DX | 🔲 Pendente |
| Implementar `okr_dependencies` | 2h | Feature | 🔲 Pendente |

### Wave 4 — Performance (P3)

| Item | Esforço | Impacto | Status |
|------|---------|---------|--------|
| Criar índices pendentes | 30 min | Query speed | 🔲 Pendente |
| Implementar RPCs agregadoras | 4h | Network | 🔲 Pendente |
| Configurar staleTime por domínio | 1h | UX | 🔲 Pendente |

---

## ✅ Métricas de Sucesso

| Métrica | Atual | Meta |
|---------|-------|------|
| Tabelas vazias (legacy) | 1 | 0 |
| Funções SQL obsoletas | 1 | 0 |
| Componentes duplicados | 5+ | 0 |
| Índices não utilizados | 25 | < 10 |
| Tempo de load (dashboard) | — | < 2s |
| Bundle size (main chunk) | — | < 500KB |

---

## 📎 Documentos Relacionados

- [TECHNICAL_CONTEXT_REGISTRY.md](../TECHNICAL_CONTEXT_REGISTRY.md) — TCR v2.17.0
- [HEALTH_REPORT_2026-01-11.md](./HEALTH_REPORT_2026-01-11.md) — Estado atual
- [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) — Padrões obrigatórios
- [DATA_MODEL_REGISTRY.md](./DATA_MODEL_REGISTRY.md) — Schema canônico

---

*Documento gerado em: 2026-01-12*
