

# Fase 2 — Testes de Integração: Hooks de Mutação

## Análise do estado atual

Os hooks de mutação (`useOkrMutations`, `useCreateTeamOkrBundle`, `useCreateTeamKrBundle`, `useCreateCheckin`, `useGenericWizardDraft`) têm **0 testes de integração**. Os testes existentes no módulo OKRs são majoritariamente unitários puros (cálculos, validações) ou testes de payload estáticos sem renderHook.

O padrão de mock já está estabelecido no projeto:
- `vi.mock('@/integrations/supabase/getOptionalBuClient')` para hooks com `useOptionalBuClient`
- `vi.mock('@/integrations/supabase/useBuScopedSupabase')` para hooks com `useBuScopedSupabase`
- `vi.mock('@/contexts/BuContext')` para `useBu`
- `createMockQueryBuilder` em `src/test/mocks/supabase.ts` para simular chains do Supabase
- `renderHook` + `QueryClientProvider` via `src/test/test-utils.tsx`

## Plano de implementação

### Tarefa 1 — `useOkrMutations` integration tests
**Arquivo:** `src/modules/okrs/hooks/__tests__/useOkrMutations.integration.test.ts`

Testa os 4 hooks de cancelamento com mocks do Supabase:
- `useCancelOrgObjective`: verifica `.update({ status: 'cancelled' })` na tabela `okr_org_objectives`
- `useCancelOrgKeyResult`: verifica `.update({ cancelled_at })` na tabela `okr_org_key_results`
- `useCancelTeamObjective`: verifica `.update({ status: 'cancelled' })` na tabela `okr_team_objectives`
- `useCancelTeamKeyResult`: verifica `.update({ cancelled_at })` na tabela `okr_team_key_results`
- Cada hook: valida que `queryClient.invalidateQueries` é chamado com as prefix keys corretas
- Valida soft-delete pattern (cancelled_at / status: cancelled, nunca DELETE físico)
- Valida toast.success / toast.error em success/error

**~12 testes**

### Tarefa 2 — `useCreateTeamOkrBundle` integration tests
**Arquivo:** `src/modules/okrs/hooks/__tests__/useCreateTeamOkrBundle.integration.test.ts`

- Insert atômico: objective → KRs → contributors → dependencies → initiatives → KR metric links
- `bu_id` explícito em todos os inserts (objetivo, KRs, iniciativas)
- `owner_user_id` é passado conforme input (profileId, não auth user.id)
- KR `current_value` inicializado como `baseline`
- Dependencies non-blocking: erro em dep não interrompe o fluxo
- KR metric links non-blocking: erro em link não interrompe
- Erro em initiative é blocking (throw)
- Erro em objective bloqueia tudo (throw antes dos KRs)
- Invalidação de queryKeys: teamObjectivesPrefix, teamKeyResultsPrefix, dashboardDataPrefix, initiativesAll, cross-dependencies

**~10 testes**

### Tarefa 3 — `useCreateCheckin` integration tests
**Arquivo:** `src/modules/okrs/hooks/__tests__/useCreateCheckin.integration.test.ts`

- Insert correto: kr_id, current_value, previous_value, confidence, user_id = profileId
- Atualiza KR: status mapeado (high→green, medium→yellow, low→red) + current_value
- Mention processing: extrai @[Name](userId) e chama `emit_notification_event` RPC
- Invalidação de queryKeys: teamKeyResultsPrefix, teamObjectivesPrefix, dashboardDataPrefix, pendingCheckins, checkinSummary
- Toast de sucesso/erro (respeitando skipToast)
- Helper functions: `statusToConfidence` e `confidenceToStatus` (3 mapeamentos cada)

**~10 testes**

### Tarefa 4 — `useGenericWizardDraft` unit/integration tests
**Arquivo:** `src/modules/okrs/hooks/__tests__/useGenericWizardDraft.test.ts`

Este hook é complexo (500 linhas), testa:
- `getDraftKey`: retorna `okr-draft.{wizardType}`
- `createEmptyDraft`: version, wizardType, teamId, cycleId, defaultStep, defaultData
- `updateDraft`: merge parcial de data, persiste imediatamente no localStorage
- `setStep`: atualiza currentStep, sincroniza URL via replaceState
- `saveDraft`: persiste no localStorage + cria/atualiza `okr_wizard_sessions`
- `clearDraft`: remove localStorage, marca session como `completed`, retorna sessionId
- `discardDraft`: remove localStorage, marca session como `abandoned`
- Draft key isolation: `okr-draft.qbr-pre` ≠ `okr-draft.team-checkin`
- Hydration guard: `hasHydratedStorageRef` previne sobrescrita por estado vazio
- `beforeunload`: flush do draft sujo no localStorage

**~13 testes**

## Abordagem técnica

Todos os testes usarão:
1. `vi.mock` para os clients Supabase (getOptionalBuClient ou useBuScopedSupabase)
2. `createMockQueryBuilder` com chains configuráveis por tabela
3. `renderHook` com wrapper de providers (QueryClient + Auth + BuContext)
4. Assertions em `.from(tableName)`, `.insert(payload)`, `.update(payload)` do mock
5. `vi.spyOn(toast, 'success')` / `vi.spyOn(toast, 'error')` para toasts

Para `useGenericWizardDraft`, adicionalmente:
- `vi.stubGlobal('localStorage', ...)` para simular persistência
- Mock de `window.history.replaceState` para URL sync
- Mock de `window.addEventListener('beforeunload', ...)`

## Resumo

| Tarefa | Arquivo | Testes |
|--------|---------|--------|
| useOkrMutations | `hooks/__tests__/useOkrMutations.integration.test.ts` | ~12 |
| useCreateTeamOkrBundle | `hooks/__tests__/useCreateTeamOkrBundle.integration.test.ts` | ~10 |
| useCreateCheckin | `hooks/__tests__/useCreateCheckin.integration.test.ts` | ~10 |
| useGenericWizardDraft | `hooks/__tests__/useGenericWizardDraft.test.ts` | ~13 |
| **Total** | **4 arquivos novos** | **~45 testes** |

Implementação sequencial: Tarefas 1+2 na primeira mensagem, Tarefas 3+4 na segunda.

