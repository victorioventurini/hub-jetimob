

# `/decisions` — Tornar os escopos `self/team/area/all` realmente funcionais

## Pré-checklist canônico — concluído
Consultados antes deste plano:
- `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`
- `docs/canonical/IDENTITY_CONVENTION.md` (regra de ouro `my_profile_id()`)
- `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md` (matriz de personas)
- `docs/canonical/QUERY_KEYS_STANDARD.md`
- `mem://features/decisions/lifecycle-and-inbox-standard`
- `mem://standards/users/team-filter-includes-subteams`
- Migration `20260422195055` (RPC `rpc_decisions_inbox`)
- Policies reais de `okr_wizard_sessions` (consultadas em `pg_policy`)

## Diagnóstico verificado

| Sintoma | Causa real |
|---|---|
| "Minhas" parece vazio | RPC filtra por `owner.id` no JSONB **OU** `started_by`. Decisões legadas sem `owner.id` somem. |
| "Minha área" parece vazio para líderes de área | **Não existe** policy `okr_wizard_sessions` para líder de área. RLS bloqueia mesmo o RPC sendo `SECURITY INVOKER`. |
| "Toda a BU" some para muita gente | É correto: só aparece quando `isWildcard` (admin BU/super-admin). |
| "Meu time" inconsistente | Resolver mistura `times liderados + filhos + times da área` em `managedTeamIds`, então `team` ≠ "só meu time". |

## Mudanças (mínimas, canônicas, sem componente novo)

### 1. RLS — adicionar policy de líder de área
Migration nova com policy `Area leaders can view area sessions`:
- `SELECT` em `okr_wizard_sessions` quando `started_by` ou `team_id` pertence a um time cuja `area_id` ∈ áreas onde `areas.leader_user_id = my_profile_id()`.
- Usa `my_profile_id()` (sem `auth.uid()` em coluna de domínio — IDENTITY_CONVENTION).
- `status IN ('completed','in_progress')`.

### 2. Resolver `useDecisionsScopeContext` — separar contextos
Hoje colapsa tudo em `managedTeamIds`. Passa a retornar:
- `directLeaderTeamIds`: árvore (próprios + descendentes via `get_descendant_team_ids`) — usado por `team`.
- `managedAreaIds` + `areaTeamIds`: usado por `area`.
- `availableScopes`: `self` sempre; `team` se há `directLeaderTeamIds`; `area` se há `managedAreaIds`; `all` se `isWildcard`.

### 3. `useDecisionsInbox` — payload coerente por escopo
- `self` → `p_team_ids=[]`, `p_area_ids=[]`.
- `team` → `p_team_ids=directLeaderTeamIds` (já com descendentes).
- `area` → `p_area_ids=managedAreaIds` (RPC já expande para times via `teams.area_id`).
- `all` → `p_team_ids=[]`, `p_area_ids=[]`.
- `overrideTeamIds` (filtro `TeamSelect`) continua forçando `effectiveScope='team'` com expansão recursiva já feita no client (`useTeamTree`).
- Query keys (`okrsKeys.decisionsInbox`) atualizadas para refletir os novos campos sem perder estabilidade de cache.

### 4. RPC `rpc_decisions_inbox` — endurecer `self`
Pequeno ajuste em `WHEN p_scope = 'self'`:
- Continua matchando `owner.id = me OR started_by = me`.
- Acrescentar fallback: `me = ANY( (decision->'mentions')::jsonb )` quando o JSONB tiver array de citados.
- Migration apenas substitui a função (sem mudar assinatura → sem quebra).

### 5. UX — feedback honesto na página
- Manter botões só quando o escopo está realmente disponível (já faz).
- Texto do `PageHeader` já explica que `Meu time`/`Toda a BU` dependem do papel — manter.
- Nada de novo componente; reaproveita `PageHeader`, `ListPageFilters`, `TeamSelect`, `BuUserSelect`, `UrlFilterBar`, `SavedLinksPopover`.

## Arquivos
- `supabase/migrations/<novo>.sql` — policy de líder de área + nova versão de `rpc_decisions_inbox` (mesma assinatura).
- `src/modules/okrs/hooks/useDecisionsInbox.ts` — separação de `directLeaderTeamIds` / `managedAreaIds` e payload correto por escopo.
- `src/lib/queryKeys/okrs.ts` — refletir novos parâmetros nas keys.
- `src/modules/okrs/pages/DecisionsPage.tsx` — apenas consumir o resolver atualizado (sem mudança de UI).

## Critérios de aceite
1. Admin BU vê `Toda a BU` retornar conjunto > `Meu time` > `Minhas`.
2. Líder de time vê `Meu time` com decisões dele + descendentes.
3. Líder de área vê `Minha área` com decisões de todos os times da área (RLS permite).
4. Colaborador comum continua vendo só `Minhas`.
5. Filtro manual `TeamSelect` continua expandindo subtimes (padrão `team-filter-includes-subteams`).
6. URL state e `SavedLinksPopover` permanecem intactos.
7. `IDENTITY_CONVENTION` respeitada: nenhuma comparação direta `auth.uid()` com coluna de domínio.

## Fora de escopo
- Mudar a semântica do `self`/owner.
- Trocar a RPC para `SECURITY DEFINER`.
- Novos componentes de UI ou novas permission keys.

