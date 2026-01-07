// ============================================================
// TEMPLATE: Página de Listagem com URL State
// ============================================================
// Copie este template como base para novas páginas de listagem
// que precisam de filtros, paginação e ordenação via URL
// ============================================================

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

// URL State hooks e schemas
import {
  useUrlStates,
  searchConfig,
  pageConfig,
  pageSizeConfig,
  sortConfig,
  sortDirConfig,
  statusConfig,
  type UrlParamConfig,
} from "@/shared/url";

// Query key builder
import { buildListQueryKey } from "@/shared/query/buildQueryKey";

// Filter components
import {
  UrlSearchInput,
  UrlSelect,
  UrlPagination,
  UrlSortControl,
  UrlFilterBar,
  buildActiveFilters,
} from "@/shared/filters";

// Context
import { useBu } from "@/contexts/BuContext";

// ============================================================
// SCHEMA DEFINITION
// ============================================================
// Define o schema com tipagem explícita

type ItemStatus = "all" | "open" | "closed" | "pending";

// Schema com tipagem explícita para garantir inferência correta
const pageSchema = {
  q: searchConfig(),
  page: pageConfig(),
  pageSize: pageSizeConfig(),
  sort: sortConfig(),
  dir: sortDirConfig(),
  status: statusConfig<ItemStatus>("all"),
} satisfies Record<string, UrlParamConfig<unknown>>;

// Tipo inferido do schema
type PageSchemaValues = {
  q: string;
  page: number;
  pageSize: number;
  sort: string;
  dir: "asc" | "desc";
  status: ItemStatus;
};

// ============================================================
// COMPONENT
// ============================================================

export default function ListPageUrlStateExample() {
  const { currentBuId } = useBu();

  // URL State - todos os filtros sincronizados com URL
  // Use tipagem explícita para garantir autocomplete
  const { values, set, reset, resetAll, hasActiveFilters } =
    useUrlStates<PageSchemaValues>(pageSchema);

  // Query com URL state incluído na key
  const queryKey = useMemo(
    () =>
      buildListQueryKey("items", {
        buId: currentBuId,
        q: values.q,
        status: values.status !== "all" ? values.status : undefined,
        page: values.page,
        pageSize: values.pageSize,
        sort: values.sort || undefined,
        dir: values.dir,
      }),
    [currentBuId, values]
  );

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      // Sua função de fetch aqui
      // Usar values.q, values.status, values.page, etc.
      return { items: [] as Array<{ id: string; title: string }>, total: 0 };
    },
    enabled: !!currentBuId,
  });

  // Labels para filtros ativos
  const filterLabels: Record<string, string> = {
    q: "Busca",
    status: "Status",
    sort: "Ordenar por",
  };

  // Formatters para exibição
  const formatters: Record<string, (v: unknown) => string> = {
    status: (v) => {
      const map: Record<string, string> = {
        open: "Aberto",
        closed: "Fechado",
        pending: "Pendente",
      };
      return map[v as string] || String(v);
    },
  };

  const defaults = {
    q: "",
    status: "all",
    page: 1,
    pageSize: 25,
    sort: "",
    dir: "desc",
  };

  const activeFilters = buildActiveFilters(
    values,
    defaults,
    filterLabels,
    formatters
  );

  // Sort options
  const sortOptions = [
    { value: "created_at", label: "Data de criação" },
    { value: "updated_at", label: "Última atualização" },
    { value: "title", label: "Título" },
  ];

  // Status options
  const statusOptions = [
    { value: "all", label: "Todos" },
    { value: "open", label: "Aberto" },
    { value: "closed", label: "Fechado" },
    { value: "pending", label: "Pendente" },
  ];

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <div className="flex items-center gap-4 flex-wrap">
        <UrlSearchInput
          value={values.q}
          onChange={(q) => set({ q, page: 1 })}
          placeholder="Buscar..."
          className="w-80"
        />

        <UrlSelect
          value={values.status}
          onChange={(status) => set({ status: status as ItemStatus, page: 1 })}
          options={statusOptions}
          placeholder="Status"
        />

        <UrlSortControl
          sort={values.sort}
          dir={values.dir}
          onSortChange={(sort) => set({ sort })}
          onDirChange={(dir) => set({ dir })}
          options={sortOptions}
        />
      </div>

      {/* Filtros ativos */}
      <UrlFilterBar
        activeFilters={activeFilters}
        onRemoveFilter={(key) => reset([key as keyof PageSchemaValues])}
        onClearAll={resetAll}
      />

      {/* Conteúdo */}
      {isLoading ? (
        <div>Carregando...</div>
      ) : (
        <div>
          {/* Sua tabela/lista aqui */}
          {data?.items.map((item) => (
            <div key={item.id}>{item.title}</div>
          ))}
        </div>
      )}

      {/* Paginação */}
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

// ============================================================
// NOTAS
// ============================================================
//
// 1. SEMPRE reset page para 1 ao alterar filtros
//
// 2. Inclua todos os parâmetros de URL na queryKey
//
// 3. Use `enabled` para controlar quando a query executa
//
// 4. Para filtros complexos, crie schemas customizados:
//    const customSchema = {
//      myFilter: {
//        key: "myFilter",
//        defaultValue: "",
//        parse: (v) => v || "",
//        serialize: (v) => v || null,
//      },
//    };
//
// 5. Para namespacing (evitar colisões):
//    import { createNamespacedSchema } from "@/shared/url";
//    const schema = createNamespacedSchema("tickets", baseSchema);
//    // Resulta em: tickets.q, tickets.page, etc.
//
