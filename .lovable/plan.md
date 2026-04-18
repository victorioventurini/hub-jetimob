

# Plano: Módulo "Análise Estratégica" (`/analysis`)

## Pré-checklist canônico ✅
- TCR v3.25.1 lido (Stack, RLS BU-scoped, Identity, Magic Link, Rotas, IA Gateway).
- DEVELOPMENT_STANDARDS, PERMISSIONS_AND_RBAC_MODEL, DATA_MODEL_REGISTRY consultados.
- Padrões em memória aplicados: `mandatory-bu-filtering-standard`, `ai-multi-llm-gateway-standard-v2-0-0`, `ai-robust-parsing-sanitization-standard`, `ai-data-normalization`, `edge-function-standard-v4`, `edge-function-performance-standard`, `bu-context-query-gating`, `query-key-prefix-standard`, `query-optimization-standard`, `wizard-development`, `frontend-memoization-standard`, `portal-event-isolation-standard`, `decision-item-standard-v2-updated`, `cross-step-decision-logging-standard`.
- Codebase auditado: agentes existentes (`analista-kpis`, `coach-okrs`, `facilitador-decisoes`, `revisor-comunicacao`), `agent-loader.ts`, `invoke-vic`, `qbr-pre-summary` (orquestração paralela com `Promise.allSettled`), `DecisionCard`/`InlineDecisionInput`, `StarRatingInput` do MBR, `BuUserMultiSelect`, `process-notification-outbox` (e-mails).
- Tabelas atuais relevantes: `ai_agents` (com `slug`, `output_format`, `output_schema`, `allowed_tools`), `ai_agent_logs`, `modules`, `permission_catalog`, `bu_ia_config`, `okr_wizard_sessions`, `project_comments` (padrão de comentário existente).

## Decisões de arquitetura

1. **Reuso máximo, zero duplicação.** Nenhum componente paralelo a `DecisionCard`, `StarRatingInput`, `BuUserMultiSelect` ou pipeline de e-mail.
2. **Agente único novo:** `analista-estrategico` (global, integration_key `chatgpt`, `output_format=json`, `output_schema` definido). Reaproveita `facilitador-decisoes` existente para ações sugeridas — **não** criar segundo agente.
3. **Edge Function única `analysis-generate`** (factory + middleware do `_shared`), seguindo padrão `qbr-pre-summary`: orquestra `analista-estrategico` + `facilitador-decisoes` em **`Promise.allSettled`**, com `sanitizeJsonResponse` e fallback defensivo. Respeita `bu_ia_config.ia_enabled`.
4. **Coleta de dados respeita `period` × `depth`** (sem limite fixo), feita em paralelo por módulo selecionado via `Promise.all`.
5. **Modo Automático/Misto:** primeira chamada leve ao `analista-estrategico` apenas para sugerir módulos a partir da premissa (output JSON `{modules: string[], rationale}`), depois 2ª chamada com dados completos.
6. **Rota nova `/analysis` registrada em `src/routes/core.routes.tsx`** (não em `App.tsx`) atrás de `ProtectedRoute > BuRequiredRoute > ModuleRoute moduleSlug="analysis"`.
7. **Templates protegidos** (10–12) gated por `useAuth().isAdmin || role_in_bu==='admin'`.
8. **Compartilhamento e agendamentos** reutilizam `process-notification-outbox` com novo `event_slug='analysis.shared'` / `analysis.scheduled` e templates de notificação (sistema existente).

## Banco de dados (uma única migration)

### Novo módulo
```sql
INSERT INTO public.modules (slug, name, description, type, route, display_order, status)
VALUES ('analysis','Análise Estratégica','Análises com IA cruzando KPIs, OKRs, Projetos e Rituais','operational','/analysis', <next>, 'active');
```

### Permissões (`module.resource.action:scope`)
- `analysis.report.create:bu`
- `analysis.report.view:bu`
- `analysis.report.delete:own`
- `analysis.report.delete:bu`
- `analysis.template.manage:bu`
- `analysis.schedule.manage:bu`

