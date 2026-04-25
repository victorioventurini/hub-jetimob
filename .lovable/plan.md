# Corrigir empty-state que oculta OKRs compartilhadas no dashboard do time

## Pré-checklist executado

- ✅ `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` (referência geral)
- ✅ `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md` — sem impacto (mudança puramente de renderização)
- ✅ `docs/canonical/QUERY_KEYS_STANDARD.md` — sem novas queries
- ✅ `mem://features/okrs/shared-okr-contributor-view-standard` — SSOT do bloco "OKRs Compartilhadas". Confirma que `TeamOkrSections` é o componente canônico que renderiza `contributedObjectives` quando `activeView === 'team'` e `normalizedTeamId` está definido.
- ✅ Código atual em `src/modules/okrs/pages/OkrDashboardPage.tsx` linhas 561–619.

## Diagnóstico

Em `/okrs?view=team&team_id={Product Design}` o objetivo compartilhado pelo time Tecnologia não aparece porque a **ordem dos guards de renderização** em `OkrDashboardPage.tsx` curto-circuita:

```
linha 572  ) : displayObjectives.length === 0 ? (
linha 573      <OkrEmptyState ... />
linha 606  ) : activeView === 'team' && normalizedTeamId ? (
linha 607      <TeamOkrSections ... contributedObjectives={filteredContributedObjectives} />
```

Como Product Design não possui objetivos próprios no ciclo, `displayObjectives.length === 0` é avaliado primeiro e renderiza o empty-state — `TeamOkrSections` (única coisa que renderiza `filteredContributedObjectives`) nunca é alcançado. Isso viola o SSOT em `mem://features/okrs/shared-okr-contributor-view-standard`, que define que o bloco "OKRs Compartilhadas" deve aparecer sempre que `contributedObjectives.length > 0`, independente de o time ter objetivos próprios.

## Mudanças propostas

### 1. `src/modules/okrs/pages/OkrDashboardPage.tsx`

Reordenar os guards para que, na visão de time com `team_id` definido, `TeamOkrSections` seja avaliado **antes** do empty-state. O empty-state só dispara quando ambas as listas estão vazias.

```tsx
const isTeamView = activeView === 'team' && !!normalizedTeamId;
const teamViewIsEmpty =
  isTeamView &&
  displayObjectives.length === 0 &&
  filteredContributedObjectives.length === 0;

isLoading
  ? <skeletons />
  : isTeamView
    ? (teamViewIsEmpty
        ? <OkrEmptyState ... />
        : <TeamOkrSections
            primaryObjectives={displayObjectives}
            contributedObjectives={filteredContributedObjectives}
            teamId={normalizedTeamId}
            ...
          />)
    : displayObjectives.length === 0
      ? <OkrEmptyState ... />
      : <div>{displayObjectives.map(o => <ObjectiveListItem .../>)}</div>
```

`TeamOkrSections` já trata internamente o caso `primaryObjectives.length === 0` (renderizando apenas o bloco compartilhado), então nenhuma mudança interna nele é necessária — basta deixar de bloqueá-lo aqui.

### 2. Mensagem do empty-state (refinamento leve)

Quando `filters.sharedFilter === 'exclusive'` e a lista filtrada ficou vazia por causa do filtro (e não por ausência de dados), trocar o `description` para algo como _"Nenhum objetivo exclusivo neste filtro. Tente ‘Todos’ ou ‘Compartilhadas’."_

### 3. Documentação

Atualizar `mem://features/okrs/shared-okr-contributor-view-standard` adicionando à seção "Regras invioláveis":

> **Empty-state guard**: na view de time, o empty-state só pode aparecer quando `displayObjectives.length === 0 && contributedObjectives.length === 0`. `TeamOkrSections` deve ser sempre avaliado antes do empty-state.

## Não-objetivos

- Sem alterações em hooks, queries, RLS ou schema.
- Sem mexer em `TeamOkrSections`, `ContributingOkrCard` ou `useTeamContributedOkrs`.
- Sem alterar a lógica do filtro `sharedFilter` (já corrigida em iteração anterior).

## Resultado esperado

Em `/okrs?cycle_id=...&view=team&team_id={Product Design}&shared=shared`, o bloco "OKRs Compartilhadas" passa a renderizar o objetivo compartilhado pelo time Tecnologia, mesmo Product Design não tendo objetivos próprios no ciclo.