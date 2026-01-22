/**
 * InventoryTable - Table view for inventory listing
 * Displays assets in a structured table format with columns
 * Follows the same pattern as TicketsTable for visual consistency
 */

import { Link } from "react-router-dom";
import { formatDistanceToNow, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AssetInventory } from "../../types";
import { INVENTORY_STATUS_LABELS } from "../../types";

interface InventoryTableProps {
  items: AssetInventory[];
}

// Safe date formatter to prevent RangeError on invalid dates
function formatUpdatedAt(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = parseISO(dateStr);
  if (!isValid(date)) return "—";
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
}

export function InventoryTable({ items }: InventoryTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[280px]">Item</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Localização</TableHead>
            <TableHead className="text-right">Atualizado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            // Determinar holder info
            const isWithUser = item.current_holder_type === "user" && item.current_user;
            const isAtLocation = item.current_holder_type === "location" && item.current_location;
            
            return (
              <TableRow 
                key={item.id} 
                className={cn(
                  "cursor-pointer hover:bg-muted/50",
                  item.status === "written_off" && "opacity-60"
                )}
              >
                {/* Item - Nome e marca/modelo */}
                <TableCell>
                  <Link 
                    to={`/assets/inventory/${item.id}`}
                    className="block group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium group-hover:text-primary transition-colors line-clamp-1">
                          {item.name}
                        </span>
                        {(item.brand || item.model) && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {item.brand}{item.brand && item.model && " "}{item.model}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </TableCell>
                
                {/* Código interno */}
                <TableCell>
                  <span className="text-sm font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    #{item.internal_code}
                  </span>
                </TableCell>
                
                {/* Categoria */}
                <TableCell>
                  {item.category?.name ? (
                    <span className="text-sm">{item.category.name}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                
                {/* Status */}
                <TableCell>
                  <StatusBadge 
                    status={item.status} 
                    customLabel={INVENTORY_STATUS_LABELS[item.status]}
                    className="text-xs"
                  />
                </TableCell>
                
                {/* Responsável (usuário) */}
                <TableCell>
                  {isWithUser && item.current_user ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={item.current_user.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {item.current_user.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm line-clamp-1">{item.current_user.full_name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                
                {/* Localização */}
                <TableCell>
                  {isAtLocation && item.current_location ? (
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="line-clamp-1">{item.current_location.name}</span>
                    </div>
                  ) : item.home_location ? (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-1">{item.home_location.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
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
