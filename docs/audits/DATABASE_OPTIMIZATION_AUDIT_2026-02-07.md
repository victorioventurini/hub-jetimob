# Auditoria de Otimização do Banco de Dados

**Data:** 2026-02-07  
**Versão TCR:** 2.94.0  
**Status:** ✅ Fase 1 Executada (Índices bu_id criados)

---

## 📊 Resumo Executivo

| Categoria | Achados | Prioridade | Status |
|-----------|---------|------------|--------|
| Tabelas Gigantescas | 3 tabelas > 1MB | P1 | 🔴 Requer limpeza |
| Índices Não Utilizados | 20 índices (2.7 MB) | P2 | 🟡 Avaliar remoção |
| Índices Faltando bu_id | 4 tabelas | P1 | 🔴 Impacto RLS |
| Colunas TEXT → ENUM | 3 colunas | P3 | 🟢 Baixo impacto |
| Colunas JSONB | 43 colunas | P4 | ⚪ Design intencional |

---

## 📈 Métricas Atuais do Banco

### Tamanho das Tabelas (Top 10)

| Tabela | Rows | Tamanho | Política de Retenção |
|--------|------|---------|---------------------|
| `perf_metrics_snapshots` | **28.729** | **92 MB** | 14 dias (cleanup existe) |
| `ai_agent_logs` | **19.951** | **9.4 MB** | 14 dias (cleanup existe) |
| `cron_execution_logs` | **10.080** | **3.6 MB** | 7 dias (cleanup existe) |
| `audit_logs` | 883 | 1.7 MB | 180 dias |
| `okr_audit_log` | 470 | 1.0 MB | N/A |
| `okr_wizard_sessions` | 8 | 512 KB | 30 dias |
| `asset_inventory` | 473 | 408 KB | N/A |
| `profiles` | 71 | 392 KB | N/A |
| `notification_outbox` | 82 | 320 KB | N/A |

### Análise de Datas dos Logs

| Tabela | Data Mais Antiga | Data Mais Recente | Dias de Dados |
|--------|------------------|-------------------|---------------|
| `perf_metrics_snapshots` | 2026-01-18 | 2026-02-07 | **20 dias** ⚠️ |
| `ai_agent_logs` | 2026-01-24 | 2026-02-06 | **13 dias** ✅ |
| `cron_execution_logs` | 2026-01-31 | 2026-02-07 | **7 dias** ✅ |

---

## ✅ FASE 1: Crítico (P1) — EXECUTADO

### 1.1 Executar Limpeza de Logs

**Problema:** `perf_metrics_snapshots` tem 20 dias de dados (deveria ter 14).

**Ação:** Executar `cleanup_old_logs()` via Cloud → Run SQL:

```sql
-- Executar limpeza (deve rodar no contexto read-write)
SELECT * FROM cleanup_old_logs(14, 14, 7, 30, 180);

-- Verificar tamanhos após limpeza
SELECT relname, n_live_tup, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables
WHERE relname IN ('perf_metrics_snapshots', 'ai_agent_logs', 'cron_execution_logs')
ORDER BY pg_total_relation_size(relid) DESC;
```

**Economia esperada:** ~25% do tamanho atual (aprox. 23 MB)

**Status:** ⏳ Pendente (requer execução via Cloud UI com permissão de escrita)

### 1.2 Criar Índices Faltantes em bu_id ✅ COMPLETO

**Problema:** 4 tabelas com `bu_id` sem índice (impacto em RLS performance).

| Tabela | Rows | Índice Criado | Tamanho |
|--------|------|---------------|---------|
| `okr_checkins` | Crítica | ✅ `idx_okr_checkins_bu_id` | 16 KB |
| `cycles` | Médio | ✅ `idx_cycles_bu_id` | 16 KB |
| `kpi_target_history` | Médio | ✅ `idx_kpi_target_history_bu_id` | 8 KB |
| `ai_agents` | Baixo | ✅ `idx_ai_agents_bu_id` (parcial) | 8 KB |

**Executado em:** 2026-02-07 via migration

```sql
-- Criar índices parciais para tabelas com soft delete
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_okr_checkins_bu_id 
  ON public.okr_checkins(bu_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cycles_bu_id 
  ON public.cycles(bu_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kpi_target_history_bu_id 
  ON public.kpi_target_history(bu_id);

-- ai_agents é pequena, índice opcional
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_agents_bu_id 
  ON public.ai_agents(bu_id) 
  WHERE bu_id IS NOT NULL;
```

---

## 🟡 FASE 2: Importante (P2)

### 2.1 Avaliar Remoção de Índices Não Utilizados

**Problema:** 20 índices com `idx_scan = 0` ocupando ~2.7 MB.

**Índices Candidatos à Remoção (Top 10 por tamanho):**

