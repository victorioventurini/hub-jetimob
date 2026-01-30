/**
 * ListPageFilters - Componente canônico para barra de filtros em páginas de listagem
 * 
 * Padroniza o layout: busca à esquerda, filtros no meio, ações à direita.
 * Usado ABAIXO do PageHeader em páginas de listagem.
 * 
 * @example
 * <ListPageFilters
 *   searchValue={search}
 *   onSearchChange={setSearch}
 *   searchPlaceholder="Buscar..."
 *   resultCount={items.length}
 *   actions={<Button>+ Novo Item</Button>}
 * >
 *   <StatusSelect value={status} onChange={setStatus} />
 * </ListPageFilters>
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { UrlSearchInput } from "@/shared/filters/UrlSearchInput";

interface ListPageFiltersProps {
  /** Valor atual da busca */
  searchValue?: string;
  /** Callback de mudança da busca */
  onSearchChange?: (value: string) => void;
  /** Placeholder do campo de busca */
  searchPlaceholder?: string;
  /** Debounce da busca em ms (default: 300) */
  searchDebounceMs?: number;
  /** Largura do campo de busca (default: flex-1 ou max-w-sm) */
  searchClassName?: string;
  /** Filtros adicionais (selects, toggles, etc) */
  children?: ReactNode;
  /** Botões de ação (ex: Novo Item) */
  actions?: ReactNode;
  /** Classes adicionais para o container */
  className?: string;
  /** Se true, não mostra o campo de busca */
  hideSearch?: boolean;
  /** Número de resultados para exibir contador (ex: "42 itens encontrados") */
  resultCount?: number;
  /** Label customizada para o contador (default: "itens encontrados") */
  resultCountLabel?: string;
  /** Label singular para o contador (default: "item encontrado") */
  resultCountLabelSingular?: string;
}

export function ListPageFilters({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Buscar...",
  searchDebounceMs = 300,
  searchClassName,
  children,
  actions,
  className,
  hideSearch = false,
  resultCount,
  resultCountLabel = "itens encontrados",
  resultCountLabelSingular = "item encontrado",
}: ListPageFiltersProps) {
  const hasFilters = !!children;
  const hasActions = !!actions;
  const hasResultCount = typeof resultCount === "number";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Row 1: Search + Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        {!hideSearch && onSearchChange && (
          <UrlSearchInput
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            debounceMs={searchDebounceMs}
            className={cn("flex-1 sm:max-w-sm", searchClassName)}
          />
        )}
        
        {hasActions && (
          <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
            {actions}
          </div>
        )}
      </div>

      {/* Row 2: Filters (optional) */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          {children}
        </div>
      )}

      {/* Row 3: Result count (optional) */}
      {hasResultCount && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{resultCount.toLocaleString("pt-BR")}</span>{" "}
          {resultCount === 1 ? resultCountLabelSingular : resultCountLabel}
        </div>
      )}
    </div>
  );
}
