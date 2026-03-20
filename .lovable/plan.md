

# Plano de Otimização da Plataforma — Hub da Jet

**Base:** TCR v3.12.0 | DEVELOPMENT_STANDARDS v1.26.0  
**Pre-Checklist Ritual:** ✅ Completo  
**Score atual:** 8.4/10

---

## Status de Execução

### ✅ Wave 1 — Higiene (P1) — CONCLUÍDA

| # | Ação | Status |
|---|------|--------|
| 1.1 | Remover `console.log` de `src/` | ✅ 10 logs removidos em 6 arquivos (InventoryDetailView, InventoryMovementDialog, ImpersonationContext, BuContext, useAuth, VicFeedbackDraft). Mantidos: gtag.ts (isDev guard), AuthCallback (auth flow crítico) |
| 1.2 | Corrigir `select("*,...")` em JetimoberDialog | ✅ Substituído por campos explícitos |
| 1.3 | Migrar `select("*", {count, head:true})` | ✅ Migrado para `select("id", {count, head:true})` em SettingsHome, useMyTicketsHome, useTeams |
| 1.4 | Remover cores hardcoded | ✅ `text-[#25D366]` → `text-emerald-500` em phone-link.tsx |

**Resultado:** 0 `console.log` operacionais em `src/`, 0 `select("*")`, 0 cores hex hardcoded.

---

### 🔲 Wave 2 — Cobertura de Testes (P2) ~12h — Pendente

| # | Escopo | Tipo | Testes | Esforço |
|---|--------|------|--------|---------|
| 2.1 | **Tickets** — hooks + componentes | Vitest | ~10 files | 3h |
| 2.2 | **Assets** — hooks + componentes | Vitest | ~8 files | 2h |
| 2.3 | **Auth & RBAC** — hooks + guards | Vitest | ~6 files | 2h |
| 2.4 | **Shared/UI** — componentes canônicos | Vitest | ~6 files | 1.5h |
| 2.5 | **E2E** — specs críticos | Playwright | ~4 specs | 3h |

### 🔲 Wave 3 — Performance Frontend (P2) ~6h — Pendente

- 3.1 Virtualização de listas (4 listas de alta densidade)
- 3.2 Memoização estratégica (React.memo em cards e layout estável)
- 3.3 Suspense boundaries granulares em sub-rotas pesadas

### 🔲 Wave 4 — Banco de Dados e Backend (P3) ~3h — Pendente

- 4.1 Índices para tabelas de log
- 4.2 Avaliar DROP de índices não utilizados
- 4.3 JSDoc em 4 Edge Functions novas
- 4.4 Política de retenção (cron_execution_logs, perf_metrics_snapshots)

---

## Métricas de Sucesso

| Indicador | Antes | Após Wave 1 | Meta Final |
|-----------|-------|-------------|------------|
| `console.log` em `src/` | ~10 | 0 ✅ | 0 |
| `select("*")` real | 1 | 0 ✅ | 0 |
| Cores hardcoded | 1 | 0 ✅ | 0 |
| Arquivos de teste | 83+16 | 83+16 | ~115+20 |
| `React.memo` | 0 | 0 | 15+ |
| Listas virtualizadas | 2 | 2 | 6+ |
| **Score geral** | **8.4** | **8.5** | **9.0+** |
