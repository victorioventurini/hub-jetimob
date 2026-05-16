# Módulo KPIs — Canonical

**Slug:** `kpis` · **Status:** ✅ Ativo
**Master/SSOT:** `mem://features/kpis/kpis-master-standard`
**Effective area/team:** `mem://features/kpis/kpi-effective-area-team-resolution`

> Especificações completas no Master. Este arquivo cobre apenas operacional/UI.

## Tabelas

`kpi_metrics`, `kpi_values`. Schema: `src/integrations/supabase/types.ts`.

## Enums críticos (v3.0.0 — Frequency Split)

- `kpi_frequency_value` (7 valores): daily, weekly, biweekly, monthly, quarterly, semiannual, annual
- `kpi_update_mode`: manual, automatic, hybrid
- `kpi_input_type`: `partial` (parcial até a data, antes do período fechar) | `consolidated`
  - ⚠️ valor `projection` foi **renomeado para `partial`** (via `ALTER TYPE RENAME VALUE`)

## Campos novos em `kpi_metrics`

`consolidation_frequency`, `update_frequency`, `update_mode`, `frequency_migration_reviewed`.

## Campo novo em `kpi_values`

`input_type` (default `consolidated`).

## Triggers

- `kpi_frequency_validation` — valida combinação válida de frequências
- `trg_kpi_value_derive_confidence` — deriva nível de confiança automaticamente

## Função canônica de cálculo

`kpi_calculate_period_v2(...)` — semântica formal para biweekly e semiannual. Substituir chamadas a versões anteriores.

## KPI Gate (6-bucket)

Pré-MBR/MBR/QBR usam classificação 6-bucket via `classifyKpiGateBucketsFromMonthlySnapshots` + `useMbrPreTeamKpisMonthly` (ancorada ao mês de referência, sem contaminação por valores futuros).

## Effective Area/Team

Sempre via `effective_area`/`effective_team`. Filtros por área devem incluir `responsible_area_id`. Detalhes: `mem://features/kpis/kpi-effective-area-team-resolution`.

## Primary KPIs

Quando KPI é primário e está atrelado a um KR, o input manual da KR é bloqueado. Inputs de KPI restritos a datas passadas.

## Páginas

`/kpis` (dashboard), `/kpis/:id` (detalhe).

## Permissões

`kpis.metric.*`, `kpis.value.*`. Templates em `RBAC_TEMPLATES_V3.md`.

## Métricas SaaS suportadas

MRR Commit, MRR Churn, Expansion Revenue, Logo Churn, CAC, LTV — usadas no QBR Executive Report (`MRR Churn × MRR Commit × Expansion × Mkt Budget`).

## Referências

- Master: `mem://features/kpis/kpis-master-standard`
- Effective area: `mem://features/kpis/kpi-effective-area-team-resolution`
- Integração com KR: `modules/okrs.md`
- Rituais: `modules/rituals.md`
