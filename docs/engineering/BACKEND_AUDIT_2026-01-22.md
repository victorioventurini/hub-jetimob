# Backend Audit Report — Hub da Jet

**Data:** 2026-01-22  
**Versão TCR:** 2.59.0  
**Autor:** Lovable AI  
**Escopo:** Edge Functions, RPCs, Database Functions, Hooks/Queries

---

## 1. Resumo Executivo

### Status Geral: 🟡 BOM (com melhorias estruturais necessárias)

O backend do Hub é **funcional e seguro**, mas apresenta oportunidades significativas de **consolidação**, **redução de complexidade** e **melhoria de manutenibilidade**.

| Área | Status | Prioridade |
|------|--------|------------|
| Edge Functions | 🟢 Boa modularização | P3 |
| Database Functions (RPCs) | 🟡 Duplicação identificada | P1 |
| Cleanup/Manutenção | 🔴 Funções redundantes | P1 |
| Identity Resolution | 🟡 Múltiplos resolvers | P2 |
| Notification System | 🟢 Bem estruturado | P4 |
| Permission System (RBAC) | 🟡 Complexidade desnecessária | P2 |

---

## 2. Descobertas Críticas

### 2.1 🔴 Funções de Cleanup Redundantes (P1)

**Problema:** Existem 3 funções fazendo cleanup de logs com parâmetros de retenção **conflitantes**:

| Função | Tabela | Retenção | Status |
|--------|--------|----------|--------|
| `cleanup_old_logs()` | `ai_agent_logs` | 30 dias | Principal |
| `cleanup_old_logs()` | `perf_metrics_snapshots` | 14 dias | Principal |
| `cleanup_old_logs()` | `cron_execution_logs` | 7 dias | Principal |
| `cleanup_old_agent_logs()` | `ai_agent_logs` | 14 dias | **REDUNDANTE** |
| `cleanup_old_cron_logs()` | `cron_execution_logs` | 30 dias | **CONFLITANTE** |

**Impacto:**
- Parâmetros de retenção inconsistentes
- Código duplicado que viola DRY
- Confusão sobre qual função usar

**Solução Proposta:**
```sql
-- Consolidar em UMA ÚNICA função com parâmetros configuráveis
CREATE OR REPLACE FUNCTION public.cleanup_old_logs(
  p_agent_logs_days INTEGER DEFAULT 14,
  p_perf_days INTEGER DEFAULT 14,
  p_cron_days INTEGER DEFAULT 7,
  p_wizard_days INTEGER DEFAULT 30
) RETURNS TABLE(table_name TEXT, rows_deleted BIGINT) ...
```

### 2.2 🟡 Identity Resolution Fragmentada (P2)

**Problema:** Múltiplas funções resolvem identidade de formas diferentes:

| Função | Propósito | Input | Output |
|--------|-----------|-------|--------|
| `my_profile_id()` | Profile do usuário logado | — | `uuid` |
| `profile_id_from_user_id(uuid)` | Conversão auth→profile | `auth.users.id` | `uuid` |
| `resolve_notification_recipient(uuid)` | Para notificações | `auth.users.id` | `jsonb` |
| `resolve_participant_identity(uuid)` | Para tickets (híbrido) | `profile_id` | `TABLE` |
| `get_profile_id(uuid)` | Conversão genérica | `auth.users.id` | `uuid` |

**Impacto:**
- Lógica duplicada entre funções
- Comportamento inconsistente (algumas aceitam profile_id como fallback, outras não)
- Difícil manutenção

**Solução Proposta:**
```
Fase 1: Deprecar funções redundantes
- Manter: my_profile_id(), resolve_participant_identity()
- Deprecar: get_profile_id() (alias para profile_id_from_user_id)
- Refatorar: resolve_notification_recipient() para usar resolve_participant_identity()
```

### 2.3 🟡 Complexidade em RBAC (P2)

**Problema:** A função `user_has_permission_ctx()` tem 250+ linhas com múltiplos `CASE` statements para escopos.

