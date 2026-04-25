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

## Iniciativas e Projetos em KR contribuidora

Cada KR contribuidora exibida em `ContributingOkrCard` é **expansível**
(chevron à esquerda). Quando expandida, renderiza abaixo do progresso:

- `<InitiativesList krId={kr.id} krTeamId={currentTeamId} canEdit={canContribute} isDraft={objective.status === 'draft'} />`
- `<ProjectsForKrSection krId={kr.id} krKind="team" canEdit={canContribute} />`

Idêntico ao padrão de Team KR em `ObjectiveListItem` (linhas 729–749).
KR contribuidora é Team KR (`okr_team_key_results`), portanto:
- Hooks `useKrInitiatives`, `useProjectsForKr`, `useMilestonesForKr`,
  `useAddProjectKrLink({ kind: 'team' })` funcionam sem alteração.
- RLS de `project_krs_insert` e `okr_initiatives` já cobrem (KR pertence
  ao time do usuário contribuidor).
- Permissão herda de `canContribute` (mesma que governa "Adicionar KR").

Sem novo hook, schema, RLS ou rota — reuso 100% do canon.

## InitiativeDialog escopado por teamId

`InitiativeDialog` (`src/modules/okrs/components/initiatives/InitiativeDialog.tsx`)
recebe prop `krTeamId?: string` e usa **obrigatoriamente** os componentes
canônicos `BuUserSelect` (Responsável) e `BuUserMultiSelect` (Contribuidores)
com `teamId={krTeamId}` + `includeSubteams` + `excludeExternal`. Proibido
reimplementar combobox manual via `Popover + Command + useBuUsersDirectory`.

`InitiativesList` propaga `krTeamId` ao dialog. Cadeia de chamada:
- KR de time próprio: `ObjectiveListItem` → `InitiativesList krTeamId={kr.team_id}` → dialog escopa ao time dono.
- KR contribuidora (OKR compartilhado): `ContributingOkrCard` → `InitiativesList krTeamId={currentTeamId}` → dialog escopa ao **time contribuidor**, nunca à BU inteira.

Padrão alinhado a `mem://standards/users/team-filter-includes-subteams`.
RLS de `okr_initiatives` continua intacta (a KR pertence ao time correto).

