// ============================================================
// VIRTUALIZED LIST - Componente canônico para listas virtualizadas
// ============================================================
// Use quando há muitos itens visíveis simultaneamente (>50)
// Ideal para: dialogs de seleção, logs, dropdowns grandes
// 
// Para tabelas paginadas (Users, Tickets, Inventory), use 
// o padrão de paginação com UrlPagination.
// ============================================================

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface VirtualizedListProps<T> {
  /** Array de itens a renderizar */
  items: T[];
  /** Altura estimada de cada item em pixels */
  estimateSize?: number;
  /** Altura do container (CSS) */
  height?: string | number;
  /** Função para renderizar cada item */
  renderItem: (item: T, index: number) => ReactNode;
  /** Função para obter a key única de cada item */
  getItemKey?: (item: T, index: number) => string | number;
  /** Classe CSS adicional para o container */
  className?: string;
  /** Overscan (quantos itens extras renderizar fora da viewport) */
  overscan?: number;
  /** Mensagem quando a lista está vazia */
  emptyMessage?: string;
}

/**
 * VirtualizedList - Renderiza apenas os itens visíveis na viewport
 * 
 * @example
 * ```tsx
 * <VirtualizedList
 *   items={users}
 *   height={400}
 *   estimateSize={48}
 *   renderItem={(user) => (
 *     <div className="p-3 border-b">
 *       {user.name}
 *     </div>
 *   )}
 *   getItemKey={(user) => user.id}
 * />
 * ```
 */
export function VirtualizedList<T>({
  items,
  estimateSize = 48,
  height = 400,
  renderItem,
  getItemKey,
  className,
  overscan = 5,
  emptyMessage = "Nenhum item encontrado",
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: getItemKey 
      ? (index) => getItemKey(items[index], index)
      : undefined,
  });

  if (items.length === 0) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center text-muted-foreground text-sm",
          className
        )}
        style={{ height: typeof height === "number" ? `${height}px` : height }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto", className)}
      style={{ height: typeof height === "number" ? `${height}px` : height }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// VIRTUALIZED TABLE - Para tabelas com muitas linhas
// ============================================================

interface Column<T> {
  /** Chave ou accessor da coluna */
  key: string;
  /** Título do header */
  header: string;
  /** Largura da coluna (CSS) */
  width?: string | number;
  /** Função para renderizar a célula */
  render?: (item: T, index: number) => ReactNode;
  /** Classe CSS para a célula */
  className?: string;
}

interface VirtualizedTableProps<T> {
  /** Array de itens a renderizar */
  items: T[];
  /** Definição das colunas */
  columns: Column<T>[];
  /** Altura estimada de cada linha em pixels */
  rowHeight?: number;
  /** Altura do container (CSS) */
  height?: string | number;
  /** Função para obter a key única de cada item */
  getItemKey?: (item: T, index: number) => string | number;
  /** Classe CSS adicional */
  className?: string;
  /** Callback quando uma linha é clicada */
  onRowClick?: (item: T, index: number) => void;
  /** Mensagem quando a tabela está vazia */
  emptyMessage?: string;
}

/**
 * VirtualizedTable - Tabela virtualizada para grandes volumes de dados
 * 
 * @example
 * ```tsx
 * <VirtualizedTable
 *   items={logs}
 *   height={500}
 *   rowHeight={44}
 *   columns={[
 *     { key: "timestamp", header: "Data", width: 120 },
 *     { key: "message", header: "Mensagem", render: (log) => <code>{log.message}</code> },
 *     { key: "status", header: "Status", width: 80 },
 *   ]}
 *   getItemKey={(log) => log.id}
 *   onRowClick={(log) => setSelectedLog(log)}
 * />
 * ```
 */
export function VirtualizedTable<T>({
  items,
  columns,
  rowHeight = 44,
  height = 400,
  getItemKey,
  className,
  onRowClick,
  emptyMessage = "Nenhum registro encontrado",
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
    getItemKey: getItemKey 
      ? (index) => getItemKey(items[index], index)
      : undefined,
  });

  if (items.length === 0) {
    return (
      <div className={cn("border rounded-md", className)}>
        <div className="flex border-b bg-muted/50">
          {columns.map((col) => (
            <div
              key={col.key}
              className={cn(
                "px-3 py-2 text-sm font-semibold text-muted-foreground",
                col.className
              )}
              style={{ width: col.width, flexShrink: col.width ? 0 : 1, flexGrow: col.width ? 0 : 1 }}
            >
              {col.header}
            </div>
          ))}
        </div>
        <div 
          className="flex items-center justify-center text-muted-foreground text-sm py-8"
        >
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("border rounded-md overflow-hidden", className)}>
      {/* Header */}
      <div className="flex border-b bg-muted/50 sticky top-0 z-10">
        {columns.map((col) => (
          <div
            key={col.key}
            className={cn(
              "px-3 py-2 text-sm font-semibold text-muted-foreground",
              col.className
            )}
            style={{ width: col.width, flexShrink: col.width ? 0 : 1, flexGrow: col.width ? 0 : 1 }}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: typeof height === "number" ? `${height}px` : height }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = items[virtualItem.index];
            return (
              <div
                key={virtualItem.key}
                className={cn(
                  "flex border-b last:border-b-0 hover:bg-muted/30 transition-colors",
                  onRowClick && "cursor-pointer"
                )}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                onClick={() => onRowClick?.(item, virtualItem.index)}
              >
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className={cn(
                      "px-3 flex items-center text-sm",
                      col.className
                    )}
                    style={{ width: col.width, flexShrink: col.width ? 0 : 1, flexGrow: col.width ? 0 : 1 }}
                  >
                    {col.render 
                      ? col.render(item, virtualItem.index)
                      : String(item[col.key] ?? "—")
                    }
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
