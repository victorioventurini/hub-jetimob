## Contexto
Org Objectives são associados ao ciclo via coluna `year` (integer), não via `cycle_id`. O filtro atual de `useKrsForLinking` rejeita todos eles porque exige `cycleSet.has(obj.cycle_id)`. Resultado: nenhum Org KR aparece no popover de vínculo.

## Mudanças

### 1. `src/modules/projects/hooks/useKrsForLinking.ts`
- Adicionar `year` ao select de `okr_org_objectives`.
- Derivar `activeYears` a partir dos `activeCycles` com `type === 'year'` (parse do `name` para int).
- Criar dois validadores:
  - `isTeamObjectiveActive(obj)` → mantém regra atual (cycle_id ∈ cycleSet, status ≠ draft/cancelled, sem deleted_at/cancelled_at).
  - `isOrgObjectiveActive(obj)` → aceita match por `obj.year ∈ activeYears` **OU** `obj.cycle_id ∈ cycleSet`; mantém demais regras (status, soft-delete).
- Para Org KRs, `cycle_name` faz fallback para `String(obj.year)` quando `cycle:cycles` for nulo.
- `enabled`/early-return: permitir prosseguir se `cycleIds.length > 0` **OU** `activeYears.length > 0`.

### 2. `.lovable/memory/features/projects/kr-linking-standard.md`
- Documentar regra dual de filtragem por ciclo:
  - Team KRs: via `objective.cycle_id` ∈ ciclos ativos (quarter/year).
  - Org KRs: via `objective.year` ∈ anos ativos **ou** `objective.cycle_id` ∈ ciclos ativos (compatibilidade futura).
- Manter regras de exclusão de draft/cancelled/deleted intactas.

## Não-mudanças
- Schema do BD permanece igual.
- UI dos popovers permanece igual (já agrupa por objetivo + badge Org/Time).
- Mutations permanecem iguais.
- Navegação continua para `/okrs?...`.

## Verificação
- Type-check.
- Validar que Org KRs do ciclo 2026 aparecem na busca em /projects/:id.
- Validar que objetivos draft/cancelled continuam excluídos.