### Tabelas (todas com `bu_id NOT NULL`, RLS via `is_bu_member(bu_id)` + `has_role`)
| Tabela | Função |
|---|---|
| `analysis_reports` | premissa, mode, modules[], scope (jsonb), period (jsonb), depth, additional_context, result (jsonb), sources (jsonb), title, created_by, bu_id, status, deleted_at |
| `analysis_feedback` | report_id, rating(1-5), text, user_id, bu_id (mesmo padrão do MBR feedback) |
| `analysis_comments` | report_id, body, author_profile_id, bu_id, deleted_at (espelha `project_comments`) |
| `analysis_templates` | name, category, premise, defaults (jsonb), is_admin_only, scope (`global`/`bu`), bu_id (nullable se global), created_by |
| `analysis_schedules` | template_id, frequency (`weekly`/`monthly`/`per_cycle`), cron_expr, recipients (jsonb uuid[]), is_active, bu_id, last_run_at, next_run_at |
| `analysis_share_log` | report_id, recipient_profile_id, sent_at, bu_id |

**Sem CHECK constraints** (memory `database/check-constraint-prohibition`) — usar enums:
- `analysis_mode AS ENUM ('auto','manual','mixed')`
- `analysis_depth AS ENUM ('auto','minimal','standard','full')`
- `analysis_status AS ENUM ('pending','generating','complete','failed')`
- `analysis_schedule_frequency AS ENUM ('weekly','monthly','per_cycle')`

**RLS canônica:**
- SELECT: `is_bu_member(bu_id)` (qualquer usuário da BU vê)
- INSERT: `has_permission('analysis.report.create:bu', bu_id)`
- UPDATE: autor OU `has_role(admin)`
- DELETE soft: autor (`:own`) OU admin BU (`:bu`)
- Templates admin-only filtrados em query + RLS extra

### Inserts (data, via insert tool)
- 1 agente `analista-estrategico` em `ai_agents` (system_prompt completo + `output_schema`).
- 12 templates em `analysis_templates` (categoria + flag `is_admin_only` para 10–12).

## Edge Functions

### `analysis-generate` (nova)
- Middleware: `withMiddleware({ requireAuth:true, requireBu:true, validateBuAccess:true, logRequest:true })`
- Verifica `bu_ia_config.ia_enabled` → 403 `IA_DISABLED`
- Cria `analysis_reports(status='generating')` e retorna `report_id` imediatamente (UI faz polling/realtime)
- **Fase 1 (modo `auto`/`mixed`):** chama `analista-estrategico` com premissa → JSON `{modules}`
- **Fase 2 — coleta paralela** por módulo (`Promise.all`) respeitando `period` + `depth`:
  - KPIs: `kpi_values` + `kpis` filtrados por `bu_id` + janela
  - OKRs: `okr_team_objectives`+`okr_team_key_results`+`okr_org_objectives` no ciclo
  - Projetos/Iniciativas: `projects` + `okr_initiatives`
  - Check-ins: `okr_checkins` no período
  - Wizards: `okr_wizard_sessions` (`reflection_data`) no período
- **Fase 3 — orquestração IA paralela:**
  ```ts
  Promise.allSettled([
    invokeAgentDirect(serviceClient, 'analista-estrategico', promptComAdditionalContextPrimeiro, buId, requestId),
    invokeAgentDirect(serviceClient, 'facilitador-decisoes', promptDeAcoes, buId, requestId),
  ])
  ```
- Normalização: `sanitizeJsonResponse` + extração regex defensiva (memory `ai-robust-parsing-sanitization-standard`).
- Persiste resultado completo em `analysis_reports.result` e `sources`, status `complete`.
- Erros 429/402 propagados como códigos para toast no front.

### `analysis-share` (nova, pequena)
- Recebe `report_id` + `recipient_profile_ids[]`
- Insere em `notification_outbox` (sistema existente) com `event_slug='analysis.shared'` + `context_url=/analysis/:id`
- Registra em `analysis_share_log`

### `analysis-schedule-runner` (nova, invocada por cron-dispatcher)
- Adicionada como passo no `cron-dispatcher/index.ts` existente (não criar novo cron).
- Para cada `analysis_schedules` com `next_run_at <= now()` e `is_active=true`: invoca `analysis-generate` com defaults do template; emite outbox `analysis.scheduled` para `recipients[]`; recalcula `next_run_at`.

### Agente `analista-estrategico` — system prompt (resumo)
- Identidade: analista estratégico SaaS imobiliário BR, sazonalidade considerada.
- Regras: incluir `additional_context` ANTES dos dados. Específico, acionável, causa-raiz, correlações cross-módulo.
- Aplica `CANONICAL_PROGRESS_INTERPRETATION_RULES` (já em `agent-loader.ts`).
- Output JSON estrito: `{title, key_metrics:[{label,value,reference,delta}], insights:[{type:'info|warning|positive', title, body}], body, sources:[{module,entityType,entityId,label}]}`.

