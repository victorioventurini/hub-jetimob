# Auditoria de Otimização do Banco de Dados

**Data:** 2026-01-19  
**Status:** 📋 Plano de Ação Definido

---

## 📊 Resumo Executivo

| Categoria | Status | Itens Críticos |
|-----------|--------|----------------|
| Tabelas Gigantescas | ⚠️ | 3 tabelas de log acima de 5K rows |
| Campos Mal Tipados | 🔴 | 8 colunas status/type usando TEXT |
| Índices Não Utilizados | ⚠️ | 20 índices com zero scans |
| Soft Delete sem Índice | 🔴 | 5 tabelas sem índice em deleted_at |
| Dados Não Normalizados | ✅ | JSONB bem aplicado (logs/config) |
| Colunas TEXT Ilimitadas | ⚠️ | ~200+ colunas sem limite |

---

## 🔴 CRÍTICO: Tabelas de Log em Crescimento

### Status Atual

| Tabela | Rows | Size | Crescimento Estimado |
|--------|------|------|---------------------|
| `ai_agent_logs` | 82,521 | 32 MB | ~2.5K/dia |
| `perf_metrics_snapshots` | 5,603 | 17 MB | ~200/dia |
| `cron_execution_logs` | 14,001 | 3.5 MB | ~500/dia |
| `audit_logs` | 835 | 1.7 MB | Baixo |
| `okr_audit_log` | 242 | 536 KB | Baixo |

### Plano de Ação

#### Ação 1: Política de Retenção para `ai_agent_logs` [CRÍTICO]
```sql
-- Criar job de limpeza: manter apenas últimos 30 dias
DELETE FROM ai_agent_logs 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Adicionar índice parcial para consultas recentes
CREATE INDEX CONCURRENTLY idx_ai_agent_logs_recent 
ON ai_agent_logs(created_at DESC) 
WHERE created_at > NOW() - INTERVAL '7 days';
```

#### Ação 2: Política de Retenção para `perf_metrics_snapshots` [CRÍTICO]
```sql
-- Manter apenas últimas 2 semanas (métricas são diárias)
DELETE FROM perf_metrics_snapshots 
WHERE collected_at < NOW() - INTERVAL '14 days';
```

#### Ação 3: Política de Retenção para `cron_execution_logs`
```sql
-- Manter apenas últimos 7 dias
DELETE FROM cron_execution_logs 
WHERE ran_at < NOW() - INTERVAL '7 days';
```

---

## 🔴 CRÍTICO: Colunas status/type Usando TEXT

### Problema
Colunas de status/type usando TEXT desperdiçam espaço e não garantem integridade.

| Tabela | Coluna | Rows | Recomendação |
|--------|--------|------|--------------|
| `ai_agent_logs` | `status` | 82,521 | Criar ENUM |
| `audit_logs` | `entity_type` | 835 | Criar ENUM |
| `profiles` | `user_type` | 65 | Criar ENUM |
| `profiles` | `global_status` | 65 | Criar ENUM |
| `ticket_subcategories` | `status` | 44 | Usar ENUM existente |
| `areas` | `status` | 3 | Criar ENUM |
| `ticket_categories` | `status` | 4 | Usar ENUM existente |
| `okr_team_objectives` | `health_status` | 15 | Usar ENUM existente |

### Plano de Ação

#### Ação 4: Migrar `ai_agent_logs.status` para ENUM
```sql
-- Verificar valores únicos primeiro
SELECT DISTINCT status FROM ai_agent_logs;

-- Se valores são: 'success', 'error', 'pending'
CREATE TYPE ai_log_status AS ENUM ('success', 'error', 'pending', 'timeout');

ALTER TABLE ai_agent_logs 
  ALTER COLUMN status TYPE ai_log_status 
  USING status::ai_log_status;
```

#### Ação 5: Migrar `profiles.user_type` e `global_status`
```sql
-- Já existe app_role enum - verificar se aplicável
-- user_type: provavelmente ['internal', 'external']
CREATE TYPE profile_user_type AS ENUM ('internal', 'external');

ALTER TABLE profiles 
  ALTER COLUMN user_type TYPE profile_user_type 
  USING user_type::profile_user_type;
```

