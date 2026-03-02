
# Corrigir persistencia de valores de KPI via Collaborator Check-in

## Problema

Natalia preencheu valores de KPI no wizard collaborator-checkin, mas os dados nao foram salvos. A tabela `kpi_values` tem **zero registros** em toda a base.

## Diagnostico (confirmado via banco)

### Causa raiz: Trigger incompativel

O trigger `trg_enforce_bu_scope_kpi_values` executa `enforce_bu_scope()`, que acessa `NEW.bu_id`. Porem, a tabela `kpi_values` **nao possui coluna `bu_id`** — o escopo de BU e garantido via `kpi_id -> kpi_metrics.bu_id`. Toda tentativa de INSERT falha com erro do PostgreSQL.

### Causa secundaria: Erro silencioso no wizard

O `CollaboratorCheckinPage.tsx` usa uma mutacao fail-safe (linhas 352-365) com `try/catch` que apenas loga `console.warn`. O usuario nao recebe feedback de que a gravacao falhou.

### Causa terciaria: Cache nao invalida modulo /kpis

O `onSuccess` da mutacao (linhas 198-203) nao invalida as query keys usadas pelo modulo `/kpis`:
- `kpisKeys.valuesPrefix()` — historico de valores
- `kpisKeys.all(null)` — listagem geral
- `kpisKeys.kpiWithHistory(kpiId)` — grafico de evolucao

## Solucao

### 1. Migracao SQL: Remover trigger incompativel

```sql
DROP TRIGGER IF EXISTS trg_enforce_bu_scope_kpi_values ON public.kpi_values;
```

A seguranca de BU continua garantida por:
- RLS policies em `kpi_values` que fazem JOIN com `kpi_metrics` para verificar `bu_id`
- O trigger `trg_enforce_bu_scope` em `kpi_metrics` (que tem `bu_id`)

### 2. Codigo: Adicionar invalidacao de cache para modulo /kpis

**Arquivo:** `src/modules/okrs/pages/CollaboratorCheckinPage.tsx`

No `onSuccess` da mutacao `addKpiValueSilent` (linhas 198-203), adicionar:

```typescript
onSuccess: (_result, variables) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.kpis.forWizard({}), refetchType: 'active' });
  queryClient.invalidateQueries({ queryKey: queryKeys.kpis.detail(variables.kpi_id), refetchType: 'active' });
  queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResultsPrefix(), refetchType: 'active' });
  // Novas invalidacoes para modulo /kpis
  queryClient.invalidateQueries({ queryKey: queryKeys.kpis.valuesPrefix(), refetchType: 'active' });
  queryClient.invalidateQueries({ queryKey: queryKeys.kpis.all(null), refetchType: 'active' });
  queryClient.invalidateQueries({ queryKey: queryKeys.kpis.kpiWithHistory(variables.kpi_id), refetchType: 'active' });
  queryClient.invalidateQueries({ queryKey: queryKeys.kpis.listPrefix(), refetchType: 'active' });
},
```

### 3. Codigo: Adicionar feedback de erro ao usuario

**Arquivo:** `src/modules/okrs/pages/CollaboratorCheckinPage.tsx`

No `catch` (linhas 362-365), adicionar toast de aviso:

```typescript
} catch (error) {
  console.warn('[CollaboratorCheckin] KPI save failed (continuing):', error);
  toast.warning('Nao foi possivel salvar o valor do KPI. Tente novamente pelo modulo de KPIs.');
}
```

## Impacto

- Desbloqueia toda a persistencia de valores de KPI no sistema (0 registros atualmente)
- Dados preenchidos no wizard passarao a aparecer no modulo `/kpis`
- Usuario recebe feedback quando gravacao falha (sem bloquear wizard)
- Nota: o Comment Gate (notas obrigatorias para RAG amarelo/vermelho) continuara ativo — o wizard ja tem campo de notas
