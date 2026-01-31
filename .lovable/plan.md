# Plano de Otimização de Banco de Dados — Hub da Jet

**Versão:** 1.0  
**Data:** 2026-01-31  
**Base TCR:** v2.74.0  
**Status:** ✅ Análise Completa | Ações Identificadas

---

## 📊 Diagnóstico Executivo

### Tabelas por Volume (Top 10)

| Tabela | Rows | Tamanho Total | Índices |
|--------|------|---------------|---------|
| `perf_metrics_snapshots` | 22.338 | 71 MB | 1.9 MB |
| `ai_agent_logs` | 384 | 33 MB | 16 MB |
| `cron_execution_logs` | 10.080 | 3.6 MB | 1.9 MB |
| `audit_logs` | 870 | 1.7 MB | 96 KB |
| `okr_audit_log` | 368 | 816 KB | 56 KB |
| `okr_wizard_sessions` | - | 512 KB | 152 KB |
| `asset_inventory` | 471 | 416 KB | 232 KB |
| `profiles` | 71 | 392 KB | 304 KB |
| `bu_user_permission_templates_v2` | 677 | 280 KB | 184 KB |
| `notification_outbox` | 38 | 272 KB | 208 KB |

### Conformidade com TCR

| Área | Status | Notas |
|------|--------|-------|
| RLS 100% | ✅ | Todas tabelas operacionais |
| Soft-Delete Indexes | ✅ | 40/40 tabelas com índice parcial |
| Cleanup Jobs | ✅ | `cleanup_old_logs()` ativo (domingo 03:00 UTC) |
| Identity Convention | ✅ | profile_id vs user_id correto |

---

## 🔍 PROBLEMAS IDENTIFICADOS

### 1. TABELAS GIGANTESCAS ⚠️

**`perf_metrics_snapshots` — 71 MB (22K rows)**
- **Problema:** Tabela de métricas P4 sem particionamento
- **Impacto:** Crescimento linear, lentidão em agregações
- **Recomendação:** Já tem retenção de 14 dias via `cleanup_old_logs()` — **MONITORAR**

**`ai_agent_logs` — 33 MB (apenas 384 rows visíveis)**
- **Problema:** Tamanho desproporcional — possível bloat ou índices excessivos
- **Impacto:** 16 MB em índices (50% do tamanho total)
- **Ação P2:** Auditar índices e executar `VACUUM FULL`

### 2. COLUNAS TEXT MAL TIPADAS ⚠️

| Tabela | Coluna | Valores Possíveis | Ação |
|--------|--------|-------------------|------|
| `ai_agent_logs` | `status` | `success`, `error`, `pending` | Migrar para ENUM |
| `automation_logs` | `status` | Já tem enum `automation_log_status` | **OK** |
| `automation_logs` | `type` | Já tem enum `automation_log_type` | **OK** |
| `areas` | `status` | `active`, `inactive` | Migrar para `team_status` ou criar enum |
| `hub_integrations_catalog` | `status` | `active`, `inactive` | Migrar para `catalog_status` |
| `notification_channels` | `status` | `active`, `inactive` | Migrar para `catalog_status` |
| `okr_notifications_log` | `status` | `sent`, `failed`, `pending` | Migrar para enum |
| `okr_notifications_log` | `type` | Diversos tipos | Migrar para `notification_type` |
| `permission_migrations` | `status` | `not_started`, `in_progress`, `completed`, `failed` | Migrar para `migration_status` |
| `ticket_categories` | `status` | `active`, `inactive` | Migrar para `catalog_status` |
| `ticket_subcategories` | `status` | `active`, `inactive` | Migrar para `catalog_status` |

**Análise:** 9 colunas TEXT que deveriam ser ENUM — impacto baixo mas melhora integridade.

### 3. ÍNDICES NÃO UTILIZADOS (idx_scan = 0) ⚠️

| Tabela | Índice | Ação |
|--------|--------|------|
| `okr_audit_log` | `okr_audit_log_pkey` | Manter (PK obrigatória) |
| `okr_org_objectives` | `idx_okr_org_objectives_status` | Avaliar remoção |
| `job_titles` | `idx_job_titles_active` | Manter (parcial, baixo custo) |
| `external_companies` | `idx_partner_companies_document_unique` | Manter (constraint) |
| `perf_metrics_snapshots` | `perf_metrics_snapshots_pkey` | Manter (PK obrigatória) |
| `okr_audit_log` | `idx_okr_audit_log_entity_id` | Avaliar remoção (P4) |
| `bu_user_memberships` | `idx_bu_user_memberships_bu` | Avaliar uso |

