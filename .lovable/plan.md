

# Plano: Etapa 2 do módulo `/analysis` — Edge Functions + Frontend

## Pré-checklist canônico ✅
- TCR v3.25.1 (Stack, PRE-BU/POST-BU, Magic Link, RLS BU-scoped, IA Gateway, rotas via `src/routes/*.routes.tsx`)
- DEVELOPMENT_STANDARDS v1.29.0 (cliente singleton, query keys centralizadas, sem `select('*')`, URL state)
- BU_SCOPED_SUPABASE_RULES v4.1.0 (`useBuScopedSupabase` em todo módulo operacional)
- QUERY_KEYS_STANDARD (helpers de prefixo + namespace por módulo)
- Padrões em memória aplicados: `mandatory-bu-filtering-standard`, `ai-multi-llm-gateway-standard-v2-0-0`, `ai-robust-parsing-sanitization-standard`, `ai-data-normalization`, `edge-function-standard-v4`, `edge-function-performance-standard`, `bu-context-query-gating`, `query-key-prefix-standard`, `query-optimization-standard`, `frontend-memoization-standard`, `portal-event-isolation-standard`, `decision-item-standard-v2-updated`, `cross-step-decision-logging-standard`, `wizard-development`
- Padrões já em uso confirmados: `qbr-pre-summary` (orquestração `Promise.allSettled` + `invokeAgentDirect`), `process-notification-outbox` (canal email/in_app via `notification_outbox`), `cron-dispatcher` (RPCs em try/catch), `BuUserMultiSelect` canônico, `DecisionCard`/`InlineDecisionInput` em `wizards/shared`, `StarRatingInput` duplicado em MBR e QBR Meeting (será extraído).

## Arquitetura

### 1. Edge Functions (3)

#### `supabase/functions/analysis-generate/index.ts`
- Usa `withMiddleware({ requireAuth:true, requireBu:true, validateBuAccess:true, logRequest:true })` do `_shared/middleware.ts`.
- Verifica `bu_ia_config.ia_enabled` → 403 `IA_DISABLED` se desativada.
- Cria registro em `analysis_reports(status='generating')` e responde imediato com `{ report_id }`. UI faz polling (TanStack Query `refetchInterval`).
- **Fase 1 (modo `auto`/`mixed`):** chama `analista-estrategico` apenas com a premissa pedindo JSON `{modules:[], rationale}` para sugerir módulos.
- **Fase 2 — coleta paralela** via `Promise.all` por módulo selecionado, respeitando `period × depth`:
  - `kpis`: `kpis` + `kpi_values` filtrados por `bu_id` + janela
  - `okrs`: `okr_team_objectives` + `okr_team_key_results` + `okr_org_objectives`
  - `projects`/`initiatives`: `projects` + `okr_initiatives`
  - `checkins`: `okr_checkins`
  - `wizards`: `okr_wizard_sessions.reflection_data`
  - **Sem `select('*')`** — campos explícitos.
- **Fase 3 — orquestração paralela:**
  ```ts
  const [strategic, actions] = await Promise.allSettled([
    invokeAgentDirect(serviceClient, 'analista-estrategico', promptComContextoAdicionalPrimeiro, buId, requestId),
    invokeAgentDirect(serviceClient, 'facilitador-decisoes', promptDeAcoes, buId, requestId),
  ]);
  ```
- Normalização: `sanitizeJsonResponse` + regex de salvamento (memory `ai-robust-parsing-sanitization-standard`).
- Update final em `analysis_reports.result`/`sources`/`suggested_actions`/`status='complete'`. Em erro, `status='failed'` + `error_message`.
- Erros 429/402 do gateway propagam com códigos para toast.

#### `supabase/functions/analysis-share/index.ts`
- Recebe `{ report_id, recipient_profile_ids[] }`.
- Resolve `auth.users.id` por `profiles.user_id` (memory `IDENTITY_CONVENTION`).
- Insere N linhas em `notification_outbox` com `event_slug='analysis.shared'`, `channel_slug='email'` e `channel_slug='in_app'`, payload com `report_url` e `report_title`.
- Insere em `analysis_share_log` para histórico.

