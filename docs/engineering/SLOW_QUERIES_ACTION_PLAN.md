# Slow Queries — Relatório e Plano de Ação

**Versão:** 1.1.0  
**Data:** 2026-01-15  
**Status:** ✅ P3.1 COMPLETO

---

## 1. Resumo Executivo

Análise das métricas de performance do banco Supabase identificou:
- ✅ **Nenhuma query lenta crítica (>100ms)** nos logs recentes
- ⚠️ **5 tabelas com alto volume de Sequential Scans** que podem ser otimizadas
- ⚠️ **~12MB de índices não utilizados** que podem ser removidos
- ✅ **Wave P2.3 anterior** já otimizou as principais queries paginadas

---

## 2. Índices Mais Utilizados (Top 10)

| Índice | Tabela | idx_scan | Impacto |
|--------|--------|----------|---------|
| `idx_bu_memberships_active_unique` | bu_user_memberships | 1.7M | 🟢 Crítico |
| `job_titles_pkey` | job_titles | 1.07M | 🟢 Crítico |
| `system_settings_pkey` | system_settings | 995K | 🟢 Crítico |
| `asset_categories_pkey` | asset_categories | 297K | 🟢 Alto |
| `asset_inventory_pkey` | asset_inventory | 254K | 🟢 Alto |
| `profiles_pkey` | profiles | 215K | 🟢 Alto |
| `permission_template_items_v2_pkey` | permission_template_items_v2 | 127K | 🟢 Médio |
| `bu_user_permission_overrides_*_key` | bu_user_permission_overrides | 125K | 🟢 Médio |
| `hub_integrations_global_config_*_key` | hub_integrations_global_config | 91K | 🟢 Médio |
| `asset_clavicularies_pkey` | asset_clavicularies | 84K | 🟢 Médio |

**Conclusão:** Os índices críticos estão sendo utilizados corretamente.

---

## 3. Tabelas com Alto Volume de Sequential Scans

| Tabela | Seq Scans | Rows/Scan | Row Count | Status |
|--------|-----------|-----------|-----------|--------|
| `asset_inventory` | 40.7K | 6.73 | 407 | ⚠️ Alto volume, baixo rows/scan |
| `permission_template_items_v2` | 36.4K | 151 | 229 | 🔴 Full table scans frequentes |
| `bu_user_permission_templates_v2` | 17.4K | 48.7 | 667 | 🟡 Moderado |
| `okr_wizard_sessions` | 6.2K | 480 | 499 | 🔴 Full table scans |
| `ai_agent_logs` | 548 | 7.3K | 82K | 🔴 Crítico - tabela grande |

### 3.1 Análise Detalhada

#### `ai_agent_logs` (82K rows, 548 seq scans)
- **Problema:** Tabela grande com seq scans lendo ~7K rows por scan
- **Índice existente não usado:** `idx_ai_agent_logs_user_bu_created` (8.5MB, 0 scans)
- **Causa provável:** Queries não usam as colunas do índice
- **Ação:** Analisar padrão de query atual

#### `okr_wizard_sessions` (499 rows, 6.2K seq scans)
- **Problema:** Full table scans frequentes lendo 480 rows/scan
- **Causa provável:** Falta de índice para queries por status/bu_id
- **Ação:** Criar índice composto

#### `permission_template_items_v2` (229 rows, 36K seq scans)
- **Problema:** Alta frequência de seq scans
- **Causa provável:** Queries de join sem índice adequado
- **Ação:** Analisar padrão e criar índice

---

## 4. Índices Não Utilizados (Candidatos a Remoção)

| Índice | Tabela | Tamanho | Recomendação |
|--------|--------|---------|--------------|
| `idx_ai_agent_logs_user_bu_created` | ai_agent_logs | 8.5 MB | 🟡 Avaliar remoção |
| `ai_agent_logs_pkey` | ai_agent_logs | 3.2 MB | ⛔ Manter (PK) |
| `cron_execution_logs_pkey` | cron_execution_logs | 320 KB | ⛔ Manter (PK) |
| `audit_logs_pkey` | audit_logs | 56 KB | ⛔ Manter (PK) |
| `idx_bu_units_domains` | bu_units | 24 KB | 🟡 Avaliar remoção |
| `idx_profiles_employment_status` | profiles | 16 KB | 🟡 Avaliar remoção |
| `idx_teams_status` | teams | 16 KB | 🟡 Avaliar remoção |
| `idx_audit_logs_user_id` | audit_logs | 16 KB | 🟡 Avaliar remoção |
| `idx_audit_logs_entity` | audit_logs | 16 KB | 🟡 Avaliar remoção |
| `idx_okr_checkins_date` | okr_checkins | 16 KB | 🟡 Avaliar remoção |

