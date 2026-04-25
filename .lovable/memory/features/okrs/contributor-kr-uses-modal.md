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
