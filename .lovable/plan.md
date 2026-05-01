# Padronizar UI de Iniciativas no Check-in do Colaborador

## Objetivo

Na rota `/rituals/collaborator-checkin?step=initiatives`:

1. **Remover** o botão/área "Comentar" por iniciativa.
2. **Reutilizar a mesma UI canônica usada dentro do módulo OKRs** (`InitiativeCard` agrupado por KR), em vez do componente `InitiativesSummary` específico do wizard.

Resultado: o colaborador vê suas iniciativas com a mesma aparência (status badge, prioridade, owner com avatar, datas, progresso) e o mesmo menu de ações (Atualizar / Editar / Excluir) que existe na tela de detalhes de KR.

## Escopo

- **Apenas** o step de iniciativas do Check-in Individual (`CollaboratorInitiativesStep.tsx`).
- **Não alterar** `InitiativesSummary` (segue sendo usado no Pré-Weekly e demais wizards do time/líder, onde o "marcar em risco" e o agrupamento de atenção fazem sentido).
- **Não alterar** a query de iniciativas, o filtro por owner/contributor, nem a hidratação de owner.
- **Não tocar** em business logic / RLS / permissões.

## Mudanças (frontend only)

### `CollaboratorInitiativesStep.tsx`

1. Remover import de `InitiativesSummary`.
2. Importar `InitiativeCard` de `@/modules/okrs/components/initiatives/InitiativeCard`.
3. Para cada KR (loop existente `initiativesByKr`), renderizar a lista com `InitiativeCard`:
   - `onQuickUpdate={(init) => setEditingInitiative(init)}` apenas quando o usuário pode editar (mesma regra atual: `init.owner_user_id === effectiveUserId`).
   - `onEdit` e `onDelete`: **não** passar (o step é de check-in, não de gestão; mantém consistência com o que já era exposto antes — só "Atualizar").
   - Não passar `onComment` / nada relacionado a comentário (não existe mais).
4. Remover o estado `markedAtRisk` e a lógica `handleMarkAtRisk`:
   - O `InitiativesSummary` era o único consumidor desse estado.
   - `onContinue` passa a ser chamado com `[]` sempre (mantém assinatura para não quebrar o caller). Se preferir, simplificamos a assinatura — confirmar antes de implementar.
5. Remover o badge "X sinalizadas" no botão Continuar (decorre do item 4).
6. Manter intactos: header com contagem/atenção, prompt do Lightbulb, ScrollArea, listagem de Projetos por KR, `MicrocopyQuestion` final, `InlineAgendaSuggestionInput`, `InitiativeQuickUpdateDialog`, footer Voltar/Pular/Continuar e empty state.

### Caller do step

- `CollaboratorCheckinPage.tsx` (e `CollaboratorDraftData.initiativesMarkedAtRisk`): hoje recebe a lista de IDs em risco. Como não há mais marcação, o array fica sempre vazio. **Não removemos o campo do draft** nesta entrega para evitar migração de snapshots — apenas paramos de populá-lo. Marcar como `@deprecated` no tipo.

## Detalhes técnicos

- `InitiativeCard` já consome `Initiative` com `owner` populado — compatível com a hidratação que o step já faz.
- `InitiativeCard` já mostra: status badge (com ícone), badge de prioridade (≠ medium), título, owner com avatar + `UserLink`, range de datas, progress bar e dropdown de ações.
- O agrupamento por KR (header com título do KR + contador) permanece como está hoje no step.
- Sem mudanças de query keys, RLS, BU isolation ou tipos do banco.

## Fora de escopo

- Persistir comentários de iniciativa em algum outro lugar.
- Repensar o "marcar em risco" no Pré-Weekly do time.
- Alterar `InitiativesSummary` ou outros wizards.
