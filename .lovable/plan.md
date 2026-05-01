## Contexto

Pedido (`/teams/org-chart?fullscreen=true`):

1. Squads devem aparecer **ao lado** do subtime "Quality Assurance" (mesmo nível de Tecnologia, peers).
2. Squads devem **sempre aparecer** ao expandir o time de Tecnologia (sem precisar ligar toggle).

### Diagnóstico

- **Render unificado já existe** (`OrganogramNode.tsx` linhas 274–332): subteams + squads + pessoas já são tratados como irmãos no mesmo `allChildren`, em linhas de até 6, sem implicar hierarquia entre as linhas. Order: `subteams → squads → others → persons`. ✅
- **Causa real do bug "squads sumidos"**: `OrganogramPage.tsx` (linhas 36–39) tem o default do URL state `squads = "false"`. Com o toggle Squads OFF, o filtro em `OrganogramChart.filteredData` (`if (!filters.showSquads) filteredChildren = filteredChildren.filter(c => c.type !== 'squad')`) remove todos os squads antes de renderizar. Por isso QA aparece sozinho — squads existem nos dados mas são filtrados.
- **Path do squad** está como `/teams/squads/${id}` em `useOrganogramData.ts` (linha 169) mas a rota canônica é `/squads/:id` (`teams.routes.tsx`). Bug separado: clicar no card de squad cai em 404.

## Mudanças (presentation/data wiring, sem lógica de negócio)

### 1) `src/modules/teams/pages/OrganogramPage.tsx`
Trocar default do URL param `squads` de `"false"` para `"true"`. Mantém o toggle (usuário pode desligar), mas o estado inicial passa a mostrar squads. Atende ao requisito "sempre exibir squads ao expandir Tecnologia" sem mudar a semântica do filtro.

```text
defaultValue: "false"  →  defaultValue: "true"
```

### 2) `src/modules/teams/hooks/useOrganogramData.ts`
Corrigir o `path` do squad de `/teams/squads/${squad.id}` para `/squads/${squad.id}` (linha 169) para alinhar com `teams.routes.tsx`. Sem isso, abrir o card de squad vai pra rota inexistente.

### 3) Garantia visual (já implementado, apenas confirmar)
Nada a alterar em `OrganogramNode.tsx`: a ordem `[subteams, squads, persons]` já coloca QA e os squads lado a lado na primeira linha (peers do mesmo pai Tecnologia), respeitando o limite de 6 cards por linha.

## Validação

- `/teams/org-chart?fullscreen=true` → Tecnologia expandido por padrão: QA aparece como 1º card, squads logo ao lado, depois pessoas, tudo na mesma faixa horizontal.
- Toggle "Squads" OFF → squads desaparecem (comportamento original do filtro preservado).
- Clicar no card de um squad → abre `/squads/:id` (rota válida).
- Outras BUs sem squads: comportamento idêntico.
- Sem mudanças em RLS, queries, tipos ou query keys.