#### Atualização do `cron-dispatcher`
- Adiciona `runAnalysisSchedules(supabase)` em try/catch (mesmo padrão das outras RPCs).
- Para cada `analysis_schedules` com `is_active=true AND next_run_at <= now()`:
  - Invoca `analysis-generate` com defaults do `analysis_templates`.
  - Insere outbox `analysis.scheduled` para `recipients[]`.
  - Atualiza `last_run_at` e calcula `next_run_at` conforme `frequency`.

### 2. Refactor mínimo: `StarRatingInput` compartilhado
- Cria `src/components/ui/star-rating.tsx` com `StarRatingInput` + `StarRatingDisplay` (cópia exata do MBR, zero mudança visual).
- Atualiza `MbrClosingStep.tsx` e `QbrMeetingClosingStep.tsx` para importar do novo arquivo (remove definições inline).

### 3. Frontend — `src/modules/analysis/`

```
src/modules/analysis/
├─ pages/
│  ├─ AnalysisHomePage.tsx           // composer + histórico
│  ├─ AnalysisResultPage.tsx         // /analysis/:reportId
│  └─ AnalysisTemplatesPage.tsx      // /analysis/templates
├─ components/
│  ├─ composer/
│  │  ├─ PremiseField.tsx
│  │  ├─ AdditionalContextField.tsx
│  │  ├─ ModeSelector.tsx
│  │  ├─ ModulesChips.tsx
│  │  ├─ ScopePills.tsx
│  │  ├─ PeriodPills.tsx
│  │  └─ DepthSelector.tsx
│  ├─ result/
│  │  ├─ ResultHeader.tsx
│  │  ├─ SourcesChips.tsx
│  │  ├─ KeyMetricsGrid.tsx
│  │  ├─ InsightBlock.tsx
│  │  ├─ AnalysisBody.tsx
│  │  ├─ SuggestedActions.tsx        // usa DecisionCard / InlineDecisionInput
│  │  └─ AnalysisCommentList.tsx
│  ├─ feedback/AnalysisFeedback.tsx  // usa StarRatingInput compartilhado
│  ├─ history/AnalysisHistoryList.tsx
│  ├─ ShareDialog.tsx                 // usa BuUserMultiSelect
│  └─ LoadingRotativo.tsx             // 4 mensagens com setInterval(2000) + cleanup
├─ hooks/
│  ├─ useGenerateAnalysis.ts          // mutation → invoca edge function
│  ├─ useAnalysisReport.ts            // query com refetchInterval enquanto status != complete
│  ├─ useAnalysisHistory.ts
│  ├─ useAnalysisTemplates.ts
│  ├─ useAnalysisFeedback.ts
│  ├─ useAnalysisComments.ts
│  └─ useAnalysisShare.ts
├─ types/index.ts
└─ index.ts
```

