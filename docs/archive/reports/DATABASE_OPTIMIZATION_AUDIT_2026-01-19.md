# Auditoria de Otimização do Banco de Dados

**Data:** 2026-01-19  
**Status:** ✅ Fases 1-3 Concluídas

---

## 📊 Resumo Executivo

| Categoria | Status | Resultado |
|-----------|--------|-----------|
| Tabelas Gigantescas | ✅ DONE | Política de retenção implementada |
| Índices Não Utilizados | ✅ DONE | 15 índices removidos (~700 KB) |
| Soft Delete sem Índice | ✅ DONE | 5 índices parciais criados |
| Campos Mal Tipados | 📋 BACKLOG | 8 colunas TEXT (baixa prioridade) |

---

## ✅ FASE 1: Políticas de Retenção (CONCLUÍDA)

### Função Criada: `cleanup_old_logs()`

Limpa automaticamente logs antigos:
- `ai_agent_logs`: mantém 30 dias
- `perf_metrics_snapshots`: mantém 14 dias  
- `cron_execution_logs`: mantém 7 dias

### Resultado da Limpeza Inicial

| Tabela | Rows Deletados |
|--------|----------------|
| `ai_agent_logs` | 0 (todos recentes) |
| `perf_metrics_snapshots` | 0 (todos recentes) |
| `cron_execution_logs` | **3.927** ✅ |

### Uso
```sql
-- Executar limpeza manualmente
SELECT * FROM cleanup_old_logs();

-- Agendar via pg_cron (opcional)
SELECT cron.schedule('cleanup-logs', '0 3 * * *', 'SELECT cleanup_old_logs();');
```

---

## ✅ FASE 2: Remoção de Índices Não Utilizados (CONCLUÍDA)

### Índices Removidos (15 total)

| Índice | Tabela | Size |
|--------|--------|------|
| `idx_cron_execution_logs_status_ran` | cron_execution_logs | 448 KB |
| `idx_audit_logs_entity` | audit_logs | 32 KB |
| `job_titles_bu_ids_gin` | job_titles | 24 KB |
| `idx_okr_objective_contributors_team` | okr_team_objective_contributors | 16 KB |
| `idx_asset_movements_asset_occurred` | asset_movements | 16 KB |
| `idx_okr_audit_log_entity` | okr_audit_log | 16 KB |
| `idx_asset_keyrings_claviculary` | asset_keyrings | 16 KB |
| `idx_squad_teams_team_id` | squad_teams | 16 KB |
| `idx_okr_checkins_team_id` | okr_checkins | 16 KB |
| `idx_asset_inventory_loaned_user` | asset_inventory | 16 KB |
| `idx_okr_checkins_kr` | okr_checkins | 16 KB |
| `idx_audit_logs_user_id` | audit_logs | 16 KB |
| `idx_ai_agent_documents_agent` | ai_agent_documents | 16 KB |
| `idx_okr_checkins_date` | okr_checkins | 16 KB |
| `idx_asset_movements_bu_date` | asset_movements | 16 KB |

**Economia total: ~700 KB**

---

## ✅ FASE 3: Índices Parciais para Soft Delete (CONCLUÍDA)

### Índices Criados

| Índice | Tabela | Condição |
|--------|--------|----------|
| `idx_squad_memberships_active` | squad_memberships | `WHERE deleted_at IS NULL` |
| `idx_squads_active_bu` | squads | `WHERE deleted_at IS NULL` |
| `idx_ticket_categories_active` | ticket_categories | `WHERE deleted_at IS NULL` |
| `idx_okr_coaching_events_active` | okr_coaching_events | `WHERE deleted_at IS NULL` |
| `idx_notification_outbox_pending` | notification_outbox | `WHERE status = 'pending'` |

---

## 📋 BACKLOG: Migração TEXT → ENUM

### Colunas Candidatas (Baixa Prioridade)

| Tabela | Coluna | Rows | Impacto |
|--------|--------|------|---------|
| `ai_agent_logs` | `status` | 82K | Médio |
| `profiles` | `user_type` | 65 | Baixo |
| `profiles` | `global_status` | 65 | Baixo |
| `audit_logs` | `entity_type` | 835 | Baixo |
| `areas` | `status` | 3 | Baixo |

**Decisão:** Manter como TEXT por ora. Migração para ENUM traz risco de breaking changes e benefício marginal para tabelas pequenas.

---

## 📈 Métricas de Sucesso

| Métrica | Antes | Depois |
|---------|-------|--------|
| Rows em `cron_execution_logs` | 14.001 | 10.074 |
| Índices não utilizados | 20+ | 5 (mantidos por constraints) |
| Tabelas soft delete sem índice | 5 | 0 |
| Função de limpeza | ❌ | ✅ `cleanup_old_logs()` |

---

## 🔧 Comandos de Monitoramento

```sql
-- Executar limpeza de logs
SELECT * FROM cleanup_old_logs();

-- Verificar tamanho das tabelas de log
SELECT relname, n_live_tup, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables
WHERE relname LIKE '%log%' OR relname LIKE '%snapshot%'
ORDER BY pg_total_relation_size(relid) DESC;

-- Verificar índices não utilizados restantes
SELECT indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## 📝 Notas

1. Os warnings de segurança (RLS `USING(true)`) são **pré-existentes** e aplicáveis a tabelas de catálogo público por design
2. A função `cleanup_old_logs()` deve ser executada periodicamente (recomendado: diariamente via cron)
3. Índices mantidos: constraints unique e índices usados por RLS
