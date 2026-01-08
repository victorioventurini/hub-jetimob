# Query Keys Standard

> **Regra**: Nunca usar `queryKey` inline. Sempre importar de `queryKeys.ts`.

## Por que padronizar Query Keys?

1. **Cache consistente** - Evita duplicação de queries quando diferentes componentes usam keys diferentes para os mesmos dados
2. **Invalidação confiável** - Garante que `invalidateQueries` sempre encontre e limpe o cache correto
3. **Manutenibilidade** - Centraliza todas as keys em um único arquivo, facilitando refatoração
4. **Prevenção de erros** - Lint gate bloqueia regressões automaticamente

## Como usar

### ✅ Correto

```typescript
import { queryKeys } from "@/lib/queryKeys";

// Fetching
useQuery({
  queryKey: queryKeys.assets.categories(buId),
  queryFn: () => fetchCategories(buId),
});

// Invalidating
queryClient.invalidateQueries({ 
  queryKey: queryKeys.assets.categories(buId) 
});

// Prefetching
queryClient.prefetchQuery({
  queryKey: queryKeys.tickets.list(buId, filters),
  queryFn: () => fetchTickets(buId, filters),
});
```

### ❌ Incorreto

```typescript
// NÃO FAÇA ISSO - arrays literais inline
useQuery({
  queryKey: ["assets", "categories", buId],  // ❌
  queryFn: () => fetchCategories(buId),
});

queryClient.invalidateQueries({ 
  queryKey: ["asset-categories", buId]  // ❌
});
```

## Estrutura do queryKeys.ts

O arquivo `src/lib/queryKeys.ts` segue a convenção de namespaces:

```typescript
export const queryKeys = {
  // Cada módulo tem seu namespace
  assets: {
    all: () => ["assets"] as const,
    categories: (buId: string | null) => ["assets", "categories", buId] as const,
    inventory: {
      all: (buId: string | null) => ["assets", "inventory", buId] as const,
      detail: (id: string) => ["assets", "inventory", "detail", id] as const,
    },
  },
  
  tickets: {
    all: () => ["tickets"] as const,
    list: (buId: string | null, filters?: TicketFilters) => 
      ["tickets", "list", buId, filters] as const,
  },
  
  // ... outros módulos
};
```

## Adicionando novas keys

1. Identifique o namespace correto (ou crie um novo)
2. Adicione a key seguindo o padrão existente
3. Use `as const` para type safety
4. Documente se a key tiver comportamento especial

```typescript
// Exemplo: adicionando key para novo recurso
myModule: {
  all: () => ["my-module"] as const,
  list: (buId: string | null) => ["my-module", "list", buId] as const,
  detail: (id: string) => ["my-module", "detail", id] as const,
},
```

## Lint Gate

O projeto possui um lint gate que bloqueia PRs com query keys hardcoded:

```bash
pnpm check:query-keys
```

Se o gate falhar, corrija as violações listadas antes de fazer merge.

## Referência

- Arquivo de query keys: `src/lib/queryKeys.ts`
- Script de verificação: `scripts/check-query-keys.sh`
- [TanStack Query - Query Keys](https://tanstack.com/query/latest/docs/react/guides/query-keys)
