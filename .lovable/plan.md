## Diagnóstico

O card **Insights** que aparece em `/okrs` (BU Jet Experience) é o `SharedOkrInsights`, alimentado por `useSharedOkrsInsights` → `useSharedOkrsSummary` (`src/modules/okrs/hooks/queries/useTeamContributedQueries.ts`).

A query lê da view `public.v_shared_okrs_summary` sem filtrar por `bu_id`:

```ts
let query = supabase
  .from('v_shared_okrs_summary')
  .select(AGGREGATE_FIELDS.sharedSummary);     // não inclui bu_id
// nenhum .eq('bu_id', currentBuId)
```

A definição atual da view confirma o vazamento:

- **Não tem `security_invoker=on`** → executa como owner (postgres) e **ignora RLS** de `okr_team_objectives`.
- **Não expõe a coluna `bu_id`**, então o cliente também não consegue aplicar o filtro.

Resultado: na view "company" (sem `teamId`), a hook retorna **todos** os OKRs compartilhados visíveis da view, inclusive os da Jetimob, mesmo no contexto da Jet Experience. Como a Jet Experience não tem nenhum OKR de time, o card só mostra dados da outra BU — exatamente o sintoma reportado.

Viola duas Core Rules: **BU Isolation** (filtro por `currentBuId`) e **Privilege Policy** (`security_invoker=on` para views de domínio).

## Correção

### 1. Migração — recriar `v_shared_okrs_summary`

- Adicionar `o.bu_id` ao SELECT.
- Recriar com `WITH (security_invoker = on)` para que a RLS de `okr_team_objectives` se aplique sob o usuário corrente.
- Manter as mesmas colunas/joins existentes; sem mudança de schema consumido a não ser pelo novo `bu_id`.
- `GRANT SELECT ... TO authenticated` (manter privilégios atuais).

### 2. `AGGREGATE_FIELDS.sharedSummary` (`aggregateUtils.ts`)

Incluir `bu_id` na projeção:

```ts
sharedSummary: `
  objective_id, bu_id, title, primary_team_id, primary_team_name,
  contributor_count, is_shared, responsibility_model, status
` as const,
```

### 3. `useSharedOkrsSummary` (`useTeamContributedQueries.ts`)

- Aplicar filtro obrigatório `.eq('bu_id', currentBuId)` (já existe `currentBuId` via `useBu()`; manter o gate `enabled: !!currentBuId`).
- A query key já contém `currentBuId`, então não muda.

### 4. Verificação

- BU Jet Experience: card de Insights deve sumir (ou exibir contagem zero) já que ela não tem OKRs de time compartilhados.
- BU Jetimob: card continua mostrando os mesmos dados de antes.
- Mantém o comportamento ao alternar `teamId`/`year` (filtros adicionais continuam por cima do filtro de BU).

## Fora de escopo

- Não mexer em `v_team_contributed_okrs` nesta entrega (a query já é filtrada por `contributor_team_id` ligado à BU ativa; sem evidência de leak). Se necessário, abrir tarefa separada para auditar essa view com o mesmo critério `security_invoker=on`.
- Sem alterações de UI no `SharedOkrInsights` ou no `OkrDashboardPage`.
