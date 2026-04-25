# Plano — Fix race no switch de BU (Victorio Venturini → Jetimob)

## Pré-checklist (executado)
- [x] TCR §A.3 (Defense-in-Depth, multi-tenancy isolation)
- [x] `mem://standards/bu-selection-race-protection` (guard `recentlySelected`)
- [x] `mem://standards/bundling-no-manual-chunks` (irrelevante mas verificado)
- [x] `mem://architecture/auth/supabase-client-sync-standard` (somente globalClient com autoRefresh)
- [x] `BuContext.tsx`, `ModuleContext.tsx`, `buScopedClient.ts`, `useBuData.ts`, `BuRequiredRoute`, `ModuleRoute`, `usePrefetchRoute`

## Causa raiz

A janela de proteção `recentlySelected` em `BuContext.tsx` linhas 103-112 só protege se **`currentBuId` já está em `userBus`**. Quando uma BU foi criada recentemente:

1. `selectBu('victorio-id')` chama `queryClient.clear()` → `useUserBus` é refetched
2. Effect de init roda com `userBus` antigo (Jetimob apenas) → `currentBuId='victorio-id'` NÃO está em `userBus` → cai em `else if (storedBuId && !validBu)` (linha 132), preserva `currentBuId` e dispara refetch — ok
3. Refetch chega: effect re-roda; `currentBuId='victorio-id'` agora ESTÁ em `userBus` → guard `recentlySelected` ativa → **OK até aqui**
4. **Problema:** entre os passos 2 e 3, o `useEffect` de init pode ter caído no ramo `defaultBu` se `userBus` voltou primeiro mas SEM Victorio (replicação eventual / refetch chegou antes do membership ser visível no Postgres). Aí `currentBuId` é sobrescrito para Jetimob. Quando Victorio finalmente aparece, o guard verifica `currentBuId` (= Jetimob agora) que existe em userBus → **o guard passa preservando Jetimob** ❌

Adicionalmente, em `selectBu` linhas 218-224 (caminho de retry), a ordem é:
```
setCurrentBuId(buId); setBuSelected(true); localStorage.setItem(...);
clearBuClientCache(); queryClient.clear();
```
mas **não há guarda contra o effect re-rodar** com cache stale. Mesmo problema do caminho normal.

## Correção (cirúrgica, em conformidade com TCR §A.3)

### 1) `src/contexts/BuContext.tsx` — endurecer guard com **`requestedBuId`**, não `currentBuId`

Trocar a semântica do guard: ao invés de verificar se `currentBuId` (estado React, que pode ter sido sobrescrito por uma execução anterior do effect) está em `userBus`, manter **a BU exatamente solicitada pelo usuário** (`pendingSelectionBuIdRef`) e proteger ESSA referência durante a janela de 5s.

Mudanças:
- Adicionar `pendingSelectionBuIdRef = useRef<string | null>(null)` setado em `selectBu` junto com `lastUserSelectionAtRef`.
- No effect de init, se `recentlySelected && pendingSelectionBuIdRef.current`:
  - Se a BU pendente já apareceu em `userBus` → setar `currentBuId = pendingSelectionBuIdRef.current` (idempotente, restaura se foi sobrescrito) e **limpar a ref**.
  - Se ainda não apareceu → invalidar `userBusPrefix()`, NÃO mexer em `currentBuId`, **manter** a ref para a próxima execução do effect.
- Quando a janela expira (>5s) sem a BU aparecer → toast.error("BU ainda não sincronizada") e limpar a ref.

Isso resolve a inversão temporal do passo 4 acima: Victorio nunca mais é "esquecida".

### 2) `src/contexts/BuContext.tsx` — `selectBu` registra `pendingSelectionBuIdRef` no caminho normal E no retry

Ambos os fluxos (linha 218 e linha 238) devem setar `pendingSelectionBuIdRef.current = buId` junto com `lastUserSelectionAtRef.current = Date.now()`.

### 3) `src/integrations/supabase/buScopedClient.ts` — `clearBuClientCache(nextBuId?)` opcional

Atualmente `clearBuClientCache()` zera `__hubJet_currentBuId = null`. Em ambiente sob race, o fetch interceptor cai no fallback `localStorage` — que **deveria** ser o BU novo, mas só se o `localStorage.setItem` rodou ANTES. Hoje a ordem em `selectBu` está correta (setItem antes de clearCache), mas é frágil.

Adicionar parâmetro opcional: `clearBuClientCache(nextBuId?: string | null)`. Se passado, ao invés de zerar para null, **substitui** por `nextBuId`. Assim o globalThis nunca fica null durante a janela de transição. Manter retrocompatibilidade (sem arg = comportamento atual).

Em `BuContext.selectBu`, passar `clearBuClientCache(buId)` em ambos os caminhos.

### 4) `src/hooks/usePrefetchRoute.ts` — gating durante switch (já mencionado em plano anterior, agora obrigatório)

Não disparar prefetch se `currentBuId` mudou nos últimos 5s OU se `pendingSelectionBuIdRef !== currentBuId`. Adicionar export em `BuContext`: `isSwitchingBu: boolean`.

Atualizar `usePrefetchRoute` para `if (isSwitchingBu) return;` no callback.

### 5) Atualizar `mem://standards/bu-selection-race-protection.md`

Documentar:
- `pendingSelectionBuIdRef` como mecanismo canônico (substitui só `currentBuId`-based guard)
- Ordem canônica em `selectBu`: ref→state→storage→`clearBuClientCache(buId)`→`queryClient.clear()`
- `isSwitchingBu` para gating de prefetch
- Janela de 5s com fallback de toast

## Não-objetivos

- ❌ Trocar `queryClient.clear()` por algo mais granular (mantido por TCR §A.3)
- ❌ Reduzir `RECENT_SELECTION_WINDOW_MS` (5s já é o mínimo seguro para replicação Postgres)
- ❌ Mexer em `useBuScopedSupabase` ou em RLS (o problema é puramente de propagação client-side)
- ❌ Adicionar `bu_id` ao Realtime channel (fora de escopo)

## Files

**Modificar:**
- `src/contexts/BuContext.tsx` — `pendingSelectionBuIdRef`, `isSwitchingBu`, guard endurecido
- `src/integrations/supabase/buScopedClient.ts` — `clearBuClientCache(nextBuId?)`
- `src/hooks/usePrefetchRoute.ts` — gating `isSwitchingBu`

**Documentação:**
- `.lovable/memory/standards/bu-selection-race-protection.md` — atualizar regras

## Validação manual (pós-implementação)

1. Login com `victorio@jetimob.com`
2. Confirmar BU ativa = Jetimob
3. Switch para Victorio Venturini via dropdown → checar console:
   - `[BuContext.selectBu]` com buId=victorio
   - SEM `[BuContext.init] Falling back to default BU`
4. Acessar `/tickets` → deve abrir contexto de Victorio (header `x-current-bu-id` = victorio em DevTools Network)
5. Switch de volta para Jetimob → mesmo comportamento simétrico
