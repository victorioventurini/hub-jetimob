

# `/decisions` — Filtro por Time + Clarificações de Escopo

## Diagnóstico real (após leitura do RPC, hook e página)

| Pergunta do usuário | Resposta verificada |
|---|---|
| "Minhas / Minha área / Toda a BU funcionam?" | **Sim**, funcionam. "Meu time" não aparece porque você não lidera **nenhum time diretamente** (`leader_user_id`). O resolvedor `useDecisionsScopeContext` só habilita o escopo `team` quando há times liderados. |
| "Como filtro por time específico?" | **Hoje não dá.** Só há filtro por **responsável individual**. Vamos adicionar. |

## Mudança (mínima, sem migration, sem componente novo)

**Reaproveitar 100% o que existe:**
- RPC `rpc_decisions_inbox` já aceita `p_team_ids[]` no branch `scope='team'`. Não precisa migration.
- `TeamSelect` canônico (hierárquico, com indentação de subteams).
- `useHierarchicalTeamList` para expansão de subtimes no client.
- `useUrlState`, `UrlFilterBar`, `buildActiveFilters` já em uso.

### Arquivo único: `src/modules/okrs/pages/DecisionsPage.tsx`

1. **Novo URL state:** `teamState = useUrlState('team', '')`.
2. **Novo `<TeamSelect>`** dentro do `ListPageFilters` ao lado do `BuUserSelect`, com `includeAll` e label "Todos os times".
3. **Lógica de scope override:**
   - Se `teamState.value` está setado:
     - Expandir `teamId` + descendentes via `useHierarchicalTeamList` (hook já existente, mesmo padrão de `team-filter-includes-subteams`).
     - Enviar `effectiveScope = 'team'` e `effectiveTeamIds = [teamId, ...descendants]` para `useDecisionsInbox`.
   - Caso contrário, usar `currentScope` normal.
4. **Adicionar parâmetro opcional `overrideTeamIds?: string[]`** em `useDecisionsInbox` (apenas para esse override do client; quando presente, ignora `scopeCtx?.managedTeamIds`).
5. **Chip "Time" no `UrlFilterBar`** com label do time + remoção individual.
6. **Inclusão no `handleClearAll`**.

### Arquivo: `src/modules/okrs/hooks/useDecisionsInbox.ts`

Adicionar prop opcional:
```ts
interface UseDecisionsInboxParams {
  …
  overrideTeamIds?: string[]; // se setado, força scope='team' e ignora managedTeamIds
}
```
Lógica: se `overrideTeamIds && length > 0`, usar `scope='team'` e `p_team_ids=overrideTeamIds`.

## Esclarecimento UX (sem código)

Adicionar `description` no `PageHeader` mais explícita: indicar que **"Meu time" só aparece se você for líder de algum time** (e a opção "Toda a BU" só para administradores). Evita a percepção de "botão sumido".

## Verificações canônicas (pré-checklist atendido)

- ✅ TCR: não há doc específico de filtros por time em decisões — usar padrão `TeamSelect` central.
- ✅ Identity: `useIdentity` continua sendo a fonte (`profileId`).
- ✅ BU isolation: RPC já filtra por `bu_id`; `TeamSelect` é BU-scoped.
- ✅ Subteams: `team-filter-includes-subteams` — usar `useHierarchicalTeamList` para expandir.
- ✅ URL state: novo `team` entra em `useUrlState` (compartilhável, salvável via `SavedLinksPopover`).
- ✅ Sem `select('*')`, sem componentes novos, sem migration.
- ✅ Query keys: incluir `overrideTeamIds` no key de `okrsKeys.decisionsInbox`.

## Fora de escopo

- Migration de banco (não é necessária).
- Mudar a semântica de `self/team/area/all`.
- Permission key nova.
- Novo componente UI.

## Arquivos editados

- `src/modules/okrs/pages/DecisionsPage.tsx`
- `src/modules/okrs/hooks/useDecisionsInbox.ts`
- `src/lib/queryKeys/okrs.ts` (somente adicionar `overrideTeamIds` no key existente)

