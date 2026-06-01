
# Gráfico de KPI: deduplicar partial × consolidated por período

## Problema

No gráfico de evolução, quando um período (ex.: mai/26) tem tanto um valor **consolidado** quanto valores **parciais** registrados, ambos aparecem como pontos distintos no eixo X (no print: dois "mai/26"). Visualmente confunde e inflaciona a série.

## Regra desejada

Para cada **período de consolidação** do KPI (mensal, semanal, etc.):

1. Se existir pelo menos um valor `input_type='consolidated'` → mostrar apenas o **último** consolidado do período.
2. Se NÃO existir consolidado mas existir parcial → mostrar apenas o **último** parcial do período.
3. Períodos sem nenhum valor permanecem ausentes da série.

A regra vale para todas as instâncias do `KpiEvolutionChart` (cards do `KpiEvolutionPage`, modal `KpiHistoryDialog`, comparações).

O toggle existente "apenas consolidados" continua funcionando como filtro independente: quando ligado, parciais somem mesmo dos períodos sem consolidado.

## Implementação

### `src/modules/kpis/components/KpiEvolutionChart.tsx`
- Adicionar prop **`consolidationFrequency?: KpiFrequencyValue | null`**.
- No hook `useKpiChartData`, após o filtro `onlyConsolidated`:
  - Se `consolidationFrequency` existir, agrupar `values` por `getConsolidationPeriod(freq, refDate).label` (já temos o helper em `utils/frequency`).
  - Para cada grupo: separar consolidados vs. parciais; escolher o último consolidado por `reference_date`, ou, na ausência, o último parcial.
  - Sem `consolidationFrequency` (KPIs legados/manuais), manter o comportamento atual (sem dedupe) — fallback seguro.
- Manter ordenação cronológica final por `reference_date`.

### Consumidores — passar a prop
- `src/modules/kpis/components/KpiHistoryDialog.tsx` — já tem `kpi.consolidation_frequency`; adicionar `consolidationFrequency={kpi.consolidation_frequency}` no `<KpiEvolutionChart>`.
- `src/modules/kpis/pages/KpiEvolutionPage.tsx` — duas instâncias (card compacto + detalhe single mode). Em ambas, propagar `consolidation_frequency` que já vem em `kpi`/`data`.

## Fora de escopo

- Backend / `kpi_values` / triggers: nenhuma mudança.
- Tooltip e estilo dos pontos: mantidos (o ponto único de cada período já carrega o `inputType` correto e ganha o badge "(parcial)" no tooltip quando aplicável).
- Toggle "apenas consolidados": mantido e independente.
- Outros componentes que listam `kpi_values` em tabela (`KpiValuesTable`): fora do escopo — tabela mostra histórico bruto por design.

## Validação

1. KPI mensal com mai/26 consolidado + mai/26 parcial → gráfico mostra **um único ponto** em mai/26 com o valor consolidado.
2. KPI mensal só com mai/26 parcial → mostra um ponto em mai/26 com o valor parcial (estilo "anel vazado").
3. Toggle "apenas consolidados" ligado: períodos sem consolidado somem.
4. KPI sem `consolidation_frequency`: gráfico se comporta como hoje.
5. URL do exemplo (`/kpis/93f6a7c7-...`): mai/26 deixa de aparecer duplicado.
