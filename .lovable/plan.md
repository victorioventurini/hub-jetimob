# Step "Projetos" do Check-in Individual — Ajustes de escopo e UI

## Mudanças solicitadas

1. **Exibir somente milestones em que o próprio usuário é o responsável** (owner do milestone), mesmo nos projetos em que ele é dono do projeto.
2. **Remover o botão "Editar projeto"** que aparece no cabeçalho do card quando o usuário é dono do projeto.

## Comportamento atual (que muda)

- Hoje, quando o usuário é dono de um projeto, o card lista **todos os marcos pendentes** do projeto (sejam dele ou de outras pessoas).
- Hoje, quando o usuário é dono do projeto, aparece um botão "Editar projeto" no canto superior direito do card que abre o `ProjectDialog`.

## Comportamento novo

- Lista de "Marcos pendentes" do card mostra **apenas milestones em que `milestone.owner_id === effectiveUserId`** (independente do usuário ser dono do projeto ou não).
- Projetos sem nenhum milestone pendente do usuário continuam aparecendo (preserva visibilidade do projeto que ele lidera), exibindo a mensagem padrão de "Todos os marcos concluídos ✓" ou similar.
- Cabeçalho do card não mostra mais "Editar projeto". Edição segue disponível pelo módulo de Projetos.
- Edição inline de milestone (botão lápis ao lado de cada linha) **permanece**, pois agora todos os milestones listados são do próprio usuário.

## Detalhes técnicos

Arquivo único: `src/modules/okrs/components/wizards/collaborator/CollaboratorProjectsStep.tsx`

- No `processProject`, ao montar `milestones`, adicionar filtro `m.owner_id === effectiveUserId` junto ao filtro `status !== 'done'` existente.
- Recalcular `pendingMilestonesCount` continua válido (deriva de `projects.map(p => p.milestones)` já filtrado).
- Remover:
  - `useUpdateProject`, `ProjectDialog` e import de `Pencil` (verificar se ainda é usado pelo botão de editar milestone — sim, é, manter o import).
  - State `editingProject` e setter.
  - Handler `handleProjectEditSubmit`.
  - Bloco JSX do botão "Editar projeto" (linhas ~362-372).
  - Bloco JSX `<ProjectDialog ... />` no final do componente.
- Os totais `milestones_total`/`milestones_done`/`completion_pct` exibidos na barra de progresso continuam refletindo o **projeto inteiro** (não filtrar — a barra é do projeto, não do usuário). Manter como está.
- Não mexer em queries/RLS/permissões — apenas presentation layer.

## Fora de escopo

- Lógica de quais projetos aparecem (continua: dono do projeto OU dono de algum milestone pendente).
- Edição de milestone inline (mantida).
- Outras etapas do wizard.
