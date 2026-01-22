# Plano de Higienização e Otimização — Hub da Jet

**Data:** 2026-01-22  
**Versão TCR:** v2.64.0  
**Status:** ✅ Health Score 10/10

---

## 📋 Sumário Executivo

O Hub da Jet atingiu score máximo (10/10) após completar todas as ações P1/P2 identificadas na auditoria de 2026-01-22. Este documento consolida as ações executadas e o plano P3 (backlog).

---

## 1. BANCO DE DADOS

### 1.1 Higienização — Retenção de Logs ✅

| Tabela | Retenção | Função | Cron |
|--------|----------|--------|------|
| `ai_agent_logs` | 14 dias | `cleanup_old_logs()` | Domingo 03:00 UTC |
| `perf_metrics_snapshots` | 14 dias | `cleanup_old_logs()` | Domingo 03:00 UTC |
| `cron_execution_logs` | 7 dias | `cleanup_old_logs()` | Domingo 03:00 UTC |
| `okr_wizard_sessions` | 30 dias | `cleanup_old_logs()` | Domingo 03:00 UTC |
| `audit_logs` | 180 dias | `cleanup_old_logs()` | Domingo 03:00 UTC |

### 1.2 Índices de Performance ✅

| Índice | Tabela | Propósito |
|--------|--------|-----------|
| `idx_ai_agent_logs_agent_id` | `ai_agent_logs` | Busca por agente |
| `idx_ai_agent_documents_agent_id` | `ai_agent_documents` | Busca por agente |
| `idx_notification_deliveries_notification_id` | `notification_deliveries` | Busca por notificação |
| `idx_okr_audit_log_entity_id` | `okr_audit_log` | Busca por entidade |

### 1.3 Índices Parciais Soft-Delete (7 existentes) ✅

| Tabela | Índice |
|--------|--------|
| `partner_company_bu_associations` | `WHERE deleted_at IS NULL` |
| `squad_memberships` | `WHERE deleted_at IS NULL` |
| `squads` | `WHERE deleted_at IS NULL` |
| `ticket_categories` | `WHERE deleted_at IS NULL` |
| `ticket_messages` | `WHERE deleted_at IS NULL` |
| `ticket_routing_rules` | `WHERE deleted_at IS NULL` |
| `ticket_subcategories` | `WHERE deleted_at IS NULL` |

### 1.4 Backlog (P3)

| Item | Status | Prioridade |
|------|--------|------------|
| Consolidar `okr_audit_log` + `okr_notifications_log` | 🔲 Avaliar | Baixa |
| Migrar `tickets.priority` para enum | 🔲 Futuro | Baixa |
| Avaliar tabelas vazias de automação | 🔲 Futuro | Baixa |

---

## 2. BACKEND (Edge Functions)

### 2.1 Status Atual ✅

- **18 funções ativas** — 0 dead code
- **100% documentadas** com JSDoc headers
- **Error handler padronizado** via `_shared/response.ts`
- **Cleanup functions deprecated** — consolidadas em `cleanup_old_logs()`

### 2.2 Funções Deprecated (mantidas para compatibilidade)

| Função | Status | Substituto |
|--------|--------|------------|
| `cleanup_old_agent_logs()` | DEPRECATED | `cleanup_old_logs()` |
| `cleanup_old_cron_logs()` | DEPRECATED | `cleanup_old_logs()` |
| `cleanup_old_perf_snapshots()` | DEPRECATED | `cleanup_old_logs()` |

---

## 3. FRONTEND

### 3.1 Higienização — Código Removido ✅

| Item | Arquivo | Status |
|------|---------|--------|
| `useDebounce` alias | `src/hooks/useDebounce.ts:57` | ✅ REMOVIDO |
| `LegacyAssetRedirect.tsx` | - | ✅ Removido (v2.29.0) |
| `TicketMentionInput.tsx` | - | ✅ Removido (v2.29.0) |

### 3.2 Migrações Concluídas ✅

| Arquivo | De | Para |
|---------|----|----|
| `useInitiativeNameValidation.ts` | `useDebounce` | `useDebouncedValue` |
| `TeamOkrKrDetailStep.tsx` | `useDebounce` | `useDebouncedValue` |

