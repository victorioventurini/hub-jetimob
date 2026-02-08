# Auditoria de Otimização do Banco de Dados

**Data:** 2026-02-08  
**Versão TCR:** 3.1.0  
**Status:** ✅ Auditoria Completa | Sistema Saudável

---

## 📊 Resumo Executivo

| Categoria | Status | Prioridade | Ação |
|-----------|--------|------------|------|
| **Tabelas Grandes (Logs)** | 🟢 Gerenciado | - | `cleanup_old_logs()` ativo |
| **Índices bu_id** | ✅ Completo | - | Fase 1 executada (v2.94.0) |
| **Campos TEXT → ENUM** | 🟡 7 candidatos | P3 | Avaliar migração |
| **Índices Não Utilizados** | 🟡 15 índices | P4 | Monitorar 30 dias |
| **Colunas Auxiliares** | 🟢 Completo | - | Todas presentes |
| **Normalização** | 🟢 Adequada | - | Design intencional |

**Conclusão:** O banco de dados está em **excelente estado**. Não há débitos críticos. As melhorias identificadas são incrementais (P3/P4).

---

## 📈 Métricas Atuais do Banco

### Tamanho das Tabelas (Top 10)

| Tabela | Rows | Tamanho | Retenção | Status |
|--------|------|---------|----------|--------|
| `perf_metrics_snapshots` | 20.853 | **92 MB** | 14 dias | 🟢 Cleanup ativo |
| `ai_agent_logs` | 19.930 | 9.4 MB | 14 dias | 🟢 Cleanup ativo |
| `cron_execution_logs` | 10.774 | 3.7 MB | 7 dias | 🟢 Cleanup ativo |
| `audit_logs` | 895 | 1.8 MB | 180 dias | 🟢 Normal |
| `okr_audit_log` | 470 | 1.0 MB | N/A | 🟢 Normal |
| `okr_wizard_sessions` | 8 | 512 KB | 30 dias | 🟢 Cleanup ativo |
| `asset_inventory` | 473 | 424 KB | N/A | 🟢 Normal |
| `profiles` | 71 | 392 KB | N/A | 🟢 Normal |
| `notification_outbox` | 82 | 320 KB | N/A | 🟢 Normal |
| `bu_user_permission_templates_v2` | 684 | 288 KB | N/A | 🟢 Normal |

### Análise de Retenção de Logs

| Tabela | Data Mais Antiga | Data Mais Recente | Dias | Status |
|--------|------------------|-------------------|------|--------|
| `ai_agent_logs` | 2026-01-26 | 2026-02-07 | 12 | ✅ OK (< 14) |
| `cron_execution_logs` | 2026-02-01 | 2026-02-08 | 7 | ✅ OK (= 7) |
| `audit_logs` | 2025-12-31 | 2026-02-08 | 39 | ✅ OK (< 180) |

**Nota:** `perf_metrics_snapshots` usa coluna `collected_at` (não `created_at`). Cleanup funciona corretamente.

---

## ✅ Índices bu_id — COMPLETO

Fase 1 da auditoria anterior foi **executada com sucesso** em 2026-02-07:

| Tabela | Índice | Status |
|--------|--------|--------|
| `okr_checkins` | `idx_okr_checkins_bu_id` | ✅ Criado |
| `cycles` | `idx_cycles_bu_id` | ✅ Criado |
| `kpi_target_history` | `idx_kpi_target_history_bu_id` | ✅ Criado |
| `ai_agents` | `idx_ai_agents_bu_id` (parcial) | ✅ Criado |

**Todas as tabelas com `bu_id` agora possuem índice adequado para RLS.**

---

## 🟡 Campos TEXT que Poderiam ser ENUM (P3)

| Tabela | Coluna | Valores Conhecidos | Recomendação |
|--------|--------|-------------------|--------------|
| `asset_recommendations` | `status` | `active` | ⏳ Migrar quando crescer |
| `asset_gift_items` | `category` | Variados | ⏳ Avaliar normalização |
| `automation_connections` | `scope` | `bu`, `global` | ⏳ Criar enum |
| `automation_event_catalog` | `scope` | `bu`, `global` | ⏳ Criar enum |
| `automation_incoming_tokens` | `scope` | `bu`, `global` | ⏳ Criar enum |
| `automation_logs` | `status`, `type` | Usar ENUMs existentes | ⏳ Migrar |
| `external_company_bu_associations` | `role` | Variados | ⏳ Avaliar |

**Decisão:** ADIADO para P3. Impacto de performance é mínimo. Revisitar quando módulos crescerem.

---

## 🟡 Índices Não Utilizados (P4)

15 índices com `idx_scan = 0`. **Nota:** PKs de tabelas de log aparecem com scan=0 porque PostgreSQL usa seq scan em tabelas pequenas.

### Índices a MANTER (PKs de logs)

| Índice | Tamanho | Motivo |
|--------|---------|--------|
| `perf_metrics_snapshots_pkey` | 1.2 MB | PK obrigatória |
| `ai_agent_logs_pkey` | 808 KB | PK obrigatória |
| `cron_execution_logs_pkey` | 584 KB | PK obrigatória |
| `audit_logs_pkey` | 56 KB | PK obrigatória |
| `okr_audit_log_pkey` | 40 KB | PK obrigatória |

