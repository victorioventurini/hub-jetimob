# Tendência de KPIs baseada em consolidados dos últimos meses

## Por que mudar

Hoje o filtro de Tendência compara apenas os **dois últimos lançamentos** de cada KPI, sem distinguir se são valores parciais ou consolidados e sem janela de tempo. Isso gera ruído: um parcial de meio de mês pode ser comparado com um consolidado do mês anterior, e um único ponto atípico define a tendência.

Sim — o ideal é olhar para os **consolidados dos últimos meses**.

## O que será feito

1. **Só consolidados**: o cálculo da tendência passa a usar apenas valores com `input_type = 'consolidated'` (parciais são ignorados). Se o KPI não tiver consolidados suficientes, ele fica sem classificação (não aparece em nenhum dos três filtros).
2. **Janela de tempo explícita**: novo controle "Período" ao lado do filtro de Tendência, com opções **3, 6 e 12 meses** (padrão: 6 meses), refletido na URL (`?trendWindow=6`).
3. **Classificação por reta de tendência** (em vez de só primeiro vs. último ponto):
   - Regressão linear simples sobre os consolidados da janela.
   - A inclinação é normalizada em % sobre a média do período e orientada à meta (queda de churn = crescimento/melhoria).
   - Banda de estabilidade mantida em ±2% (por período): dentro da banda → Estabilidade; acima → Crescimento; abaixo → Queda.
   - Mínimo de 3 pontos consolidados na janela para classificar; com 2 pontos, cai no comparativo simples entre eles.
4. **Gráfico de evolução**: o mesmo seletor de período passa a recortar o gráfico da página e do modal de histórico, com opção "Tudo" para o histórico completo.
5. **Transparência na UI**: tooltip no badge de tendência informando base do cálculo (ex.: "6 consolidados, jan–jun/2026, inclinação +4,1%").

## Detalhes técnicos

- `src/modules/kpis/utils/trendClassification.ts`: substituir a assinatura atual por `classifyKpiTrendSeries(points, direction, { bandPct, minPoints })`, com regressão linear e normalização orientada via `orientedDeltaPct`. Manter export legado apenas se ainda houver consumidor.
- `src/modules/kpis/hooks/useKpiEvolutionList.ts`: hoje só guarda os 2 últimos valores por KPI. Passar a agregar a série filtrada por `input_type = 'consolidated'` e `reference_date >= hoje - janela`, e expor `consolidated_series` + `trend_class` no `KpiEvolutionItem`. Incluir a janela na query key (`queryKeys.kpis.evolutionList`).
- `src/modules/kpis/types.ts`: adicionar `KpiTrendWindow = 3 | 6 | 12` e labels.
- `src/modules/kpis/components/KpiDashboardFilters.tsx`: novo `Select` de período, habilitado junto ao filtro de tendência.
- `src/modules/kpis/pages/KpiEvolutionPage.tsx`: URL state `trendWindow`, passar ao hook e usar `trend_class` no filtro (sem recomputar no cliente).
- Testes em `src/modules/kpis/utils/__tests__/trendClassification.test.ts`: séries crescentes, decrescentes, planas, KPI `direction='down'`, dados insuficientes e presença de parciais (devem ser ignorados).