**Impacto:**
- Difícil debugging
- Performance subótima (múltiplos lookups)
- Risco de bugs em edge cases

**Solução Proposta:**
1. Separar validação de escopo em função dedicada
2. Implementar cache de permissões por sessão
3. Simplificar lógica de `CASE` com tabela de lookup

---

## 3. Análise de Edge Functions

### 3.1 Estrutura Atual (17 funções)

| Função | Propósito | JWT | Complexidade |
|--------|-----------|-----|--------------|
| `invoke-vic` | Orquestrador de IA | ✅ | Alta |
| `process-notification-outbox` | Processamento de notificações | ❌ | Média |
| `cron-dispatcher` | Executor de tarefas agendadas | ❌ | Média |
| `request-magic-link` | Auth (legacy) | ❌ | Baixa |
| `auth-email-hook` | Hook de email auth | ❌ | Baixa |
| `okr-org-health-review` | Análise de saúde OKR | ✅ | Média |
| `okr-construction-review` | Revisão de construção OKR | ❌ | Média |
| `search-cities` | Busca de cidades | ❌ | Baixa |
| `get-tcr` | Retorna TCR | ❌ | Baixa |
| `process-agent-document` | Processa documentos IA | ✅ | Média |
| `culture-message` | Mensagem de cultura | ✅ | Baixa |
| `hub-greeting` | Saudação do Hub | ✅ | Baixa |
| `get-public-asset` | Assets públicos | ❌ | Baixa |
| `audit-permissions` | Auditoria de permissões | ❌ | Baixa |
| `evaluate-notification-health` | Saúde de notificações | ❌ | Média |
| `search-address` | Busca de endereços | ? | Baixa |
| `send-partner-invite` | Convite de parceiros | ? | Baixa |

### 3.2 Pontos Fortes ✅

1. **Middleware bem estruturado** (`_shared/middleware.ts`):
   - Validação de JWT centralizada
   - Criação de cliente BU-scoped
   - Rate limiting configurável
   - Logging padronizado

2. **LLM Client modular** (`_shared/llm-client.ts`):
   - Suporta múltiplos providers (OpenAI, Lovable AI)
   - Streaming configurável
   - Error mapping consistente

3. **Agent Loader com SWR Cache** (`_shared/agent-loader.ts`):
   - Cache de 60s para configurações de agente
   - Refresh em background (stale-while-revalidate)

4. **Notification Providers bem separados** (`_shared/notification-providers/`):
   - Email, Slack, Webhook em módulos separados
   - Template rendering centralizado

### 3.3 Oportunidades de Melhoria

| Área | Problema | Solução |
|------|----------|---------|
| `okr-org-health-review` | Faz `fetch()` para `invoke-vic` ao invés de importar diretamente | Refatorar para usar shared client |
| `cron-dispatcher` | Faz `fetch()` para `process-notification-outbox` | Considerar invocação direta |
| Error handling | Inconsistente entre funções | Criar `_shared/error-handler.ts` |
| Validation | Zod só usado em `invoke-vic` | Expandir para todas as funções |

---

## 4. Análise de Hooks/Queries (Frontend→Backend)

### 4.1 Padrões Identificados

**✅ Bom:**
- Query keys centralizadas em `src/lib/queryKeys/`
- `staleTime` configurado na maioria dos hooks
- Campo selection explícito (sem `select('*')`)

**🟡 Atenção:**
- Alguns hooks fazem múltiplas queries sequenciais que poderiam ser consolidadas
- N+1 queries em alguns casos (ex: buscar profiles após listar KRs)

### 4.2 Hooks com Potencial de Consolidação

| Hook Atual | Problema | Solução |
|------------|----------|---------|
| `useTeamPendingKrs` + `useTeamOverviewMetrics` | 2 queries separadas para dados relacionados | Criar RPC `get_team_dashboard_data` |
| `useOkrHealth` + `useObjectiveInsights` | Chamadas paralelas evitáveis | Incluir insights na query de health |
| `useBuAdmins` | Query manual de memberships + profiles | Usar view `v_bu_all_profiles_admin` |