## Frontend

### Estrutura `src/modules/analysis/`
```
analysis/
├─ pages/
│  ├─ AnalysisHomePage.tsx           // composer + histórico
│  ├─ AnalysisResultPage.tsx         // /analysis/:reportId
│  └─ AnalysisTemplatesPage.tsx      // /analysis/templates
├─ components/
│  ├─ composer/ (PremiseField, AdditionalContextField, ModeSelector, ModulesChips, ScopePills, PeriodPills, DepthSelector)
│  ├─ result/ (ResultHeader, SourcesChips, KeyMetricsGrid, InsightBlock, AnalysisBody, SuggestedActions, AnalysisCommentList)
│  ├─ feedback/AnalysisFeedback.tsx  // REUSA StarRatingInput extraído do MBR (ver refactor abaixo)
│  ├─ ShareDialog.tsx                // usa BuUserMultiSelect
│  └─ LoadingRotativo.tsx
├─ hooks/
│  ├─ useGenerateAnalysis.ts         // mutation
│  ├─ useAnalysisReport.ts           // realtime via supabase channel
│  ├─ useAnalysisHistory.ts
│  ├─ useAnalysisTemplates.ts
│  └─ useAnalysisFeedback.ts
└─ types/
```

### Refactor mínimo necessário (preservar reuso)
- Extrair `StarRatingInput`/`StarRatingDisplay` de `MbrClosingStep.tsx` para `src/components/ui/star-rating.tsx` e re-importar no MBR e no QBR Meeting (hoje duplicado em 2 lugares). Zero alteração de comportamento.

### Reuso confirmado
- `DecisionCard` + `InlineDecisionInput` (`@/modules/okrs/components/wizards/shared`) para "Ações sugeridas" que viram decisões formais.
- `BuUserMultiSelect` para seletor de compartilhamento.
- `useBuScopedSupabase` + `currentBuId` síncrono em todas as queries (memory `bu-context-query-gating`).
- Query keys em novo arquivo `src/lib/queryKeys/analysis.ts` com helpers de prefixo (memory `query-key-prefix-standard`), exportado em `src/lib/queryKeys.ts`.
- Toasts de erro 429/402 via `mapLLMError` pattern existente.

### Rota e navegação
- `src/routes/core.routes.tsx`: registrar `/analysis`, `/analysis/:reportId`, `/analysis/templates` com `ModuleRoute moduleSlug="analysis"`.
- Sidebar (`src/components/layout/Sidebar.tsx`): novo item "Análise" abaixo de "OKRs/Métricas", filtrado por `useModuleAccess('analysis')`.

### Loading rotativo
Componente `LoadingRotativo` com array de 4 mensagens, `setInterval(2000)`, cleanup em `useEffect`.

### Comentários
Reutilizar padrão estrutural de `project_comments` (avatar + texto + timestamp). Sem componente de "comments framework" generalizado — implementação direta na página.

## Arquivos a criar/editar

**Migrations (1)** — schema + enums + RLS + índices.
**Inserts (data)** — agente + 12 templates.
**Edge Functions (3)** — `analysis-generate`, `analysis-share`, atualização de `cron-dispatcher`.
**Frontend (≈25 arquivos novos)** dentro de `src/modules/analysis/` + 1 refactor de `StarRatingInput` + edição em `core.routes.tsx`, `Sidebar.tsx`, `lib/queryKeys.ts`.

## Validações pós-implementação
1. Geração funciona end-to-end com `additional_context` e respeita `depth`.
2. RLS bloqueia análise de outra BU (testar com 2 BUs).
3. `bu_ia_config.ia_enabled=false` retorna 403 com toast claro.
4. Decisões registradas via SuggestedActions aparecem no sistema central de decisões.
5. Feedback grava `analysis_feedback` e influencia média no histórico.
6. Compartilhamento dispara e-mail real via outbox.
7. Templates 10–12 invisíveis para usuário não-admin.
8. Agendamento mensal cria análise automaticamente quando cron-dispatcher roda.

## Impacto e risco
- **Aditivo**: zero quebra de módulo existente.
- Único refactor é mover `StarRatingInput` para componente compartilhado (pré-condição de reuso exigida pelo briefing do Claude).
- Conformidade total com TCR v3.25.1 e regras inquebráveis (PRE-BU/POST-BU, BU-scoped, sem `select('*')`, query keys centralizadas, RBAC por permission key).

