# Plano de Performance — 2026-05-04

Plano consolidado de débitos técnicos e otimizações em 3 ondas. Documento vivo
— atualizar conforme cada item é concluído.

---

## Wave 1 — Quick wins (1 semana)

### W1.DB — Banco ✅ Concluído (2026-05-04)
- ✅ Drop de 12 índices secundários sem uso (`idx_outbox_sent_at`, `idx_tickets_status`,
  `idx_kpi_metrics_responsible_area`, `idx_okr_checkins_bu_id`, …).
- ✅ Retenção de `perf_metrics_snapshots` reduzida de 30 → 14 dias
  (`cleanup_old_logs()` recriada com `SET search_path = public`).
- ✅ Cleanup imediato: ~22.700 linhas removidas (-53%).
- ✅ Auditoria confirmou **0 ocorrências reais** de `.select("*")` em código de produção.
- 🟡 Seq scans em tabelas pequenas (`profiles`, `bu_units`, < 100 rows) são falsos
  positivos — Postgres ignora índice intencionalmente; nenhuma ação necessária.

### W1.B — Backend ✅ Concluído (2026-05-04)
- ✅ **`AbortController` + timeout em `llmComplete`** (default 60s, override via
  `options.timeoutMs`, encadeado com `signal` externo). Antes: chamada pendurada
  podia segurar uma instância Edge até o teto de 150s do gateway. Agora: 504 controlado.
- ✅ **TTFB timeout em `llmStream`** (30s até primeiro byte). Após o stream começar,
  o consumer controla o cancelamento.
- ✅ **`Cache-Control: public, max-age=30`** em `health-check` quando `healthy`
  (`no-store` quando degraded/unhealthy). Reduz custo de monitoramento externo.
- 🟡 Split das 5 Edge Functions > 500 linhas — **adiado para W2.B**
  (`team-checkin-summary` 962, `analysis-generate` 671, `invoke-vic` 552,
  `qbr-executive-report` 520, `mbr-summary` 513).

### W1.F — Frontend ✅ Parcial (2026-05-04)
- ✅ **`esbuild.pure` em build de produção** remove `console.log/info/debug/warn`
  do bundle final (mantém `console.error` para diagnóstico). Ataca os 352 `console.*`
  em `src/` sem refactor manual. `debugger` também removido em prod.
- 🟡 Quebrar `MbrV2Page` (1060) e `CreateKpiDialog` (1059) em sub-componentes — W2.F.
- 🟡 Adicionar `React.memo` em mais cards/listas (baseline 63 arquivos hoje) — W2.F.
- 🟡 Auditar `JSON.parse` (34 ocorrências) → migrar para `tryParseAiJson` onde
  o input vier de LLM ou storage não-confiável — W2.F.

---

## Wave 2 — Refatoração (2-3 semanas)

- **B.1** Split das Edge Functions > 500 linhas (template: `okr-construction-review` 388 LoC).
  - ✅ `team-checkin-summary` (962 → 152 LoC index + 4 módulos: `types`, `pace`, `data-loader`, `agents`) — 2026-05-04
  - ✅ Helper `_shared/ai-json.ts` (`tryParseAiJson` / `sanitizeJsonResponse` / `extractSettled`) extraído para reutilização — 2026-05-04
  - 🟡 Restantes: `analysis-generate` (671), `invoke-vic` (552), `qbr-executive-report` (520), `mbr-summary` (513), `collaborator-checkin-summary` (508)
- **B.2** `Promise.all` em agregações restantes (`invoke-vic` não usa hoje).
- **B.3** Enforce `correlation-id` em todas as Edge Functions (validar via middleware).
- **F.1** `React.memo` em 100% de cards/listas — meta: lint-enforced.
- **F.2** Quebrar páginas > 700 LoC em sub-componentes (~14 arquivos).
- **F.3** `@tanstack/react-virtual` para listas > 50 itens.
- **F.4** Reduzir `console.*` em produção (352 em src, 405 em functions).

---

## Wave 3 — Contínuo

- Particionar `audit_logs` e `perf_metrics_snapshots` por mês.
- Snapshots de `pg_stat_statements` semanais.
- CI gate: `EXPLAIN` para queries novas em PRs.
- Critical CSS + service worker.
- ESLint rules bloqueando: `console.*` em prod, `JSON.parse` raw, `.select("*")`,
  arquivos > 600 LoC.
- Storybook coverage de componentes compartilhados.

---

## Métricas-baseline (2026-05-04)

| Métrica | Atual | Alvo |
|---|---|---|
| Seq scans/dia | < 200 (após W1) | < 200 |
| Edge functions > 500 LoC | 5 → 5 (1 splitada, 962→152) | 2 |
| `.select("*")` em src | 0 | 0 ✅ |
| Arquivos src > 600 LoC | 19 | 10 |
| `console.*` em src | 352 | < 80 |
| `console.*` em functions | 405 | < 100 |
| `React.memo` em arquivos | 63 | 100+ |
| `JSON.parse` raw em src | 34 | < 5 |

---

## Fora de escopo

- UX/redesign visual.
- Upgrades React 18→19 / Vite 5→6.
- Migração para outro provedor de banco.
- `src/integrations/supabase/types.ts` (12k linhas, auto-gerado).
