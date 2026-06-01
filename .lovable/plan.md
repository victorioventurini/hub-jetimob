## Diagnóstico

A página `/kpis/evolution` (cards e charts) já renderiza via `KpiEvolutionChart`, que recebe `consolidationFrequency` e — a partir da última iteração — usa `formatConsolidationPeriodLabel` para o rótulo do eixo X.

Porém, o caminho `cards` (mini-charts) usa `useKpiWithHistory`, que:

1. **Não busca `input_type`** em `kpi_values` → a regra de dedupe "último consolidado por período, fallback último parcial" colapsa para "último ponto por período" (ok para o rótulo, mas mostra partial quando já há consolidado).
2. **Não busca `consolidation_frequency`** em `kpi_metrics` (a frequência hoje chega só via prop a partir do `KpiEvolutionItem`).

E o `KpiHistoryDialog` (acionado pelo botão "Histórico") também usa o mesmo hook → tem o mesmo problema.

## Mudanças

### 1. `src/modules/kpis/hooks/useKpiWithHistory.ts`

- Adicionar `consolidation_frequency` ao `select` de `kpi_metrics`.
- Adicionar `input_type` ao `select` de `kpi_values`.
- Refletir ambos no `KpiWithHistoryData` (tipos) e na construção de `KpiValue[]`.

### 2. `src/modules/kpis/pages/KpiEvolutionPage.tsx`

- Em `KpiMiniChart`, passar `consolidationFrequency` priorizando `data?.consolidation_frequency ?? consolidationFrequency` (segurança), mantendo a prop como fallback.

### 3. (Verificação) `KpiEvolutionChart`

- Confirmar que a formatação por `formatConsolidationPeriodLabel` continua ativa quando `consolidationFrequency` é truthy (já implementada).

## Fora de escopo

- Backend / RLS / triggers.
- Outras páginas (Sparkline, HistoryDialog, MBR, etc. — já cobertas em iterações anteriores via `useKpiHistory`).
- Tabela `Valores` (mantém `reference_date` cru, pois ali a data exata importa).

## Validação

Em `/kpis/evolution?type=kpi` (cards) e `?view=charts`:
- KPI mensal: eixo X passa a mostrar `jan/26`, `fev/26`, …, `mai/26`.
- KPI trimestral: `Q1/26`, `Q2/26`.
- Tooltip: forma longa (`maio 2026`, `Trim. 2 2026`).
- KPI sem `consolidation_frequency`: continua `dd/MM` (sem regressão).
- Dedupe preserva o último consolidado quando partials coexistem no mesmo período.
