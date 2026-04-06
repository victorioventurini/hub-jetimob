

# Relatório Executivo de QBR — Gerado por IA

## Pré-checklist verificado

- [x] **TCR v3.21.0** — multi-BU, auth Magic Link, stack React 18 + Vite + Tailwind + shadcn, Edge Functions Deno, Lovable AI Gateway
- [x] **DEVELOPMENT_STANDARDS v1.27.0** — POST-BU (`useBuScopedSupabase`), `.eq('bu_id', currentBuId)` obrigatório, query keys centralizadas, URL state via `@/shared/url`, Edge Functions ≤500 linhas com `withMiddleware`
- [x] **DATA_MODEL_REGISTRY** — `okr_wizard_sessions` (BU-scoped, RLS), `okr_team_objectives`, `okr_team_key_results`, `okr_org_objectives`, `okr_org_key_results`, `kpi_metrics`, `kpi_values`, `cycles`, `teams`
- [x] **QUERY_KEYS_STANDARD** — Nunca inline; usar `okrsKeys` em `src/lib/queryKeys/okrs.ts`
- [x] **BU_SCOPED_SUPABASE_RULES v4.1** — `useBuScopedSupabase()` para dados operacionais, `supabase.functions.invoke()` herda headers BU
- [x] **WIZARD_DEVELOPMENT_GUIDE v1.0** — `FullPageWizardShell`, insights obrigatórios, snapshot em `reflection_data`
- [x] **Memory: edge-function-standard-v4** — `withMiddleware`, `resolveLLMConfig`, `llmComplete`, `successResponse`/`errorResponse`
- [x] **Memory: ai-multi-llm-gateway-standard-v2** — modelo padrão `google/gemini-3-flash-preview`, Lovable AI Gateway
- [x] **Memory: wizard-snapshot-persistence-standard** — snapshot imutável em `reflection_data` JSONB
- [x] **Memory: okr-table-schema-naming** — nomes canônicos: `cycles`, `okr_team_objectives`, `okr_team_key_results`, `kpi_metrics`
- [x] **Memory: mandatory-bu-filtering-standard** — `.eq('bu_id')` explícito em toda query
- [x] **Memory: qbr-pre-clevel-ritual-standard** — edge function `qbr-clevel-learnings-summary` como referência
- [x] **Memory: executive-quarter-review-standard** — `ExecutiveQuarterReviewPage` como referência de layout e queries
- [x] Verificação de implementação similar — não existe `qbr-executive-report` no codebase

## Resumo

Página read-only acessível por BuAdmins que gera um relatório executivo narrativo via Gemini, consolidando OKRs, KPIs, snapshots de rituais e decisões pendentes do quarter. Persistência em `okr_wizard_sessions` com `wizard_type = 'qbr-executive-report'`.

## Correções ao spec do Claude

| Item original | Correção | Motivo (doc canônico) |
|---|---|---|
| `supabase.from(...)` direto na EF | `ctx.serviceClient` do `withMiddleware` | edge-function-standard-v4 |
| `bu_id` no payload | Extrair de `ctx.buId` (header `x-current-bu-id`) | BU_SCOPED_SUPABASE_RULES v4.1 |
| Query keys inline `['qbr-executive-report', ...]` | `okrsKeys.qbrExecutiveReport(buId, cycleId)` | QUERY_KEYS_STANDARD |
| `kpis` como nome de tabela | `kpi_metrics` | okr-table-schema-naming |
| Persistência dentro da EF | Frontend faz upsert após resposta | EF é stateless (edge-function-standard-v4) |
| `import { supabase } from client` | `useBuScopedSupabase()` | BU_SCOPED_SUPABASE_RULES — client.ts proibido |

## Mudanças por arquivo

### 1. `src/lib/queryKeys/okrs.ts` — Nova query key

Adicionar ao objeto `okrsKeys`:
```typescript
qbrExecutiveReport: (buId: string | null, cycleId: string | null) =>
  ['qbr-executive-report', buId, cycleId] as const,
```

### 2. `supabase/functions/qbr-executive-report/index.ts` (NOVO)

Edge function seguindo o padrão exato de `qbr-clevel-learnings-summary`:

