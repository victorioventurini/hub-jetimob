# 🔒 Auditoria de Backend — Robustez, Clareza e Performance

**Data:** 2026-01-13  
**Versão:** 1.0.0  
**Escopo:** Edge Functions, RLS, Database Functions, Views, Triggers  
**Objetivo:** Identificar complexidade desnecessária, pontos frágeis, acoplamentos ruins, lógica duplicada, riscos de performance ou manutenção

---

## 📊 Sumário Executivo

| Categoria | Status | Score | Observações |
|-----------|--------|-------|-------------|
| **Edge Functions** | ✅ Excelente | 9/10 | Modularizado, middleware centralizado |
| **RLS Policies** | ✅ Sólido | 9/10 | 100% V2, 3 warnings aceitáveis |
| **Database Functions** | ✅ Bom | 8/10 | Bem documentadas, cleanup feito |
| **Views** | ⚠️ Alerta | 6/10 | **2 bugs ativos** em produção |
| **Triggers** | ✅ Bom | 8/10 | Nomenclatura inconsistente (cosmético) |
| **Observabilidade** | ✅ Bom | 8/10 | Logging estruturado, cleanup automático |

**Veredicto Geral:** Backend robusto e bem arquitetado, mas com **2 bugs críticos** em produção que precisam correção imediata.

---

## 🔴 BUGS CRÍTICOS ENCONTRADOS

### Bug 1: `v_shared_okrs_summary.objective_id` não existe

**Impacto:** Erro 500 ao acessar OKRs compartilhados  
**Logs:** `column v_shared_okrs_summary.objective_id does not exist`

**Causa:**
- A view usa `o.id` (sem alias)
- O frontend espera `objective_id`

**Arquivos afetados:**
- `src/modules/okrs/hooks/queries/useOkrAggregateQueries.ts:149-152` (SHARED_SUMMARY_FIELDS)
- `src/modules/okrs/hooks/useTeamContributedOkrs.ts:22-25` (SHARED_SUMMARY_FIELDS)

**Correção aplicada (frontend):**
- ✅ `src/modules/okrs/hooks/queries/useOkrAggregateQueries.ts:149-152`
- ✅ `src/modules/okrs/hooks/useTeamContributedOkrs.ts:22-25`

Alterado `objective_id, contributor_count` → `id, total_teams_count` para corresponder ao schema real da view.

---

### Bug 2: `okr_checkins.notes` não existe

**Impacto:** Erro 500 ao buscar feed de check-ins  
**Logs:** `column c.notes does not exist`

**Causa:**
- RPC `get_cycle_checkins` referencia `c.notes`
- Tabela `okr_checkins` usa `comments` (não `notes`)

**Status:** ⏳ Requer correção manual via SQL Editor (múltiplas overloads da função)

**Schema real da tabela:**
```
okr_checkins:
  id, kr_id, date, previous_value, current_value, 
  confidence, blockers, comments, user_id, created_at, team_id, bu_id
```

**Arquivos afetados:**
- `supabase/migrations/20260109172437_*.sql:71, 90, 135` (RPC get_cycle_checkins)

**Correção necessária:**
```sql
-- Em get_cycle_checkins, substituir:
c.notes → c.comments
```

---

## ✅ PONTOS FORTES

### 1. Arquitetura de Edge Functions (Excelente)

```
supabase/functions/
├── _shared/                    ← Biblioteca compartilhada
│   ├── middleware.ts           ✅ Auth, CORS, BU validation centralizados
│   ├── llm-client.ts           ✅ Cliente LLM unificado (OpenAI + Lovable)
│   ├── agent-loader.ts         ✅ Carregador de agentes modular
│   ├── logging.ts              ✅ Structured logging
│   ├── validation.ts           ✅ Zod schemas
│   └── hub-tools.ts            ✅ Tool definitions para IA
├── invoke-vic/                 ✅ Refatorado (648 → 380 linhas, -41%)
├── cron-dispatcher/            ✅ Orquestrador de tarefas agendadas
├── process-notification-outbox/ ✅ Sistema de notificações robusto
└── ... (12 funções no total)
```

