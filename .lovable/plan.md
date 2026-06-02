## Objetivo

Na etapa **Pautas e decisões** do MBR, tornar os cartões da seção **"Pendências do MBR Anterior"** totalmente editáveis, usando o mesmo `DecisionCard` (com reclassificação, responsável, prazo, edição de texto e remoção) já usado para os registros criados dentro do próprio rito.

## Comportamento

- Cada pendência herdada vira um registro editável (texto, categoria, responsável, prazo).
- Ao editar/reclassificar/atribuir responsável/prazo, a mudança é persistida no draft do MBR atual (em `decisions`), preservando o `id` original para reconciliação com a sessão anterior.
- Continuam visualmente agrupadas sob o cabeçalho “Pendências do MBR Anterior”, separadas dos registros criados nesta etapa, para manter a leitura de origem.
- Remover um item carry-over no MBR atual = descartá-lo (não voltará a aparecer na próxima sessão como pendente — fica resolvido).

## Mudanças

### `src/modules/okrs/components/wizards/mbr/MbrDecisionsStep.tsx`

1. **Hidratar pendências no estado editável**: em `useEffect`, mesclar em `decisions` cada item de `previousMbrPendingItems` cujo `id` ainda não esteja presente, marcando `metadata.carry_over = true` e preservando `category`/`text`/`owner`/`deadline` originais. Chamar `onDecisionsChange` uma única vez.
2. **Separar carry-overs da listagem agrupada por step**: `groupedDecisions` passa a filtrar `d.metadata?.carry_over !== true`.
3. **Substituir os `Card` read-only** (linhas 206–222) por `DecisionCard` com `showReclassify` e `showOwnerDeadline`, usando os mesmos `handleUpdate`/`handleRemove`. Manter o header da seção (`Clock` + “Pendências do MBR Anterior (N)”).
4. Contador da seção passa a refletir os carry-overs presentes em `decisions` (não mais o prop bruto), para refletir remoções/edições em tempo real.

Nenhuma mudança em `MbrPage.tsx`, hooks ou backend — `previousMbrPendingItems` continua sendo a fonte de hidratação inicial, e `decisions` segue como o estado canônico salvo no draft.

## Fora de escopo

- Seção “Sinalizações dos Pré-MBRs” (continua como “sugestão + botão adicionar”).
- Carry-over de outros ritos (weekly/QBR).
