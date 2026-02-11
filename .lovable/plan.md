

# Correcao: Atualizar lista de usuarios em tempo real apos cadastrar, editar ou remover

## Pre-checklist executado

- [x] **TCR v3.6.0**: Consultado. Query Keys 100% centralizadas, prefixos obrigatorios.
- [x] **DEVELOPMENT_STANDARDS v1.24.0**: Consultado. POST-BU, invalidacao via queryKeys.*.
- [x] **QUERY_KEYS_STANDARD**: Consultado. Nunca inline, prefixos para invalidar variantes filtradas.
- [x] **Memory query-key-prefix-standard**: Confirmado padrao de prefixos para invalidacao.

## Problema

A pagina `/users` usa a query key `queryKeys.users.directory(buId, filters)` para buscar dados. Porem, todas as mutacoes (criar, editar, excluir, bulk edit) invalidam `queryKeys.profiles.all(buId)` — uma chave de namespace diferente. Resultado: a lista nunca atualiza automaticamente apos uma acao.

**Leitura:**
- `Users.tsx` (linha 106): `queryKeys.users.directory(currentBu?.id, { q, areaId, teamId, status, ... })`
- `useBuUsersDirectory.ts` (linha 74): `queryKeys.users.directory(buId, { q, teamId, includeTerminated, excludeExternal })`

**Invalidacao atual (todas erradas para o directory):**
- `JetimoberDialog.tsx`: `queryKeys.profiles.all(currentBu?.id)`
- `useProfiles.ts` (delete): `queryKeys.profiles.all(currentBu?.id)`
- `useProfiles.ts` (transfer): `queryKeys.profiles.all(buId)`
- `BulkEditDialog.tsx`: `queryKeys.profiles.all(null)` (BU errada tambem)

## Solucao

### 1. Adicionar `directoryPrefix` em `src/lib/queryKeys/misc.ts`

Seguindo o padrao de prefixos do projeto, adicionar helper para invalidacao de todas as variantes filtradas:

```typescript
export const usersKeys = {
  all: () => ['users'] as const,
  directoryPrefix: (buId: string | null) =>
    ['users', 'directory', buId] as const,
  directory: (buId, filters?) => ['users', 'directory', buId, filters] as const,
  // ... demais keys inalteradas
};
```

### 2. Corrigir invalidacao em `src/components/users/JetimoberDialog.tsx`

Nos 3 callbacks `onSuccess` (create, update, addToBu), adicionar invalidacao do directory:

```typescript
queryClient.invalidateQueries({ queryKey: queryKeys.users.directoryPrefix(currentBu?.id ?? null) });
```

Manter `queryKeys.profiles.all()` existente para nao quebrar outros consumidores (hover cards, selects).

### 3. Corrigir invalidacao em `src/hooks/useProfiles.ts`

No `useDeleteProfile.onSuccess` e `useTransferDependencies.onSuccess`, adicionar:

```typescript
queryClient.invalidateQueries({ queryKey: queryKeys.users.directoryPrefix(buId) });
```

### 4. Corrigir invalidacao em `src/components/users/BulkEditDialog.tsx`

Substituir `queryKeys.profiles.all(null)` por `queryKeys.users.directoryPrefix(currentBu?.id ?? null)` (com BU correta):

```typescript
queryClient.invalidateQueries({ queryKey: queryKeys.users.directoryPrefix(currentBu?.id ?? null) });
```

## Arquivos alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/queryKeys/misc.ts` | Adicionar `directoryPrefix` ao `usersKeys` |
| `src/components/users/JetimoberDialog.tsx` | Adicionar invalidacao do directory nos 3 onSuccess |
| `src/hooks/useProfiles.ts` | Adicionar invalidacao do directory em delete e transfer |
| `src/components/users/BulkEditDialog.tsx` | Corrigir invalidacao com BU correta e key do directory |

## Nota

A invalidacao existente de `queryKeys.profiles.all(buId)` sera mantida em todos os pontos para nao quebrar outros consumidores (profile selects, hover cards, etc). A addicao do `directoryPrefix` e puramente aditiva.

