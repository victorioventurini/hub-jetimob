import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MapPin, User, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssetInventory } from "../../types";
import { INVENTORY_STATUS_LABELS } from "../../types";

interface InventoryCardProps {
  item: AssetInventory;
}

const statusColors: Record<string, string> = {
  available: "bg-green-500/10 text-green-700 border-green-200",
  loaned: "bg-blue-500/10 text-blue-700 border-blue-200",
  maintenance: "bg-amber-500/10 text-amber-700 border-amber-200",
  written_off: "bg-gray-500/10 text-gray-700 border-gray-200",
};

export function InventoryCard({ item }: InventoryCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
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
          <Badge variant="outline" className={cn("shrink-0", statusColors[item.status])}>
            {INVENTORY_STATUS_LABELS[item.status]}
          </Badge>
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
