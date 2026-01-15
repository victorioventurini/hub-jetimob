# Plano de Ação de Performance — Wave P5

**Versão:** 1.0.0  
**Data:** 2026-01-15  
**Status:** 🚧 Em planejamento  
**Baseado em:** Snapshot de 2026-01-15 16:13 UTC

---

## 1. Resumo Executivo

### Estado Atual do Sistema

| Métrica | Valor | Status |
|---------|-------|--------|
| Tabelas analisadas | 50 | ✅ |
| **Tabelas críticas** (< 50% idx usage) | **27** | 🔴 ALTO |
| Tabelas em atenção (50-80% idx usage) | 12 | 🟡 |
| Tabelas saudáveis (> 80% idx usage) | 11 | 🟢 |
| Índices não utilizados | ~10+ | 🟡 |

### Diagnóstico Principal

O sistema apresenta **27 tabelas em estado crítico** onde sequential scans dominam sobre index scans. Isso indica:
1. **Índices ausentes** para colunas frequentemente filtradas
2. **Padrões de query** que não utilizam índices existentes
3. **Tabelas pequenas** onde PostgreSQL prefere seq scan (normal)

---

## 2. Top 10 Tabelas Críticas — Prioridade Máxima

| # | Tabela | Seq Scans | Idx Scans | % Idx | Diagnóstico |
|---|--------|-----------|-----------|-------|-------------|
| 1 | `user_roles` | 11.7M | 46 | 0.00% | 🔴 **CRÍTICO** - Sem índice efetivo |
| 2 | `profiles` | 7.5M | 310K | 3.99% | 🔴 **CRÍTICO** - Índices subutilizados |
| 3 | `asset_movements` | 197K | 14K | 6.48% | 🔴 ALTO - Falta índice composto |
| 4 | `bu_locations` | 132K | 16K | 10.78% | 🔴 ALTO |
| 5 | `bu_units` | 111K | 48 | 0.04% | 🔴 **CRÍTICO** - Tabela pequena? |
| 6 | `ai_agent_documents` | 63K | 0 | 0.00% | 🔴 **CRÍTICO** - Sem índice |
| 7 | `notification_outbox` | 48K | 13K | 21.13% | 🔴 ALTO |
| 8 | `okr_team_key_results` | 15K | 14K | 48.71% | 🔴 Próximo do limite |
| 9 | `okr_team_objectives` | 14K | 3K | 17.04% | 🔴 ALTO |
| 10 | `okr_wizard_sessions` | 6.3K | 312 | 4.69% | 🔴 Índice P3.3 não está sendo usado |

---

## 3. Análise Detalhada e Ações

### 3.1 🔴 PRIORIDADE 1 — Impacto Imediato

#### `user_roles` — 11.7M seq scans, 0% idx
**Problema:** Tabela consultada milhões de vezes sem usar índice.

**Causa provável:** 
- RLS policies e funções `has_role()` consultam sem passar pelo índice
- Query `WHERE user_id = ?` sem índice em `user_id`

**Ação:**
```sql
-- Criar índice para lookup por user_id (padrão mais comum)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_user_id 
ON public.user_roles(user_id);

-- Índice composto para validação de role específica
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_user_role 
ON public.user_roles(user_id, role);
```

**Impacto esperado:** -90% seq scans (economia de ~10M+ scans)

---

#### `profiles` — 7.5M seq scans, 4% idx
**Problema:** Tabela mais consultada do sistema com baixíssimo uso de índice.

**Causa provável:**
- Queries `WHERE bu_id = ?` sem índice adequado
- `my_profile_id()` e funções RLS causando full scans
- Joins sem índice nas colunas de join

**Ação:**
```sql
-- Índice principal para filtro por BU (muito frequente)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_bu_id 
ON public.profiles(bu_id) 
WHERE deleted_at IS NULL;

-- Índice para lookup rápido por user_id (auth → domain)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_id_unique 
ON public.profiles(user_id) 
WHERE user_id IS NOT NULL;
```

**Impacto esperado:** -80% seq scans

---

#### `bu_units` — 111K seq scans, 0.04% idx
**Problema:** Tabela pequena, mas seq scans muito frequentes.

**Análise:**
- Se tabela tem <100 rows, PostgreSQL prefere seq scan (normal)
- Verificar se há muitas chamadas redundantes

**Ação:** 
```sql
-- Verificar tamanho da tabela
SELECT COUNT(*) FROM bu_units;

-- Se > 50 rows, criar índice
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bu_units_id_active 
ON public.bu_units(id) 
WHERE deleted_at IS NULL;
```

**Alternativa:** Se tabela pequena, otimizar caching no frontend.

---

#### `ai_agent_documents` — 63K seq scans, 0% idx
**Problema:** Nenhum índice sendo usado.

**Causa provável:**
- Queries `WHERE agent_id = ?` sem índice

