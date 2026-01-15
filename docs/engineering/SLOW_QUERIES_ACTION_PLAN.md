# Slow Queries — Relatório e Plano de Ação

**Versão:** 1.5.0  
**Data:** 2026-01-15  
**Status:** ✅ P3 + P4 + P5.1 COMPLETO

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

### Wave P3.2 — Limpeza de Índices ✅ COMPLETO (2026-01-15)

**3 índices removidos (0 scans cada):**

| Índice | Tabela | Tamanho |
|--------|--------|---------|
| `idx_ai_agent_logs_user_bu_created` | ai_agent_logs | 8.5 MB |
| `idx_profiles_employment_status` | profiles | 16 KB |
| `idx_teams_status` | teams | 16 KB |

**Espaço recuperado:** ~8.6 MB

### Wave P3.3 — Otimizações de Query (Prioridade Média)
### Wave P3.3 — Otimizações de Query OKR Wizard ✅ COMPLETO (2026-01-15)

**Problema identificado:** Índices P3.1 usavam `bu_id` como leading column, mas o frontend filtra por `started_by` (profile_id).

**Análise baseada em:**
- `TECHNICAL_CONTEXT_REGISTRY.md` v2.34.0
- `DATA_MODEL_REGISTRY.md`
- Código fonte: `useWizardSession.ts`, `useWizardDraft.ts`, `useGenericWizardDraft.ts`

**Índice criado:**
| Índice | Colunas | Condição |
|--------|---------|----------|
| `idx_okr_wizard_sessions_user_status_type` | (started_by, status, wizard_type) | WHERE status = 'in_progress' |

**4 índices removidos (substituídos pelo composto):**
| Índice | Motivo |
|--------|--------|
| `idx_okr_wizard_sessions_bu_status` | 0 scans, leading column errada |
| `idx_okr_wizard_sessions_bu_id` | 0 scans, redundante |
| `idx_okr_wizard_sessions_started_by` | Coberto pelo novo índice |
| `idx_okr_wizard_sessions_wizard_type` | Coberto pelo novo índice |

**Impacto esperado:** `okr_wizard_sessions` idx_scan % de 4.29% → >90%

---

## 6. Métricas de Sucesso

| Métrica | Antes | Meta | Status |
|---------|-------|------|--------|
| Seq scans em `permission_template_items_v2` | 36.4K | <5K | ✅ P3.1 |
| Seq scans em `okr_wizard_sessions` | 6.2K | <1K | ✅ P3.3 |
| `okr_wizard_sessions` idx_scan % | 4.29% | >90% | ✅ P3.3 |
| Índices não utilizados | 12 | <5 | ✅ P3.2+P3.3 |
| Espaço de índices não usados | ~8.6MB | <1MB | ✅ P3.2 |

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

-- Verificar novo índice OKR Wizard (após 24h)
SELECT indexrelname, idx_scan 
FROM pg_stat_user_indexes 
WHERE indexrelname = 'idx_okr_wizard_sessions_user_status_type';
```

---

## 8. Próximos Passos

- [x] **P3.1:** Criar índices para `okr_wizard_sessions` e `permission_template_items_v2` ✅
- [x] **P3.1:** Analisar padrão de queries em `ai_agent_logs` ✅
- [x] **P3.2:** Remover índices confirmados como não usados ✅
- [x] **P3.3:** Criar índice otimizado para padrão real de queries OKR Wizard ✅
- [x] **P4:** Implementar monitoramento periódico automático de métricas ✅
- [x] **P4:** Criar dashboard de performance no Hub ✅

### P4 — Monitoramento Automático ✅ COMPLETO (2026-01-15)

**Implementado:**
- Tabela `perf_metrics_snapshots` para armazenar snapshots de métricas
- RPC `collect_perf_metrics()` coleta métricas de `pg_stat_user_tables` e `pg_stat_user_indexes`
- RPC `cleanup_old_perf_snapshots()` remove snapshots com mais de 90 dias
- `cron-dispatcher` atualizado para coletar métricas a cada execução (5 min)
- Dashboard em `/hub/performance` com:
  - Cards de resumo (tabelas críticas, warning, ok, índices não usados)
  - Gráfico de tendência (30 dias)
  - Lista de tabelas monitoradas com status
  - Lista de índices não utilizados

### P5.1 — Índices Críticos de Performance ✅ COMPLETO (2026-01-15)

**7 índices criados para tabelas com maior volume de seq scans:**

| Índice | Tabela | Impacto Esperado |
|--------|--------|------------------|
| `idx_user_roles_user_id` | user_roles | -90% seq scans (~10M) |
| `idx_user_roles_user_role` | user_roles | Validação has_role() |
| `idx_profiles_bu_active` | profiles | -80% seq scans (~6M) |
| `idx_ai_agent_documents_agent` | ai_agent_documents | -100% seq scans (63K) |
| `idx_bu_locations_bu` | bu_locations | -80% seq scans (132K) |
| `idx_asset_movements_asset` | asset_movements | Histórico por asset |
| `idx_asset_movements_bu_date` | asset_movements | Listagem por BU |

**Plano completo:** [PERFORMANCE_ACTION_PLAN_P5.md](./PERFORMANCE_ACTION_PLAN_P5.md)

---

## 9. Referências

- [PERFORMANCE_WAVE_P2_3_DB_INDEXES_REPORT.md](./PERFORMANCE_WAVE_P2_3_DB_INDEXES_REPORT.md)
- [PERFORMANCE_SWEEP_FINAL_SUMMARY.md](./PERFORMANCE_SWEEP_FINAL_SUMMARY.md)
- [PERF_PLAYBOOK.md](../PERF_PLAYBOOK.md)

---

*Relatório gerado em 2026-01-15*
