## Objetivo
Em todos os locais que renderizam um Objetivo compartilhado, mostrar **inline, ao lado do badge "Compartilhada"**, os nomes dos times com quem o objetivo está compartilhado. Hoje a tag aparece sozinha (modo `compact`) e a lista de times só é visível dentro do tooltip — não é descobrível.

## Diagnóstico
- `OkrDashboardPage` (view=team) usa `useTeamObjectives` → `OKR_FIELDS.teamObjectiveWithKrs` que **NÃO** carrega `contributors`. Consequência: `ObjectiveListItem` chama `<SharedOkrBadge contributingTeams={objective.contributors?...|| []}/>`, que nesse contexto vem vazio, e em modo `compact` o badge nem renderiza a lista.
- `useTeamObjectivesWithSharedInfo` (usado em `TeamSharedOkrsBlock`) já carrega `contributors` com `team:teams(id, name)`. Vamos reaproveitar o **mesmo padrão de hidratação**.
- `SharedOkrBadge` já suporta `showTeamList` no modo padrão e tem variante `compact`. Vamos adicionar uma exibição enxuta de chips inline (sem inflar layout) reutilizando o componente — sem código novo descentralizado.

## Mudanças propostas (canônicas, sem duplicação)

### 1) Hidratar `contributors` no fluxo principal de team OKRs
- Em `src/modules/okrs/hooks/queries/useTeamObjectiveQueries.ts` (`useTeamObjectives`), após carregar os objetivos, buscar contributors em **uma única query batched** para todos os `is_shared=true` do resultset:
  ```ts
  const sharedIds = data.filter(o => o.is_shared).map(o => o.id);
  if (sharedIds.length) {
    const { data: contribs } = await supabase
      .from('okr_team_objective_contributors')
      .select('id, objective_id, team_id, team:teams(id, name)')
      .in('objective_id', sharedIds);
    // map e merge contributors[] em cada objetivo
  }
  ```
- Mantém soft-delete (`deleted_at`/`cancelled_at` via tabela já filtrada), respeita BU isolation (consulta scoped pelo cliente atual), zero `select('*')`, query key inalterada (cache continua válido).

### 2) Ajuste visual em `SharedOkrBadge` (canônico)
- Adicionar uma nova prop opcional `inlineTeams?: boolean` que, quando `true` **junto com `compact`**, renderiza chips compactos `<Badge variant="outline" size=xs>` com o nome de cada time contribuidor logo após o badge "Compartilhada" — limitando a 3 e exibindo `+N` quando exceder, com tooltip listando todos.
- Mantém `compact` puro (apenas badge + tooltip) como fallback, sem breaking changes nos demais consumidores.

### 3) Aplicar `inlineTeams` nos pontos de uso
- `src/modules/okrs/components/dashboard/ObjectiveListItem.tsx` (linha ~206): passar `inlineTeams` ao `SharedOkrBadge` no header do card.
- `src/modules/okrs/components/EnhancedObjectiveCard.tsx` (linha ~217) e `src/modules/okrs/components/TeamObjectiveCard.tsx` (linha ~142): mesma alteração para consistência cross-views.
- `TeamSharedOkrsBlock` já mostra contribuidores em bloco próprio — sem mudança lá.

### 4) Documentação
- Atualizar `mem://features/okrs/shared-okr-contributor-view-standard` registrando que **toda exibição de objetivo compartilhado deve mostrar os times contribuidores inline via `SharedOkrBadge inlineTeams`**, e que a hidratação de `contributors` é responsabilidade do hook de listagem de team objectives (não do componente).

## Arquivos a editar
- `src/modules/okrs/hooks/queries/useTeamObjectiveQueries.ts` — hidratar `contributors` em batch
- `src/modules/okrs/components/SharedOkrBadge.tsx` — nova prop `inlineTeams` (compatível)
- `src/modules/okrs/components/dashboard/ObjectiveListItem.tsx` — passar `inlineTeams`
- `src/modules/okrs/components/EnhancedObjectiveCard.tsx` — idem
- `src/modules/okrs/components/TeamObjectiveCard.tsx` — idem
- `.lovable/memory/features/okrs/shared-okr-contributor-view-standard.md` — registro do padrão

## Não-objetivos
- Não alterar RLS, schema ou query keys.
- Não criar componente novo de chip de time (reuso de `Badge` existente).
- Não tocar em `useTeamObjectivesWithSharedInfo` (já completo).

## Resultado visual esperado
`[👥 Customer Success] [Em Risco] [♥ 0%] [👥 Compartilhada] [Time A] [Time B] [+2]`