**Ação:**
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_agent_documents_agent 
ON public.ai_agent_documents(agent_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_agent_documents_status 
ON public.ai_agent_documents(status) 
WHERE status != 'processed';
```

---

### 3.2 🟡 PRIORIDADE 2 — Melhoria Significativa

#### `bu_user_memberships` — 1.5M seq scans, 55% idx
**Status:** Em atenção, mas alto volume absoluto.

**Ação:**
```sql
-- Verificar índice existente está sendo usado
-- idx_bu_memberships_active_unique já existe com 1.9M scans
-- Problema pode ser outras queries

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bu_memberships_profile_bu 
ON public.bu_user_memberships(profile_id, bu_id) 
WHERE status = 'active';
```

---

#### `asset_movements` — 197K seq scans, 6.5% idx
**Ação:**
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asset_movements_asset 
ON public.asset_movements(asset_id, occurred_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asset_movements_bu_date 
ON public.asset_movements(bu_id, occurred_at DESC);
```

---

#### `notification_outbox` — 48K seq scans, 21% idx
**Ação:**
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_outbox_pending 
ON public.notification_outbox(status, scheduled_for) 
WHERE status IN ('pending', 'retry');
```

---

#### `okr_team_objectives` — 14K seq scans, 17% idx
**Ação:**
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_okr_team_objectives_team_year 
ON public.okr_team_objectives(team_id, year) 
WHERE deleted_at IS NULL AND cancelled_at IS NULL;
```

---

#### `okr_team_key_results` — 15K seq scans, 49% idx
**Ação:**
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_okr_team_kr_objective 
ON public.okr_team_key_results(team_objective_id) 
WHERE deleted_at IS NULL;
```

---

### 3.3 🟢 PRIORIDADE 3 — Tabelas Menores

| Tabela | Ação |
|--------|------|
| `bu_notification_event_settings` | Índice em (bu_id, event_key) |
| `bu_notification_channels` | Índice em (bu_id, channel_key) |
| `permission_presets` | Índice em (bu_id) |
| `permission_audit_log` | Índice em (performed_by, created_at DESC) |
| `kpi_metrics` | Índice em (bu_id, metric_key) |
| `kpi_values` | Índice em (metric_id, recorded_at DESC) |
| `ticket_participants` | Índice em (ticket_id) |
| `ticket_routing_rules` | Índice em (bu_id, category_id) |

---

## 4. Índices Não Utilizados — Candidatos a Remoção

| Índice | Tabela | Scans | Tamanho | Recomendação |
|--------|--------|-------|---------|--------------|
| `job_titles_bu_ids_gin` | job_titles | 0 | 24 KB | 🟡 Avaliar |
| `idx_bu_units_domains` | bu_units | 0 | 24 KB | 🟡 Avaliar |
| `idx_bu_units_cnpj` | bu_units | 0 | 16 KB | 🟡 Avaliar |
| `okr_team_objective_contributors_*_key` | okr_team_objective_contributors | 0 | 16 KB | 🟡 Avaliar |

**Nota:** Antes de remover, verificar se são usados em queries específicas ou admin.

---

## 5. Plano de Execução

### Wave P5.1 — Índices Críticos (Prioridade IMEDIATA)

**Impacto:** Redução estimada de **~15M seq scans**

```sql
-- Executar sequencialmente para evitar lock contention

-- 1. user_roles (MAIOR IMPACTO)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_user_id 
ON public.user_roles(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_user_role 
ON public.user_roles(user_id, role);

-- 2. profiles (SEGUNDO MAIOR IMPACTO)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_bu_id 
ON public.profiles(bu_id) 
WHERE deleted_at IS NULL;

-- 3. ai_agent_documents
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_agent_documents_agent 
ON public.ai_agent_documents(agent_id);
```

### Wave P5.2 — Índices Secundários (Próxima semana)

```sql
-- asset_movements
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asset_movements_asset 
ON public.asset_movements(asset_id, occurred_at DESC);

-- notification_outbox
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_outbox_pending 
ON public.notification_outbox(status, scheduled_for) 
WHERE status IN ('pending', 'retry');

-- okr_team_objectives
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_okr_team_objectives_team_year 
ON public.okr_team_objectives(team_id, year) 
WHERE deleted_at IS NULL AND cancelled_at IS NULL;

-- okr_team_key_results
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_okr_team_kr_objective 
ON public.okr_team_key_results(team_objective_id) 
WHERE deleted_at IS NULL;
```

### Wave P5.3 — Otimizações Adicionais (Próximo sprint)

- Índices para tabelas de prioridade 3
- Remoção de índices não utilizados (após confirmação)
- Cache optimization no frontend para tabelas pequenas

---

## 6. Métricas de Sucesso

| Métrica | Antes (P5.0) | Meta (P5.1) | Meta Final |
|---------|--------------|-------------|------------|
| Tabelas críticas | 27 | < 15 | < 5 |
| `user_roles` seq scans | 11.7M | < 1M | < 100K |
| `profiles` idx % | 4% | > 50% | > 80% |
| Seq scans totais | ~20M | < 10M | < 5M |

---

## 7. Monitoramento Pós-Implementação

Após cada wave, verificar métricas:

```sql
-- Verificar melhoria em tabelas específicas
SELECT relname, seq_scan, idx_scan,
       round(100.0 * idx_scan / NULLIF(seq_scan + idx_scan, 0), 2) as idx_pct
FROM pg_stat_user_tables
WHERE relname IN ('user_roles', 'profiles', 'ai_agent_documents')
ORDER BY seq_scan DESC;

-- Verificar novos índices estão sendo usados
SELECT indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE indexrelname LIKE 'idx_user_roles%' 
   OR indexrelname LIKE 'idx_profiles_bu%'
   OR indexrelname LIKE 'idx_ai_agent_documents%';
```

---

## 8. Próximos Passos

- [ ] **P5.1:** Criar índices críticos para `user_roles` e `profiles`
- [ ] **P5.1:** Criar índice para `ai_agent_documents`
- [ ] **P5.2:** Criar índices secundários para OKRs e assets
- [ ] **P5.3:** Avaliar remoção de índices não usados
- [ ] **P5.3:** Implementar cache optimization no frontend
- [ ] **Monitorar:** Dashboard de performance após 24h de cada wave

---

## 9. Referências

- [SLOW_QUERIES_ACTION_PLAN.md](./SLOW_QUERIES_ACTION_PLAN.md) — Waves P3/P4 (completas)
- [PERF_PLAYBOOK.md](../PERF_PLAYBOOK.md) — Guia geral de performance
- Dashboard: `/hub/performance`

---

*Plano criado em 2026-01-15 baseado em análise de métricas reais*