| Índice | Tamanho | Recomendação |
|--------|---------|--------------|
| `perf_metrics_snapshots_pkey` | 1160 KB | ⚠️ MANTER (PK) |
| `ai_agent_logs_pkey` | 808 KB | ⚠️ MANTER (PK) |
| `cron_execution_logs_pkey` | 584 KB | ⚠️ MANTER (PK) |
| `audit_logs_pkey` | 56 KB | ⚠️ MANTER (PK) |
| `okr_audit_log_pkey` | 40 KB | ⚠️ MANTER (PK) |
| `idx_partner_bu_assoc_supervisor_contacts` | 24 KB | 🔍 Verificar uso |
| `idx_partner_bu_assoc_supervisors` | 24 KB | 🔍 Verificar uso |
| `idx_asset_recommendations_teams` | 24 KB | 🔍 Verificar uso |
| `idx_asset_recommendations_job_titles` | 24 KB | 🔍 Verificar uso |
| `idx_kpi_metrics_category` | 16 KB | 🔍 Verificar uso |

**Nota:** PKs aparecem com `idx_scan = 0` porque queries usam seq scan em tabelas pequenas. **NÃO REMOVER PKs.**

**Ação:** Monitorar por 2 semanas antes de remover índices não-PK.

---

## 🟢 FASE 3: Backlog (P3)

### 3.1 Migração TEXT → ENUM

**Colunas candidatas:**

| Tabela | Coluna | Valores Distintos | Ação |
|--------|--------|-------------------|------|
| `asset_recommendations.status` | 1 (`active`) | ⏳ Adiar |
| `external_companies.document_type` | 1 | ⏳ Adiar |
| `external_companies.person_type` | 1 | ⏳ Adiar |

**Decisão:** ADIADO — poucos valores distintos e baixo volume. Revisitar quando houver mais dados.

### 3.2 Colunas JSONB (Análise)

**43 colunas JSONB identificadas.** Maioria são:
- ✅ Payloads de eventos (design intencional)
- ✅ Configs flexíveis (design intencional)
- ✅ Audit trails (old_values/new_values)

**Candidatas a normalização futura:**

| Tabela | Coluna | Uso | Decisão |
|--------|--------|-----|---------|
| `asset_inventory.photos` | Array de URLs | Considerar tabela separada |
| `asset_inventory.documents` | Array de docs | Considerar tabela separada |

**Status:** ⏳ Backlog — avaliar quando módulo Assets crescer.

---

## 📋 Checklist de Execução

### Fase 1 (Crítico) — Executar Agora
- [ ] Executar `cleanup_old_logs()` via Cloud SQL
- [ ] Criar índice `idx_okr_checkins_bu_id`
- [ ] Criar índice `idx_cycles_bu_id`
- [ ] Criar índice `idx_kpi_target_history_bu_id`

### Fase 2 (Importante) — Próximas 2 semanas
- [ ] Monitorar uso de índices suspeitos
- [ ] Remover índices confirmadamente não utilizados

### Fase 3 (Backlog) — Revisitar em 30 dias
- [ ] Migração TEXT → ENUM (se volume aumentar)
- [ ] Normalização de JSONB (se módulo crescer)

---

## 🔧 Comandos de Monitoramento

```sql
-- Verificar tamanho das tabelas de log
SELECT relname, n_live_tup, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables
WHERE relname LIKE '%log%' OR relname LIKE '%snapshot%'
ORDER BY pg_total_relation_size(relid) DESC;

-- Verificar índices não utilizados
SELECT schemaname, indexrelname, idx_scan, 
       pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- Verificar tabelas sem índice em bu_id
SELECT t.relname, 
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_attribute a ON a.attnum = ANY(i.indkey) AND a.attrelid = t.oid
    WHERE i.indrelid = t.oid AND a.attname = 'bu_id'
  ) THEN 'YES' ELSE 'NO' END as has_bu_id_index
FROM pg_class t
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE t.relkind = 'r' AND n.nspname = 'public'
  AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = t.oid AND a.attname = 'bu_id')
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_attribute a ON a.attnum = ANY(i.indkey) AND a.attrelid = t.oid
    WHERE i.indrelid = t.oid AND a.attname = 'bu_id'
  )
ORDER BY t.relname;
```

---

## 📝 Notas

1. **Função `cleanup_old_logs()` existe** e está configurada corretamente (v2.94.0 TCR)
2. **ENUMs já estão bem utilizados** — 70+ tipos ENUM no banco
3. **Índices de PKs** aparecem com scan=0 porque PostgreSQL usa seq scan em tabelas pequenas
4. **JSONB é intencional** para payloads flexíveis de automação/eventos

---

*Criado em: 2026-02-07*  
*Baseado em: TCR v2.94.0, DATABASE_OPTIMIZATION_AUDIT_2026-01-19*
