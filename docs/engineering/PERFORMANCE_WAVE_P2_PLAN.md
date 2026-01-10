# Performance Wave P2 Plan

**Versão:** 1.0.0  
**Data:** 2026-01-10  
**Status:** Em Progresso

---

## 1. Resumo Executivo

Wave P2 foca em três pilares:
1. **Paginação** - Reduzir payload e melhorar UX em listas grandes
2. **Índices** - Otimizar queries recorrentes com evidência EXPLAIN ANALYZE
3. **RPCs Agregadoras** - Reduzir roundtrips em dashboards

---

## 2. Mapeamento de Listas Grandes

### 2.1 Tickets Module

| Aspecto | Valor Atual |
|---------|-------------|
| Tabela | `tickets` |
| Volume Potencial | 10k+ por BU |
| Filtros Atuais | type, status, category, partner, owner, search |
| Ordenação | `created_at DESC` |
| LIMIT/RANGE | ❌ Não tem |
| Count | ❌ Não tem |
| URL State | ✅ Parcial (filtros sim, page/pageSize não) |

**Ação:** Adicionar paginação com `page`, `pageSize` em URL state + count

### 2.2 Assets Inventory

| Aspecto | Valor Atual |
|---------|-------------|
| Tabela | `asset_inventory` |
| Volume Potencial | 5k+ por BU |
| Filtros Atuais | search, status, category, holder, location |
| Ordenação | `name ASC` |
| LIMIT/RANGE | ❌ Não tem |
| Count | ❌ Não tem |
| URL State | ✅ Parcial |

**Ação:** Adicionar paginação + count

### 2.3 Users Directory

| Aspecto | Valor Atual |
|---------|-------------|
| Tabela | `profiles` (view: v_profiles_directory) |
| Volume Potencial | 500-2k por BU |
| Filtros Atuais | search, team, status |
| Ordenação | `display_name ASC` |
| LIMIT/RANGE | ❌ Não tem |
| Count | ❌ Não tem |
| URL State | ✅ Parcial |

**Ação:** Adicionar paginação + count

### 2.4 OKRs - Objectives List

| Aspecto | Valor Atual |
|---------|-------------|
| Tabela | `okr_team_objectives` |
| Volume Potencial | 100-500 por ciclo |
| Filtros Atuais | year, team, status |
| Ordenação | Variado |
| LIMIT/RANGE | ⚠️ Parcial (alguns hooks) |
| Count | ❌ Não tem |

**Ação:** Padronizar com paginação onde necessário

### 2.5 Notifications

| Aspecto | Valor Atual |
|---------|-------------|
| Tabela | `notifications` |
| Volume Potencial | 10k+ por usuário |
| Ordenação | `created_at DESC` |
| LIMIT/RANGE | ✅ Infinite scroll (20 por page) |
| URL State | N/A (infinite scroll) |

**Ação:** Manter infinite scroll, adicionar count total

### 2.6 Global Search Expanded

| Aspecto | Valor Atual |
|---------|-------------|
| RPC | `rpc_global_search` |
| Volume Potencial | Variável |
| LIMIT/RANGE | ⚠️ Limite interno |

**Ação:** Adicionar paginação na página expandida

---

## 3. Componentes Canônicos

### 3.1 Existente: `UrlPagination`
- Path: `src/shared/filters/UrlPagination.tsx`
- Status: ✅ Pronto para uso
- Props: `page`, `pageSize`, `totalItems`, `onPageChange`, `onPageSizeChange`

### 3.2 URL State Hooks
- `useUrlState({ key: 'page', defaultValue: 1, parse: parseInt })`
- `useUrlState({ key: 'pageSize', defaultValue: 25, parse: parseInt })`
- Schema: `paginationSchema` em `@/shared/url`

---

## 4. Índices Propostos

### 4.1 Tickets
```sql
CREATE INDEX IF NOT EXISTS idx_tickets_bu_status_active 
ON tickets(bu_id, status) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_bu_created_at 
ON tickets(bu_id, created_at DESC) 
WHERE deleted_at IS NULL;
```

### 4.2 Assets
```sql
CREATE INDEX IF NOT EXISTS idx_asset_inventory_bu_status_active 
ON asset_inventory(bu_id, status) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_asset_inventory_bu_name 
ON asset_inventory(bu_id, name) 
WHERE deleted_at IS NULL;
```

### 4.3 Profiles
```sql
CREATE INDEX IF NOT EXISTS idx_profiles_bu_display_name_active 
ON profiles(bu_id, display_name) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_bu_team_active 
ON profiles(bu_id, team_id) 
WHERE deleted_at IS NULL AND employment_status != 'terminated';
```

---

## 5. RPCs Agregadoras Propostas

### 5.1 Home Dashboard
- **Nome:** `rpc_home_dashboard_data`
- **Retorno:** JSONB com OKR counts, KPI summary, focus items
- **Substitui:** 4+ queries paralelas em `useHomeDashboard`

### 5.2 Tickets Summary
- **Nome:** `rpc_tickets_summary`
- **Retorno:** Counts por status, overdue, assigned
- **Uso:** Cards de resumo no dashboard

### 5.3 Assets Summary
- **Nome:** `rpc_assets_summary`
- **Retorno:** Counts por status, overdue loans, by category
- **Uso:** Cards de resumo no dashboard

---

## 6. Plano de Execução

### P2.1 - Paginação (Prioridade Alta) — ✅ DONE
1. ✅ Criar documento de plano
2. ✅ Implementar paginação em `useTickets` + `TicketsListPage`
3. ✅ Implementar paginação em `useInventory` + `InventoryPage`
4. ✅ Implementar paginação em `UsersPage`
5. ✅ Documentar QA

### P2.2 - Paginação Inventory + Users — ✅ DONE
1. ✅ Integrar UrlPagination end-to-end em Inventory
2. ✅ Migrar Users para paginação server-side
3. ✅ URL state completo (page/pageSize + filtros)
4. ✅ Documentar (ver PERFORMANCE_WAVE_P2_2_REPORT.md)

### P2.3 - Índices DB — ✅ DONE
1. ✅ Gerar queries EXPLAIN ANALYZE
2. ✅ Criar migration com índices (3 índices criados)
3. ✅ Validar ganho de performance (20x em Inventory)
4. ✅ Documentar (ver PERFORMANCE_WAVE_P2_3_DB_INDEXES_REPORT.md)

### P2.4 - RPCs Agregadoras (Prioridade Média) — PENDENTE
1. [ ] Criar `rpc_home_dashboard_data`
2. [ ] Migrar `useHomeDashboard` para usar RPC
3. [ ] Criar RPCs de summary adicionais
4. [ ] Documentar

---

## 7. Métricas de Sucesso

| Métrica | Antes | Meta |
|---------|-------|------|
| Tickets load (1000+ rows) | ~2s | <500ms |
| Inventory load (500+ rows) | ~1.5s | <400ms |
| Home dashboard queries | 4-6 | 1-2 |
| Payload size (avg) | 500KB+ | <100KB |

---

## 8. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Índices aumentam write time | Criar apenas índices com evidência |
| RPCs complexas demais | Manter simples, JSONB flat |
| Breaking changes em hooks | Manter backward compatibility |

---

## Histórico

| Data | Versão | Mudança |
|------|--------|---------|
| 2026-01-10 | 1.0.0 | Documento inicial |
| 2026-01-10 | 1.1.0 | P2.1/P2.2 DONE - Paginação Tickets/Inventory/Users |
| 2026-01-10 | 1.2.0 | P2.3 DONE - Índices DB com evidência EXPLAIN ANALYZE |
