# Filtro de Tendência em /kpis/evolution

Novo filtro "Tendência" na página de Evolução de Indicadores, com três opções: **Crescimento**, **Estabilidade** e **Queda**.

## Semântica (definida com você)

- A classificação é **orientada à meta**: o que vale é se o indicador melhorou ou piorou, não se o número subiu.
  - Ex.: um KPI de churn com `direction = down` que caiu de 25% para 23% entra em **Crescimento** (evolução positiva).
- **Estabilidade** = variação orientada dentro de **±2%** em relação ao valor anterior.
- Indicadores sem valor anterior (ou com anterior igual a zero) não têm variação calculável e ficam fora de Crescimento/Queda — são tratados como **sem dados** e só aparecem em "Todas as tendências".
- Os rótulos exibidos serão "Crescimento / Estabilidade / Queda", com um texto de apoio no seletor indicando que se refere à evolução em relação à meta (melhora/piora).

## Comportamento

- Seletor adicionado na linha de filtros existente, ao lado de Status e Vínculo com KRs.
- Estado persistido na URL (`?trend=growth|stable|decline`), seguindo o padrão dos outros filtros da página (links compartilháveis e Saved Links continuam funcionando).
- Filtragem client-side sobre a lista já carregada, igual ao filtro de vínculo com KRs — sem mudança de query no banco.
- O contador de resultados ("N indicadores") passa a refletir o filtro.
- Nos cards e na tabela, o ícone/cor de variação já existente permanece como está (nenhuma mudança visual além do novo seletor).

## Detalhes técnicos

- `src/modules/kpis/types.ts`: novo tipo `KpiTrendFilter = 'growth' | 'stable' | 'decline'` + `TREND_FILTER_LABELS` e a constante de banda de estabilidade (`KPI_TREND_STABLE_BAND_PCT = 2`).
- Novo helper puro `classifyKpiTrend(currentValue, previousValue, direction, bandPct)` em `src/modules/kpis/utils/` reutilizando `orientedDeltaPct` de `src/modules/okrs/utils/kpiVariations.ts` (SSOT de variação orientada), retornando `'growth' | 'stable' | 'decline' | null`.
- Teste unitário do helper cobrindo: direção `up`/`down`, banda ±2%, valor anterior nulo/zero.
- `src/modules/kpis/components/KpiDashboardFilters.tsx`: props opcionais `trend` / `onTrendChange` e novo `Select` (renderizado apenas quando o handler é passado, mantendo o dashboard `/kpis` inalterado).
- `src/modules/kpis/pages/KpiEvolutionPage.tsx`: `useUrlState` para `trend`, aplicação do filtro no `useMemo` que já resolve o filtro de KR link (composição dos dois), passando o valor para `KpiDashboardFilters`.

Nenhuma migração de banco, nenhuma alteração em edge functions.
