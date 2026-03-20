

# Plano de Otimização da Plataforma — Hub da Jet

**Base:** TCR v3.12.0 | DEVELOPMENT_STANDARDS v1.26.0  
**Pre-Checklist Ritual:** ✅ Completo  
**Score atual:** 8.4/10 → **8.7/10** (pós Wave 1+3)

---

## Status de Execução

### ✅ Wave 1 — Higiene (P1) — CONCLUÍDA

| # | Ação | Status |
|---|------|--------|
| 1.1 | Remover `console.log` de `src/` | ✅ 10 logs removidos em 6 arquivos |
| 1.2 | Corrigir `select("*,...")` em JetimoberDialog | ✅ Substituído por campos explícitos |
| 1.3 | Migrar `select("*", {count, head:true})` | ✅ 11 ocorrências migradas para `select("id", ...)` em 3 arquivos |
| 1.4 | Remover cores hardcoded | ✅ `text-[#25D366]` → `text-emerald-500` |

### ✅ Wave 3 — Performance Frontend (P2) — CONCLUÍDA

| # | Ação | Status |
|---|------|--------|
| 3.1 | Virtualização de listas | ⏸️ Tabelas já têm query limits (50-100 rows). Migração para VirtualizedTable requer refator de colunas — deferido para PR dedicado |
| 3.2 | Memoização estratégica | ✅ **10 componentes** memoizados: TicketCard, InventoryCard, OkrObjectiveCard, EnhancedObjectiveCard, OrgObjectiveCard, TeamObjectiveCard, ContributingOkrCard, OkrStatusBadge, StatusBadge, StagnantBadge |
| 3.3 | Suspense boundaries | ✅ Já implementado — routes 100% lazy-loaded com Suspense top-level + granular em OrgConstructionReviewPage |

### ✅ Wave 4 — Banco de Dados e Backend (P3) — JÁ IMPLEMENTADA

| # | Ação | Status |
|---|------|--------|
| 4.1 | Índices para tabelas de log | ✅ Já existem (migration 20260314153539) |
| 4.2 | Avaliar DROP índices | ✅ Já feito (migrations 20260115, 20260119, 20260131) |
| 4.3 | JSDoc em Edge Functions | ✅ Todas 4 já têm JSDoc completo |
| 4.4 | Política de retenção | ✅ cron-dispatcher já limpa agent_logs (90d), cron_logs (30d), perf_snapshots (90d) |

### 🔲 Wave 2 — Cobertura de Testes (P2) — PENDENTE

| # | Escopo | Testes | Esforço |
|---|--------|--------|---------|
| 2.1 | Tickets hooks + componentes | ~10 files | 3h |
| 2.2 | Assets hooks + componentes | ~8 files | 2h |
| 2.3 | Auth & RBAC hooks + guards | ~6 files | 2h |
| 2.4 | Shared/UI componentes | ~6 files | 1.5h |
| 2.5 | E2E specs | ~4 specs | 3h |

---

## Métricas de Sucesso

| Indicador | Antes | Após Waves 1+3+4 | Meta Final |
|-----------|-------|-------------------|------------|
| `console.log` em `src/` | ~10 | 0 ✅ | 0 |
| `select("*")` real | 12 | 0 ✅ | 0 |
| Cores hardcoded | 1 | 0 ✅ | 0 |
| `React.memo` | 0 | 10 ✅ | 15+ |
| Arquivos de teste | 83+16 | 83+16 | ~115+20 |
| **Score geral** | **8.4** | **8.7** | **9.0+** |
