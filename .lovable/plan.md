

# Filtro de Quarter na Visão Organizacional

## Pré-checklist verificado

- [x] TCR v3.21.0 — arquitetura multi-BU, stack, auth
- [x] DEVELOPMENT_STANDARDS v1.27.0 — PRE-BU/POST-BU (hooks usam `useOptionalBuClient` corretamente), query keys centralizadas, URL state via `@/shared/url`
- [x] DATA_MODEL_REGISTRY — tabelas `cycles` (BU-scoped, type/name/start_date/end_date), `okr_team_objectives` (tem `cycle_id`), `okr_team_key_results` (join via `team_objective_id`)
- [x] Memory: dashboard-quarterly-filtering — Visão Org filtra só por Ano (Quarters bloqueados no dashboard). Esta feature adiciona Quarter especificamente nas páginas org-view, que são separadas do dashboard
- [x] Verificação de implementação similar — OrgViewFilters já existe com status/team; YearSelect já usado no header

## Resumo

Adicionar seletor de quarter nas páginas `/okrs/org-view` e `/okrs/org-view/:objectiveId`. Quando selecionado, filtra team KRs e team objectives pelo `cycle_id` do quarter correspondente.

## Mudanças por arquivo

### 1. `src/lib/queryKeys/okrs.ts`

Adicionar `cycleId` como parâmetro opcional nas duas keys:

```typescript
allOrgObjectivesView: (year: number, buId: string | null, cycleId?: string | null) =>
  ['all-org-objectives-view', year, buId, cycleId ?? null] as const,

orgObjectiveView: (objectiveId: string, buId: string | null, cycleId?: string | null) =>
  ['org-objective-view', objectiveId, buId, cycleId ?? null] as const,
```

### 2. `src/modules/okrs/hooks/queries/useOrgObjectiveViewQueries.ts`

**`useAllOrgObjectivesView(year?, cycleId?)`**:
- Aceitar `cycleId?: string | null`
- Na query de `okr_team_key_results`, quando `cycleId` definido: adicionar filtro na subquery do join `team_objective`: `.eq('team_objective.cycle_id', cycleId)`
- Atualizar queryKey para incluir cycleId

**`useOrgObjectiveView(objectiveId, cycleId?)`**:
- Aceitar `cycleId?: string | null`
- Mesmo filtro de `team_objective.cycle_id` na query de team KRs
- Na query de `okr_team_objectives` (linkedTeamObjectives): adicionar `.eq('cycle_id', cycleId)` quando definido
- Atualizar queryKey para incluir cycleId

### 3. `src/modules/okrs/pages/OrgViewListPage.tsx`

- Importar `useCycles` de `../hooks`
- Adicionar URL state: `useUrlState<string>({ key: 'quarter', defaultValue: 'all' })`
- Derivar `cycleId` via useMemo: filtrar ciclos por `type === 'quarter'` e ano correspondente, match pelo quarter selecionado (Q1/Q2/Q3/Q4 via nome ou posição temporal)
- Ao mudar ano, resetar quarter para "all"
- Renderizar `SimpleSelect` com opções `[all, Q1, Q2, Q3, Q4]` ao lado do `YearSelect` no `actions` do PageHeader
- Se quarter selecionado mas ciclo não encontrado, exibir aviso inline
- Passar `cycleId` para `useAllOrgObjectivesView(selectedYear, cycleId)`

### 4. `src/modules/okrs/pages/OrgObjectiveViewPage.tsx`

- Mesmo URL state `quarter` e resolução de `cycleId` via `useCycles`
- Adicionar seletor de quarter + badge informativo quando quarter ativo (ex: "Mostrando Q1 2026 · 01 jan → 31 mar" com botão "Limpar")
- Passar `cycleId` para `useOrgObjectiveView(objectiveId, cycleId)`
- `LinkedTeamObjectivesSection` recebe dados já filtrados (sem mudança no componente)

### 5. Barrel export (se necessário)

Verificar se `useCycles` já está exportado via `src/modules/okrs/hooks/index.ts`. Se não, adicionar export.

## Decisões técnicas

| Decisão | Justificativa |
|---------|---------------|
| Usar `SimpleSelect` (já canônico) | Não criar componente novo para 5 opções fixas |
| Filtro no Supabase (não client-side) | Team KRs podem ser numerosos; filtrar na query evita buscar dados desnecessários |
| Progresso = `current_value` atual | Não buscar check-ins por período (complexidade alta, fora de escopo) |
| Resolver quarter→cycleId pelo `name` do ciclo | Convenção existente: nomes como "2026-Q1" |
| Resetar quarter ao mudar ano | Evita estado inconsistente (Q2 selecionado em ano sem Q2) |
| URL param `?quarter=Q1` | Padrão `useUrlState` do projeto, compartilhável |

## O que NÃO muda

- Filtros de status RAG e time existentes na página de detalhe
- Deep-linking `?kr=`
- Comportamento padrão "Todos" = idêntico ao atual
- Componentes internos (OrgKrExpandableCard, TeamKrListItem, OrgViewInsights, LinkedTeamObjectivesSection)

