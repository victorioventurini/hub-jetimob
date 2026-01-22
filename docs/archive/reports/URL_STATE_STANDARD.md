# URL State Standard - Hub da Jet

## Visão Geral

Este documento define o padrão para gerenciamento de estado via URL (query params) no Hub da Jet. O objetivo é garantir que estados de UI importantes sejam:

- **Compartilháveis**: links podem ser copiados e abertos em outra aba
- **Restauráveis**: refresh mantém o estado
- **Navegáveis**: back/forward funcionam corretamente
- **Consistentes**: mesmo padrão em todo o Hub

## Quando Usar URL State

### ✅ DEVE ir para URL:
- Busca (`q`)
- Filtros: `status`, `owner`, `teamId`, `squadId`, `category`
- Ordenação: `sort`, `dir`
- Paginação: `page`, `pageSize`
- Tabs: `tab`
- Seleção de contexto: `teamId`, `squadId`
- Período: `start`, `end`

### ❌ NÃO deve ir para URL:
- Dados sensíveis (tokens, senhas)
- Inputs de formulário em edição (drafts)
- IDs secretos
- Estado de UI efêmero (tooltips abertos, hover states)

## Convenções de Nomes

| Parâmetro | Uso | Exemplo |
|-----------|-----|---------|
| `q` | Busca textual | `?q=relatório` |
| `status` | Filtro de status | `?status=open&status=paused` |
| `page` | Página atual | `?page=2` |
| `pageSize` | Itens por página | `?pageSize=25` |
| `sort` | Campo de ordenação | `?sort=created_at` |
| `dir` | Direção (asc/desc) | `?dir=desc` |
| `tab` | Aba ativa | `?tab=details` |
| `teamId` | ID do time | `?teamId=uuid` |
| `squadId` | ID do squad | `?squadId=uuid` |
| `start` | Data início | `?start=2024-01-01` |
| `end` | Data fim | `?end=2024-12-31` |
| `year` | Ano selecionado | `?year=2024` |

## Como Usar

### 1. Parâmetro Único (useUrlState)

```tsx
import { useUrlState } from "@/shared/url";

function MyComponent() {
  const [search, setSearch] = useUrlState({
    key: "q",
    defaultValue: "",
    debounceMs: 300, // opcional
  });

  return (
    <input 
      value={search} 
      onChange={(e) => setSearch(e.target.value)} 
    />
  );
}
```

### 2. Tab (useUrlTab)

```tsx
import { useUrlTab } from "@/shared/url";

type Tab = "overview" | "details" | "settings";

function MyComponent() {
  const [activeTab, setActiveTab] = useUrlTab<Tab>("overview");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      {/* ... */}
    </Tabs>
  );
}
```

### 3. Busca com Debounce (useUrlSearch)

```tsx
import { useUrlSearch } from "@/shared/url";

function MyComponent() {
  const [search, setSearch] = useUrlSearch("", 300);
  // Automaticamente usa key "q" e debounce de 300ms
}
```

### 4. Múltiplos Parâmetros (useUrlStates)

```tsx
import { useUrlStates, listingSchema, statusFilterSchema, combineSchemas } from "@/shared/url";

const schema = combineSchemas(
  listingSchema,
  statusFilterSchema("all")
);

function TicketsList() {
  const { values, set, resetAll, hasActiveFilters } = useUrlStates(schema);

  // values.q, values.page, values.status, etc.
  
  // Atualizar um valor
  set({ page: 2 });
  
  // Resetar todos os filtros
  resetAll();
}
```

### 5. Arrays (status múltiplos)

```tsx
import { useUrlArrayParam } from "@/shared/url";

function MyComponent() {
  const [statuses, setStatuses] = useUrlArrayParam("status");
  // URL: ?status=open&status=paused
}
```

### 6. Date Range

```tsx
import { useUrlDateRange } from "@/shared/url";

function MyComponent() {
  const { start, end, setStart, setEnd, setRange, clear } = useUrlDateRange();
  // URL: ?start=2024-01-01&end=2024-12-31
}
```

## Componentes UI

O Hub fornece componentes prontos integrados com URL state:

