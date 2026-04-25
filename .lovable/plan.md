
## Pré-checklist (executado)

- [x] `TECHNICAL_CONTEXT_REGISTRY.md` — confirma multi-tenancy e BU isolation.
- [x] `docs/canonical/QUERY_KEYS_STANDARD.md` — invalidação por key correta com `userId` no segmento.
- [x] `docs/canonical/IDENTITY_CONVENTION.md` — `bu_user_memberships` é a fonte de verdade do acesso.
- [x] `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md` — `selectBu` valida com `userBus.some(m => m.bu_id === buId)`.
- [x] Validação no banco: a BU **Victorio Venturini** (`2eeeb494…`) e o **membership ativo** do `victorio@jetimob.com` (role `admin`, BU id `2eeeb494…`) **existem** corretamente. Backend OK.
- [x] Inspeção do código real (`BuContext.tsx`, `useBuData.ts`, `AddToBuDialog.tsx`, `JetimoberDialog.tsx`, `BuSelector.tsx`, `buScopedClient.ts`).

## Diagnóstico (root cause)

O backend está correto — o problema é **cache stale do frontend** sobre a lista de BUs do usuário (`useUserBus`):

1. **`useUserBus`** (`src/modules/bu/hooks/useBuData.ts`) usa `staleTime: 5 * 60 * 1000` (5 min) e key `['user-bus', userId]`.
2. Os fluxos que **adicionam memberships** ou **criam BUs** **não invalidam** essa key:
   - `useCreateBu` invalida apenas `queryKeys.bu.allBus()`.
   - `AddToBuDialog.onSuccess` invalida só `profiles.all` e `profiles.buMembers`.
   - `JetimoberDialog.addToBuMutation.onSuccess` invalida só profiles e directory.
   - `useUpdateBu` chega a chamar `queryKeys.bu.userBus(null)` — mas a key real é `['user-bus', '<userId>']`. Como o invalidate não usa `exact: false` e a key não bate, **nada é invalidado**.
3. Consequência prática para o relato:
   - O `victorio@jetimob.com` se adicionou à nova BU "Victorio Venturini", mas a lista em memória (`userBus`) ainda contém só `Jetimob` + `Jet Experience`.
   - Quando ele tenta trocar pela `BuSelector`, a nova BU **não aparece no dropdown** (ou, se aparece via outro caminho, `selectBu(buId)` faz `hasAccess = userBus.some(...)` → `false` e **silenciosamente não troca**, mantendo a Jetimob ativa).
   - Por isso o sintoma: "ao tentar acessar Victorio Venturini, abre Jetimob".
4. Defeitos secundários:
   - `selectBu` falha **em silêncio** quando `hasAccess === false` (nem toast, nem refetch). Isso esconde o bug real.
   - `useUpdateBu` usa key inválida `userBus(null)`.

## Plano de ação (mínimo, focado, sem regressão)

### 1. Helper de invalidação por prefixo em `queryKeys.bu`
Adicionar em `src/lib/queryKeys/bu.ts`:
```ts
userBusPrefix: () => ['user-bus'] as const,
```
Permite invalidar `['user-bus', *]` independente do `userId` no segmento — alinhado ao padrão de prefix helpers (`docs/canonical/QUERY_KEYS_STANDARD.md`).

### 2. Invalidar `userBus` em todos os fluxos que mexem em membership/BU
- `src/modules/bu/hooks/useBuData.ts`:
  - `useCreateBu.onSuccess`: também invalidar `queryKeys.bu.userBusPrefix()`.
  - `useUpdateBu.onSuccess`: trocar `userBus(null)` por `userBusPrefix()`.
- `src/components/users/AddToBuDialog.tsx` (`addMembershipMutation.onSuccess`): adicionar invalidação de `queryKeys.bu.userBusPrefix()`.
- `src/components/users/JetimoberDialog.tsx` (`addToBuMutation.onSuccess` e `createMutation.onSuccess` se também cria membership): adicionar invalidação de `queryKeys.bu.userBusPrefix()`.

### 3. Tornar `selectBu` defensivo (sem mascarar erros)
Em `src/contexts/BuContext.tsx`:
- Quando `hasAccess === false`, em vez de retornar silencioso:
  - `console.warn` estruturado com o `buId` solicitado e os IDs disponíveis (debug).
  - Disparar **um** refetch da query `userBus` (`queryClient.invalidateQueries({ queryKey: queryKeys.bu.userBusPrefix() })`) — útil quando o cache estava stale e o user clicou logo após mudança no banco. Não tenta re-selecionar automaticamente para evitar loops; o usuário tenta de novo após o refetch.

### 4. Memória persistente
Criar `.lovable/memory/standards/bu-membership-cache-invalidation.md`:
> Toda mutação que cria/altera `bu_user_memberships` ou `bu_units` DEVE invalidar `queryKeys.bu.userBusPrefix()`. Sem isso, `BuContext.userBus` fica stale por até 5 min e `selectBu` rejeita silenciosamente novas BUs.

Atualizar `.lovable/memory/index.md` com a referência.

## Não está no escopo

- Mexer no `staleTime` global do `useUserBus` (5 min é apropriado; o problema é a falta de invalidação pontual).
- Refatorar `BuContext.selectBu` para forçar troca sem validar — isso quebraria o contrato de segurança.
- Tocar no `buScopedClient.ts` ou no `globalClient.ts` (esses já estão corretos para esse cenário; o `clearBuClientCache` só roda **dentro** do `selectBu`, que hoje nem chega a executar).

## Validação esperada após o fix

1. Como `victorio@jetimob.com`: criar/adicionar membership em uma BU nova → o dropdown do `BuSelector` passa a mostrar a nova BU **imediatamente** (sem F5).
2. Clicar na nova BU → `selectBu` encontra `hasAccess = true` → faz `clearBuClientCache()` + `queryClient.clear()` → app re-renderiza com `currentBuId = <nova>` e o header `x-current-bu-id` correto.
3. Caso de borda: se o user clicar em uma BU enquanto o cache ainda não atualizou, agora há refetch defensivo que cobre o próximo clique.
