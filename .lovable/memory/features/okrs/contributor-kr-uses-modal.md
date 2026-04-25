---
name: KR de contribuição usa modal padrão
description: Em OKRs compartilhadas, o botão "Adicionar KR" do time contribuidor abre TeamKrFormDialog (não o wizard de KR)
type: feature
---

Para criar uma KR contribuidora em um objetivo compartilhado, o card
`ContributingOkrCard` abre **`TeamKrFormDialog`** com:
- `objectiveId` = ID do objetivo compartilhado (do time dono)
- `teamId` = ID do time contribuidor (currentTeamId)
- `buId` = `objective.bu_id` (mesma BU do objetivo)

Não navegar para `/okrs/objectives/:id/krs/create?contributor_team_id=...`
neste caso. O wizard full-page só é usado para criação no objetivo
próprio do time, via `OkrCreationPage` / `TeamObjectiveCard`.

A inserção continua passando pelas RLS canônicas:
- `okr_team_key_results_insert_v2`
- `can_create_shared_team_kr_by_profile`

Após criar, invalidar caches contribuidor:
`objectiveContributors`, `teamContributedObjectives`, `teamContributedOkrs`,
`sharedSummaryPrefix` e a query local `['shared-objectives-with-krs']`.

## Campo Responsável escopado por teamId

O `BuUserSelect` do campo "Responsável" no `TeamKrFormDialog` recebe
**obrigatoriamente** `teamId={teamId}` + `includeSubteams`. Isso garante
que apenas membros do time dono (ou contribuidor, em OKR compartilhada)
e seus subtimes apareçam — nunca a BU inteira. Padrão alinhado com
`mem://standards/users/team-filter-includes-subteams`.

## Linha da KR usa `KeyResultRow` canônico

A linha-resumo de cada KR contribuidora em `ContributingOkrCard` é
renderizada via **`KeyResultRow`** de
`src/modules/okrs/components/dashboard/KeyResultRow.tsx` — exatamente o
mesmo componente usado em `ObjectiveListItem` para Team KRs próprias.
**Proibido** reimplementar localmente botão/expand/progresso/avatar de KR
em qualquer card de OKR (compartilhado ou não).

Paridade garantida: badge "Rascunho", `KrPrimaryKpiBadge` (KPI primária),
status efetivo (`mapRagToCalculated` + `STATUS_CONFIG`), valor atual/target
com unidade efetiva, contagem de iniciativas (`useKrInitiativesCount`),
botões **Histórico/Editar/Atualizar** e avatar do responsável. A área
expandida (Iniciativas + Projetos) também vem do próprio `KeyResultRow`.

Em `ContributingOkrCard`, `canEdit` e `canCheckin` recebem `canContribute`
(derivado de `useCanManageTeamOkr(currentTeamId)`), pois a KR contribuidora
é `okr_team_key_results` do time contribuidor — RLS canônica
(`mem://auth/okr-ownership-enforcement-rls`) já valida pelo time dono.
Dialogs reusados sem fork: `TeamKrFormDialog` (criar/editar),
`CheckinDialog`, `KrHistoryDialog`.

Hidratação obrigatória do payload do KR contribuidor (em
`useSharedObjectivesWithKrs` de `TeamSharedOkrsBlock`):
`owner_user_id, updated_at, type` + `owner:profiles!okr_team_key_results_owner_profile_fkey (id, display_name, photo_url)`.
Sem isso `KrHistoryDialog` e o avatar do responsável quebram.

## Iniciativas e Projetos em KR contribuidora

Como `KeyResultRow` já renderiza `InitiativesList` e `ProjectsForKrSection`
internamente quando a linha é expandida, o `ContributingOkrCard` **não**
chama esses componentes diretamente. A propagação de `krTeamId` continua
correta: `KeyResultRow` passa `krTeamId={kr.team_id}` (= `currentTeamId`
no caso contribuidor, pois a KR pertence ao time contribuidor).

KR contribuidora é Team KR (`okr_team_key_results`), portanto:
- Hooks `useKrInitiatives`, `useProjectsForKr`, `useMilestonesForKr`,
  `useAddProjectKrLink({ kind: 'team' })` funcionam sem alteração.
- RLS de `project_krs_insert` e `okr_initiatives` já cobrem.
- Permissão herda de `canEdit || canCheckin` (= `canContribute`).

Sem novo hook, schema, RLS ou rota — reuso 100% do canon.

## InitiativeDialog escopado por teamId

`InitiativeDialog` (`src/modules/okrs/components/initiatives/InitiativeDialog.tsx`)
recebe prop `krTeamId?: string` e usa **obrigatoriamente** os componentes
canônicos `BuUserSelect` (Responsável) e `BuUserMultiSelect` (Contribuidores)
com `teamId={krTeamId}` + `includeSubteams` + `excludeExternal`. Proibido
reimplementar combobox manual via `Popover + Command + useBuUsersDirectory`.

`InitiativesList` propaga `krTeamId` ao dialog. Cadeia de chamada:
- KR de time próprio: `ObjectiveListItem` → `KeyResultRow` → `InitiativesList krTeamId={kr.team_id}` → dialog escopa ao time dono.
- KR contribuidora (OKR compartilhado): `ContributingOkrCard` → `KeyResultRow` → `InitiativesList krTeamId={kr.team_id}` (= `currentTeamId`) → dialog escopa ao **time contribuidor**, nunca à BU inteira.

Padrão alinhado a `mem://standards/users/team-filter-includes-subteams`.
RLS de `okr_initiatives` continua intacta (a KR pertence ao time correto).

