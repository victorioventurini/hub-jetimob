

# Plano de Otimização de Performance

Diagnóstico baseado em métricas reais do banco (`pg_stat_user_indexes`, `pg_stat_user_tables`), inventário do código (~33 edge functions, App.tsx com lazy loading, cache config centralizado) e auditorias já existentes em `scripts/`.

## Estado Atual (linha de base)

**Já implementado** (não vamos refazer): 100% query-keys centralizadas, 0 `select('*')`, 7 índices soft-delete, `staleTime` por domínio, lazy loading de rotas, cron de cleanup semanal, RPC para agregações OKR.

**Gaps reais detectados:**
- `ticket_messages` faz **62% de seq scans** (14.735 seq vs 8.885 idx) — RLS provavelmente força full scan apesar dos 9 índices existentes.
- `bu_notification_event_settings`: **91% seq scans** (2.175 seq, 144 linhas) — tabela pequena, baixo impacto, mas reflete query sem filtro adequado.
- **20 índices nunca usados** (1.31 MB), incluindo `idx_ai_agent_logs_created_at`, `idx_cron_execution_logs_created_at`, `idx_okr_audit_log_created_at` — duplicatas de outros índices na mesma tabela.
- Tabelas com **dead tuples >20%** sem autovacuum recente: `kpi_metrics` (60%), `ai_agents` (67%), `okr_wizard_sessions` (32%), `tickets` (23%), `profiles` (24%), `okr_team_key_results` (35%).
- `perf_metrics_snapshots`: **107 MB** com 24.415 linhas de telemetria — o cron coleta indefinidamente sem retenção.
- `cron_execution_logs`: **6.2 MB**, 14.342 linhas, retenção idem.
- `vite.config.ts` **não tem `manualChunks`** — bundle é dividido apenas por rota lazy, vendor inteiro vai num chunk só.
- Edge functions de IA (`qbr-executive-report`, `okr-construction-review`, etc.) já usam `Promise.all`, mas **falta tracking de tempo de resposta**.

---

## 5.1 Banco de Dados

### P1.1 Retenção de telemetria (alta prioridade — libera 110+ MB)
- Adicionar política de retenção na função `cleanup_old_logs()`:
  - `perf_metrics_snapshots`: manter apenas últimos **30 dias** (hoje guarda tudo).
  - `cron_execution_logs`: manter **14 dias**.
  - `ai_agent_logs`: manter **60 dias**.
  - `okr_audit_log` + `audit_logs`: manter **180 dias**.

### P1.2 Drop de índices duplicados/não usados
Após confirmar que estatísticas são representativas (>30 dias de uso), remover:
- `idx_cron_execution_logs_created_at` (duplicata de `idx_cron_logs_ran_at`)
- `idx_ai_agent_logs_created_at` (duplicata de `idx_ai_agent_logs_created_at_bu`)
- `idx_okr_audit_log_created_at` (índice em tabela de 1.132 linhas, sem uso)
- 4 índices `idx_partner_*` / `idx_asset_recommendations_*` em tabelas vazias ou sub-utilizadas.
- Estimativa: ~600 KB liberados, menos overhead em writes.

### P1.3 Investigar seq scans em `ticket_messages`
- Rodar `EXPLAIN ANALYZE` na query principal (`SELECT ... FROM ticket_messages WHERE ticket_id = X`).
- Hipótese: a RLS policy força recheck que ignora o índice composto. Solução: criar policy `SECURITY DEFINER` helper já presente (`user_can_access_ticket(ticket_id)`) e refatorar.

### P1.4 VACUUM ANALYZE manual nas tabelas com dead tuples >20%
- Migration única: `VACUUM ANALYZE` em `kpi_metrics`, `ai_agents`, `okr_wizard_sessions`, `tickets`, `profiles`, `okr_team_key_results`, `permission_catalog`, `bu_user_memberships`.

### P1.5 Documentação
- Atualizar `docs/canonical/DB_FUNCTIONS_INDEX.md` com nova retenção.
- Criar `docs/perf/RETENTION_POLICY.md` consolidando todas as janelas.

---

## 5.2 Backend (Edge Functions)

### P2.1 Tracking de tempo em funções de IA
- Adicionar wrapper `withTiming()` em `_shared/timing.ts` que loga `{ function, duration_ms, model, tokens }` via `logger.info`.
- Aplicar em: `qbr-executive-report`, `okr-construction-review`, `qbr-meeting-summary`, `mbr-summary`, `weekly-curate-opening`, `invoke-vic`, `okr-org-health-review`.

### P2.2 Cache compartilhado para LLM (médio impacto)
- Em `_shared/llm-client.ts`, adicionar cache em memória (TTL 5min) de prompts determinísticos repetidos dentro do mesmo cold start (ex.: validador metodológico chamado em sequência por vários KRs).
- Ganho estimado: 30–40% em rituais de revisão em massa.

