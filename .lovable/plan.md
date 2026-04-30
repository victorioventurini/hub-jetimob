## Contexto

Hoje o `OrganogramNode.tsx` separa os filhos de um time em dois clusters distintos:

1. `nonPersonChildren` (subteams/squads) — renderizados primeiro, em uma linha própria
2. `personRows` (colaboradores em chunks de 6) — renderizados abaixo, em uma ou mais linhas

Resultado visual em Tecnologia: o subteam **Quality Assurance** aparece sozinho numa linha acima, e os colaboradores aparecem empilhados abaixo. Isso sugere que QA "está acima" das pessoas, quando na verdade ambos são filhos diretos do mesmo time pai (Tecnologia).

## Objetivo

Renderizar **subteams/squads na mesma faixa horizontal dos colaboradores**, como irmãos do mesmo pai. Manter a regra de máximo 6 cards por linha já existente, agora aplicada ao conjunto unificado (subteams + squads + pessoas).

## Mudanças (apenas presentation, arquivo único)

`src/modules/teams/components/organogram/OrganogramNode.tsx` — bloco de render de filhos (linhas ~274–320):

1. **Unificar a lista de filhos** num único array ordenado: subteams primeiro (mais "pesados" visualmente, à esquerda), squads em seguida, depois pessoas. Todos compartilham o mesmo tronco vertical e barra horizontal vindos do card pai.
2. **Aplicar `chunk(allChildren, 6)`** ao array unificado, mantendo o limite de 6 cards por linha pedido anteriormente.
3. **Conectores**: a 1ª linha recebe stem vertical do pai + barra horizontal (se >1 filho). Linhas 2..N continuam sem conectores próprios (regra já implementada para evitar falsa hierarquia entre linhas empilhadas).
4. Remover a divisão `nonPersonChildren` vs `personRows`; passar a tratar todos como irmãos.

### Esboço visual

Hoje:
```text
              [ Tecnologia ]
                    │
              [ QA Subteam ]          ← subteam isolado acima
                    │
   ──────────────┬──┴──┬──────────────
   [P][P][P][P][P][P]
   [P][P][P][P][P][P]
   [P]
```

Depois:
```text
              [ Tecnologia ]
                    │
   ────┬────┬────┬────┬────┬────
   [QA][P][P][P][P][P]              ← QA + 5 pessoas na mesma linha
   [P][P][P][P][P][P]
   [P][P]
```

## Detalhes técnicos

- Substituir o IIFE atual por: `const allChildren = [...subteams, ...squads, ...persons]; const rows = chunk(allChildren, MAX_PER_ROW);` e renderizar via `rows.map(renderRow)`.
- `renderRow` mantém a lógica atual: 1ª linha com stems, demais sem.
- Renomear `MAX_PERSONS_PER_ROW` → `MAX_CHILDREN_PER_ROW` (mais semântico) — valor permanece 6.
- Subteams/squads continuam usando `OrganogramNodeWrapper` recursivo, então sua expansão interna (filhos próprios) segue funcionando normalmente embaixo do card.
- Sem alteração em tipos, dados, hooks, query keys ou RLS.

## Validação

- `/teams` → Tecnologia: confirmar que QA aparece como 1º card da 1ª linha, ao lado dos colaboradores.
- Times só com pessoas: comportamento idêntico ao atual.
- Times só com subteams: continuam exibidos corretamente (até 6 por linha).
- Expansão dos subteams permanece funcional (clique no chevron do QA mostra membros do subteam abaixo).