### 3.3 Hooks Consolidados ✅

| Arquivo | Exports |
|---------|---------|
| `src/hooks/useDebounce.ts` | `useDebouncedValue`, `useDebouncedCallback`, `useDebouncedCallbackAdvanced` |

### 3.4 Query Keys Centralizadas ✅

| Módulo | Arquivo |
|--------|---------|
| OKRs | `src/lib/queryKeys/okrs.ts` |
| KPIs | `src/lib/queryKeys/kpis.ts` |
| Assets | `src/lib/queryKeys/assets.ts` |
| Tickets | `src/lib/queryKeys/tickets.ts` |
| Notifications | `src/lib/queryKeys/notifications.ts` |

---

## 4. CENTRALIZAÇÃO

### 4.1 Banco de Dados ✅

| Área | Centralização |
|------|---------------|
| Autorização | `is_platform_admin()`, `is_bu_admin()`, `user_has_bu_access()` |
| Identity | `my_profile_id()`, `profile_id_from_user_id()` |
| Hierarquia Times | `is_team_leader()`, `user_can_manage_team()`, `get_manageable_teams()` |
| Views Canônicas | `v_bu_active_profiles`, `v_all_participants` |

### 4.2 Backend ✅

| Área | Arquivo |
|------|---------|
| Respostas | `supabase/functions/_shared/response.ts` |
| CORS | `supabase/functions/_shared/cors.ts` |
| TCR | `supabase/functions/_shared/tcr-content.ts` |

### 4.3 Frontend ✅

| Área | Hook/Componente |
|------|-----------------|
| Identidade | `useIdentity()` |
| Permissões | `usePermissions()` |
| Diretório | `useBuUsersDirectory()` |
| Cliente BU | `useBuScopedSupabase()` |
| Selects | `BuUserSelect`, `BuUserMultiSelect` |

---

## 5. PERFORMANCE

### 5.1 Banco de Dados ✅

| Estratégia | Status |
|------------|--------|
| Índices parciais soft-delete | ✅ 7 tabelas |
| Índices de busca em logs | ✅ 4 novos |
| pg_cron cleanup semanal | ✅ Ativo |
| RPC para agregações | ✅ Implementado |

### 5.2 Frontend ✅

| Estratégia | Status |
|------------|--------|
| `staleTime` em queries | ✅ 2-10 min |
| Batch lookups profiles | ✅ Implementado |
| URL state filtros | ✅ Migrado |
| Debounce em buscas | ✅ 250-800ms |

---

## 6. SEGURANÇA

### 6.1 RLS Policies ✅

- **100% V2** — todas tabelas operacionais migradas
- **`USING (true)`** apenas em logs pre-auth (intencional)
- **Identity convention** enforced (profile_id vs user_id)

### 6.2 Warnings Conhecidos (Intencionais)

| Warning | Tabela | Justificativa |
|---------|--------|---------------|
| RLS `USING (true)` | `app_error_logs` | Log pre-auth |
| RLS `USING (true)` | `audit_logs` | Log de auditoria |
| Leaked Password | - | Sistema usa OTP, não senhas |

---

## 7. MÉTRICAS FINAIS

| Métrica | Valor | Target | Status |
|---------|-------|--------|--------|
| Health Score | 10/10 | 10/10 | ✅ |
| RLS Coverage | 100% | 100% | ✅ |
| Identity Convention | 100% | 100% | ✅ |
| Query Keys Centralizadas | 100% | 100% | ✅ |
| Edge Functions Documentadas | 100% | 100% | ✅ |
| Índices Soft-Delete | 7 | 7 | ✅ |
| Cleanup Jobs | 1 | 1 | ✅ |

---

## 8. PRÓXIMOS PASSOS (P3)

| # | Item | Prioridade | Quando |
|---|------|------------|--------|
| 1 | Consolidar logs OKR | Baixa | Quando refatorar OKRs |
| 2 | Migrar `tickets.priority` para enum | Baixa | Próximo ciclo |
| 3 | Completar TODOs em hooks OKR | Baixa | Quando necessário |

---

*Documento gerado em 2026-01-22 — TCR v2.64.0*