### P2.3 Streaming progressivo onde aplicável
- `qbr-executive-report` e `okr-construction-review` retornam **payload completo** após 30–60s. Migrar para resposta SSE/streaming usando o gateway Lovable AI já configurado.
- Reduz TTFB percebido sem mexer no agente.

### P2.4 Health endpoint enxuto
- `health-check` hoje toca múltiplas tabelas. Reduzir para um único `SELECT 1` + verificação de cron mais recente. Cache 30s.

### P2.5 Documentação
- `docs/canonical/EDGE_PERFORMANCE_STANDARD.md` com padrões de timing/log/cache.

---

## 5.3 Frontend

### P3.1 Bundle splitting manual no Vite
- Adicionar `build.rollupOptions.output.manualChunks` em `vite.config.ts`:
  - `react-vendor`: react, react-dom, react-router
  - `radix-vendor`: todos os `@radix-ui/*`
  - `query-vendor`: @tanstack/react-query, supabase
  - `chart-vendor`: recharts, date-fns
- Habilitar `build.cssCodeSplit` (default true, validar) e `chunkSizeWarningLimit: 1000`.
- Estimativa: -40% no chunk principal, melhor cache entre deploys.

### P3.2 Auditoria de re-renders em listas críticas
- Aplicar `React.memo` nos componentes ainda não cobertos (validar via `npx tsx scripts/audit-shared-components.ts`):
  - `OkrTeamKrCard`, `TicketRow`, `KpiHistoryRow`, `RitualOccurrenceCard`, `ProjectMilestoneRow`.
- Garantir keys estáveis (sem `index` em iterações grandes).

### P3.3 Suspense boundaries granulares
- Hoje `App.tsx` tem 1 Suspense top-level. Adicionar boundaries em:
  - Dashboards de OKR (separar header de grid)
  - Página de tickets (separar lista de detalhe)
- Ganho: parts of UI ficam interativas antes do payload completo.

### P3.4 Imagens e ícones
- Verificar se `lucide-react` está sendo tree-shaken corretamente (importar named, não default).
- Migrar avatares para `<img loading="lazy" decoding="async">` onde ainda não estiver.

### P3.5 Prefetch inteligente
- No menu lateral, no `onMouseEnter` de itens, executar `queryClient.prefetchQuery` da tela alvo (tickets list, OKR dashboard, home).
- Ganho de ~200–500ms percebido na navegação.

### P3.6 Documentação e enforcement
- Atualizar `docs/guides/PERF_PLAYBOOK.md` com:
  - Como ler `pg_stat_user_indexes` periodicamente
  - Checklist de bundle (`npm run build -- --report`)
  - Padrão de prefetch
- Criar `scripts/audit-bundle.ts` que falha o build se chunk principal > 500KB.

---

## Detalhes Técnicos

| Wave | Risco | Reversível | Validação |
|------|-------|-----------|-----------|
| **W1** — Retenção (P1.1) + VACUUM (P1.4) + drop índices (P1.2) | Baixo | Sim (migração) | `pg_stat_user_tables` antes/depois |
| **W2** — Backend timing/cache/streaming (P2.1–P2.4) | Médio | Sim (sem mudança de contrato) | Logs `function_edge_logs` |
| **W3** — Bundle splitting + memo + prefetch (P3.1–P3.5) | Baixo | Sim | `tsc --noEmit` + smoke manual |
| **W4** — Investigação `ticket_messages` (P1.3) + docs (P1.5/P2.5/P3.6) | Médio | Sim | EXPLAIN ANALYZE |

### Métricas-alvo
- Banco: -110 MB (telemetria), -50% seq scans em `ticket_messages`, dead tuples <10% nas tabelas críticas.
- Backend: -30% latência em rituais de IA via cache, TTFB <2s em relatórios.
- Frontend: bundle principal <500 KB gzipped, FCP -300ms via prefetch.

### Arquivos novos (estimativa)
- `supabase/functions/_shared/timing.ts`
- `supabase/migrations/<ts>_perf_retention_and_vacuum.sql`
- `supabase/migrations/<ts>_drop_unused_indexes.sql`
- `docs/perf/RETENTION_POLICY.md`
- `docs/canonical/EDGE_PERFORMANCE_STANDARD.md`
- `scripts/audit-bundle.ts`

### Arquivos modificados
- `vite.config.ts` (manualChunks)
- `supabase/functions/_shared/llm-client.ts` (cache)
- `supabase/functions/cron-dispatcher/index.ts` (chamar cleanup com nova retenção)
- ~7 edge functions de IA (wrap timing)
- ~5 componentes de lista (React.memo)
- `docs/guides/PERF_PLAYBOOK.md`

### Out-of-scope (ficam para futuro)
- Migração para Edge Runtime regional (depende de plano Supabase).
- CDN de assets estáticos próprios (Lovable já serve via CDN).
- Materialized views para dashboards (só se houver evidência de gargalo após W1–W3).

