## Diagnóstico

O texto **"Nenhum dos 18 líderes enviou Pre-Weekly (0% de cobertura)... critical"** foi gerado pelo LLM com base no `payload.coverage` que recebeu **`{ totalLeaders: 18, submittedLeaders: 0, pendingLeaders: 18 }`**.

Verificação no banco:

- 6 sessões de `pre-weekly` `status='completed'` para a BU `a000…0001` na semana de 2026-05-25 → 6 `started_by` distintos. ✓
- 18 `teams` ativos não-deletados. ✓
- `useWeeklyPreWeeklyAggregation` calcula `submittedLeaders = new Set(started_by).size` corretamente quando a query resolve.

A causa é uma **race condition** no `useWeeklyOpeningCuration` + ausência de guard no botão:

1. `useWeeklyPreWeeklyAggregation` retorna o default `{ totalLeaders: 0, submittedLeaders: 0, pendingLeaders: 0 }` enquanto `isLoading` é `true`.
2. `WeeklyExecutiveOpeningStep` desabilita o botão **apenas** por `isGenerating`, não por `aggregation.isLoading`. Em refresh/F5, o usuário consegue clicar antes da agregação terminar.
3. Em uma chamada concreta hoje (10:44 UTC), antes das submissões de 10:43 e 11:17 entrarem na janela, o `submittedLeaders` real era 4; mas se a query estivesse parcialmente carregada (cobertura com `totalLeaders=18` já populado e `submittedLeaders` ainda 0 por timing/cache), o LLM recebeu 0/18 e materializou a frase "Nenhum dos 18 líderes…".
4. O `executiveOpening.summary` é persistido no draft local do wizard — **não recalcula sozinho** quando novos Pré-Weeklies chegam.

Adicionalmente: o objeto `coverage` é construído inline a cada render em `WeeklyPage.tsx:174-179`, então a referência muda toda render e o `useCallback`/`generate` se reconstrói; isso não causa o bug em si, mas reforça a fragilidade.

## Mudança proposta (mínima e cirúrgica)

**Arquivo 1: `src/modules/okrs/hooks/useWeeklyPreWeeklyAggregation.ts`**

- Expor `isLoading` no retorno (já existe) e adicionar `isFetching` derivado do `useQuery` para o caller conseguir distinguir "primeira carga" de "refetch silencioso".

**Arquivo 2: `src/modules/okrs/pages/WeeklyPage.tsx`**

- Memorizar o objeto `coverage` com `useMemo` para evitar re-renders desnecessários do hook curador.
- Em `handleGenerateDraft`, bloquear a invocação se `aggregation.isLoading === true` e exibir `toast.info('Aguarde — carregando Pré-Weeklies da semana…')`.

**Arquivo 3: `src/modules/okrs/components/wizards/weekly/WeeklyExecutiveOpeningStep.tsx`**

- Aceitar nova prop opcional `disableGenerate?: boolean` (default `false`).
- Aplicar `disabled={isGenerating || disableGenerate}` nos dois botões "Gerar rascunho com IA" (linhas 153 e 175).
- Passar `disableGenerate={aggregation.isLoading}` na chamada em `WeeklyPage`.

Nada mais muda: contrato da edge function, prompt, schema do LLM, RLS, BU isolation, query keys.

## Conformidade canônica

- **BU Isolation**: query mantém `.eq('bu_id', buId!)`.
- **Soft Deletes**: `okr_wizard_sessions` continua sem filtro `deleted_at` (coluna inexistente — exceção já documentada).
- **AI Safety**: não toca em parsing.
- **Identity**: nenhum mutation neste fluxo.
- **React.memo**: não aplicável (não é card de lista).
- **Standards / Rituals Master**: Weekly v2 — `executiveOpening` continua sendo a fonte de verdade do draft; só prevenimos invocação com dados parciais.

## Pós-fix — validação

1. `/rituals/weekly` → na primeira renderização o botão "Gerar rascunho com IA" fica desabilitado por ~300ms até a agregação carregar.
2. Após carregar, clicar gera rascunho com `coverage: { totalLeaders: 18, submittedLeaders: 6, pendingLeaders: 12 }`; o LLM produz resumo coerente (33% cobertura, nível `partial`).
3. Para o caso atual do usuário: após shipar este fix, ele deve clicar **"Regenerar com IA"** uma vez para substituir o resumo stale.

## Fora de escopo

- Auto-regeneração reativa quando `coverage` muda (UX maior — exigiria invalidar trabalho manual já feito no draft).
- Persistir o draft do Weekly em `okr_wizard_sessions` (hoje só persiste ao concluir — comportamento mantido).
- Refatorar `useMbrOpeningCuration` para o mesmo guard (MBR tem fluxo distinto; tratado em ticket separado se observado).
