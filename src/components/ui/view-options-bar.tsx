/**
 * ViewOptionsBar - Componente canônico para linha de opções de visualização
 * 
 * Padroniza o layout: contador de resultados (esquerda) + controles de visualização (direita).
 * Usado ABAIXO do ListPageFilters em páginas de listagem.
 * 
 * @example
 * <ViewOptionsBar
 *   resultCount={items.length}
 *   resultCountLabel="indicadores"
 * >
 *   <KpiViewToggle viewMode={view} onViewModeChange={setView} />
 * </ViewOptionsBar>
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ViewOptionsBarProps {
  /** Número de resultados para exibir contador (ex: "42 itens encontrados") */
  resultCount?: number;
  /** Label customizada para o contador (default: "itens encontrados") */
  resultCountLabel?: string;
  /** Label singular para o contador (default: "item encontrado") */
  resultCountLabelSingular?: string;
  /** Controles de visualização (ViewToggle, SortControl, etc) */
  children?: ReactNode;
  /** Classes adicionais para o container */
  className?: string;
}

export function ViewOptionsBar({
  resultCount,
  resultCountLabel = "itens encontrados",
  resultCountLabelSingular = "item encontrado",
  children,
  className,
}: ViewOptionsBarProps) {
  const hasResultCount = typeof resultCount === "number";
  const hasChildren = !!children;

  // Se não há conteúdo, não renderiza nada
  if (!hasResultCount && !hasChildren) {
    return null;
  }

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      {/* Contador à esquerda */}
      {hasResultCount ? (
        <span className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {resultCount.toLocaleString("pt-BR")}
          </span>{" "}
          {resultCount === 1 ? resultCountLabelSingular : resultCountLabel}
        </span>
      ) : (
        <div /> // Spacer para manter children à direita
      )}
      
      {/* Controles à direita */}
      {hasChildren && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