### Índices a MONITORAR (30 dias)

| Índice | Tamanho | Ação |
|--------|---------|------|
| `idx_okr_audit_log_created_at` | 32 KB | Monitorar uso |
| `idx_partner_bu_assoc_supervisor_contacts` | 24 KB | Monitorar uso |
| `idx_asset_recommendations_teams` | 24 KB | Monitorar uso |
| `idx_asset_recommendations_job_titles` | 24 KB | Monitorar uso |
| `idx_partner_bu_assoc_supervisors` | 24 KB | Monitorar uso |
| `idx_kpi_metrics_category` | 16 KB | Monitorar uso |
| `idx_kpi_metrics_owner` | 16 KB | Monitorar uso |
| `idx_kpi_metrics_category_bu` | 16 KB | Monitorar uso |
| `idx_kpi_metrics_team` | 16 KB | Monitorar uso |

**Decisão:** Monitorar por 30 dias antes de remover. Total: ~200 KB (negligenciável).

---

## ✅ Colunas Auxiliares — COMPLETO

### Verificação de Padrões

| Padrão | Status | Notas |
|--------|--------|-------|
| `bu_id` em tabelas operacionais | ✅ 100% | Todas possuem |
| `created_at` em tabelas transacionais | ✅ 100% | Todas possuem |
| `deleted_at` para soft-delete | ✅ Onde aplicável | Padrão seguido |
| `updated_at` em entidades editáveis | ✅ Onde aplicável | Triggers ativos |

### Índices de Performance Recomendados (P2)

Com base na análise, alguns índices adicionais **podem melhorar performance**:

| Tabela | Coluna | Justificativa | Prioridade |
|--------|--------|---------------|------------|
| `okr_checkins` | `team_id` | Filtros por time | P2 |
| `okr_checkins` | `created_at` | Ordenação temporal | P2 |
| `okr_team_objectives` | `created_at` | Ordenação temporal | P3 |
| `okr_team_key_results` | `created_at` | Ordenação temporal | P3 |

**Nota:** Estes índices são opcionais. O volume atual (< 1000 rows) não justifica urgência.

---

## ✅ Normalização — ADEQUADA

### Análise de JSONB

43 colunas JSONB identificadas. Todas são **design intencional**:

| Categoria | Exemplo | Justificativa |
|-----------|---------|---------------|
| Payloads de eventos | `automation_logs.payload` | Flexibilidade para diferentes eventos |
| Configs flexíveis | `bu_ia_config.config` | Configuração dinâmica por BU |
| Audit trails | `audit_logs.old_values/new_values` | Snapshots históricos |
| Métricas | `perf_metrics_snapshots.metrics` | Estrutura variável |

**Candidatas a normalização futura (P4):**

| Tabela | Coluna | Quando Normalizar |
|--------|--------|-------------------|
| `asset_inventory.photos` | Array de URLs | Se > 10 fotos por ativo |
| `asset_inventory.documents` | Array de docs | Se módulo de documentos crescer |

---

## 📋 Plano de Ação

### ✅ Fase 1: Crítico — COMPLETO

Não há ações críticas pendentes. O banco está saudável.

### 🟡 Fase 2: Quick Wins (P2) — Opcional

Executar via migration se performance degradar:

```sql
-- Índices de performance para OKR checkins
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_okr_checkins_team_id 
  ON public.okr_checkins(team_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_okr_checkins_created_at 
  ON public.okr_checkins(created_at);
```

### 🟢 Fase 3: Backlog (P3)

| Item | Esforço | Impacto |
|------|---------|---------|
| Migrar `automation_*.scope` para ENUM | 30min | Baixo |
| Migrar `asset_recommendations.status` para ENUM | 15min | Baixo |
| Criar ENUM `automation_scope_type` | 15min | Baixo |

### ⚪ Fase 4: Monitoramento (P4)

| Item | Prazo | Ação |
|------|-------|------|
| Monitorar índices não utilizados | 30 dias | Remover se confirmado |
| Avaliar normalização de JSONB | 90 dias | Se volume crescer |

---

## 🔧 Comandos de Monitoramento

```sql
-- Verificar tamanho das tabelas
SELECT relname, n_live_tup, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 15;

-- Verificar índices não utilizados
SELECT indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Executar cleanup manual (se necessário)
SELECT * FROM cleanup_old_logs(14, 14, 7, 30, 180);

-- Executar VACUUM ANALYZE
VACUUM ANALYZE;
```

---

## 📝 Conclusão

O banco de dados do Hub da Jet está em **excelente estado técnico**:

1. ✅ **Tabelas de log** gerenciadas por `cleanup_old_logs()` via pg_cron
2. ✅ **Índices bu_id** criados em todas as tabelas operacionais
3. ✅ **Colunas auxiliares** (created_at, updated_at, deleted_at) presentes onde necessário
4. ✅ **Normalização adequada** — JSONB usado intencionalmente para flexibilidade
5. 🟡 **Melhorias incrementais** (P3/P4) identificadas para futuro

**Nenhum débito crítico encontrado. Sistema saudável.**

---

*Documento gerado em: 2026-02-08*  
*Baseado em: TCR v3.1.0, DATABASE_OPTIMIZATION_AUDIT_2026-02-07*