**Economia potencial:** ~8.6 MB removendo apenas `idx_ai_agent_logs_user_bu_created`

---

## 5. Plano de Ação

### Wave P3.1 — Índices Ausentes ✅ COMPLETO (2026-01-15)

**6 índices criados:**

| Índice | Tabela | Colunas |
|--------|--------|---------|
| `idx_okr_wizard_sessions_bu_status` | okr_wizard_sessions | (bu_id, status) |
| `idx_okr_wizard_sessions_bu_created` | okr_wizard_sessions | (bu_id, created_at DESC) |
| `idx_permission_template_items_v2_template` | permission_template_items_v2 | (template_id) |
| `idx_permission_template_items_v2_pkey` | permission_template_items_v2 | (permission_key) |
| `idx_ai_agent_logs_bu_created` | ai_agent_logs | (bu_id, created_at DESC) |
| `idx_ai_agent_logs_agent_created` | ai_agent_logs | (agent_id, created_at DESC) |

### Wave P3.2 — Limpeza de Índices (Prioridade Média)

```sql
-- Executar após 30 dias de monitoramento para confirmar não uso
-- DROP INDEX IF EXISTS idx_ai_agent_logs_user_bu_created;
-- DROP INDEX IF EXISTS idx_profiles_employment_status;
-- DROP INDEX IF EXISTS idx_teams_status;
```

### Wave P3.3 — Otimizações de Query (Prioridade Média)

| Módulo | Ação | Impacto Esperado |
|--------|------|------------------|
| Permissions | Revisar queries que causam seq scan em `permission_template_items_v2` | -30K seq scans |
| AI Agents | Revisar queries em `ai_agent_logs` para usar índice existente ou criar novo | Evitar 7K rows/scan |
| OKR Wizard | Adicionar índice e revisar queries em `okr_wizard_sessions` | -6K seq scans |

---

## 6. Métricas de Sucesso

| Métrica | Antes | Meta | Prazo |
|---------|-------|------|-------|
| Seq scans em `permission_template_items_v2` | 36.4K | <5K | P3.1 |
| Seq scans em `okr_wizard_sessions` | 6.2K | <1K | P3.1 |
| Índices não utilizados | 12 | <5 | P3.2 |
| Espaço de índices não usados | ~8.6MB | <1MB | P3.2 |

---

## 7. Queries para Monitoramento

```sql
-- Tabelas com mais seq scans (rodar semanalmente)
SELECT relname, seq_scan, idx_scan, 
       round(100.0 * seq_scan / (seq_scan + idx_scan), 2) as pct_seq
FROM pg_stat_user_tables
WHERE schemaname = 'public' AND (seq_scan + idx_scan) > 100
ORDER BY seq_scan DESC LIMIT 20;

-- Índices não utilizados (rodar mensalmente)
SELECT indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Tamanho total de índices não usados
SELECT pg_size_pretty(sum(pg_relation_size(indexrelid)))
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND idx_scan = 0;
```

---

## 8. Próximos Passos

- [ ] **P3.1:** Criar índices para `okr_wizard_sessions` e `permission_template_items_v2`
- [ ] **P3.1:** Analisar padrão de queries em `ai_agent_logs`
- [ ] **P3.2:** Após 30 dias, remover índices confirmados como não usados
- [ ] **P3.3:** Implementar monitoramento periódico de métricas

---

## 9. Referências

- [PERFORMANCE_WAVE_P2_3_DB_INDEXES_REPORT.md](./PERFORMANCE_WAVE_P2_3_DB_INDEXES_REPORT.md)
- [PERFORMANCE_SWEEP_FINAL_SUMMARY.md](./PERFORMANCE_SWEEP_FINAL_SUMMARY.md)
- [PERF_PLAYBOOK.md](../PERF_PLAYBOOK.md)

---

*Relatório gerado em 2026-01-15*
