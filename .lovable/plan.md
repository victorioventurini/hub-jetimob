## Objetivo

Nos gráficos de KPI, exibir o **rótulo do período de consolidação** (ex.: "mai/26", "Q2/26", "2026", "S1/26", semana "06–12/mai") no eixo X e no tooltip, em vez da data crua de atualização (`dd/MM`).

## Mudança

Centralizar a formatação no mesmo lugar onde já é feita a deduplicação por período, usando `getConsolidationPeriod(freq, reference_date).start` como base do label.

### Mapeamento por frequência

| `consolidation_frequency` | `date` (eixo X) | `fullDate` (tooltip) |
|---|---|---|
| `daily` | `dd/MM` | `dd MMM yyyy` |
| `weekly` | `dd/MM` (início da semana) | `dd/MM – dd/MM yyyy` |
| `biweekly` | `dd/MM` (início) | `dd/MM – dd/MM yyyy` |
| `monthly` | `MMM/yy` (ex. `mai/26`) | `MMMM yyyy` (ex. `maio 2026`) |
| `quarterly` | `'Q'Q/yy` (ex. `Q2/26`) | `'Trim.' Q yyyy` |
| `semiannual` | `S1/yy` ou `S2/yy` | `S1 yyyy` / `S2 yyyy` |
| `annual` | `yyyy` | `yyyy` |
| `null` (sem freq.) | `dd/MM` (fallback atual) | `dd MMM yyyy` |

## Arquivos afetados

1. **`src/modules/kpis/utils/frequency.ts`** — adicionar helper puro `formatConsolidationPeriodLabel(freq, date)` retornando `{ short, long }` conforme tabela acima. Mantém a SSOT da nomenclatura de períodos.

2. **`src/modules/okrs/hooks/useKpiHistory.ts`** (`useKpiChartData`) — após o dedupe já existente, montar `date`/`fullDate` chamando o novo helper com `freq` quando existir, e mantendo o fallback `dd/MM` quando `freq` for `null`. Cobre: `KpiSparkline`, `KpiHistoryChart`, MBR/QBR/Collaborator wizards.

3. **`src/modules/kpis/components/KpiEvolutionChart.tsx`** (linhas 111–112) — usar o mesmo helper quando `consolidationFrequency` estiver presente.

4. **`src/modules/kpis/components/KpiDetailContent.tsx`** (linha 119) — usar o mesmo helper para o label do eixo X (já está em `MMM/yy`, vai virar canônico via helper).

## Fora de escopo

- Backend, RLS, triggers, schema.
- Lógica de deduplicação (já feita em iterações anteriores).
- Página de histórico/tabela (continua mostrando `reference_date` cru, pois ali a data exata da atualização importa).
- `KpiValueEntryForm` e demais formulários de entrada.

## Validação

URL: `/rituals/mbr?step=kpi-deep-dive&substep=57a26ec8-...`
- KPI mensal: eixo X passa a mostrar `jan/26`, `fev/26`, …, `mai/26` (em vez de `28/05`, `30/04`, etc.).
- KPI trimestral: `Q1/26`, `Q2/26`.
- Tooltip exibe a versão longa (`maio 2026`, `Trim. 2 2026`).
- KPIs sem `consolidation_frequency` continuam com `dd/MM` (sem regressão).
