import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Package2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssetGiftItem, AssetGiftBatch } from "../../types";

interface GiftItemCardProps {
  item: AssetGiftItem;
  batches: AssetGiftBatch[];
  totals: { totalQuantity: number; availableQuantity: number };
}

export function GiftItemCard({ item, batches, totals }: GiftItemCardProps) {
  const isLowStock = totals.availableQuantity > 0 && totals.availableQuantity < 10;
  const isOutOfStock = totals.availableQuantity === 0;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-pink-500/10 shrink-0">
              <Gift className="h-5 w-5 text-pink-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
              {item.category && (
                <p className="text-sm text-muted-foreground">{item.category}</p>
              )}
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0",
              isOutOfStock
                ? "bg-red-500/10 text-red-700 border-red-200"
                : isLowStock
                ? "bg-amber-500/10 text-amber-700 border-amber-200"
                : "bg-green-500/10 text-green-700 border-green-200"
            )}
          >
            {isOutOfStock ? "Sem estoque" : isLowStock ? "Baixo estoque" : "Em estoque"}
          </Badge>
        </div>

        <div className="mt-4 pt-3 border-t flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package2 className="h-4 w-4" />
            <span>{batches.length} lote(s)</span>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{totals.availableQuantity}</p>
            <p className="text-xs text-muted-foreground">disponíveis</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
