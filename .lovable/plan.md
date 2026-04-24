## Objetivo
Excluir da busca de KRs vinculáveis a Projetos/Marcos qualquer item cujo **objetivo pai** ou a própria **KR** estejam em estado `draft` ou `cancelled`. Hoje a listagem ignora o status do objetivo, fazendo com que o objetivo "teste" (cancelado, com KR ativa) apareça nos popovers.

## Diagnóstico
- `useKrsForLinking` filtra apenas `deleted_at IS NULL` e `cancelled_at IS NULL` na própria KR.
- O status `draft`/`cancelled` é uma propriedade do **objetivo** (`okr_team_objectives.status` / `okr_org_objectives.status`), não da KR.
- KRs órfãs de objetivos cancelados/rascunho continuam visíveis — viola `mem://features/okrs/draft-okr-governance`.

## Mudanças

### 1. `src/modules/projects/hooks/useKrsForLinking.ts`
- Incluir `objective.status`, `objective.deleted_at`, `objective.cancelled_at` no SELECT (Team e Org).
- Filtro client-side adicional após o filtro de ciclo:
  ```ts
  const obj = kr.objective;
  return obj?.cycle_id
    && cycleSet.has(obj.cycle_id)
    && obj.status !== 'draft'
    && obj.status !== 'cancelled'
    && !obj.deleted_at
    && !obj.cancelled_at;
  ```
- Aplicar a mesma regra a Team e Org.

### 2. `.lovable/memory/features/projects/kr-linking-standard.md`
Atualizar a seção "Listagem para vínculo" com:
> Exclui também KRs cujo **objetivo pai** esteja em `status='draft'`, `status='cancelled'`, `deleted_at` ou `cancelled_at` preenchidos.

## Não muda
- Schema do banco (XOR já implementado).
- UI dos popovers (largura, agrupamento, badges).
- Mutations de link/unlink.
- Navegação `/okrs?...`.

## Validação
- Recarregar `/projects/98074a55-...` → abrir popover → objetivo "teste" não deve mais aparecer.
- KRs de objetivos publicados ativos continuam listadas normalmente.
