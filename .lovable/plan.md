## Objetivo
Adicionar em `/kpis` (KpiDashboardPage) um filtro que isole indicadores que **precisam de atenção de input**, distinguindo dois sintomas independentes:

- **A) Atualização atrasada** — `update_frequency` venceu desde o último valor (input parcial ou consolidado).
- **B) Consolidação pendente** — existem **períodos de `consolidation_frequency` já fechados** que não receberam valor `input_type='consolidated'`.

## Pré-checklist (executado)
- TCR `KPI_FREQUENCY_SUNSET_PLAN.md` + `mem://features/kpis/kpis-master-standard` (v3.0.0) confirmam: `update_frequency` rege gate de input; `consolidation_frequency` rege fechamento de período; `input_type` distingue `partial` vs `consolidated`.
- Helpers SSOT já existentes em `src/modules/kpis/utils/frequency.ts`: `UPDATE_OVERDUE_THRESHOLDS`, `FREQUENCY_DAYS`, `getConsolidationPeriod`. Vou **estender**, não duplicar.
- Lógica de `needsUpdate` está duplicada em `useKpisForWizard.ts` e `useKpisForWizardV2.ts` — será consolidada no SSOT (sem mudar comportamento de gate dos ritos).
- Componentes reutilizados: `KpiDashboardFilters` (novo Select no padrão existente), `ListPageFilters`, `useUrlState`, padrão de pílula `border-dashed bg-muted/30` já usado por `needs_review`/`missing_responsible`. Nenhum componente novo criado.
- BU isolation, RLS, query keys: sem impacto (filtro client-side sobre dados já carregados pelo `useKpiData`).

## Regras canônicas

### Regra A — Atualização atrasada (`update_overdue`)
```
update_frequency ausente            → false (KPI manual fica fora)
sem nenhum valor                    → true
diff(now, latest_reference_date)
  ≥ UPDATE_OVERDUE_THRESHOLDS[freq] → true
```

### Regra B — Consolidação pendente (`consolidation_pending`)
Detecta **todos os períodos de `consolidation_frequency` já fechados** (`period.end < now`) sem valor `input_type='consolidated'` correspondente.

Implementação eficiente (sem N+1):
1. Coletar `period_label` de todos os valores com `input_type='consolidated'` → `Set<string>`.
2. Iterar períodos para trás a partir do **último período fechado** (cronologicamente recente), via `getConsolidationPeriod` em saltos de `FREQUENCY_DAYS[freq]`.
3. Critério de parada: parar quando o `period_label` corrente **existir no Set** (último consolidado conhecido). Se nenhum valor consolidado nunca foi lançado, parar quando atingir a `created_at` do KPI (ou limite máximo de 24 períodos para guardrail de performance).
4. Se houver **qualquer** período fechado faltante no Set → `consolidation_pending = true` e expor `missing_consolidation_count` (para uso futuro em tooltip/banner).

KPIs sem `consolidation_frequency` → `false` (fora do filtro).

## Mudanças

### 1. Helpers SSOT em `utils/frequency.ts`
```ts
// Regra A — substitui as 2 cópias locais
export function isKpiUpdateOverdue(
  updateFrequency: KpiFrequencyValue | null | undefined,
  lastReferenceDate: string | Date | null | undefined,
  now?: Date,
): boolean

// Regra B — itera períodos fechados
export function getMissingConsolidationPeriods(
  consolidationFrequency: KpiFrequencyValue | null | undefined,
  consolidatedPeriodLabels: Iterable<string>,
  bounds: { kpiCreatedAt: Date; now?: Date; maxLookback?: number },
): string[]  // labels dos períodos faltantes (ordem desc)

export function isKpiConsolidationPending(...): boolean // wrapper de length > 0
```

Testes em `utils/__tests__/frequency.test.ts` cobrindo:
- A: sem valor, vencido, dentro do prazo, manual.
- B: tudo em dia; um período fechado faltando; múltiplos períodos faltando; KPI recém-criado (zero períodos fechados); guardrail `maxLookback`.

### 2. Refatorar consumidores (sem mudança de comportamento)
- `hooks/useKpisForWizard.ts`: remover `function needsUpdate(...)` local, importar `isKpiUpdateOverdue`.
- `hooks/useKpisForWizardV2.ts`: substituir `checkNeedsUpdate` pelo SSOT.
- `hooks/__tests__/useKpisForWizard.test.ts`: apontar para o helper exportado.

