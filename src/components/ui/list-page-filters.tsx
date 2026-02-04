/**
 * ListPageFilters - Componente canônico para barra de filtros em páginas de listagem
 * 
 * Padroniza o layout: busca à esquerda, filtros em linha (children).
 * Usado ABAIXO do PageHeader em páginas de listagem.
 * 
 * Para opções de visualização (contador, toggles), use ViewOptionsBar abaixo.
 * 
 * @example
 * <ListPageFilters
 *   searchValue={search}
 *   onSearchChange={setSearch}
 *   searchPlaceholder="Buscar..."
 * >
 *   <StatusSelect value={status} onChange={setStatus} />
 *   <TeamSelect value={team} onChange={setTeam} />
 * </ListPageFilters>
 * 
 * <ViewOptionsBar resultCount={items.length}>
 *   <KpiViewToggle ... />
 * </ViewOptionsBar>
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
  /** Classes adicionais para o container */
  className?: string;
  /** Se true, não mostra o campo de busca */
  hideSearch?: boolean;
}

export function ListPageFilters({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Buscar...",
  searchDebounceMs = 300,
  searchClassName,
  children,
  className,
  hideSearch = false,
}: ListPageFiltersProps) {
  const hasFilters = !!children;
  const hasSearch = !hideSearch && onSearchChange;

  // Se não há busca nem filtros, não renderiza nada
  if (!hasSearch && !hasFilters) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {/* Search Input */}
      {hasSearch && (
        <UrlSearchInput
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          debounceMs={searchDebounceMs}
          className={cn("w-full sm:w-auto sm:min-w-[200px] sm:max-w-sm", searchClassName)}
        />
      )}
      
      {/* Filters (inline with search) */}
      {hasFilters && children}
    </div>
  );
}
