---
name: Team contribution tab standard
description: Estrutura da aba Contribuição em /teams/:id?tab=contribution — sub-tabs (incl. Iniciativas), layout full-width, ciclo atual auto, KPIs, sparkline+insights lado a lado
type: feature
---

# Aba Contribuição do Time — Padrão v2

## Localização canônica
- Rota: `/teams/:id?tab=contribution`
- Container: `src/modules/teams/components/contribution/TeamContributionTab.tsx`
- Hook agregador: `src/modules/teams/hooks/useTeamContributionAnalytics.ts`

## Layout full-width
A aba **Contribuição** roda fora da grid 2/3 + sidebar do `TeamDetailPage`. Quando
`activeTab === 'contribution'`, a página alterna o grid principal para 1 coluna
(`grid-cols-1`) e oculta a sidebar (Líder/Time pai). Demais abas mantêm o layout
canônico 2/3 + sidebar.

## Estrutura
Sub-tabs (URL param `subtab`, default `overview`):
1. **overview** — KPI cards (5) + sparkline + insights lado a lado (`TeamContributionOverview`)
2. **team-okrs** — Lista de objetivos próprios (`useTeamObjectives`)
3. **shared-okrs** — Recebidos (dono com contribuidores) + Contribuídos (`TeamSharedOkrsBlock`)
4. **org-contribution** — Org Objectives impactados (reuso de `OrgObjectiveContributionCard` + `useTeamContributionView`)
5. **initiatives** — Iniciativas (`okr_initiatives`) agrupadas por KR (`TeamInitiativesBlock`)
6. **projects** — Projetos do time (`useProjects({ team_id })`)

## Filtros (URL state)
- `subtab` — sub-aba ativa
- `include_subteams` — toggle, **default `false`**. Quando `true`, expande via `parent_team_id` recursivo client-side
- `cycle_id` — filtro de ciclo opcional. **Quando vazio**, aplica-se automaticamente o
  **ciclo atual**: `useActiveCycle().activeQuarterlyCycle?.id ?? activeCycle?.id`.
  O `CycleSelect` exibe placeholder `Ciclo atual · {nome}` quando o ciclo é resolvido implicitamente.
- `init_status` — filtro de status na sub-tab Iniciativas
  (`all | in_progress | planned | blocked | overdue | completed`)

## KPI cards (overview)
Grid responsivo `grid-cols-2 md:grid-cols-3 lg:grid-cols-5`:
1. **OKRs do time** (count obj + count KR)
2. **Compartilhados** (recebidos + contribuídos)
3. **Org Objectives impactados** (distinct via `linked_org_kr_id`)
4. **Iniciativas** — total + breakdown `in_progress · planned · blocked` (ou `N em risco`)
5. **Projetos ativos** (status `planned` ou `in_progress`, vinculados via `project_krs.key_result_id`)

Cada card com CTA navega para a sub-tab correspondente.

## Iniciativas (sub-tab + KPI)
- Hook agregador retorna `initiativesTotalCount`, `initiativesByStatus`, `initiativesAtRiskCount`
  consultando `okr_initiatives` por `kr_id IN (krIds)` no ciclo aplicado, BU-scoped.
- "Em risco" = `status='blocked' OR (expected_end_date < hoje AND status !== 'completed')`.
- `TeamInitiativesBlock` agrupa por KR e reusa `InitiativeCard` (proibido duplicar).
- Chip pequeno "**N iniciativas**" também aparece em `TeamOkrListItem` (sub-tab Org Objectives)
  via `useKrInitiativesCount`.

## Sparkline + Insights (overview)
- Linha dupla em telas largas (`lg:grid-cols-3`): sparkline `lg:col-span-2`, `TeamContributionInsights` `lg:col-span-1`.
- `TeamHealthSparkline` — média diária de `okr_checkins.confidence` mapeada para 0-100
  (`high=100, medium=66, low=33`), últimos 60 dias.
- Recharts `LineChart` sem eixos visíveis, height 60-70px.
- Estados: vazio (texto + ícone) e degenerado (1 ponto duplicado para Recharts renderizar linha).

## Visibilidade
**Qualquer membro da BU** vê a aba (sem gating por liderança). RLS no `useBuScopedSupabase` é a única barreira.

## Query keys (em `src/lib/queryKeys/teams.ts`)
- `teamsKeys.contributionAnalytics(teamId, buId, includeSubteams, cycleId)`
- `teamsKeys.contributionSubteamIds(teamId, includeSubteams)`
- `teamsKeys.contributionInitiatives(teamId, buId, cycleId, includeSubteams?)`

## Rota legada
`/okrs/team-contribution/:teamId` foi convertida em `<Navigate>` para
`/teams/:teamId?tab=contribution&subtab=org-contribution` para preservar deep-links.
SSOT: nova aba dentro do time.

## Não-fazer
- Não duplicar `OrgObjectiveContributionCard`, `TeamContributionInsights` ou `InitiativeCard` — reuso obrigatório
- Não usar `select('*')` (Regra TCR #4)
- Não criar nova rota standalone para essa visão
- Não aplicar layout full-width nas demais abas (`members`, `squads`, `subteams`, `rituals`)