#### Ação 6: Padronizar `status` em tabelas auxiliares
```sql
-- Usar catalog_status existente para: areas, ticket_categories, ticket_subcategories
ALTER TABLE areas 
  ALTER COLUMN status TYPE catalog_status 
  USING status::catalog_status;
```

---

## ⚠️ ATENÇÃO: Índices Nunca Utilizados

### Candidatos a Remoção (economia de espaço)

| Tabela | Índice | Size | Scans | Ação |
|--------|--------|------|-------|------|
| `cron_execution_logs` | `idx_cron_execution_logs_status_ran` | 448 KB | 0 | Remover |
| `audit_logs` | `idx_audit_logs_entity` | 32 KB | 0 | Remover |
| `audit_logs` | `idx_audit_logs_user_id` | 16 KB | 0 | Avaliar |
| `bu_units` | `idx_bu_units_domains` | 24 KB | 0 | Remover |
| `job_titles` | `job_titles_bu_ids_gin` | 24 KB | 0 | Remover |
| `okr_org_objectives` | `idx_okr_org_objectives_status` | 16 KB | 0 | Avaliar |
| `okr_checkins` | `idx_okr_checkins_date` | 16 KB | 0 | Avaliar |
| `okr_checkins` | `idx_okr_checkins_kr` | 16 KB | 0 | Avaliar |
| `bu_user_memberships` | `idx_bu_user_memberships_bu` | 16 KB | 0 | Remover |
| `okr_audit_log` | `idx_okr_audit_log_entity` | 16 KB | 0 | Remover |

### Plano de Ação

#### Ação 7: Remover índices não utilizados
```sql
-- Confirmar que não há queries usando estes índices
DROP INDEX CONCURRENTLY IF EXISTS idx_cron_execution_logs_status_ran;
DROP INDEX CONCURRENTLY IF EXISTS idx_audit_logs_entity;
DROP INDEX CONCURRENTLY IF EXISTS idx_bu_units_domains;
DROP INDEX CONCURRENTLY IF EXISTS job_titles_bu_ids_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_bu_user_memberships_bu;
DROP INDEX CONCURRENTLY IF EXISTS idx_okr_audit_log_entity;
```

---

## 🔴 CRÍTICO: Soft Delete sem Índice

### Tabelas Afetadas

| Tabela | Tem deleted_at | Tem Índice |
|--------|----------------|------------|
| `okr_coaching_events` | ✅ | ❌ |
| `squad_memberships` | ✅ | ❌ |
| `squads` | ✅ | ❌ |
| `ticket_categories` | ✅ | ❌ |

### Plano de Ação

#### Ação 8: Criar índices parciais para soft delete
```sql
-- Índice parcial: só indexa rows não deletadas (muito mais eficiente)
CREATE INDEX CONCURRENTLY idx_okr_coaching_events_active 
ON okr_coaching_events(id) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_squad_memberships_active 
ON squad_memberships(squad_id, user_id) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_squads_active 
ON squads(bu_id) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_ticket_categories_active 
ON ticket_categories(bu_id) 
WHERE deleted_at IS NULL;
```

---

## ⚠️ ATENÇÃO: Seq Scans Elevados

### Tabelas com Alto % de Sequential Scans

| Tabela | Rows | Seq Scans | Idx Scans | Seq % |
|--------|------|-----------|-----------|-------|
| `okr_audit_log` | 242 | 147 | 0 | 99.3% |
| `ticket_participants` | 1 | 1,081 | 15 | 98.5% |
| `profiles` | 65 | 8.1M | 385K | 95.5% |
| `bu_notification_event_settings` | 136 | 1,437 | 178 | 88.9% |
| `notification_outbox` | 13 | 85,431 | 12,883 | 86.9% |
| `bu_locations` | 19 | 132,143 | 18,679 | 87.6% |
| `audit_logs` | 835 | 13 | 3 | 76.5% |

### Análise

1. **`profiles`**: 8.1M seq scans é ESPERADO - tabela pequena (65 rows), full scan é mais rápido que index lookup
2. **`okr_audit_log`**: Sem índice útil, mas tabela pequena
3. **`bu_locations`**: 132K scans em 19 rows - OK, tabela muito pequena
4. **`notification_outbox`**: Precisa índice por status para processamento

