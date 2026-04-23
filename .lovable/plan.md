# Filtrar OKRs/KRs e Iniciativas do Perfil pelo Ciclo Ativo

## Objetivo
Na página `/users/:id`, exibir apenas KRs e Iniciativas do **ciclo ativo** da BU corrente, com fallback claro quando não houver ciclo ativo.

## Conformidade com TCR e Canônicos

- **BU isolation:** mantém `bu_id` + cliente buScoped (`useOptionalBuClient`).
- **Ciclo ativo:** via `useActiveCycle()` (SSOT — `mem://features/dashboard/active-cycle-logic`), nunca inferindo por datas.
- **Query keys centralizadas:** estende helpers em `src/lib/queryKeys/auth.ts` e `src/lib/queryKeys/okrs.ts` (regra #5).
- **Sem `select('*')`:** colunas explícitas (regra #4).
- **Soft-delete:** mantém `.is('deleted_at', null)` / `.is('cancelled_at', null)` onde aplicável.
- **Joins canônicos:** usa `!inner` para que filtros em relações aninhadas (`cycle_id`) sejam aplicados pelo PostgREST.
- **Reaproveitamento:** estende hooks existentes (`useUserOkrs`, `useUserInitiatives`) — sem duplicação.

## Mudanças por Arquivo

### 1. `src/lib/queryKeys/auth.ts`
Estender `publicProfileKeys.okrs` com `cycleId` opcional:
```ts
okrs: (userId, buId, cycleId?) => ['user-okrs', userId, buId, cycleId ?? null] as const,
```

### 2. `src/lib/queryKeys/okrs.ts`
Estender helper de iniciativas-por-usuário com `cycleId` opcional, mantendo retrocompat.

### 3. `src/lib/queryKeys/auth.test.ts`
Adicionar casos para `publicProfileKeys.okrs` com e sem `cycleId`, garantindo chaves distintas.

### 4. `src/hooks/usePublicProfile.ts` — `useUserOkrs`
- Aceitar `cycleId: string | null` opcional.
- Incluir `cycleId` na queryKey.
- Filtrar `okr_team_objectives.cycle_id = cycleId` quando presente.
- Para KRs aninhados, usar join `team_objective:okr_team_objectives!inner(cycle_id, ...)` + `.eq('team_objective.cycle_id', cycleId)`.
- Fallback: sem `cycleId`, comportamento atual (todos os ciclos).

### 5. `src/modules/okrs/hooks/useInitiatives.ts` — `useUserInitiatives`
- Aceitar `cycleId: string | null` opcional.
- Incluir `cycleId` na queryKey.
- Filtrar via duplo `!inner` (`key_result -> team_objective -> cycle_id`).
- Manter soft-delete.

### 6. `src/pages/UserProfile/index.tsx`
- Importar `useActiveCycle` de `@/modules/okrs/hooks/useActiveCycle`.
- `activeCycleId = activeCycle?.id ?? null`.
- Passar `activeCycleId` para `useUserOkrs` e `useUserInitiatives`.
- Exibir Badge com nome do ciclo no header das seções de OKRs/Iniciativas.
- Empty states:
  - Sem ciclo ativo: mensagem "BU sem ciclo ativo — exibindo todos os registros" + lista completa (fallback).
  - Com ciclo ativo, mas sem KRs/Iniciativas: "Nenhum KR/Iniciativa neste ciclo".

## Validação
- Testes unitários em `auth.test.ts` (query keys).
- Verificação visual em `/users/4e5985d2-d729-4529-ad6c-4ee15b0d927f`.
- Chip do ciclo visível no cabeçalho das seções.

## Arquivos Impactados
- `src/lib/queryKeys/auth.ts`
- `src/lib/queryKeys/okrs.ts`
- `src/lib/queryKeys/auth.test.ts`
- `src/hooks/usePublicProfile.ts`
- `src/modules/okrs/hooks/useInitiatives.ts`
- `src/pages/UserProfile/index.tsx`