**Nota:** Maioria são PKs ou constraints — apenas 2-3 candidatos a remoção.

### 4. TABELAS SEM `updated_at` ⚠️

| Tabela | Tipo | Ação |
|--------|------|------|
| `ai_agent_logs` | Log imutável | **Esperado** — logs não são atualizados |
| `app_error_logs` | Log imutável | **Esperado** |
| `asset_gift_movements` | Log imutável | **Esperado** |
| `asset_key_movements` | Log imutável | **Esperado** |
| `asset_movements` | Log imutável | **Esperado** |
| `audit_logs` | Log imutável | **Esperado** |
| `automation_logs` | Log imutável | **Esperado** |
| `cron_execution_logs` | Log imutável | **Esperado** |
| `kpi_values` | Log imutável | **Esperado** |
| `notifications` | Atualiza `is_read` | ⚠️ Candidato a adicionar |
| `okr_audit_log` | Log imutável | **Esperado** |
| `okr_checkins` | Pode ser editado | ⚠️ Candidato a adicionar |

**Análise:** A maioria são tabelas de log (imutáveis por design). Apenas `notifications` e `okr_checkins` são candidatos.

### 5. CONFORMIDADE SOFT-DELETE ✅

**Resultado:** 40/40 tabelas com `deleted_at` já possuem índice parcial `WHERE deleted_at IS NULL`.

---

## 📋 PLANO DE AÇÃO PRIORIZADO

### P1 — Crítico (Executar Agora)

| # | Ação | Impacto | Esforço | Status |
|---|------|---------|---------|--------|
| — | **NENHUMA AÇÃO P1** | — | — | ✅ |

**O sistema está em excelente estado.** Todas as otimizações críticas já foram implementadas em waves anteriores.

### P2 — Importante (Próximo Sprint)

| # | Ação | Impacto | Esforço |
|---|------|---------|---------|
| 1 | Auditar índices de `ai_agent_logs` | Médio | 1h |
| 2 | Executar `VACUUM FULL` em tabelas de log | Médio | 30min |
| 3 | Migrar `areas.status` para `team_status` enum | Baixo | 30min |

### P3 — Backlog (Quando Refatorar Módulo)

| # | Ação | Impacto | Esforço |
|---|------|---------|---------|
| 1 | Migrar 9 colunas TEXT → ENUM | Baixo | 2h |
| 2 | Adicionar `updated_at` em `notifications` | Baixo | 30min |
| 3 | Adicionar `updated_at` em `okr_checkins` | Baixo | 30min |
| 4 | Avaliar remoção de `idx_okr_org_objectives_status` | Baixo | 15min |
| 5 | Avaliar remoção de `idx_bu_user_memberships_bu` | Baixo | 15min |

---

## 📈 MÉTRICAS DE SAÚDE

| Indicador | Valor | Target | Status |
|-----------|-------|--------|--------|
| Health Score | 10/10 | 10/10 | ✅ |
| RLS Coverage | 100% | 100% | ✅ |
| Soft-Delete Indexes | 40/40 | 100% | ✅ |
| Cleanup Jobs Ativos | 1 | 1 | ✅ |
| Colunas TEXT que deveriam ser ENUM | 9 | 0 | ⚠️ P3 |
| Índices não utilizados | 7 | 0 | ⚠️ P3 |
| Tabelas sem updated_at (não-logs) | 2 | 0 | ⚠️ P3 |

---

## 🎯 CONCLUSÃO

O banco de dados do Hub da Jet está **em excelente estado** após as otimizações das waves anteriores:

✅ **Pontos Fortes:**
- 100% RLS coverage
- Cleanup jobs ativos (retenção de logs)
- Índices parciais em todas tabelas com soft-delete
- Identity convention correta
- Nenhuma tabela sem índices críticos

⚠️ **Melhorias Opcionais (P3):**
- 9 colunas TEXT → ENUM (baixa prioridade)
- 2 tabelas poderiam ter `updated_at`
- 2-3 índices não utilizados podem ser removidos

**Recomendação:** Nenhuma ação urgente necessária. Itens P3 podem ser executados quando houver refatoração nos módulos relacionados.

---

*Documento gerado em 2026-01-31 — TCR v2.74.0*