```tsx
import {
  UrlSearchInput,
  UrlSelect,
  UrlMultiSelect,
  UrlDateRangePicker,
  UrlPagination,
  UrlSortControl,
  UrlFilterBar,
} from "@/shared/filters";

function TicketsList() {
  const [search, setSearch] = useUrlSearch();
  const [statuses, setStatuses] = useUrlArrayParam("status");

  return (
    <>
      <UrlSearchInput value={search} onChange={setSearch} />
      <UrlMultiSelect
        value={statuses}
        onChange={setStatuses}
        options={[
          { value: "open", label: "Aberto" },
          { value: "closed", label: "Fechado" },
        ]}
      />
    </>
  );
}
```

## Query Keys

Toda queryKey deve incluir o estado relevante da URL:

```tsx
import { buildQueryKey, buildListQueryKey } from "@/shared/query/buildQueryKey";

// Exemplo de listagem
const queryKey = buildListQueryKey("tickets", {
  buId,
  q: values.q,
  status: values.status,
  page: values.page,
  pageSize: values.pageSize,
});

// Exemplo de detalhe
const queryKey = buildQueryKey("tickets", "detail", { id, tab });
```

## Exemplos Completos

### Página de Listagem (Tickets)

```tsx
import { useUrlStates, listingSchema, combineSchemas, statusFilterSchema } from "@/shared/url";
import { buildListQueryKey } from "@/shared/query/buildQueryKey";
import { UrlSearchInput, UrlPagination, UrlMultiSelect } from "@/shared/filters";

const ticketsSchema = combineSchemas(
  listingSchema,
  statusFilterSchema("all")
);

export default function TicketsPage() {
  const { values, set, resetAll, hasActiveFilters } = useUrlStates(ticketsSchema);
  const { currentBuId } = useBu();

  const { data, isLoading } = useQuery({
    queryKey: buildListQueryKey("tickets", {
      buId: currentBuId,
      ...values,
    }),
    queryFn: () => fetchTickets(values),
  });

  return (
    <div>
      <UrlSearchInput
        value={values.q}
        onChange={(q) => set({ q, page: 1 })}
        placeholder="Buscar tickets..."
      />

      <UrlMultiSelect
        value={values.status ? [values.status] : []}
        onChange={(status) => set({ status: status[0], page: 1 })}
        options={statusOptions}
      />

      {hasActiveFilters && (
        <Button onClick={resetAll}>Limpar filtros</Button>
      )}

      <TicketsTable data={data?.items} />

      <UrlPagination
        page={values.page}
        pageSize={values.pageSize}
        totalItems={data?.total || 0}
        onPageChange={(page) => set({ page })}
        onPageSizeChange={(pageSize) => set({ pageSize, page: 1 })}
      />
    </div>
  );
}
```

### Página de Detalhe com Tabs

```tsx
import { useUrlTab } from "@/shared/url";

type DetailTab = "overview" | "history" | "settings";

export default function TicketDetailPage() {
  const [activeTab, setActiveTab] = useUrlTab<DetailTab>("overview");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="overview">Visão Geral</TabsTrigger>
        <TabsTrigger value="history">Histórico</TabsTrigger>
        <TabsTrigger value="settings">Configurações</TabsTrigger>
      </TabsList>
      {/* TabsContent... */}
    </Tabs>
  );
}
```

## Checklist para PRs

- [ ] Estados de filtro/paginação usam `useUrlState` ou `useUrlStates`?
- [ ] QueryKey inclui todos os parâmetros de URL relevantes?
- [ ] Não há estado duplicado (useState + URL)?
- [ ] Debounce aplicado em campos de busca?
- [ ] Reset de página ao alterar filtros?
- [ ] Componentes de filtro vêm de `@/shared/filters`?

## Backward Compatibility

Para migrar páginas existentes sem quebrar URLs antigas:

```tsx
const schema = {
  q: {
    key: "q",
    defaultValue: "",
    // Aceita "search" e "term" como aliases
    aliases: ["search", "term"],
  },
};
```

## Auditoria

Execute o script de auditoria para encontrar páginas não migradas:

```bash
npm run audit:urlstate
```
