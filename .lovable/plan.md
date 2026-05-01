## Objetivo

Na rota `/rituals/collaborator-checkin?step=kpis`, dentro do `CollaboratorKpiStep`, exibir:
1. **Tipo do indicador** — badge "KPI" ou "Métrica" (via `INDICATOR_TYPE_LABELS`).
2. **Mini-gráfico** das últimas atualizações do indicador, compacto (≈h-20), sem ocupar espaço excessivo.

## Pré-checklist (executado)

- TCR / docs canônicos: padrão SSOT de KPI já consolidado em `mem://features/kpis/kpi-value-entry-ssot.md` (formulário centralizado em `KpiValueEntryForm`).
- Componentes existentes inspecionados:
  - `KpiHistoryChart` (em `okrs/components`) — pesado, embrulhado em `Card` + Tabs, voltado para análise de KR. **Não serve inline** no step.
  - `KrEvolutionChart` — sparkline minimalista para KR (referência de padrão visual).
  - `useKpiHistory(kpiId)` — hook canônico que já retorna `values`, `trend`, `currentValue`, `variation`. **Reaproveitável.**
  - `useKpiChartData(history)` — formata data para Recharts. **Reaproveitável.**
  - `INDICATOR_TYPE_LABELS` (`{ kpi: 'KPI', metric: 'Métrica' }`) — fonte de verdade do label.
- `KpiForWizardV2` **não expõe** `indicator_type` hoje — precisa ser adicionado ao select e ao tipo (campo já existe na tabela `kpi_metrics`, conforme `useKpiData`/`useKpiEvolutionList`).

## Mudanças

### 1. Expor `indicator_type` no fluxo de wizard

**`src/modules/kpis/types.ts`** — adicionar `indicator_type: KpiIndicatorType` à interface `KpiForWizardV2`.

**`src/modules/kpis/hooks/useKpisForWizardV2.ts`** — incluir `indicator_type` no `select(...)` (linha 82-89) e no objeto enriquecido (linha 210-242), com fallback `(kpi.indicator_type ?? 'kpi') as KpiIndicatorType`.

### 2. Novo componente compacto centralizado: `KpiSparkline`

**Arquivo novo:** `src/modules/kpis/components/shared/KpiSparkline.tsx`
**Barrel:** atualizar `src/modules/kpis/components/shared/index.ts`.

Razão para criar (em vez de estender `KpiHistoryChart`):
- `KpiHistoryChart` é "viewer analítico" embrulhado em Card+Header+Tabs — semanticamente diferente de um sparkline inline.
- `KrEvolutionChart` é específico de KR (recebe `baseline`, `target`, `direction` de KR e tipa `KrCheckinHistory`).
- O novo componente fica **centralizado em `kpis/components/shared`** ao lado de `KpiValueEntryForm` para reuso futuro (lista de KPIs, dialogs, outros ritos).

Props:
```ts
interface KpiSparklineProps {
  kpiId: string;
  unit: string;
  target?: number | null;
  height?: number;        // default 80
  pointsLimit?: number;   // default 12 (últimas N atualizações)
  className?: string;
}
```

Comportamento:
- Usa `useKpiHistory(kpiId)` + `useKpiChartData` (já canônicos).
- `AreaChart` minimalista (sem eixo Y, eixo X só com últimas datas, gradient da `--primary`), padrão visual idêntico ao `KrEvolutionChart` para consistência.
- `ReferenceLine` em `target` quando disponível.
- Estados: skeleton enquanto carrega, mensagem inline "Sem histórico" quando `values.length === 0`, "Apenas 1 atualização" quando `length === 1`.
- Tooltip mostra valor formatado via `formatValueWithUnit` e data completa.

### 3. Integração no `CollaboratorKpiStep`

**`src/modules/okrs/components/wizards/collaborator/CollaboratorKpiStep.tsx`**:

a) **Badge de tipo** — no header (perto do título "Atualizar Indicador" ou no KPI Info Card, junto ao RAG):
```tsx
<Badge variant="outline" className="text-xs">
  {INDICATOR_TYPE_LABELS[kpi.indicator_type]}
</Badge>
```

b) **Sparkline** — entre o KPI Info Card (linha 256) e o `KpiValueEntryForm` (linha 258). Bloco enxuto:
```tsx
<div className="px-6 py-3 border-b">
  <div className="flex items-center justify-between mb-1">
    <span className="text-xs font-medium text-muted-foreground">Evolução recente</span>
  </div>
  <KpiSparkline
    kpiId={kpi.id}
    unit={kpi.unit}
    target={kpi.target_value}
    height={72}
    pointsLimit={12}
  />
</div>
```

Não duplica nem altera `KpiValueEntryForm`, `KpiHistoryChart`, `KrEvolutionChart` ou hooks existentes — apenas consome.

## Arquivos afetados

- `src/modules/kpis/types.ts` (adicionar `indicator_type` em `KpiForWizardV2`)
- `src/modules/kpis/hooks/useKpisForWizardV2.ts` (select + enrich)
- `src/modules/kpis/components/shared/KpiSparkline.tsx` (novo)
- `src/modules/kpis/components/shared/index.ts` (export)
- `src/modules/okrs/components/wizards/collaborator/CollaboratorKpiStep.tsx` (badge + sparkline)

## Não inclui

- Refatoração de `KpiHistoryChart` ou `KrEvolutionChart`.
- Alteração no `KpiValueEntryForm` (SSOT permanece intacto).
- Mudança de regras de RAG / gating de notes / footer do wizard.

## Validação

- Build/typecheck (auto).
- Visual: abrir `/rituals/collaborator-checkin?step=kpis` e verificar (a) badge "KPI"/"Métrica" no card do indicador, (b) sparkline ≤ 80px de altura sem quebrar layout, (c) estados sem histórico/com 1 ponto.
