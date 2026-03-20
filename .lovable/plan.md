

# Plano de Otimização da Plataforma — Hub da Jet

**Base:** TCR v3.12.0 | DEVELOPMENT_STANDARDS v1.26.0  
**Pre-Checklist Ritual:** ✅ Completo — TCR, DEVELOPMENT_STANDARDS, DATA_MODEL_REGISTRY, IDENTITY_CONVENTION, Refactoring Plan 2026-03-14, Comprehensive Audit 2026-02-08 revisados  
**Score atual:** 8.4/10

---

## Achados da Revisão Documental

Antes de apresentar o plano, corrijo o plano anterior com base na revisão real do código:

| Item do plano anterior | Status real no codebase |
|------------------------|------------------------|
| `KrUnitSelect` deprecated | ✅ Já removido — 0 referências encontradas |
| Domínio hardcoded em Edge Functions | ✅ Já centralizado em `_shared/constants.ts` (SITE_URL, NO_REPLY_EMAIL) |
| `select('*')` em `useBuLocations.ts` | ✅ Já corrigido — usa campos explícitos |
| 175 `console.log` em produção | ⚠️ Encontrados 70 arquivos com `console.log`, mas ~90% estão em `scripts/` e Edge Functions (onde são legítimos para logging). **~8 arquivos** em `src/` precisam revisão |
| `React.memo` em 0 componentes | ✅ Confirmado: 0 usos |
| Virtualização em 2 lugares | ✅ Confirmado: `AutomationLogsTable` e `AgentLogsPage` |
| 83 test files | ✅ Confirmado: 83 unit test files + 16 E2E specs |
| `select('*', { count, head: true })` | ⚠️ 4 arquivos usam pattern — mas `head: true` não retorna dados, apenas count. **Não é violação real.** Apenas `JetimoberDialog.tsx` tem `select("*,...")` real |

---

## Plano Revisado

### Wave 1 — Higiene (P1) ~2h — Risco: Zero

| # | Ação | Detalhes | Esforço |
|---|------|----------|---------|
| 1.1 | Remover `console.log` de `src/` | ~8 arquivos em módulos operacionais (não scripts/Edge Functions, que são legítimos) | 30min |
| 1.2 | Corrigir `select("*,...")` em `JetimoberDialog.tsx` | Único `select("*")` real no frontend — substituir por campos explícitos | 15min |
| 1.3 | Avaliar `select("*", { count, head: true })` em `SettingsHome.tsx`, `useMyTicketsHome.ts`, `useTeams.ts` | Pattern de count-only — documentar como exceção aceita OU migrar para `.select("id", { count, head: true })` | 20min |
| 1.4 | Remover cores hardcoded no CSS | 19 ocorrências de `text-[#...]` — criar tokens semânticos onde aplicável | 30min |

---

### Wave 2 — Cobertura de Testes (P2) ~12h — Risco: Zero

**Estado atual:** 83 unit test files + 16 E2E specs. Módulos testados: OKRs (types, calculations, linking rules, contributions, queries, field definitions, wizard sessions, checkin save). Gaps: Tickets, Assets, Auth/RBAC, UI components.

| # | Escopo | Tipo | Testes | Esforço |
|---|--------|------|--------|---------|
| 2.1 | **Tickets** — hooks (useTickets, useTicketMessages, useTicketFilters) + componentes | Vitest | ~10 files | 3h |
| 2.2 | **Assets** — hooks (useInventory, useBuLocations, useKeyrings) + componentes | Vitest | ~8 files | 2h |
| 2.3 | **Auth & RBAC** — hooks (useAuth, usePermissions, useBu) + guards | Vitest | ~6 files | 2h |
| 2.4 | **Shared/UI** — componentes canônicos (VirtualizedList, GlobalSearch, NotificationBell) | Vitest | ~6 files | 1.5h |
| 2.5 | **E2E** — expandir specs existentes: login → ticket CRUD, login → OKR checkin | Playwright | ~4 specs | 3h |

**Meta:** 83 → ~115 test files (~25% cobertura nos módulos críticos)

---

### Wave 3 — Performance Frontend (P2) ~6h — Risco: Baixo

#### 3.1 Virtualização de Listas

Componente canônico `VirtualizedList` / `VirtualizedTable` existe em `src/components/ui/virtualized-list.tsx` mas é usado em apenas 2 locais. Expandir:

| Lista | Módulo | Rows típicas |
|-------|--------|-------------|
| Ticket list | Tickets | 100-500 |
| Inventory table | Assets | 200-1000 |
| Notifications dropdown | Global | 50-200 |
| Profile selector | Settings | 100-500 |

**Esforço:** 3h

#### 3.2 Memoização Estratégica

0 componentes usam `React.memo`. Aplicar em componentes de lista que re-renderizam por filter keystroke:

| Componente | Motivo |
|------------|--------|
| Cards em listas (TicketCard, OkrCard, AssetRow) | Re-render em cada keystroke de filtro |
| Sidebar, Header | Re-render em cada navegação |
| Badge/Status components | Props estáveis |

**Esforço:** 2h

#### 3.3 Suspense Boundaries granulares

Routes são 100% lazy-loaded. Adicionar `Suspense` boundaries dentro dos módulos OKRs e Tickets para sub-rotas pesadas (wizards, detail views).

**Esforço:** 1h

---

### Wave 4 — Banco de Dados e Backend (P3) ~3h — Risco: Médio

Itens do Refactoring Plan 2026-03-14 ainda pendentes:

| # | Ação | Detalhes | Esforço |
|---|------|----------|---------|
| 4.1 | Índices para tabelas de log | `ai_agent_logs` (563 seq_scans, 4.4M tup_read) e `cron_execution_logs` (564 seq_scans) — criar `idx_*_created_at` | 20min |
| 4.2 | Avaliar DROP de índices secundários não utilizados | 20 índices com 0 scans (excluir PKs) — analisar com EXPLAIN antes | 45min |
| 4.3 | JSDoc em 4 Edge Functions novas | `clevel-checkin-summary`, `collaborator-checkin-summary`, `mbr-summary`, `health-check` | 30min |
| 4.4 | Política de retenção | Incluir `cron_execution_logs` e `perf_metrics_snapshots` no `cleanup_old_logs()` (90 dias) | 30min |

---

## Métricas de Sucesso

| Indicador | Antes (verificado) | Meta |
|-----------|---------------------|------|
| `console.log` em `src/` | ~8 arquivos | 0 |
| `select("*")` real | 1 arquivo (`JetimoberDialog`) | 0 |
| Arquivos de teste | 83 unit + 16 E2E | ~115 unit + 20 E2E |
| `React.memo` | 0 | 15+ |
| Listas virtualizadas | 2 | 6+ |
| Edge Functions sem JSDoc | 4 | 0 |
| **Score geral** | **8.4/10** | **9.0+/10** |

---

## Ordem de Execução Recomendada

```text
Wave 1 (Higiene)     → Imediata, sem risco, limpeza factual
Wave 3 (Performance) → Alto impacto percebido pelo usuário
Wave 2 (Testes)      → Fundação para escalabilidade segura
Wave 4 (DB/Backend)  → Otimização infraestrutural
```

