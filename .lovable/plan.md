## Pré-checklist (consultado)

- ✅ TCR (`docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`) — seção `kpi_metrics`
- ✅ `SCHEMA_QUICK_REFERENCE.md` — schema vigente
- ✅ `RESPONSIBILITY_MIGRATION_POLICY.md` — confirma que `kpi_metrics` tem `owner_user_id` mandatório; responsabilidade operacional é dimensão paralela
- ✅ `AREA_BADGE_STANDARD.md` — `AreaBadge` é SSOT visual; trocaremos só a fonte de dados
- ✅ `UI_COMPONENTS_REGISTRY.md` — `AreaSelect`/`TeamSelect` já implementam corretamente o form de Edit/Create; **não mexer**
- ✅ Memória `mem://features/kpis/kpis-master-standard` — base v3.0.0
- ⚠️ TCR ainda não documenta `responsible_area_id` / `responsible_team_id` em `kpi_metrics` — gap será registrado em memória nova ao final

## Problema

`kpi_metrics` tem 2 dimensões de vínculo:

| Coluna | Semântica |
|---|---|
| `area_id` / `team_id` | Ownership **estrutural** (preenchido em `scope='team'` / `scope='area'`) |
| `responsible_area_id` / `responsible_team_id` | **Responsabilidade Operacional** — quem responde no dia a dia (preenchido em `scope='org'` Globais e em `scope='area'` quando delegado a um time) |

**Caso NPS:** `scope='org'`, `area_id=NULL`, `team_id=NULL`, `responsible_area_id=Operações`, `responsible_team_id=Customer Success`.

A UI hoje só lê `kpi.area` / `kpi.team` (joins por `area_id`/`team_id`), então **KPIs Globais aparecem sem área e sem time** em `/kpis`, `/kpis/evolution` e em vários ritos — quando deveriam exibir os responsáveis operacionais.

## Solução canônica

Estender o tipo do KPI com **campos derivados** (sem alterar schema):

```ts
effective_area = area  ?? responsible_area
effective_team = team  ?? responsible_team
```

Toda renderização de "área/time do KPI" passa a usar `effective_*`. Edição/forms continuam vendo os campos brutos (área estrutural × área operacional).

## Mudanças

### 1. Tipos (SSOT)
`src/modules/kpis/types.ts`
- Adicionar `responsible_area`, `responsible_team`, `effective_area`, `effective_team` em `KpiWithValues` e `KpiForWizardV2`.

### 2. Hooks de fetch — incluir joins de responsável e popular `effective_*`
- `src/modules/kpis/hooks/useKpiData.ts` (lista + detalhe)
- `src/modules/kpis/hooks/useKpiWithHistory.ts`
- `src/modules/kpis/hooks/useKpiEvolutionList.ts`
- `src/modules/kpis/hooks/useKpisForWizardV2.ts`
- `src/modules/kpis/hooks/useKpisForWizard.ts`
- `src/modules/okrs/hooks/useMbrMonthlyKpisByScope.ts` (já tem `responsible_team_id`; estender para `area`)
- `src/modules/okrs/hooks/useMbrPreTeamKpisMonthly.ts`
- `src/modules/teams/hooks/useTeamKpisGrouped.ts`

Joins padrão a adicionar:
```
responsible_area:areas!kpi_metrics_responsible_area_id_fkey(id, name, color),
responsible_team:teams!kpi_metrics_responsible_team_id_fkey(id, name)
```

### 3. Filtro por área no Dashboard `/kpis`
`useKpiData.ts` — espelhar o que já é feito para `team_id`:
```ts
if (areaId) {
  query = query.or(`area_id.eq.${areaId},responsible_area_id.eq.${areaId}`);
}
```
E atualizar `KpiDashboardPage.tsx` para agrupar por `effective_area.id`/`name`/`color` em vez de `area_id`.

### 4. Consumidores UI — trocar `kpi.area`/`kpi.team` → `kpi.effective_area`/`kpi.effective_team`
- `src/modules/kpis/components/KpiCard.tsx`
- `src/modules/kpis/components/KpiDashboardTable.tsx`
- `src/modules/kpis/components/KpiSidePanel.tsx`
- `src/modules/kpis/components/KpiDetailContent.tsx`
- `src/modules/kpis/components/KpiHistoryDialog.tsx`
- `src/modules/kpis/pages/KpiEvolutionPage.tsx`
- `src/modules/kpis/pages/KpiDashboardPage.tsx` (badges + agrupamento)
- `src/modules/okrs/components/wizards/shared/KpiMonthlyComparisonCard.tsx`
- `src/modules/okrs/components/wizards/shared/framework/components/KpiGateStep.tsx`
- `src/modules/okrs/components/wizards/clevel-checkin/CLevelInsightsStep.tsx`
- `src/modules/okrs/pages/mbr/useMbrDataSources.ts`

### 5. NÃO mexer
- Forms de Create/Edit (`CreateKpiDialog`, `EditKpiDialog`, `EditKpiScopeSection`, `ScopeAreaSection`, schemas).
- `useCanEditKpi`, `useCanChangeKpiScope` — lógica de permissão correta.
- `AreaBadge` (componente).
- Banco / migrations.

### 6. Memória / docs
- Criar `mem://features/kpis/kpi-effective-area-team-resolution` com a regra: "Renderização sempre via `effective_area`/`effective_team`. Filtros por área incluem `responsible_area_id`."
- Atualizar `mem://index.md` com a nova entrada.

## Validação

1. `/kpis` (NPS visível): badge "Operações" + chip "Customer Success".
2. `/kpis/evolution` (table + cards): mesmo.
3. Filtro `?area_id=<Operações>` em `/kpis`: NPS aparece (mesmo com `area_id=NULL`).
4. `/rituals/mbr?step=kpi-gate`: NPS rotulado com área/time.
5. `/rituals/mbr-pre?step=opening`: cards com área/time.
6. KPIs `scope='team'` legados (com `area_id`/`team_id` setados) continuam exibindo igual — fallback transparente.

## Riscos

- Cache: invalidar `queryKeys.kpis.*` após deploy (já garantido — só estamos adicionando colunas no select, mesmo cache key).
- TS: novos campos opcionais em `KpiWithValues` — sem breaking change para consumidores que já leem `kpi.area`/`kpi.team` (mantidos).
