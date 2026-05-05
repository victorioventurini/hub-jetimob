## Diagnóstico

A tabela "Indicadores fora da meta" (step `kpi-deep-dive`, abaixo do gráfico) mostra "—" para **Março de 2026** mesmo com o valor `R$ 2.051` registrado em 31/03/2026.

**Causa raiz:** o step está alimentando a tabela com o **snapshot congelado** do draft (`draft.data.kpiSnapshots`), seedado por `useSeedKpiSnapshots` a partir de `allBuKpis`. Esse seed só preenche `currentValue` (último valor de qualquer mês) e seta `previousValue = null` fixo. Nunca calcula o valor do mês anterior.

Já o step `kpi-gate` mostra os valores corretamente porque consome `useMbrMonthlyKpisByScope`, que faz o "last-in-month" para o mês de referência **e** para o mês anterior.

## Correção

No `MbrKpiDeepDiveStep`:

1. Consumir `useMbrMonthlyKpisByScope(referenceMonth, ['org','area','team'])` para obter os valores reais de Abril/Março por KPI.
2. Construir um `Map<kpiId, MbrMonthlyKpiSnapshot>` a partir do resultado.
3. Em `extraContentForCurrentKpi`, montar a linha da `MbrKpiGateTable` priorizando o snapshot mensal (que tem `previousValue` correto). Fallback para o snapshot do draft caso o KPI não esteja no overview (ex.: KPI removido após o seed).
4. Manter sparkline e `KpiLeaderInsightsPanel` intactos.

Sem mudanças no schema, sem alterar o seed do draft, sem afetar o KPI Gate.

## Arquivos afetados

- `src/modules/okrs/components/wizards/mbr/MbrKpiDeepDiveStep.tsx` — adicionar hook mensal e usar seu snapshot na tabela.

## Validação

Reabrir `/rituals/mbr?step=kpi-deep-dive` no KPI CAC e conferir que a coluna "Março de 2026" mostra `R$ 2.051` e a Variação % aparece (≈ +55,9% piora, vermelho — direção `down`).