### Plano de Ação

#### Ação 9: Índice para `notification_outbox` 
```sql
-- Índice para busca por status (processamento de fila)
CREATE INDEX CONCURRENTLY idx_notification_outbox_pending 
ON notification_outbox(created_at) 
WHERE status = 'pending';
```

---

## ✅ POSITIVO: Uso Adequado de JSONB

### Análise
O uso de JSONB está bem aplicado:

| Uso | Tabelas | Status |
|-----|---------|--------|
| Configurações dinâmicas | `config`, `config_encrypted` | ✅ Correto |
| Payloads de log | `metrics`, `payload`, `request_payload` | ✅ Correto |
| Audit snapshots | `old_values`, `new_values`, `before_state` | ✅ Correto |
| Rich content | `body_richtext` | ✅ Correto |

**Não há dados normalizáveis armazenados indevidamente em JSONB.**

---

## ⚠️ ATENÇÃO: Tabelas com Muitas Colunas

### Tabelas com >20 Colunas

| Tabela | Colunas | Análise |
|--------|---------|---------|
| `okr_team_objectives` | 28 | OK - entidade complexa |
| `asset_inventory` | 28 | OK - muitos atributos de ativo |
| `profiles` | 28 | OK - dados de usuário |
| `okr_team_key_results` | 26 | OK - entidade complexa |
| `bu_locations` | 25 | ⚠️ Avaliar separar address |
| `tickets` | 21 | OK - entidade de ticket |
| `okr_org_objectives` | 20 | OK - entidade complexa |
| `okr_org_key_results` | 19 | OK - entidade complexa |

### Recomendação
Nenhuma ação imediata necessária. Estrutura está adequada para o domínio.

---

## 📋 PLANO DE AÇÃO CONSOLIDADO

### Fase 1: Crítico (Executar Imediatamente)

| # | Ação | Impacto | Esforço |
|---|------|---------|---------|
| 1 | Política retenção `ai_agent_logs` (30 dias) | Alto | Baixo |
| 2 | Política retenção `perf_metrics_snapshots` (14 dias) | Alto | Baixo |
| 3 | Política retenção `cron_execution_logs` (7 dias) | Médio | Baixo |

### Fase 2: Importante (Próxima Sprint)

| # | Ação | Impacto | Esforço |
|---|------|---------|---------|
| 4 | Migrar `ai_agent_logs.status` para ENUM | Médio | Médio |
| 5 | Migrar `profiles.user_type` para ENUM | Baixo | Baixo |
| 6 | Padronizar status em tabelas auxiliares | Baixo | Baixo |
| 7 | Remover índices não utilizados | Baixo | Baixo |

### Fase 3: Melhoria (Backlog)

| # | Ação | Impacto | Esforço |
|---|------|---------|---------|
| 8 | Criar índices parciais para soft delete | Médio | Baixo |
| 9 | Índice `notification_outbox` por status | Baixo | Baixo |

---

## 📈 Métricas de Sucesso

| Métrica | Atual | Meta |
|---------|-------|------|
| Tamanho `ai_agent_logs` | 32 MB | < 5 MB |
| Tamanho `perf_metrics_snapshots` | 17 MB | < 3 MB |
| Índices não utilizados | 20 | 0 |
| Colunas TEXT para status | 8 | 0 |
| Tabelas soft delete sem índice | 5 | 0 |

---

## 🔧 Comandos de Monitoramento

```sql
-- Verificar tamanho das tabelas de log
SELECT relname, n_live_tup, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables
WHERE relname LIKE '%log%' OR relname LIKE '%snapshot%'
ORDER BY pg_total_relation_size(relid) DESC;

-- Verificar índices não utilizados
SELECT indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Verificar seq scans elevados
SELECT relname, seq_scan, idx_scan, 
       round((seq_scan::numeric / (seq_scan + idx_scan + 1)) * 100, 2) as seq_pct
FROM pg_stat_user_tables
WHERE seq_scan > 1000
ORDER BY seq_pct DESC;
```
