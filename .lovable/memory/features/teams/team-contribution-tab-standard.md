---
name: Team contribution tab standard
description: Estrutura da aba Contribuição em /teams/:id?tab=contribution — sub-tabs, toggle sub-times, sparkline, redirect da rota legada
type: feature
---

# Aba Contribuição do Time — Padrão v1

## Localização canônica
- Rota: `/teams/:id?tab=contribution`
- Container: `src/modules/teams/components/contribution/TeamContributionTab.tsx`
- Hook agregador: `src/modules/teams/hooks/useTeamContributionAnalytics.ts`

## Estrutura
Sub-tabs (URL param `subtab`, default `overview`):
1. **overview** — KPI cards + sparkline + insights (`TeamContributionOverview`)
2. **team-okrs** — Lista de objetivos próprios (`useTeamObjectives`)
3. **shared-okrs** — Recebidos (dono com contribuidores) + Contribuídos (`TeamSharedOkrsBlock`)
4. **org-contribution** — Org Objectives impactados (reuso de `OrgObjectiveContributionCard` + `useTeamContributionView`)
5. **projects** — Projetos do time (`useProjects({ team_id })`)

## Filtros (URL state)
- `subtab` — sub-aba ativa
- `include_subteams` — toggle, **default `false`**. Quando `true`, expande via `parent_team_id` recursivo client-side
- `cycle_id` — filtro de ciclo opcional

## KPI cards (overview)
- OKRs do time (count obj + count KR)
- Compartilhados (recebidos + contribuídos)
- Org Objectives impactados (distinct via `linked_org_kr_id`)
- Projetos ativos (status `planned` ou `in_progress`, vinculados via `project_krs.key_result_id`)

## Sparkline
- `TeamHealthSparkline` — média diária de `okr_checkins.confidence` mapeada para 0-100
  (`high=100, medium=66, low=33`), últimos 60 dias
- Recharts `LineChart` sem eixos visíveis, height 60-70px
- Estados: vazio (texto + ícone) e degenerado (1 ponto duplicado para Recharts renderizar linha)

## Visibilidade
**Qualquer membro da BU** vê a aba (sem gating por liderança). RLS no `useBuScopedSupabase` é a única barreira.

## Query keys (em `src/lib/queryKeys/teams.ts`)
- `teamsKeys.contributionAnalytics(teamId, buId, includeSubteams, cycleId)`
- `teamsKeys.contributionSubteamIds(teamId, includeSubteams)`

## Rota legada
`/okrs/team-contribution/:teamId` foi convertida em `<Navigate>` para
`/teams/:teamId?tab=contribution&subtab=org-contribution` para preservar deep-links.
SSOT: nova aba dentro do time.

## Não-fazer
- Não duplicar `OrgObjectiveContributionCard` ou `TeamContributionInsights` — reuso obrigatório do módulo OKRs
- Não usar `select('*')` (Regra TCR #4)
- Não criar nova rota standalone para essa visão
