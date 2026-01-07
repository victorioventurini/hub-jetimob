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
  listingSchema,
  statusFilterSchema,
  combineSchemas,
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
// Combine schemas conforme necessidade da página

type ItemStatus = "all" | "open" | "closed" | "pending";

const pageSchema = combineSchemas(
  listingSchema, // q, page, pageSize, sort, dir
  statusFilterSchema<ItemStatus>("all")
);

// ============================================================
// COMPONENT
// ============================================================

export default function ListPageUrlStateExample() {
  const { currentBuId } = useBu();

  // URL State - todos os filtros sincronizados com URL
  const {
    values,
    set,
    reset,
    resetAll,
    hasActiveFilters,
    activeKeys,
  } = useUrlStates(pageSchema);

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
      return { items: [], total: 0 };
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
  const formatters: Record<string, (v: any) => string> = {
    status: (v) => {
      const map: Record<string, string> = {
        open: "Aberto",
        closed: "Fechado",
        pending: "Pendente",
      };
      return map[v] || v;
    },
  };

  const activeFilters = buildActiveFilters(
    values,
    { q: "", status: "all", page: 1, pageSize: 25, sort: "", dir: "desc" },
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
          onChange={(q) => set({ q, page: 1 })} // Reset page on search
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
        onRemoveFilter={(key) => reset(key as keyof typeof values)}
        onClearAll={resetAll}
      />

      {/* Conteúdo */}
      {isLoading ? (
        <div>Carregando...</div>
      ) : (
        <div>
          {/* Sua tabela/lista aqui */}
          {data?.items.map((item: any) => (
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
//    const schema = createNamespacedSchema("tickets", listingSchema);
//    // Resulta em: tickets.q, tickets.page, etc.
//
