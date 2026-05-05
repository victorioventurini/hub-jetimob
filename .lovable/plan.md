## Mudança

No `MbrKpiGateStep.tsx`, substituir a única seção "KPIs Globais e de Área" por **duas seções independentes**, filtrando `overviewSnapshots` por `scope`:

```text
┌─ KPIs Globais — abril de 2026 ──────────────┐
│  KpiMonthlyComparisonCard (scope='org')     │
└─────────────────────────────────────────────┘

┌─ KPIs de Área — abril de 2026 ──────────────┐
│  KpiMonthlyComparisonCard (scope='area')    │
└─────────────────────────────────────────────┘
```

## Detalhes técnicos

Arquivo único: `src/modules/okrs/components/wizards/mbr/MbrKpiGateStep.tsx` (linhas 182–209).

1. Derivar com `useMemo`:
   - `orgSnapshots = overviewSnapshots.filter(s => s.scope === 'org')`
   - `areaSnapshots = overviewSnapshots.filter(s => s.scope === 'area')`

2. Renderizar duas `<section>` separadas, cada uma com:
   - Heading: `KPIs Globais — {formatMonthLabel(referenceMonth)}` / `KPIs de Área — {formatMonthLabel(referenceMonth)}`
   - Loading: `<Skeleton>` enquanto `overviewLoading`
   - Conteúdo: `KpiMonthlyComparisonCard` (mesmas props atuais — `showNoData`, `stack`, `topN={5}`)
   - Empty: mensagem específica ("Sem KPIs globais cadastrados nesta BU." / "Sem KPIs de área cadastrados nesta BU.")
   - Divider entre as seções

3. Sem mudança no hook `useMbrMonthlyKpisByScope` — ele já retorna ambos os escopos (`['org', 'area']`) com o campo `scope` em cada snapshot.

4. Sem mudanças em DB, RLS, queryKey, ou outros ritos. Apenas presentation.

Quer que eu implemente?
