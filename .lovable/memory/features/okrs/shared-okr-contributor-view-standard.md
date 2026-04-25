---
name: Shared OKR contributor view standard
description: SSOT para exibição de OKRs compartilhados no dashboard do time contribuidor — bloco separado, read-only, com KRs próprias do contribuidor destacadas
type: feature
---

Quando um objetivo de time está marcado como `is_shared=true` e contém entradas em `okr_team_objective_contributors`, ele aparece em DOIS lugares no dashboard `/okrs?view=team`:

1. **Time proprietário (Time A)**: aparece no bloco principal "OKRs do {Time A}", editável (badge `Compartilhado`).
2. **Time contribuidor (Time B)**: aparece em bloco separado abaixo dos próprios, intitulado **"OKRs Compartilhadas"**, **read-only**.

## Visualização inline dos times contribuidores (todos os cards)

Em todo card/lista de objetivo compartilhado, o badge `Compartilhada` (`SharedOkrBadge`) DEVE ser usado com `compact inlineTeams` para renderizar os nomes dos times contribuidores como chips imediatamente após o badge (limite 3 + chip `+N` com tooltip). Isso vale para `ObjectiveListItem` (dashboard `/okrs?view=team`) e `EnhancedObjectiveCard`. `TeamObjectiveCard` já mostra os times em linha dedicada e por isso NÃO usa `inlineTeams`.

A hidratação de `contributors` (com `team:teams(id, name)`) é responsabilidade dos hooks de listagem — `useTeamObjectives` e `useMyTeamObjectives` em `useTeamObjectiveQueries.ts` fazem batch único após o select principal, filtrando por `is_shared=true`. Componentes NÃO devem fazer fetch próprio de contributors.

## Componentes canônicos (não duplicar)

- **`OkrDashboardPage.tsx`**: quando `activeView === 'team'` E `normalizedTeamId` está definido, renderiza `<TeamOkrSections>` em vez do map plano de `ObjectiveListItem`. Carrega `useTeamContributedOkrs(teamId)` em paralelo aos `useTeamObjectives`.
- **`TeamOkrSections`** (`src/modules/okrs/components/team-view/`): orquestra os dois blocos. O bloco "OKRs Compartilhadas" só aparece quando `contributedObjectives.length > 0`.
- **`ContributingOkrCard`** (`src/modules/okrs/components/team-view/`): card read-only de objetivo compartilhado. Mostra: badge `Compartilhada`, time proprietário, modelo de responsabilidade, progresso geral do objetivo, badge de estado de contribuição, e a sub-lista "Contribuição do seu time" filtrada por `kr.team_id === currentTeamId`.

## Estado de contribuição (badge no card)

| Estado | Condição | Visual |
|---|---|---|
| Estratégica | ≥1 KR onde `kr.team_id === currentTeamId` | `bg-status-green-muted` "Contribuição estratégica" |
| Apenas visível | nenhum KR do contribuidor | `outline` muted "Apenas visível" |

(Estado "Operacional" — sem KR mas com projeto/iniciativa do time vinculado — é uma extensão futura; requer fetch adicional.)

## Regras invioláveis

1. **Ownership único**: o objetivo NÃO é duplicado — `okr_team_objectives.team_id` permanece apontando apenas para o Time A. O bloco no Time B vem da view `v_team_contributed_okrs` (filtrada por `contributor_team_id`).
2. **Read-only no contribuidor (visualização do objetivo)**: o card `ContributingOkrCard` não expõe edição/cancelamento do objetivo nem das KRs alheias. A ÚNICA ação de escrita permitida é o botão **"+ Adicionar KR"** (gated por `canContribute`, herdado de `canEdit` do dashboard do time contribuidor) que inicia o wizard de KR no modo contribuição.
3. **KRs do contribuidor são próprias**: o Time B cria suas próprias KRs em `okr_team_key_results` com `team_id = TimeB` e `team_objective_id = objective.id`. Essas KRs aparecem automaticamente em todos os ritos coletivos (Weekly/MBR/QBR/Team Check-in) que filtram por `kr.team_id`, e no Collaborator Check-in que filtra por `kr.owner_id`. **Nenhuma alteração nos ritos é necessária para suportar contribuição cross-team.**
4. **Select correto**: `AGGREGATE_FIELDS.teamObjectiveWithKrs` em `aggregateUtils.ts` DEVE incluir `team_id` em `key_results` para permitir o filtro do contribuidor. Também inclui `is_shared`, `responsibility_model` e `org_objective_id` no objetivo.
5. **Caller do `TeamObjectiveFormDialog`**: ver `mem://features/okrs/shared-okr-edit-hydration-standard` — passar `is_shared`, `responsibility_model` e `org_objective_id` ao editar.
6. **Empty-state guard**: na view de time (`activeView === 'team' && !!normalizedTeamId`), o `OkrEmptyState` SÓ pode ser renderizado quando `displayObjectives.length === 0 && filteredContributedObjectives.length === 0`. `TeamOkrSections` deve ser sempre avaliado antes do empty-state — caso contrário, times sem objetivos próprios mas com OKRs compartilhadas recebidas verão tela vazia e o bloco "OKRs Compartilhadas" nunca renderiza. Implementação canônica em `OkrDashboardPage.tsx` usa um IIFE com a ordem: `isLoading → isTeamView (TeamOkrSections | empty) → empty → map plano`.

## Entry point para criação de KR de contribuição

- **URL contract**: `/okrs/objectives/:objectiveId/krs/create?contributor_team_id={uuid}`.
- **Origem do botão**: `ContributingOkrCard` no dashboard `/okrs?view=team&team_id={TimeB}`.
- **Derivação de ownership no wizard** (`TeamKrCreationPage`):
  - `isContribution = !!contributor_team_id && contributor_team_id !== objective.team_id`
  - `effectiveTeamId = isContribution ? contributor_team_id : objective.team_id`
  - `effectiveTeamId` é passado para `useKrWizardDraft`, `useTeam` (membros para owner do KR), e `createKrBundle.mutateAsync({ teamId })`.
- **Validação obrigatória**: ao montar a página, valida que `contributor_team_id` consta em `okr_team_objective_contributors`. Se não, toast de erro + redirect para `/okrs?view=team&team_id={contributor_team_id}`.
- **UX no Step 1 (`KrContextStep`)**: banner `InfoNotice variant="info"` quando `isContribution`, deixando claro que o KR pertencerá ao time contribuidor.
- **Pós-criação**: redirect para `/okrs?view=team&team_id={contributor_team_id}` (não `/okrs` genérico) para o usuário ver imediatamente seu KR no card "Contribuição do seu time".

## Hooks/queries envolvidos

- `useTeamContributedOkrs(teamId)` — lê `v_team_contributed_okrs` filtrando por `contributor_team_id`, depois carrega objetivos completos.
- `useObjectiveContributors(objectiveId)` — lê `okr_team_objective_contributors` para popular o multiselect no form E para validar autorização no wizard de KR.
- `useManageContributors()` — diff INSERT/DELETE em `okr_team_objective_contributors` (RLS V2).
- `useCreateTeamKrBundle()` — recebe `teamId` por argumento de mutate; nenhuma mudança necessária para suportar contribuição (já é parametrizável).
