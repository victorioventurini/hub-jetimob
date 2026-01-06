import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, User, MoreVertical, Copy, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssetInventory } from "../../types";
import { INVENTORY_STATUS_LABELS } from "../../types";

interface InventoryListItemProps {
  item: AssetInventory;
  onClone?: (item: AssetInventory) => void;
}

const statusColors: Record<string, string> = {
  available: "bg-green-500/10 text-green-700 border-green-200",
  loaned: "bg-blue-500/10 text-blue-700 border-blue-200",
  maintenance: "bg-amber-500/10 text-amber-700 border-amber-200",
  written_off: "bg-gray-500/10 text-gray-700 border-gray-200",
};

export function InventoryListItem({ item, onClone }: InventoryListItemProps) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group">
      {/* Code and Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">{item.name}</span>
          <span className="text-sm text-muted-foreground shrink-0">#{item.internal_code}</span>
        </div>
        {item.category && (
          <p className="text-sm text-muted-foreground truncate">{item.category.name}</p>
        )}
      </div>

      {/* Holder info */}
      <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground min-w-0 max-w-[200px]">
        {item.current_holder_type === "location" && item.current_location && (
          <>
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.current_location.name}</span>
          </>
        )}
        {item.current_holder_type === "user" && item.current_user && (
          <>
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.current_user.full_name}</span>
          </>
        )}
      </div>

      {/* Brand/Model */}
      {item.brand && (
        <div className="hidden md:block text-sm text-muted-foreground min-w-0 max-w-[150px]">
          <span className="truncate">{item.brand} {item.model}</span>
        </div>
      )}

      {/* Status */}
      <Badge variant="outline" className={cn("shrink-0", statusColors[item.status])}>
        {INVENTORY_STATUS_LABELS[item.status]}
      </Badge>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {onClone && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onClone(item)}>
                <Copy className="h-4 w-4 mr-2" />
                Clonar item
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}