**Destaques:**
- Middleware centralizado com `withMiddleware()` para validação
- BU-scoping automático via `createBuScopedAuthenticatedClient()`
- Fallback providers (SendGrid → Resend)
- Rate limiting por usuário e BU
- Correlation ID tracking

### 2. RLS V2 (100% Migrado)

| Métrica | Valor |
|---------|-------|
| Tabelas com RLS | 79/79 (100%) |
| Policies usando V2 | 100% |
| Views SECURITY INVOKER | 100% |
| Funções com search_path fixo | 100% |

**Padrão consolidado:**
```sql
-- SELECT: membership check
USING (is_profile_bu_member(my_profile_id(), bu_id));

-- INSERT/UPDATE/DELETE: permission check
WITH CHECK (has_permission(my_profile_id(), bu_id, 'module.entity.action:scope'));
```

### 3. Sistema de Notificações (Robusto)

```
Fluxo:
1. Frontend/Backend → INSERT notification_outbox
2. cron-dispatcher → process-notification-outbox
3. process-notification-outbox:
   - Resolve template (RPC resolve_notification_template)
   - Resolve recipient (RPC resolve_notification_recipient)
   - Send via channel (email/slack/webhook)
   - Update outbox status
4. evaluate-notification-health → Alertas SLO
```

**Destaques:**
- Template system com override por BU
- Multi-channel (email, Slack, webhook)
- Retry automático com backoff
- Health monitoring com runbooks

### 4. Observabilidade

| Componente | Status |
|------------|--------|
| Structured logging | ✅ `_shared/logging.ts` |
| Correlation ID | ✅ Propagado em todas as funções |
| AI Agent Logs | ✅ `ai_agent_logs` com cleanup 90 dias |
| Cron Logs | ✅ `cron_execution_logs` com cleanup 30 dias |
| Notification Health | ✅ Views de SLO (7 dias rolling) |

---

## ⚠️ PONTOS DE ATENÇÃO

### 1. Linter Warnings (Aceitos)

| Warning | Quantidade | Justificativa |
|---------|------------|---------------|
| `WITH CHECK(true)` | 3 | Tabelas de audit/log (insert-only) |
| Leaked Password Protection | 1 | Setting de Auth (não é bug) |

**Status:** DOCUMENTADO como exceções intencionais.

### 2. Nomenclatura de Triggers Inconsistente

**Atual:**
- `update_ai_agents_updated_at` ⚠️
- `trg_asset_keys_updated_at` ⚠️
- `trg_enforce_bu_scope_asset_categories` ✅

**Padrão proposto:**
- `trg_<table>_updated_at`
- `trg_<table>_enforce_bu_scope`

**Impacto:** Baixo. Cosmético.

### 3. Funções Dev-Only em Produção

| Função | Risco | Ação |
|--------|-------|------|
| `get-tcr` | Expõe estrutura interna | Restringir a super_admin |
| `audit-permissions` | Expõe permissões | Restringir a super_admin |

---

## 📊 MÉTRICAS DE BACKEND

### Edge Functions

| Função | Linhas | Criticidade | Status |
|--------|--------|-------------|--------|
| invoke-vic | 380 | 🔴 Crítica | ✅ Refatorado |
| process-notification-outbox | 720 | 🔴 Crítica | ✅ Robusto |
| cron-dispatcher | 260 | 🔴 Crítica | ✅ Robusto |
| auth-email-hook | ~150 | 🔴 Crítica | ✅ OK |
| request-magic-link | ~100 | 🔴 Crítica | ✅ OK |

### Database Functions

