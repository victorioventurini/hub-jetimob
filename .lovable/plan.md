## Objetivo
Remover o campo "Status do Ciclo" dos modais de cadastro e edição de KPIs. Toda nova KPI passa a ser criada com `lifecycle_status = 'active'`. KPIs existentes mantêm o valor atual (não há mais UI para alterar).

## Mudanças de UI

### Cadastro
- `src/modules/kpis/components/create-kpi/sections/TypeStatusSection.tsx`
  - Remover o `FormField` de `lifecycle_status` (bloco do select "Status do Ciclo").
  - Ajustar o container de `grid grid-cols-2 gap-4` para layout de um único campo "Tipo".
- `src/modules/kpis/components/create-kpi/schema.ts`
  - `DEFAULT_CREATE_KPI_VALUES.lifecycle_status`: `"proposed"` → `"active"`.
  - Manter o campo no schema; a validação condicional `=== "active"` (que exige `updated_by_user_id`, `area_id`/`responsible_area_id` por escopo) passa a aplicar-se a toda criação — comportamento desejado.

### Edição
- `src/modules/kpis/components/edit-kpi/EditKpiBasicFields.tsx`
  - Remover o `FormField` de `lifecycle_status` e qualquer label de seção dedicada a ele; ajustar grid.
- `src/modules/kpis/components/edit-kpi/useEditKpiForm.ts` e `editKpiSchema.ts`
  - Manter campo no schema/form. O `defaultValue` preserva `kpi.lifecycle_status || 'active'`, então a submissão envia o valor atual do KPI sem alteração.

## Sem mudanças
- `useKpiMutations.ts` continua persistindo `lifecycle_status`.
- Sem migração de banco (já normalizamos: todas as 31 KPIs estão `active`).
- Sem mudanças em listagens, filtros, RAG, gates de ritos ou wizards.

## Validação
- Criar nova KPI (time/área/org): nasce `active`; validações de campos obrigatórios para ativos seguem disparando.
- Editar KPI existente: modal não exibe o campo; submissão preserva o status atual.
- Smoke test no MBR-pré: KPIs aparecem nos buckets conforme RAG (não dependem mais da UI de status).