

## Plano: Sincronização de cache no vínculo KPI ↔ KR

### Objetivo
Fazer com que vincular, trocar ou desvincular um KPI primário (e guardrails) atualize **toda** a UI imediatamente, sem necessidade de refresh.

### Escopo
Arquivo único: `src/modules/okrs/hooks/useOkrKrMetrics.ts` (estender as 3 mutations existentes — não criar nada novo, conforme padrão "preferir estender e compor").

### Mudanças por mutation

**1. `useCreateKrMetric` — adicionar invalidações faltantes em `onSuccess`:**
- `queryKeys.okrs.krEffectiveValues(kr_id, kr_type)`
- `queryKeys.okrs.krPrimaryKpiBatch` via predicate (matches `['okr-kr-primary-kpi-batch', ...]`)
- `queryKeys.kpis.allKrLinks(currentBuId)` — usar predicate `['kpis', 'all-kr-links']` (não temos buId no escopo da mutation)
- Mover invalidação de `teamKeyResultsPrefix` / `orgKeyResultsPrefix` / `dashboardDataPrefix` para **fora** do branch `role === 'primary'` (também precisam atualizar para guardrails, pois afetam badges/contadores)

**2. `useUpdateKrMetric` — substituir invalidação atual (que só atinge `krMetrics`) por padrão completo via predicate:**
```ts
queryClient.invalidateQueries({
  predicate: (q) => Array.isArray(q.queryKey) && (
    q.queryKey[0] === 'okr-kr-metrics' ||
    q.queryKey[0] === 'okr-kr-primary-kpi' ||
    q.queryKey[0] === 'okr-kr-primary-kpi-batch' ||
    q.queryKey[0] === 'okr-kr-effective-values' ||
    (q.queryKey[0] === 'kpis' && q.queryKey[1] === 'all-kr-links')
  ),
});
queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResultsPrefix() });
queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgKeyResultsPrefix() });
queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectivesPrefix() });
queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgObjectivesPrefix() });
queryClient.invalidateQueries({ queryKey: queryKeys.okrs.dashboardDataPrefix() });
```

**3. `useDeleteKrMetric` — estender o predicate atual:**
- Adicionar `'okr-kr-primary-kpi-batch'` e `'okr-kr-effective-values'` ao predicate
- Adicionar predicate para `['kpis', 'all-kr-links', ...]`
- Adicionar invalidações de prefix: `teamKeyResultsPrefix`, `orgKeyResultsPrefix`, `teamObjectivesPrefix`, `orgObjectivesPrefix`, `dashboardDataPrefix` (necessário porque desvincular zera o sync de meta e altera progresso)

### Impacto na UI (atualização imediata garantida)

| Componente | Hook re-fetched | Resultado |
|---|---|---|
| `KrMetricsSection` (modal aberto) | `usePrimaryKrMetric`, `useGuardrailKrMetrics` | Select volta para "Nenhum" / mostra novo KPI |
| `PrimaryKpiLockBanner` | `usePrimaryKpiForKr` | Banner some/aparece/atualiza |
| Inputs de baseline/target/unit do dialog | `usePrimaryKpiForKr` (`hasPrimaryKpi`) | Desbloqueiam quando desvinculado |
| `OkrObjectiveCard` / `EnhancedObjectiveCard` | `useKrPrimaryKpiBatch` | Badge KPI primário some/aparece |
| `ObjectiveListItem` (dashboard) | `useKrPrimaryKpiBatch` | Progresso e badge atualizam |
| `KpiSelect` em outros lugares | `useKpiKrLinks` | Filtros "vinculadas" refletem mudança |

### Validação (pós-implementação)
1. Editar uma KR, vincular KPI primário → banner + lock dos inputs aparecem na hora.
2. Trocar para outro KPI → banner atualiza com novo nome/valor.
3. Selecionar "Nenhum" → banner some, baseline/target/unit voltam editáveis, badge no card da lista some.
4. Adicionar/remover guardrail → lista atualiza sem fechar modal.
5. Confirmar que não há regressão em outras edições (título, owner, status — já cobertas pelos hooks `useUpdate*KeyResult`).

### Observações
- Nenhum componente novo, nenhum hook novo: apenas estender `onSuccess` das 3 mutations existentes.
- Padrão de predicate broad já é usado no `useDeleteKrMetric` — apenas estendido.
- Não toca em RLS, edge functions ou schema.
- Conforme `mem://standards/query-key-prefix-standard`: usar helpers `*Prefix()` existentes; predicates para keys que dependem de parâmetros que a mutation não conhece (`buId`, todos os `krIds`).

