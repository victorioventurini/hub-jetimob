---
name: KPIs Permissions Matrix (escopo + hierarquia)
description: SSOT da matriz scope-oriented de KPIs/Métricas — quem pode criar/editar/remover por escopo, com herança hierárquica de liderança (área → times; time → subtimes)
type: feature
---

# KPIs — Matriz de Permissões por Escopo (v3)

## Princípios

- **Liderança ≠ Template.** Resolvida em runtime via:
  - Frontend: `useHierarchicalLeadership`, `useCanCreateKpi`, `useCanEditKpi`, `useCanChangeKpiScope`.
  - DB/RLS: `user_can_manage_kpi(profile_id, kpi_id)` + `user_can_create_kpi(profile_id, scope, area_id, team_id, indicator_type)`.
- **Herança:** líder de área → todos os times da área; líder de time → time + subtimes via `parent_team_id` (reaproveita `get_descendant_team_ids`).
- **"Contribuidor" = "Atualizado por"** = `kpi_data_contributors` com `role='data_entry'`.

## Matriz (KPIs `indicator_type='kpi'`)

| Escopo | Cadastro | Edição | Remoção |
|--------|----------|--------|---------|
| `org` (Global) | super_admin, admin | super_admin, admin, responsável, atualizado-por | super_admin, admin |
| `area` (Área) | super_admin, admin, líder da área | super_admin, admin, líder da área, responsável, atualizado-por | super_admin, admin, líder da área |
| `team` (Time/Subtime) | super_admin, admin, líder da área, líder do time, líder do subtime | super_admin, admin, líderes hierárquicos, responsável, atualizado-por | super_admin, admin, líderes hierárquicos |

## Métricas (`indicator_type='metric'`)

- **Escopo travado em `team`** (trigger `enforce_metric_scope_team`).
- **Cadastro:** super_admin, admin, líder hierárquico **OU membro do time**.
- **Edição/Remoção:** super_admin, admin, líderes hierárquicos, responsável, atualizado-por.

## UI — pontos de aplicação

- `KpiActionsMenu`: `canArchive` (admins) vs `canDelete` (matriz hierárquica).
- `KpiDashboardPage`: gate `+ Criar Indicador` inclui `manageableTeamIds`/`ledAreaIds`.
- `CreateKpiDialog`: `useCanCreateKpi` filtra escopos disponíveis e força `scope=team` quando `indicator_type=metric`; lista de times para Métricas restrita a times dos quais é membro.
- `EditKpiDialog` / `useCanChangeKpiScope`: bloqueia mudança de escopo para Métricas; admin livre; líderes restritos ao seu escopo.

## RLS — políticas vigentes

- `kpi_metrics_insert_v3`, `kpi_metrics_update_v4`, `kpi_metrics_delete_v3` — usam `user_can_manage_kpi` / `user_can_create_kpi`.
- Trigger `trg_enforce_metric_scope_team` em `kpi_metrics`.
