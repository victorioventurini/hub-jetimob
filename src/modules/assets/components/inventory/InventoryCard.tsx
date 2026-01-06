import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { MapPin, User, Package, MoreVertical, Copy } from "lucide-react";
import type { AssetInventory } from "../../types";
import { INVENTORY_STATUS_LABELS } from "../../types";

interface InventoryCardProps {
  item: AssetInventory;
  onClone?: (item: AssetInventory) => void;
}

export function InventoryCard({ item, onClone }: InventoryCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
              <p className="text-sm text-muted-foreground">{item.internal_code}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <StatusBadge 
              status={item.status} 
              customLabel={INVENTORY_STATUS_LABELS[item.status]}
              className="shrink-0"
            />
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
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {item.category && (
          <p className="text-sm text-muted-foreground">
            {item.category.name}
          </p>
        )}
        
        <div className="flex flex-col gap-1 text-sm">
          {item.current_holder_type === "location" && item.current_location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{item.current_location.name}</span>
            </div>
          )}
          {item.current_holder_type === "user" && item.current_user && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{item.current_user.full_name}</span>
            </div>
          )}
        </div>

        {item.brand && item.model && (
          <p className="text-xs text-muted-foreground">
            {item.brand} {item.model}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