### 3. `useKpiData.ts` — popular flags derivadas em `KpiWithValues`
- O `select` de `kpi_values` deve incluir explicitamente `input_type` e `period_label` (verificar; adicionar se ausente — sem `select('*')`).
- O `select` de `kpi_metrics` já traz `consolidation_frequency`, `update_frequency`, `created_at`.
- No mapeamento existente, calcular:
  ```ts
  const consolidatedLabels = values
    .filter(v => v.input_type === 'consolidated' && v.period_label)
    .map(v => v.period_label!);

  const missingPeriods = getMissingConsolidationPeriods(
    kpi.consolidation_frequency,
    consolidatedLabels,
    { kpiCreatedAt: new Date(kpi.created_at) },
  );

  const update_overdue = isKpiUpdateOverdue(kpi.update_frequency, lastValue?.reference_date);
  const consolidation_pending = missingPeriods.length > 0;
  const needs_update = update_overdue || consolidation_pending;
  ```

### 4. `types.ts` — campos derivados em `KpiWithValues`
```ts
needs_update?: boolean;
update_overdue?: boolean;
consolidation_pending?: boolean;
missing_consolidation_count?: number;
```
Opcionais para retrocompat de consumidores externos.

### 5. URL state + filtragem em `KpiDashboardPage.tsx`
```ts
const needsUpdateState = useUrlState<'all'|'any'|'overdue'|'pending'>({
  key: 'needs_update',
  defaultValue: 'all',
  parse: (v) => (['any','overdue','pending'].includes(v) ? v as any : 'all'),
});
```
Aplicar no `useMemo` de `filteredKpis` (junto aos demais filtros client-side):
```
any      → k.needs_update
overdue  → k.update_overdue
pending  → k.consolidation_pending
```

### 6. Select novo em `KpiDashboardFilters.tsx`
Padrão idêntico aos selects existentes (sem componente novo). Posicionado ao lado do filtro de Status RAG.
- Label: "Atualização"
- Opções: "Todos" / "Precisa de atualização" / "Atualização atrasada" / "Consolidação pendente"
- Props: `needsUpdate?: 'all'|'any'|'overdue'|'pending'`, `onNeedsUpdateChange?: (v) => void`

### 7. Pílula de filtro ativo no Dashboard
Reutiliza o mesmo padrão visual de `needs_review` / `missing_responsible` (`border-dashed bg-muted/30`). Texto dinâmico:
- `any` → "Mostrando indicadores que precisam de atualização."
- `overdue` → "Mostrando indicadores com atualização atrasada."
- `pending` → "Mostrando indicadores com consolidação pendente."

Botão "Limpar filtro" reseta para `all`.

## Detalhes técnicos
- 100% client-side: dados de `kpi_values` já vêm em `useKpiData`. Sem nova query, sem mudança de RLS.
- Guardrail de performance: `maxLookback` default 24 períodos (2 anos mensais, 6 anos trimestrais) evita loops longos em KPIs antigos órfãos.
- `consolidation_pending` ignora KPIs sem `consolidation_frequency` (alinhado com gate de ritos).
- `missing_consolidation_count` exposto no tipo para uso futuro (tooltip "3 fechamentos pendentes" no card/tabela), mas **não renderizado nesta entrega**.

## Arquivos afetados
- `src/modules/kpis/utils/frequency.ts` — novos helpers SSOT.
- `src/modules/kpis/utils/__tests__/frequency.test.ts` — cobertura A + B.
- `src/modules/kpis/hooks/useKpisForWizard.ts` — usa SSOT.
- `src/modules/kpis/hooks/useKpisForWizardV2.ts` — usa SSOT.
- `src/modules/kpis/hooks/__tests__/useKpisForWizard.test.ts` — apontar para SSOT.
- `src/modules/kpis/hooks/useKpiData.ts` — `select` inclui `input_type`/`period_label`; mapeamento popula flags.
- `src/modules/kpis/types.ts` — campos opcionais em `KpiWithValues`.
- `src/modules/kpis/components/KpiDashboardFilters.tsx` — Select "Atualização".
- `src/modules/kpis/pages/KpiDashboardPage.tsx` — URL state, filtragem, pílula.

## QA
- KPI mensal sem valor há 60 dias → aparece em `overdue` e `any`.
- KPI mensal com `partial` lançado ontem mas sem `consolidated` do mês passado → aparece em `pending` e `any`, **não** em `overdue`.
- KPI manual (sem `update_frequency` nem `consolidation_frequency`) → fora dos 3 filtros ativos.
- KPI com tudo em dia → some quando qualquer modo ≠ `all` for selecionado.
- Combinação com Área/Time/Tipo/Status RAG/busca textual: tudo soma.
- Pílula "Limpar filtro" remove o param da URL e o select volta para "Todos".