**Regras aplicadas:**
- `useBuScopedSupabase()` em todas as queries operacionais.
- Query keys em `src/lib/queryKeys/analysis.ts` com `allPrefix()`/`listPrefix()` + adição em `src/lib/queryKeys.ts`.
- Sem `select('*')` — campos explícitos.
- Filtros de composer (mode, modules, scope, period, depth) sincronizados com URL via `useUrlState` (regra inquebrável #7).
- `React.memo` em `AnalysisHistoryList` row e `InsightBlock`.
- Toasts mapeados para `RATE_LIMIT` (429) e `NO_CREDITS` (402) seguindo padrão `useVicAgent`.
- Comentários: implementação simples direta (avatar + texto + timestamp), sem framework genérico.
- `LoadingRotativo` com `useEffect` cleanup do `setInterval`.

### 4. Rotas e navegação

#### `src/routes/analysis.routes.tsx` (novo)
```tsx
export const analysisRoutes = (
  <>
    <Route path="/analysis" element={<AnalysisRoute><AnalysisHomePage/></AnalysisRoute>} />
    <Route path="/analysis/templates" element={<AnalysisRoute><AnalysisTemplatesPage/></AnalysisRoute>} />
    <Route path="/analysis/:reportId" element={<AnalysisRoute><AnalysisResultPage/></AnalysisRoute>} />
  </>
);
```
Wrapper `AnalysisRoute` segue padrão `ProjectRoute`: `ProtectedRoute > BuRequiredRoute > ModuleRoute moduleSlug="analysis"`.

#### `src/routes/index.ts`
Adiciona `export { analysisRoutes } from './analysis.routes';`.

#### `src/App.tsx`
Inclui `{analysisRoutes}` (mesmo padrão de `{projectRoutes}`).

#### `src/components/layout/Sidebar.tsx`
Adiciona item `"Análise"` com ícone `Sparkles` (lucide) abaixo de `OKRs/Métricas`. Filtragem natural ocorre via `ModuleRoute`/menu existente — nenhum hardcode de role.

### 5. Templates page (`/analysis/templates`)
- Lista templates lidos via `useAnalysisTemplates()` (RLS já filtra `is_admin_only` no backend).
- Botão "Usar este template" → navega para `/analysis?template_id=...` (URL state).
- `AnalysisHomePage` consome `template_id` e pré-preenche o composer.

### 6. ShareDialog
- Usa `BuUserMultiSelect` (componente canônico).
- Botão "Enviar" chama `useAnalysisShare()` → invoca edge function `analysis-share`.
- Toast de sucesso confirmando destinatários.

## Arquivos a criar/editar

**Edge Functions:**
- `supabase/functions/analysis-generate/index.ts` (novo)
- `supabase/functions/analysis-share/index.ts` (novo)
- `supabase/functions/cron-dispatcher/index.ts` (edição: adiciona `runAnalysisSchedules`)

**Frontend novo (~25 arquivos):** estrutura `src/modules/analysis/` listada acima
- `src/components/ui/star-rating.tsx` (novo)
- `src/lib/queryKeys/analysis.ts` (novo)
- `src/routes/analysis.routes.tsx` (novo)

**Edição mínima:**
- `src/lib/queryKeys.ts` (adiciona `analysis` ao objeto unificado)
- `src/routes/index.ts` (export)
- `src/App.tsx` (monta `{analysisRoutes}`)
- `src/components/layout/Sidebar.tsx` (item "Análise")
- `src/modules/okrs/components/wizards/mbr/MbrClosingStep.tsx` (import do novo `star-rating`)
- `src/modules/okrs/components/wizards/qbr-meeting/QbrMeetingClosingStep.tsx` (import do novo `star-rating`)

## Validações pós-implementação
1. Geração end-to-end com `additional_context`; validar que aparece no prompt **antes** dos dados estruturados.
2. RLS bloqueia visualização cross-BU (testar com 2 BUs).
3. `bu_ia_config.ia_enabled=false` → 403 + toast.
4. Decisões registradas via `SuggestedActions` aparecem no sistema central.
5. Feedback grava `analysis_feedback` (1–5) e influencia média no histórico.
6. Compartilhamento dispara e-mail real via outbox + `in_app`.
7. Templates 10–12 invisíveis para não-admin.
8. Agendamento mensal cria análise via `cron-dispatcher`.
9. Estados de filtro do composer persistem na URL (compartilhamento de link).
10. Loading rotativo limpa `setInterval` ao desmontar (sem leak).

## Conformidade
- **TCR v3.25.1:** rotas via `src/routes/*.routes.tsx` (não em `App.tsx`); `useBuScopedSupabase` em todo módulo; magic link inalterado.
- **DEVELOPMENT_STANDARDS v1.29.0:** PRE-BU/POST-BU correto; sem `select('*')`; query keys centralizadas; URL state para filtros.
- **BU_SCOPED_SUPABASE_RULES v4.1.0:** zero import de `client.ts`; uso exclusivo de `useBuScopedSupabase`.
- **PERMISSIONS_AND_RBAC_MODEL:** todas as 6 permissions criadas na etapa 1; sem hardcode de roles na UI; admin-only via RLS.
- **IDENTITY_CONVENTION:** edge function resolve `auth.users.id` via `profiles.user_id` para `notification_outbox`.

## Impacto e risco
- **Aditivo**: zero quebra de módulo existente. Único refactor é mover `StarRatingInput` para componente compartilhado (pré-condição de reuso explicitada no briefing original).
- Cron-dispatcher recebe novo passo isolado em try/catch — falha não afeta outros passos.

