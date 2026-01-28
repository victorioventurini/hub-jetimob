/**
 * GiftsTable - Table view for gifts listing
 * Displays gift items in a structured table format with columns
 * Updated to show structured data: category, supplier, location
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
import { Gift, AlertTriangle, Building2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AssetGiftItem, AssetGiftBatch } from "../../types";
import { useAssetCategoriesQuery } from "../../hooks";
import { useMemo } from "react";

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

// Format document for display
function formatDocument(doc: string | null): string {
  if (!doc) return "";
  if (doc.length === 11) {
    return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (doc.length === 14) {
    return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return doc;
}

export function GiftsTable({ items, batches, getItemTotals, onItemClick }: GiftsTableProps) {
  const { data: categories = [] } = useAssetCategoriesQuery();

  // Build parent category map for display
  const parentCategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((cat) => {
      if (!cat.parent_id) {
        map.set(cat.id, cat.name);
      }
    });
    return map;
  }, [categories]);

  // Get category display name (Parent → Subcategory)
  const getCategoryDisplay = (item: AssetGiftItem) => {
    if (item.subcategory) {
      const parentName = item.subcategory.parent_id 
        ? parentCategoryMap.get(item.subcategory.parent_id) 
        : null;
      if (parentName) {
        return `${parentName} → ${item.subcategory.name}`;
      }
      return item.subcategory.name;
    }
    // Fallback to legacy text field
    return item.category || "—";
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Item</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Localização</TableHead>
            <TableHead className="text-right">Valor Und</TableHead>
            <TableHead className="text-right">Qtd</TableHead>
            <TableHead className="text-right">Disponível</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Atualizado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const totals = getItemTotals(item.id);
            const stockInfo = getStockStatus(totals.availableQuantity);
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
                  <span className="text-sm">{getCategoryDisplay(item)}</span>
                </TableCell>

                {/* Fornecedor */}
                <TableCell>
                  {item.supplier ? (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="text-sm truncate">{item.supplier.name}</div>
                        {item.supplier.document && (
                          <div className="text-xs text-muted-foreground">
                            {formatDocument(item.supplier.document)}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Localização */}
                <TableCell>
                  {item.home_location ? (
                    <div className="flex items-center gap-1.5 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{item.home_location.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Valor Unitário */}
                <TableCell className="text-right">
                  {item.acquisition_value && item.quantity_total && item.quantity_total > 0 ? (
                    <span className="text-sm">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        item.acquisition_value / item.quantity_total
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Quantidade Total */}
                <TableCell className="text-right">
                  <span className="text-sm text-muted-foreground">
                    {item.quantity_total || 0}
                  </span>
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
