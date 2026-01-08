import { StatusBadge } from "@/components/ui/status-badge";
import { MapPin, User, ChevronRight, Package } from "lucide-react";
import type { AssetInventory } from "../../types";
import { INVENTORY_STATUS_LABELS } from "../../types";

interface InventoryListItemProps {
  item: AssetInventory;
}

export function InventoryListItem({ item }: InventoryListItemProps) {
  const holderInfo = item.current_holder_type === "location" && item.current_location
    ? { icon: MapPin, label: item.current_location.name }
    : item.current_holder_type === "user" && item.current_user
    ? { icon: User, label: item.current_user.full_name }
    : null;

  return (
    <div className="flex items-center px-3 py-2.5 rounded-md border bg-card hover:bg-accent/50 transition-colors cursor-pointer group">
      {/* Icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center mr-3">
        <Package className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Main Info - Name, Code, Category */}
      <div className="flex-1 min-w-0 mr-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground truncate">{item.name}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
            #{item.internal_code}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
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
        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground mr-3 max-w-[160px]">
          <holderInfo.icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{holderInfo.label}</span>
        </div>
      )}

      {/* Status */}
      <StatusBadge 
        status={item.status} 
        customLabel={INVENTORY_STATUS_LABELS[item.status]}
        className="shrink-0 mr-2 text-xs"
      />

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );
}