- `withMiddleware(req, { requireAuth: true, requireBu: true })`
- `cycleId` do body; `buId` de `ctx.buId`
- 6 queries via `ctx.serviceClient` com `.eq('bu_id', buId)` explícito:
  1. `cycles` — buscar ciclo atual + ciclo anterior (mesmo tipo `quarter`)
  2. `okr_team_objectives` + `okr_team_key_results` do ciclo
  3. `okr_wizard_sessions` — snapshots `qbr-pre` completados
  4. `okr_wizard_sessions` — snapshot `qbr-pre-clevel` (maybeSingle)
  5. `kpi_metrics` scope `org` com join em `kpi_values`
  6. `okr_org_objectives` + `okr_org_key_results` do ano
- `resolveLLMConfig(ctx.serviceClient, 'google/gemini-3-flash-preview')`
- Prompt em PT-BR, tom executivo, retorno JSON com 4 seções
- Rate limit handling (429/402) via padrão `errorResponse`
- ≤500 linhas

### 3. `src/modules/okrs/hooks/useQbrExecutiveReport.ts` (NOVO)

```typescript
export function useQbrExecutiveReport(cycleId: string | null) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  // useQuery: buscar relatório existente em okr_wizard_sessions
  // queryKey: okrsKeys.qbrExecutiveReport(currentBuId, cycleId)
  // enabled: !!cycleId && !!currentBuId
  // .eq('bu_id', currentBuId) obrigatório

  // useMutation: gerar via supabase.functions.invoke('qbr-executive-report')
  // onSuccess: upsert em okr_wizard_sessions + invalidateQueries

  // Retorna: { report, generatedAt, isLoading, generate, isGenerating }
}
```

### 4. `src/modules/okrs/pages/QbrExecutiveReportPage.tsx` (NOVO)

- Layout: `HubLayout` + `PageHeader` com breadcrumbs
- URL state: `cycleId` via `useUrlState` (`@/shared/url`)
- Cycle selector: dropdown com ciclos trimestrais
- 3 estados: inicial (checklist de fontes + botão gerar), loading (mensagens progressivas), sucesso (4 seções narrativas)
- Botões: "Regenerar" + "Copiar link"
- Imports: `useBuScopedSupabase`, `useBu`, componentes shadcn existentes
- Guard: `BuAdminRoute` via rota

### 5. `src/routes/okrs.routes.tsx` — Nova rota

```typescript
const QbrExecutiveReportPage = lazyWithRetry(
  () => import('@/modules/okrs/pages/QbrExecutiveReportPage')
);

<Route path="/okrs/executive/qbr-report"
  element={<OkrRoute requiresBuAdmin><QbrExecutiveReportPage /></OkrRoute>} />
```

### 6. `src/modules/okrs/pages/ExecutiveDashboardPage.tsx` — Link de acesso

Botão "Relatório QBR" ao lado do botão existente "Análise do Quarter":
```tsx
<Link to="/okrs/executive/qbr-report">
  <Button variant="outline" size="sm">
    <FileText className="h-4 w-4 mr-2" />
    Relatório QBR
  </Button>
</Link>
```

### 7. `src/modules/okrs/components/wizards/qbr-pre-clevel/QbrCLevelSystemReadStep.tsx` — Link discreto

Link para `/okrs/executive/qbr-report?cycle={cycleId}` no header do step.

## O que NÃO muda

- Tabela `okr_wizard_sessions` — sem migração (campo `wizard_type` é text livre)
- `WizardPersona` / `ALL_RITUAL_WIZARD_TYPES` — relatório não é um ritual
- Wizards e steps existentes — sem alteração funcional
- Edge functions existentes — sem alteração
- `QbrCLevelDraftData` — sem novos campos

## Decisões técnicas

| Decisão | Justificativa (doc) |
|---|---|
| `requireBu: true` na EF | BU vem do header, não do payload (BU_SCOPED_SUPABASE_RULES) |
| Persistir via frontend | EF stateless (edge-function-standard-v4) |
| `google/gemini-3-flash-preview` | Modelo padrão canônico (ai-multi-llm-gateway-standard-v2) |
| `lazyWithRetry` para a page | Padrão do projeto para lazy loading (okrs.routes.tsx) |
| Tabela de propostas montada no frontend | Dados nos snapshots; evita IA formatar tabelas |
| `useUrlState` para cycleId | URL state obrigatório (DEVELOPMENT_STANDARDS E.1) |
| Não criar novo tipo em `WizardPersona` | É relatório sob demanda, não ritual do catálogo |
| `.eq('bu_id', currentBuId)` em toda query | Regra inquebrável (DEVELOPMENT_STANDARDS A.3) |

