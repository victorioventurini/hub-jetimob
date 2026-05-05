# Direção da KPI nas análises de melhora/piora — canônico

## Problema

Hoje a classificação "Maiores avanços × Maiores quedas" e os ícones/cores de tendência usam apenas o sinal de `deltaPct` (`current - previous`). Para KPIs com `direction = 'down'` (ex.: CAC — menor é melhor), uma alta no valor é exibida como **avanço** (verde), o que está incorreto.

Já temos um helper canônico parcial em `src/lib/colors.ts → getKpiTrendColor(trend, direction)`, mas ele não é usado pelos cards comparativos dos ritos (Pré-MBR, MBR Executivo, Panorama, Executive Quarter Review). Cada local reimplementa a lógica e nenhum consulta `direction`.

## Princípio canônico

- **Avanço (improvement)** = o valor se moveu **na direção desejada** (`direction = 'up'` → subiu; `direction = 'down'` → caiu).
- **Piora (regression)** = movimento contrário.
- **Estável** = `deltaPct === 0` ou indefinido.
- KPIs sem `direction` (ou `direction = 'maintain'` / `null`) caem no comportamento atual (`up = bom`) — único default seguro, já adotado em `getKpiTrendColor`.
- Ranking "Maiores avanços / Maiores quedas" ordena pelo **módulo do delta orientado** (não pelo sinal bruto), mantendo top 3 de cada lado.

## SSOT a criar

`src/modules/okrs/utils/kpiVariations.ts` (estender — já existe):

```ts
export type KpiDirection = 'up' | 'down' | 'maintain' | null | undefined;

export function isKpiImprovement(deltaPct: number | null, direction: KpiDirection): boolean | null;
export function classifyKpiDelta(deltaPct: number | null, direction: KpiDirection):
  'improvement' | 'regression' | 'flat' | null;

/** delta com sinal corrigido pela direção: positivo = bom, negativo = ruim */
export function orientedDeltaPct(deltaPct: number | null, direction: KpiDirection): number | null;
```

Tests novos em `kpiVariations.test.ts` cobrindo: direction up/down/maintain/null × delta positivo/negativo/zero/null.

## Pontos de aplicação (todos os ritos)

1. **`src/modules/okrs/components/wizards/shared/KpiMonthlyComparisonCard.tsx`** (SSOT visual usado por Pré-MBR Abertura e MBR Executivo KPI Gate)
   - `computeKpiDeltas` passa a usar `orientedDeltaPct` e classifica `ups/downs` por `classifyKpiDelta`.
   - Mantém top 3 ordenados por `Math.abs(orientedDeltaPct)`.
   - `KpiDeltaRow` continua mostrando `previous → current` com `deltaPct` **bruto** (mantém realidade numérica), mas a cor e a coluna (avanços/quedas) seguem o oriented.
   - Microcopy mantém "Maiores avanços" / "Maiores quedas".

2. **`src/modules/okrs/components/wizards/mbr/MbrPanoramaStep.tsx`** — `TrendIcon` + `formatVariation` na linha 138-211: passar `direction` do KPI; ícone/cor via `classifyKpiDelta`.

3. **`src/modules/okrs/hooks/useMbrPreMonthAnalysis.ts`** — payload enviado à edge `mbr-pre-month-analysis` precisa incluir `direction` e `orientedDeltaPct` para o agente IA não inverter narrativa. Edge function lê e cita corretamente (ajuste de prompt: "considere a direção da KPI ao narrar avanço/piora").

4. **`src/modules/okrs/pages/executive-quarter-review/helpers.tsx → trendArrow`** + `sections/KpisSection.tsx` — passar `direction` (já presente no objeto KPI) para escolher seta para cima/baixo coerente com bom/ruim, e cor via classify.

