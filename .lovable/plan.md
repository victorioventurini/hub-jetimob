
# Habilitar criação de KRs de contribuição cross-team

## Contexto (validado via TCR + docs canônicos)

- **Schema** (`SCHEMA_QUICK_REFERENCE.md`): `okr_team_key_results.team_id` (dono do KR) e `team_objective_id` (objetivo pai) são independentes — schema já suporta KR do Time B vinculado ao objetivo do Time A.
- **RLS** (`okr-ownership-enforcement-rls`): INSERT em `okr_team_key_results` valida `bu_id` + `okrs.kr.create`, não restringe ao team owner do objetivo.
- **Memory `shared-okr-contributor-view-standard`**: documenta que "Time B cria suas próprias KRs em `okr_team_key_results` com `team_id = TimeB` e `team_objective_id = objective.id`" — comportamento esperado mas **sem entry point na UI hoje**.
- **Bug atual**: `TeamKrCreationPage.tsx` deriva `teamId` de `objective.team_id`, forçando KR a pertencer ao time owner do objetivo — impede contribuição.

## Mudanças

### 1. `src/modules/okrs/components/team-view/ContributingOkrCard.tsx`
- Adicionar botão "+ Adicionar KR de contribuição" no card.
- Visibilidade gated por `useHasPermission('okrs.kr.create')` + `useCanManageTeamOkr(currentTeamId)`.
- Navegação: `<Link to={`/okrs/objectives/${objective.id}/krs/create?contributor_team_id=${currentTeamId}`}>`.

### 2. `src/modules/okrs/pages/TeamKrCreationPage.tsx`
- Extrair `contributor_team_id` de `useSearchParams()`.
- Definir `effectiveTeamId = contributorTeamId ?? objective?.team_id`.
- Passar `effectiveTeamId` para: `useKrWizardDraft({ teamId })`, `useTeam(teamId)` (seleção de owner), e `useCreateTeamKrBundle({ teamId })`.
- Validação: se `contributor_team_id` presente, verificar via `useObjectiveContributors(objectiveId)` que o time é contribuidor autorizado; senão redirecionar com toast de erro.

### 3. `src/modules/okrs/components/wizards/team-kr-creation/KrContextStep.tsx`
- Banner informativo (`InfoNotice`) quando `isContribution === true`:
  > "Você está criando um KR de contribuição. Este KR pertencerá ao **{contributorTeamName}** e contribuirá para o objetivo de **{ownerTeamName}**."

### 4. `src/modules/okrs/components/team-view/TeamOkrSections.tsx`
- Propagar `currentTeamId` e flag `canContribute` para `ContributingOkrCard`.

### 5. `.lovable/memory/features/okrs/shared-okr-contributor-view-standard.md`
- Adicionar seção "Entry point para contribuição":
  - Contrato URL: `?contributor_team_id={uuid}` em `/okrs/objectives/:id/krs/create`.
  - Regra de derivação de ownership no wizard.
  - Validação obrigatória contra `okr_team_objective_contributors`.

## Arquivos
- **Editados**: `ContributingOkrCard.tsx`, `TeamOkrSections.tsx`, `TeamKrCreationPage.tsx`, `KrContextStep.tsx`, `shared-okr-contributor-view-standard.md`.
- **Não tocados**: schema, RLS, hooks de criação (já corretos).

## Riscos & Mitigações
- **Risco**: usuário fora do contributor team manipular URL → mitigado por validação contra `okr_team_objective_contributors` + RLS de `okrs.kr.create` no bu_id.
- **Risco**: KR aparecer no time errado nos ritos → não aplica; ritos filtram por `kr.team_id` que será `contributor_team_id`.
