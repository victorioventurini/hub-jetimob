---
name: BU Selection Race Protection
description: BuContext usa pendingSelectionBuIdRef + isSwitchingBu para honrar a BU exata escolhida pelo usuário mesmo quando a lista de memberships chega em ordem inesperada; clearBuClientCache(buId) atomiza o swap; usePrefetchRoute gateia em isSwitchingBu
type: standard
---

# BU Selection Race Protection

O `BuContext` (`src/contexts/BuContext.tsx`) tem três fluxos que podem competir e produzir bugs de "abriu BU errada":

1. **Effect de inicialização** (deps: `[userBus, currentBuId, ...]`) que re-roda toda vez que `userBus` muda de referência.
2. **`selectBu`** que chama `clearBuClientCache(buId)` + `queryClient.clear()`, disparando refetch de `useUserBus` e mudando a referência de `userBus`.
3. **`usePrefetchRoute`** que dispara queries no hover, podendo cachear dados com a BU antiga durante a janela de transição.

Sem proteção, dois bugs aparecem:
- Race A: o effect cai no fallback `defaultBu = is_default` e restaura a BU padrão por cima da escolha recente do usuário.
- Race B: `userBus` chega sem a BU recém-criada (replicação eventual), o effect "esquece" da escolha do usuário, e quando a BU finalmente aparece o guard antigo (baseado em `currentBuId`) preserva a BU **errada** porque `currentBuId` já foi sobrescrito.

## Regras

1. **Pending selection ref**: `pendingSelectionBuIdRef` guarda **a BU exatamente solicitada pelo usuário**. É setada em `selectBu` (caminho normal e retry) ANTES de qualquer setState. Sobrevive entre execuções do effect.
2. **Janela de proteção**: `RECENT_SELECTION_WINDOW_MS = 5000`. Dentro dela, o effect de init:
   - se `pendingBuId` está em `userBus` → restaura `currentBuId = pendingBuId` (idempotente) e limpa a ref
   - se ainda não está → invalida `userBusPrefix()`, **NÃO mexe em `currentBuId`** e **mantém** a ref para a próxima execução
3. **Expiração da janela**: ao expirar (>5s) sem a BU aparecer → `toast.error("Business Unit ainda não foi sincronizada")` e limpa a ref.
4. **Ordem canônica em `applyBuSwitch`**:
   1. setar refs (`lastUserSelectionAtRef`, `pendingSelectionBuIdRef`)
   2. `localStorage.setItem(...)` (fonte de verdade do fetch interceptor)
   3. `clearBuClientCache(buId)` — **com argumento** para atomicamente substituir `globalThis.__hubJet_currentBuId` (nunca null durante transição)
   4. setStates React + bump `switchingTick`
   5. `setTenantId(buId)` (GA4)
   6. `queryClient.clear()` se `isChanging`
5. **`clearBuClientCache(nextBuId?)` opcional**: sem arg = comportamento legado (logout). Com arg = swap atômico do BU id no globalThis. Use **sempre** com arg em `selectBu`.
6. **`isSwitchingBu` exposto pelo `BuContext`**: true durante a janela de 5s. Consumidores como `usePrefetchRoute` DEVEM gateá-lo para não disparar requests com BU antiga.
7. **`usePrefetchRoute` usa `useOptionalBuScopedSupabase`** (não o client global). Header `x-current-bu-id` injetado por request, conforme TCR §A.3.
8. **Logs estruturados**: `[BuContext.init]`, `[BuContext.selectBu]` com prefixos consistentes para debug em produção.

## Não-objetivos

- ❌ Remover o fallback `is_default` (necessário para single-BU users e first-login).
- ❌ Trocar `queryClient.clear()` por algo mais granular (já exigido por `clearBuClientCache` para isolar dados entre BUs — TCR §A.3).
- ❌ Persistir `lastUserSelectionAt` em storage (proteção é por sessão; reload reavalia legitimamente).
- ❌ Reduzir `RECENT_SELECTION_WINDOW_MS` (5s é o mínimo seguro para replicação Postgres + refetch de `useUserBus`).

## Implementação de referência

- `src/contexts/BuContext.tsx` — `pendingSelectionBuIdRef`, `isSwitchingBu`, `applyBuSwitch`, init effect com prioridade absoluta para `pendingBuId`
- `src/integrations/supabase/buScopedClient.ts` — `clearBuClientCache(nextBuId?)` swap atômico
- `src/hooks/usePrefetchRoute.ts` — gating em `isSwitchingBu` + cliente BU-scoped

## Histórico de incidentes

- 2026-04-25: criar BU "Victorio Venturini" e tentar acessá-la abria Jetimob. Causa: guard antigo (`recentlySelected && currentBuId in userBus`) falhava porque `currentBuId` era sobrescrito no passo 4 do effect quando `userBus` chegava sem a BU nova. Fix: pending ref + clearBuClientCache atômico + gate de prefetch.
- 2026-04-24: criar BU em outra aba e clicar abria a antiga. Fix anterior: `lastUserSelectionAtRef` + retry após refetch (insuficiente — esta atualização endurece).