---

## 5. Plano de Ação

### Fase 1: Consolidação de Cleanup (P1) — 1h

```sql
-- 1. Consolidar funções de cleanup
CREATE OR REPLACE FUNCTION public.cleanup_old_logs(
  p_config JSONB DEFAULT '{}'::JSONB
) RETURNS TABLE(table_name TEXT, rows_deleted BIGINT);

-- 2. Deprecar funções redundantes
DROP FUNCTION IF EXISTS public.cleanup_old_agent_logs();
DROP FUNCTION IF EXISTS public.cleanup_old_cron_logs();
```

### Fase 2: Identity Resolution (P2) — 2h

```sql
-- 1. Criar função unificada
CREATE OR REPLACE FUNCTION public.resolve_identity(
  p_id uuid,
  p_id_type text DEFAULT 'auto' -- 'profile', 'auth', 'auto'
) RETURNS TABLE(...);

-- 2. Refatorar resolve_notification_recipient
CREATE OR REPLACE FUNCTION public.resolve_notification_recipient(...)
-- Usar resolve_identity() internamente
```

### Fase 3: Edge Function Cleanup (P2) — 2h

1. **Criar `_shared/error-handler.ts`:**
```typescript
export function handleEdgeFunctionError(
  error: unknown,
  requestId: string,
  context?: string
): Response
```

2. **Adicionar Zod validation a todas as funções:**
- `okr-org-health-review`
- `process-notification-outbox`
- `cron-dispatcher`

### Fase 4: RBAC Simplification (P3) — 3h

1. Criar função helper `get_permission_scope()`:
```sql
CREATE FUNCTION get_permission_scope(
  p_permission_key text
) RETURNS permission_scope
```

2. Simplificar `user_has_permission_ctx()`:
```sql
-- Reduzir de 250 linhas para ~100 linhas
-- Usar get_permission_scope() ao invés de CASE
```

### Fase 5: Hook Consolidation (P4) — 4h

1. **Criar RPC `get_team_dashboard_data()`:**
```sql
CREATE FUNCTION get_team_dashboard_data(
  p_team_id uuid,
  p_cycle_id uuid
) RETURNS JSONB
-- Retorna: krs, metrics, highlights em uma única chamada
```

2. **Criar RPC `get_okr_health_with_insights()`:**
```sql
CREATE FUNCTION get_okr_health_with_insights(
  p_objective_id uuid,
  p_objective_type text
) RETURNS JSONB
-- Retorna: health score + insights ativos
```

---

## 6. Métricas de Sucesso

| Métrica | Atual | Meta |
|---------|-------|------|
| Funções de cleanup | 3 | 1 |
| Funções de identity resolution | 5 | 2 |
| Linhas em `user_has_permission_ctx` | ~250 | ~100 |
| Edge functions sem Zod validation | 16 | 0 |
| Queries N+1 identificadas | ~5 | 0 |

---

## 7. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Breaking changes em RPCs | Média | Alto | Manter assinaturas backwards-compatible |
| Cache invalidation bugs | Baixa | Médio | Testes de integração |
| Performance regression | Baixa | Alto | Benchmark antes/depois |

---

## 8. Próximos Passos Imediatos

1. ✅ **Documentar estado atual** (este documento)
2. ✅ **Fase 1:** Consolidar funções de cleanup (COMPLETO - 2026-01-22)
   - Criada `cleanup_old_logs()` unificada com parâmetros configuráveis
   - Funções redundantes marcadas como DEPRECATED
3. ✅ **Fase 3:** Padronizar error handling em Edge Functions (COMPLETO - 2026-01-22)
   - Criado `_shared/error-handler.ts` com tipos, códigos e helpers
4. ⏳ **Fase 2:** Unificar identity resolution

---

*Este documento será atualizado conforme as melhorias forem implementadas.*
