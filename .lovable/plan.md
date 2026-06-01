
# Dedupe partial × consolidated também no gráfico do KpiDetailContent

## Problema

A página `/kpis/:id` usa o componente `KpiDetailContent` (não o `KpiEvolutionChart`). Ele renderiza um `LineChart` inline com `chartData` montado direto de `values`, sem qualquer dedupe. Por isso mai/26 ainda aparece com 3 pontos (2 parciais + 1 consolidado) no KPI MQL.

## Mudança

Em `src/modules/kpis/components/KpiDetailContent.tsx`, antes do `.map(...)` que monta `chartData` (linhas ~87-93):

1. Aplicar a mesma regra do `KpiEvolutionChart`:
   - Agrupar `values` por `getConsolidationPeriod(kpi.consolidation_frequency, new Date(v.reference_date)).label` quando `consolidation_frequency` existir.
   - Para cada grupo: se houver consolidated → último consolidated por `reference_date`; senão → último partial.
   - Sem `consolidation_frequency`: passa direto (fallback).
2. Ordenar cronologicamente, aplicar o `.slice(-12)` e mapear para `{ date, value }` (mantém `MMM/yy`).

`currentValue`, `previousValue`, `lastValue` (calculados a partir de `values[0]`) ficam inalterados — refletem o último valor bruto registrado, que é o comportamento esperado para o card "Valor atual".

## Validação

Para o KPI `dd48710e-...` (MQL, monthly):
- jan/26 = 948, fev/26 = 758, mar/26 = 1014, abr/26 = 929, **mai/26 = 976 (consolidado de 28/05)**.
- Os parciais 17/05 e 24/05 deixam de aparecer no gráfico.

## Fora de escopo

Backend, outros componentes, tabela de histórico, regras de RAG.
