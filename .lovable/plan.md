## Objetivo

No sparkline do step de KPIs (rota `/rituals/collaborator-checkin?step=kpis`), tornar a **meta** visível e legível — hoje há uma `ReferenceLine` em `target`, mas sem rótulo, então o usuário não a identifica.

## Pré-checklist (executado)

- TCR / canônicos: SSOT do `KpiSparkline` está em `src/modules/kpis/components/shared/KpiSparkline.tsx`. É o único componente; `KrEvolutionChart` segue padrão similar com `ReferenceLine` rotulada — usaremos a mesma convenção visual.
- `CollaboratorKpiStep` já passa `target={kpi.target_value}` e `unit={kpi.unit}`. Nenhuma mudança no consumidor.
- Domínio Y do `useKpiChartData` já considera `target_value` no `min`/`max`, então a linha sempre cabe no viewport.

## Mudança

### Único arquivo: `src/modules/kpis/components/shared/KpiSparkline.tsx`

Estender a `ReferenceLine` da meta com:
1. **Label "Meta"** posicionada à direita, em `text-muted-foreground` 9px (mesmo padrão de `KrEvolutionChart`).
2. **Tooltip** — quando `target != null`, adicionar uma linha extra "Meta: {valor formatado}" no tooltip já existente, para reforçar o contexto.
3. Aumentar levemente `strokeOpacity` (0.6 → 0.7) para a linha ficar perceptível em ≤80px de altura.

Não toca em props públicas, não cria componente novo, não duplica nada.

## Não inclui

- Mudança em `CollaboratorKpiStep`, `KrEvolutionChart` ou `KpiHistoryChart`.
- Alteração de domínio/escala do gráfico (já contempla target).

## Validação

- Build/typecheck (auto).
- Visual em `/rituals/collaborator-checkin?step=kpis`: linha tracejada com label "Meta" visível à direita; tooltip mostra valor da meta.
