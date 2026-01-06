import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { MapPin, User, MoreVertical, Copy, ChevronRight, Package } from "lucide-react";
import type { AssetInventory } from "../../types";
import { INVENTORY_STATUS_LABELS } from "../../types";

interface InventoryListItemProps {
  item: AssetInventory;
  onClone?: (item: AssetInventory) => void;
}

export function InventoryListItem({ item, onClone }: InventoryListItemProps) {
  const holderInfo = item.current_holder_type === "location" && item.current_location
    ? { icon: MapPin, label: item.current_location.name }
    : item.current_holder_type === "user" && item.current_user
    ? { icon: User, label: item.current_user.full_name }
    : null;

  return (
    <div className="flex items-center p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group">
      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center mr-3">
        <Package className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Main Info - Name, Code, Category */}
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-foreground truncate">{item.name}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
            #{item.internal_code}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {item.category && (
            <span className="truncate">{item.category.name}</span>
          )}
          {item.category && item.brand && <span className="text-muted-foreground/50">•</span>}
          {item.brand && (
            <span className="truncate">{item.brand} {item.model}</span>
          )}
        </div>
      </div>

      {/* Holder - Hidden on mobile */}
      {holderInfo && (
        <div className="hidden lg:flex items-center gap-1.5 text-sm text-muted-foreground mr-4 max-w-[180px]">
          <holderInfo.icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{holderInfo.label}</span>
        </div>
      )}

      {/* Status */}
      <StatusBadge 
        status={item.status} 
        customLabel={INVENTORY_STATUS_LABELS[item.status]}
        className="shrink-0 mr-2"
      />

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
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
