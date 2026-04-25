---
name: BU Selection Race Protection
description: BuContext protege contra restauração indevida da BU padrão quando o usuário acabou de selecionar outra BU; selectBu retenta após refetch e mostra toast quando BU não está acessível
type: standard
---

# BU Selection Race Protection

O `BuContext` (`src/contexts/BuContext.tsx`) tem dois fluxos que podem competir e produzir o bug "cliquei em BU X mas abriu BU Y":

1. **Effect de inicialização** (deps: `[userBus, ...]`) que re-roda toda vez que `userBus` muda de referência.
2. **`selectBu`** que chama `queryClient.clear()` e dispara refetch de `useUserBus` — fazendo `userBus` mudar de referência e re-disparar o effect.

Sem proteção, o effect cai no fallback `defaultBu = is_default` e restaura a BU padrão por cima da escolha recente do usuário.

## Regras

1. **Timestamp de seleção do usuário**: `lastUserSelectionAtRef.current = Date.now()` é setado em `selectBu` ANTES de qualquer setState.
2. **Janela de proteção**: `RECENT_SELECTION_WINDOW_MS = 5000`. Dentro dela, o effect de init NÃO sobrescreve `currentBuId` se ele estiver presente em `userBus`.
3. **storedBuId ausente em userBus**: NÃO cair imediatamente no `defaultBu`. Forçar refetch e aguardar — só aplicar fallback quando o refetch confirmar perda de acesso.
4. **selectBu retenta após refetch**: se `userBus` não contém `buId` (cache stale), invalida `queryKeys.bu.userBusPrefix()`, lê o cache atualizado e retenta a seleção uma única vez. Toast de erro só se ainda assim não houver acesso.
5. **Logs estruturados**: `[BuContext.init]` e `[BuContext.selectBu]` com prefixos consistentes para debug em produção.

## Não-objetivos

- ❌ Remover o fallback `is_default` (necessário para single-BU users e first-login).
- ❌ Trocar `queryClient.clear()` por algo mais granular (já exigido por `clearBuClientCache` para isolar dados entre BUs — TCR §A.3).
- ❌ Persistir `lastUserSelectionAt` em storage (proteção é por sessão; reload reavalia legitimamente).

## Implementação de referência

`src/contexts/BuContext.tsx` — useEffect de init com guard `recentlySelected`; selectBu com retry+toast.
