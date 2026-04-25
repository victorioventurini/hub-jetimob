# Aba Contribuição do Time — Iniciativas + Layout Full-Width

## Objetivo
1. Exibir informações sobre iniciativas vinculadas às KRs do **ciclo atual** dentro da aba Contribuição.
2. Expandir horizontalmente a análise (hoje comprimida em `lg:col-span-2` por causa da sidebar Líder/Time pai).

## Diagnóstico
- A aba vive sob `lg:col-span-2` em `TeamDetailPage.tsx` (linhas 167–359). Isso comprime KPIs e sparkline em telas grandes.
- `useTeamContributionAnalytics` agrega 7 métricas mas **nunca consulta `okr_initiatives`**.
- `useKrInitiatives(krId)` e `useKrInitiativesCount(krId)` já são canônicos.
- "Ciclo atual" deve ser resolvido via `useActiveCycle().activeQuarterlyCycle ?? activeCycle` quando o filtro URL `cycle_id` está vazio.

## Mudanças

### 1) Layout full-width só para a aba Contribuição
- `TeamDetailPage.tsx`: envolver apenas `TabsContent value="contribution"` em wrapper `lg:col-start-1 lg:col-end-4` (escapa da grid 2/3 + sidebar).
- Outras abas (`members`, `squads`, `subteams`, `rituals`) preservam o layout atual.

### 2) Hook estendido: `useTeamContributionAnalytics.ts`
Novos campos no retorno:
- `initiativesTotalCount`
- `initiativesByStatus: { planned, in_progress, blocked, completed }`
- `initiativesAtRiskCount` — `status='blocked' OR (expected_end_date < hoje AND status !== 'completed')`
- `effectiveCycleId` — ciclo aplicado (passado pelo caller)

Nova SELECT em `okr_initiatives` por `kr_id IN (krIds) AND bu_id = currentBu.id AND deleted_at IS NULL`. Colunas explícitas: `id, status, expected_end_date`. Sem `select('*')`.

### 3) `TeamContributionTab.tsx`
- Importar `useActiveCycle`. Quando `cycleId` URL está vazio, usar `activeQuarterlyCycle?.id ?? activeCycle?.id` como `effectiveCycleId` repassado ao hook.
- `CycleSelect` placeholder muda para "Ciclo atual" quando vazio.
- Adicionar sub-tab `initiatives` (label "Iniciativas") na constante `SUBTABS`.
- Render: novo `<TeamInitiativesBlock teamId krIds cycleId />` na `TabsContent value="initiatives"`.

### 4) `TeamContributionOverview.tsx`
- KPI grid: `grid-cols-2 lg:grid-cols-4 xl:grid-cols-5` para acomodar o 5º card.
- Novo `KpiCard` "Iniciativas":
  - value = `initiativesTotalCount`
  - hint = `${in_progress} em progresso · ${planned} planejadas · ${blocked} bloqueadas`
  - cta "Ver iniciativas" → `onNavigateToSubtab('initiatives')`
- Sparkline + Insights lado a lado em `lg:grid-cols-3` (sparkline `lg:col-span-2`, insights `lg:col-span-1`) aproveitando a largura ganha.

### 5) Novo: `TeamInitiativesBlock.tsx` (`src/modules/teams/components/contribution/`)
- Recebe `teamId`, `krIds`, `cycleId`.
- Query única em `okr_initiatives` (mesma forma que o hook agregador) trazendo todos os campos do `Initiative` + join leve em owners (reusar lógica de `useKrInitiatives` adaptada para múltiplos KRs).
- Agrupa por KR. Para cada grupo, header com título do KR e lista de `InitiativeCard` (reuso obrigatório de `src/modules/okrs/components/initiatives/InitiativeCard.tsx`).
- Filtro chips de status: `Todas / Em progresso / Planejadas / Bloqueadas / Atrasadas / Concluídas` — URL state `init_status`.
- `React.memo` no componente raiz e nos sub-cards de grupo.

### 6) `OrgKrContributionItem.tsx` (insight inline opcional)
- Em cada item do time listado, exibir chip pequeno "**N iniciativas**" via `useKrInitiativesCount` (já existe). Sem mudar o layout do card. Se contagem = 0, omite.

### 7) Query keys
- `src/lib/queryKeys/teams.ts`: nova `teamsKeys.contributionInitiatives(teamId, buId, cycleId)`.

### 8) Memória
Atualizar `.lovable/memory/features/teams/team-contribution-tab-standard.md`:
- Adicionar sub-tab `initiatives` à lista canônica
- Novo KPI card "Iniciativas"
- Layout full-width específico (`lg:col-end-4`)
- Resolução automática de "ciclo atual" via `useActiveCycle`

## Standards (TCR)
- ✅ #3 BU-scoped via `useOptionalBuClient`
- ✅ #4 Sem `select('*')` — colunas explícitas
- ✅ #5 Query keys via helpers em `src/lib/queryKeys/teams.ts`
- ✅ #7 URL state para `subtab=initiatives` e `init_status`
- ✅ Soft-delete `.is('deleted_at', null)` em `okr_initiatives`
- ✅ React.memo em listas (`frontend-memoization-standard`)
- ✅ Reuso obrigatório de `InitiativeCard` (não duplicar)

## Não-fazer
- Não criar rota standalone.
- Não criar migration / não tocar RLS.
- Não duplicar `InitiativeCard` ou `OrgObjectiveContributionCard`.
- Não alterar layout das demais abas do `TeamDetailPage`.

## Arquivos
| Arquivo | Ação |
|---|---|
| `src/modules/teams/pages/TeamDetailPage.tsx` | edit (wrapper full-width condicional) |
| `src/modules/teams/hooks/useTeamContributionAnalytics.ts` | edit (campos de iniciativas) |
| `src/modules/teams/components/contribution/TeamContributionTab.tsx` | edit (sub-tab + ciclo atual) |
| `src/modules/teams/components/contribution/TeamContributionOverview.tsx` | edit (5º KPI + grid sparkline/insights) |
| `src/modules/teams/components/contribution/TeamInitiativesBlock.tsx` | new |
| `src/lib/queryKeys/teams.ts` | edit (nova key) |
| `src/modules/okrs/components/team-contribution/OrgKrContributionItem.tsx` | edit (chip iniciativas) |
| `.lovable/memory/features/teams/team-contribution-tab-standard.md` | update |
