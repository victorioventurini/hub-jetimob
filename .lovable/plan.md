## Objetivo
Gerar exportações CSV da BU **Jetimob** com OKRs ativos e KPIs com seus valores de 2026.

## Entregáveis (em `/mnt/documents/`)
1. `jetimob-okrs-org-2026.csv` — Objetivos organizacionais + seus KRs Org (ano 2026)
2. `jetimob-okrs-team-q1-2026.csv` — Objetivos de time + KRs do ciclo Q1/2026
3. `jetimob-okrs-team-q2-2026.csv` — Objetivos de time + KRs do ciclo Q2/2026
4. `jetimob-kpis-metadata-2026.csv` — Metadados dos KPIs ativos
5. `jetimob-kpis-values-2026.csv` — Todos os valores de KPI com `period_start` em 2026

## Escopo / Filtros
- BU: `Jetimob` (resolver `bu_id` por nome)
- **Somente ativos:** `deleted_at IS NULL` + `cancelled_at IS NULL` (objetivos e KRs)
- KPIs: `lifecycle_status = 'active'` (SSOT — ver memória `kpi-status-consolidation`)
- Q1/Q2: identificar ciclos da BU Jetimob com `year=2026` e nome/datas correspondentes a Q1 e Q2 (filtrar por `cycles.id` nos objetivos de time)

## Colunas previstas

### OKRs Org (`okr_org_objectives` + `okr_org_key_results`)
objective_id, objective_title, year, status, kr_id, kr_title, kr_type, baseline, current_value, target, direction, unit, rag_status, owner_name, progress_%, last_checkin_at

### OKRs Team Q1 / Q2 (`okr_team_objectives` + `okr_team_key_results` + `teams` + `cycles`)
cycle_name, team_name, area_name, objective_id, objective_title, status, kr_id, kr_title, kr_type, baseline, current_value, target, direction, unit, rag_status, owner_name, progress_%, last_checkin_at

### KPIs metadata (`kpi_metrics`)
kpi_id, name, description, unit, direction, frequency_value, consolidation_frequency, update_frequency, update_mode, input_type, lifecycle_status, effective_area, effective_team, responsible_profile_name

### KPIs values 2026 (`kpi_values`)
kpi_id, kpi_name, period_start, period_end, value, input_type, confidence, source, created_at

## Etapas técnicas (read-only, via psql)
1. Resolver `bu_id` da Jetimob e ids dos ciclos Q1/Q2 2026.
2. Rodar 5 queries `COPY ... TO STDOUT WITH CSV HEADER` direcionando para `/mnt/documents/`.
3. Calcular `progress_%` no SQL usando a fórmula canônica (sem clamp): se `direction='up'` → `(current-baseline)/(target-baseline)*100`, caso contrário invertido; tratar `baseline=target` retornando 0/100.
4. Validar contagens (linhas por arquivo) e emitir 5 tags `<presentation-artifact>`.

## Notas
- Não há alterações de schema, código ou dados. Apenas SELECTs e export.
- Owner/responsável resolvidos via join em `profiles.full_name`.
- Caso a Jetimob não tenha ciclo Q1 ou Q2/2026 configurado, o CSV correspondente será gerado vazio (apenas cabeçalho) e isso será reportado.
