import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AssetClaviculary, AssetHook } from "../../types";
import { useKeys } from "../../hooks/useKeys";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";
import { ASSET_STATUS_STYLES } from "@/lib/colors";

interface ClavicularyBoardProps {
  claviculary: AssetClaviculary;
}

export function ClavicularyBoard({ claviculary }: ClavicularyBoardProps) {
  const { getHooks } = useKeys();
  const [hooks, setHooks] = useState<AssetHook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHooks = async () => {
      setLoading(true);
      const data = await getHooks(claviculary.id);
      setHooks(data);
      setLoading(false);
    };
    loadHooks();
  }, [claviculary.id, getHooks]);

  const occupiedCount = hooks.filter((h) => h.occupied).length;
  const availableCount = hooks.filter((h) => !h.occupied).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{claviculary.name}</CardTitle>
            {claviculary.location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {claviculary.location.name}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className={ASSET_STATUS_STYLES.available.badge}>
              {availableCount} livres
            </Badge>
            <Badge variant="outline" className={ASSET_STATUS_STYLES.loaned.badge}>
              {occupiedCount} ocupados
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-6 gap-2">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-10 rounded-full" />
            ))}
          </div>
        ) : hooks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum gancho cadastrado
          </p>
        ) : (
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {hooks
              .sort((a, b) => a.hook_number - b.hook_number)
              .map((hook) => (
                <div
                  key={hook.id}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors cursor-pointer",
                    hook.occupied
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted border-muted-foreground/20 text-muted-foreground"
                  )}
                  title={hook.occupied ? "Ocupado" : "Disponível"}
                >
                  {hook.hook_number}
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