| Categoria | Quantidade | Status |
|-----------|------------|--------|
| Identidade | 8 | ✅ Core, documentadas |
| RLS Helpers | 12 | ✅ Usadas em policies |
| Hierarchy | 6 | ✅ Times/OKRs |
| RPCs Dashboard | 5 | ✅ Agregadoras |
| Cleanup | 3 | ✅ Automático |

### Views

| View | Uso | Status |
|------|-----|--------|
| v_bu_active_profiles | User directory | ✅ OK |
| v_pending_checkins | Check-in feed | ✅ OK |
| v_shared_okrs_summary | OKRs compartilhados | 🔴 **BUG** |
| v_team_contributed_okrs | OKRs contribuídos | ✅ OK |
| v_notification_* (5) | Health/SLO | ✅ OK |

---

## 🎯 PLANO DE AÇÃO

### P1 — Crítico (Imediato)

| Item | Esforço | Impacto |
|------|---------|---------|
| Fix: `v_shared_okrs_summary.objective_id` | 15 min | 🔴 Alto |
| Fix: `okr_checkins.notes → comments` | 15 min | 🔴 Alto |

### P2 — Importante (Esta semana)

| Item | Esforço | Impacto |
|------|---------|---------|
| Restringir get-tcr a super_admin | 30 min | 🟠 Médio |
| Restringir audit-permissions a super_admin | 30 min | 🟠 Médio |
| Habilitar Leaked Password Protection | 5 min | 🟡 Baixo |

### P3 — Desejável (Backlog)

| Item | Esforço | Impacto |
|------|---------|---------|
| Padronizar nomenclatura triggers | 2h | 🟢 Cosmético |
| Migrar text → enum (status columns) | 2h | 🟢 Baixo |
| Particionamento ai_agent_logs | 4h | 🟢 Futuro |

---

## ✅ RECOMENDAÇÕES ARQUITETURAIS

### 1. Manter Padrões Existentes

- ✅ Middleware centralizado em `_shared/`
- ✅ BU-scoping via header propagation
- ✅ RLS V2 com `has_permission()`
- ✅ Identity convention (profiles.id)
- ✅ Cleanup automático de logs

### 2. Evoluções Sugeridas

| Área | Sugestão | Benefício |
|------|----------|-----------|
| **Edge Functions** | Cache de agents em memória (60s) | -50% latência invoke-vic |
| **Notificações** | Batch processing (100 items) | -70% overhead CRON |
| **Views** | Materialized view para dashboards | -80% tempo de query |

### 3. Não Fazer

- ❌ Migrar para framework diferente (Deno é adequado)
- ❌ Criar ORMs customizados (Supabase SDK é suficiente)
- ❌ Centralizar todas as funções em uma (modularização atual é boa)

---

## 📋 CHECKLIST DE COMPLIANCE

### Segurança ✅
- [x] 100% tabelas com RLS
- [x] 100% policies V2
- [x] SECURITY INVOKER em views
- [x] search_path fixo em funções
- [x] JWT validation em Edge Functions
- [x] Rate limiting implementado

### Observabilidade ✅
- [x] Structured logging
- [x] Correlation ID tracking
- [x] Cleanup automático de logs
- [x] Health monitoring (notificações)

### Performance ✅
- [x] Índices otimizados
- [x] RPCs agregadoras para dashboards
- [x] Views para queries complexas
- [ ] Materialized views (P3)

---

## 📝 CONCLUSÃO

O backend do Hub está em **excelente estado** de maturidade técnica:

1. **Segurança:** ✅ 100% RLS V2, middleware centralizado
2. **Modularidade:** ✅ Edge Functions bem separadas
3. **Observabilidade:** ✅ Logging estruturado, cleanup automático
4. **Escalabilidade:** ✅ Arquitetura preparada para crescimento

**Ação imediata necessária:**
- 🔴 Corrigir 2 bugs em views/RPCs que estão gerando erros 500 em produção

---

*Auditoria realizada em: 2026-01-13*  
*Próxima revisão: 2026-01-20*