5. **`src/modules/okrs/components/wizards/collaborator/CollaboratorSummary.tsx`**
   - `KrCard`: KRs têm `direction` (ver `CheckinProgressBlock`); usar `isKpiImprovement` (ou helper irmão para KR — mesma assinatura) em vez de `change > 0`.
   - `KpiCard`: aplicar igualmente quando renderizar tendência.

6. **`src/modules/okrs/components/wizards/collaborator/CollaboratorKpiStep.tsx`** linhas 380-405 — já considera direção localmente; substituir bloco inline pelo helper canônico.

7. **`src/modules/okrs/components/checkin/CheckinProgressBlock.tsx`** — já considera `direction` para KRs; substituir cálculo inline pelo helper canônico (consolidação, sem mudança de comportamento).

8. **`src/lib/colors.ts → getKpiTrendColor`** — manter (já correto); documentar que é a fonte de cor a partir de `trend` agregado. O novo helper convive porque opera sobre `deltaPct` numérico (necessário para os cards comparativos onde não existe `trend`).

Itens onde **não** mexer (revisados, não envolvem direção de KPI):
- `QbrMeetingOpeningStep.getTrend` (compara RAG ordinal entre quarters — semântica própria).
- `KpiCard` / `KpiDashboardTable` / `KpiSidePanel` em `src/modules/kpis/...` — já usam `getKpiTrendColor(trend, direction)` corretamente.
- `executive-quarter-review/sections/KpisSection` — só passar a `direction` no `trendArrow`.

## Detalhes técnicos

- Tipo `direction` no snapshot já existe (`MbrKpiSnapshot.direction: 'up' | 'down' | null`) e é populado pelos hooks `useMbrPreTeamKpisMonthly` e `useMbrMonthlyKpisByScope` (lendo `kpis.direction` do banco). Nada a migrar.
- Para KR, `direction` já vem do objeto KR consumido pelos cards.
- Edge function `mbr-pre-month-analysis`: adicionar campo `direction` em cada item de `kpis[]` no payload e ajustar prompt do agente `analista-estrategico` para interpretar `orientedDeltaPct` (sinal já corrigido) em vez de re-derivar.
- Não criar novos componentes visuais; só estender helpers e roteamento de props.

## Validação

- Unit tests em `kpiVariations.test.ts`.
- Snapshot/regressão visual em `MbrKpiGateStep.test.tsx`, `MbrPanoramaStep.test.tsx`, `QbrKpiAnalysisStep.test.tsx`, `QbrMeetingSteps.test.tsx`, `QbrCLevelSteps.test.tsx` — adicionar caso com KPI `direction = 'down'` que sobe → vai para "Maiores quedas".
- Manual no time citado: `/rituals/mbr-pre?team=c8e5d7a7-...&step=opening` deve mostrar **CAC** subindo dentro de "Maiores quedas" em vermelho.
- Manual em `/rituals/mbr?step=kpi-gate` mesma checagem nos KPIs globais e de área.

## Arquivos a editar (sem criação de componentes novos)

- `src/modules/okrs/utils/kpiVariations.ts` (+ teste)
- `src/modules/okrs/components/wizards/shared/KpiMonthlyComparisonCard.tsx`
- `src/modules/okrs/components/wizards/mbr/MbrPanoramaStep.tsx`
- `src/modules/okrs/hooks/useMbrPreMonthAnalysis.ts`
- `supabase/functions/mbr-pre-month-analysis/index.ts` (payload + prompt)
- `src/modules/okrs/pages/executive-quarter-review/helpers.tsx`
- `src/modules/okrs/pages/executive-quarter-review/sections/KpisSection.tsx`
- `src/modules/okrs/components/wizards/collaborator/CollaboratorSummary.tsx`
- `src/modules/okrs/components/wizards/collaborator/CollaboratorKpiStep.tsx`
- `src/modules/okrs/components/checkin/CheckinProgressBlock.tsx`
- Memória `mem://standards/kpi-direction-aware-comparison` (novo) + entrada no `mem://index.md` em **Standards & Patterns**.
