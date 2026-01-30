/**
 * GiftsTable - Table view for gifts listing
 * Displays gift items in a structured table format with columns
 * Follows the same pattern as TicketsTable for visual consistency
 */

import { formatDistanceToNow, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Gift, Package2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AssetGiftItem, AssetGiftBatch } from "../../types";

interface GiftTotals {
  totalQuantity: number;
  availableQuantity: number;
}

interface GiftsTableProps {
  items: AssetGiftItem[];
  batches: AssetGiftBatch[];
  getItemTotals: (itemId: string) => GiftTotals;
  onItemClick?: (item: AssetGiftItem) => void;
}

function getStockStatus(quantity: number): { status: string; label: string } {
  if (quantity === 0) return { status: "written_off", label: "Sem estoque" };
  if (quantity < 10) return { status: "maintenance", label: "Baixo estoque" };
  return { status: "available", label: "Em estoque" };
}

// Safe date formatter to prevent RangeError on invalid dates
function formatUpdatedAt(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = parseISO(dateStr);
  if (!isValid(date)) return "—";
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
}

export function GiftsTable({ items, batches, getItemTotals, onItemClick }: GiftsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Item</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Lotes</TableHead>
            <TableHead className="text-right">Disponível</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Atualizado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const totals = getItemTotals(item.id);
            const stockInfo = getStockStatus(totals.availableQuantity);
            const itemBatches = batches.filter((b) => b.gift_item_id === item.id);
            const isLowStock = totals.availableQuantity > 0 && totals.availableQuantity < 10;

            return (
              <TableRow
                key={item.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50",
                  isLowStock && "bg-status-yellow-muted/20"
                )}
                onClick={() => onItemClick?.(item)}
              >
                {/* Item - Nome e ícone */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-status-pink-muted flex items-center justify-center">
                      <Gift className="h-4 w-4 text-status-pink" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium line-clamp-1">{item.name}</span>
                        {isLowStock && (
                          <AlertTriangle className="h-3.5 w-3.5 text-status-yellow shrink-0" />
                        )}
                      </div>
                      {item.notes && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {item.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Categoria */}
                <TableCell>
                  {item.category ? (
                    <span className="text-sm">{item.category}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Lotes */}
                <TableCell>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Package2 className="h-3.5 w-3.5" />
                    <span>{itemBatches.length} lote(s)</span>
                  </div>
                </TableCell>

                {/* Quantidade disponível */}
                <TableCell className="text-right">
                  <span className={cn(
                    "text-lg font-semibold",
                    totals.availableQuantity === 0 && "text-muted-foreground",
                    isLowStock && "text-status-yellow"
                  )}>
                    {totals.availableQuantity}
                  </span>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <StatusBadge 
                    status={stockInfo.status}
                    customLabel={stockInfo.label}
                    className="text-xs"
                  />
                </TableCell>

                {/* Atualizado */}
                <TableCell className="text-right">
                  <span className="text-sm text-muted-foreground">
                    {formatUpdatedAt(item.updated_at)}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
