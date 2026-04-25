---
name: BU membership cache invalidation
description: Toda mutação que mexe em bu_user_memberships ou bu_units DEVE invalidar queryKeys.bu.userBusPrefix() — sem isso, BuContext.userBus fica stale por 5 min e selectBu rejeita BUs novas em silêncio
type: preference
---

# BU membership cache invalidation

## Regra

**Qualquer mutação** que crie/atualize/remova `bu_user_memberships` ou `bu_units`
DEVE invalidar `queryKeys.bu.userBusPrefix()` no `onSuccess`:

```ts
queryClient.invalidateQueries({
  queryKey: queryKeys.bu.userBusPrefix(),
  refetchType: 'active',
});
```

## Por quê

- `useUserBus` (em `src/modules/bu/hooks/useBuData.ts`) é a fonte que alimenta `BuContext.userBus`.
- Tem `staleTime: 5 * 60 * 1000` (5 min) — apropriado, pois memberships mudam raramente.
- A query key inclui o `userId`: `['user-bus', userId]`.
- **Sem invalidação explícita**, o cache fica stale: a nova BU/membership não aparece no `BuSelector` e `selectBu(buId)` rejeita silenciosamente porque `userBus.some(m => m.bu_id === buId)` é `false`.

## Sintoma típico

> "Adicionei uma nova BU + membership e não consigo trocar para ela — ao
> tentar abrir, continua na BU anterior."

Causa: cache stale. Sem invalidação, o usuário precisa esperar 5 min ou dar F5.

## Pegadinhas comuns

1. **Não usar `userBus(null)`** para invalidar — a key real tem `userId` no segmento e não vai bater. **Sempre use `userBusPrefix()`**.
2. **Mesmo se a mutação afeta outro user**, invalide do mesmo jeito — o user logado pode ser o próprio target (ex: super_admin se adicionando à BU).
3. **`selectBu` é defensivo** (desde 2026-04-25): em caso de `hasAccess=false`, ele já dispara um refetch da userBus + warn no console — mas não substitui invalidação no caller.

## Checklist para novos hooks

- [ ] Mutation toca em `bu_user_memberships`? → invalidar `userBusPrefix()`.
- [ ] Mutation toca em `bu_units` (insert/update/delete)? → invalidar `userBusPrefix()` (a join do select inclui dados de `bu_units`).
- [ ] Após operação, o user pode passar a ter acesso a uma BU que não tinha? → invalidar `userBusPrefix()`.

## Casos conhecidos / corrigidos

- `src/modules/bu/hooks/useBuData.ts` — `useCreateBu` e `useUpdateBu`.
- `src/components/users/AddToBuDialog.tsx` — `addMembershipMutation`.
- `src/components/users/JetimoberDialog.tsx` — `addToBuMutation`.
- `src/contexts/BuContext.tsx` — `selectBu` faz refetch defensivo + warn quando `hasAccess=false`.

## Anti-pattern

```ts
// ❌ ERRADO — key não bate, nada é invalidado
queryClient.invalidateQueries({ queryKey: queryKeys.bu.userBus(null) });

// ✅ CORRETO
queryClient.invalidateQueries({ queryKey: queryKeys.bu.userBusPrefix() });
```
