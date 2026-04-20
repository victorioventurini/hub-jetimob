

## Plano: Corrigir unidade exibida em KR com KPI primário vinculado + saneamento de duplicatas

### Diagnóstico

KR `965748d8` ("Captar 1.800 inscritos com eventos") tem `unit='R$'` no banco e está vinculada a **3 KPIs marcados como `role='primary'`** (NPS em "pontos", Orçamento em "R$", NRR em "%"). O card exibe `R$ 44,54 / R$ 50` enquanto o valor real provavelmente vem do KPI NPS (44,54 pontos). Causas:

1. **Bug de UI (formatação)** — `ObjectiveListItem.tsx` (linha 626) e `EnhancedObjectiveCard.tsx` (linha 386) usam `effectiveCurrent` (vindo do KPI primário) mas formatam com `kr.unit`. Quando a unidade do KPI difere da KR, exibe a unidade errada.
2. **Bug no hook batch** — `useKrPrimaryKpiBatch.ts` não traz `kpi.unit`, então o card não tem como exibir a unidade correta.
3. **Violação de integridade** — existem 3 linhas `role='primary'` ativas para a mesma KR (deveria haver no máximo 1). `maybeSingle()` em `usePrimaryKpiForKr` retorna erro/null silencioso; o batch pega a última do loop arbitrariamente.

### Pré-checklist (executado)
- ✅ `mem://features/kpis/primary-kpi-single-source-truth` — KPI primário é fonte única; valor + unidade + meta devem vir dele.
- ✅ `mem://features/okrs/kpi-kr-integration-standard-v1` — sincronização de meta e unidade ao vincular KPI primário.
- ✅ `mem://architecture/unified-unit-selection-standard` — unidades padronizadas em `src/shared/constants/units.ts`.
- ✅ DEVELOPMENT_STANDARDS — não usar `select('*')`; query keys via helpers (mantido).
- ✅ Sem impacto em RLS, BU isolation, edge functions.

### Mudanças

**1. `src/modules/okrs/hooks/useKrPrimaryKpiBatch.ts`** — passar `unit` adiante:
- Adicionar `unit` à interface `KrPrimaryKpiInfo` (`kpiUnit: string`).
- Adicionar `unit` ao select do `kpi:kpi_metrics(...)`.
- Setar `kpiUnit: kpi.unit || ''` no `result.set(...)`.

**2. `src/modules/okrs/components/dashboard/ObjectiveListItem.tsx`** (linha 626):
```tsx
const effectiveUnit = hasPrimaryKpi && primaryKpiInfo?.kpiUnit
  ? primaryKpiInfo.kpiUnit
  : kr.unit;
// ...
{formatValue(effectiveCurrent, effectiveUnit)} / {formatValue(effectiveTarget, effectiveUnit)}
```

**3. `src/modules/okrs/components/EnhancedObjectiveCard.tsx`** (linha 386 e usos):
- Mesma lógica `effectiveUnit` aplicada onde `formatValue(..., kr.unit)` é chamado para `effectiveCurrent`/`effectiveTarget`.

**4. Saneamento de dados — KR `965748d8` (Supervisão Contabilidade BU jetimob)**
Atualmente 3 linhas `role='primary'` ativas. Um KPI primário só. Conforme o título da KR ("Captar 1.800 inscritos") e o valor exibido (44.54), os 3 vínculos são possivelmente equivocados (orçamento, NPS, NRR não medem "inscritos em eventos"). Ação: marcar os 3 como `deleted_at = now()` (preserva histórico) e deixar a KR sem KPI primário até o time vinculá-lo corretamente. Migration via tool de DB.

**5. Garantia de unicidade no banco** — Criar índice único parcial (se ainda não existir) para evitar reocorrência:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uniq_okr_kr_metrics_primary_active
  ON public.okr_kr_metrics (kr_id, kr_type)
  WHERE role = 'primary' AND deleted_at IS NULL;
```
(Se o índice existente não tiver `WHERE deleted_at IS NULL`, foi por isso que escapou. Esta versão fecha a brecha.)

### Validação pós-implementação
1. Recarregar `/okrs?view=team&team_id=c8e5d7a7...` → KR "Captar 1.800 inscritos" deve mostrar `0 / 50 R$` (sem KPI primário) ou `— / —` até religação correta.
2. Vincular KPI primário com unidade diferente em qualquer KR → card mostra valor + unidade do KPI, não da KR.
3. Tentar inserir 2º vínculo `role='primary'` ativo → banco rejeita (índice único).
4. Banner `PrimaryKpiLockBanner` e badge `KrPrimaryKpiBadge` continuam corretos (já usam dados do KPI).

### Observações
- Sem componente novo. Apenas estende hook existente + ajusta 2 pontos de exibição.
- Migration de saneamento é cirúrgica (1 KR específica). Índice único previne recorrência sistêmica.
- Não toca RLS, edge functions, schema (apenas índice).
- Query keys e cache invalidation já cobertos pelas mudanças anteriores em `useOkrKrMetrics.ts`.

### Arquivos a editar
- `src/modules/okrs/hooks/useKrPrimaryKpiBatch.ts`
- `src/modules/okrs/components/dashboard/ObjectiveListItem.tsx`
- `src/modules/okrs/components/EnhancedObjectiveCard.tsx`
- Migration: cleanup + índice único parcial em `okr_kr_metrics`.

