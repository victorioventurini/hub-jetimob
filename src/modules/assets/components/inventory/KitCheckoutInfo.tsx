import { useState, useEffect } from "react";
import { Package, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssetGroups } from "../../hooks/useAssetGroups";
import type { AssetInventory, AssetGroup } from "../../types";
import { INVENTORY_STATUS_LABELS } from "../../types";

interface KitCheckoutInfoProps {
  item: AssetInventory;
  includeAccessories: boolean;
  onIncludeAccessoriesChange: (include: boolean) => void;
  targetUserId?: string;
}

interface AccessoryStatus {
  asset: AssetInventory;
  canCheckout: boolean;
  blockedReason?: string;
}

export function KitCheckoutInfo({
  item,
  includeAccessories,
  onIncludeAccessoriesChange,
  targetUserId,
}: KitCheckoutInfoProps) {
  const { checkIfPrimaryOfKit, getRequiredAccessories } = useAssetGroups();

  const [isLoading, setIsLoading] = useState(true);
  const [kit, setKit] = useState<AssetGroup | null>(null);
  const [accessories, setAccessories] = useState<AccessoryStatus[]>([]);
  const [hasBlockedAccessories, setHasBlockedAccessories] = useState(false);

  useEffect(() => {
    const loadKitInfo = async () => {
      setIsLoading(true);
      try {
        const { isKit, group } = await checkIfPrimaryOfKit(item.id);
        
        if (isKit && group) {
          setKit(group);
          
          // Buscar acessórios obrigatórios
          const requiredAccessories = await getRequiredAccessories(item.id);
          
          // Verificar status de cada acessório
          const accessoryStatuses: AccessoryStatus[] = requiredAccessories.map((acc) => {
            let canCheckout = true;
            let blockedReason: string | undefined;

            if (acc.status !== "available") {
              canCheckout = false;
              if (acc.status === "loaned") {
                blockedReason = "Emprestado para outro usuário";
              } else if (acc.status === "maintenance") {
                blockedReason = "Em manutenção";
              } else if (acc.status === "written_off") {
                blockedReason = "Baixado";
              }
            }

            return { asset: acc, canCheckout, blockedReason };
          });

          setAccessories(accessoryStatuses);
          setHasBlockedAccessories(accessoryStatuses.some((a) => !a.canCheckout));
        } else {
          setKit(null);
          setAccessories([]);
          setHasBlockedAccessories(false);
        }
      } catch (error) {
        console.error("Error loading kit info:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadKitInfo();
  }, [item.id, checkIfPrimaryOfKit, getRequiredAccessories]);

  // Se não é kit, não mostrar nada
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!kit) {
    return null;
  }

  // Se não tem acessórios obrigatórios
  if (accessories.length === 0) {
    return (
      <Alert>
        <Package className="h-4 w-4" />
        <AlertDescription>
          Este item é o principal do kit <strong>{kit.name}</strong>, mas não possui acessórios obrigatórios configurados.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alerta se há acessórios bloqueados */}
      {hasBlockedAccessories && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Acessórios indisponíveis</AlertTitle>
          <AlertDescription>
            Alguns acessórios obrigatórios do kit não estão disponíveis. Regularize antes de continuar ou empreste sem eles.
          </AlertDescription>
        </Alert>
      )}

      {/* Card com opção de incluir acessórios */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="include-accessories"
              checked={includeAccessories}
              onCheckedChange={(checked) => onIncludeAccessoriesChange(!!checked)}
              disabled={hasBlockedAccessories}
            />
            <div className="space-y-1">
              <label
                htmlFor="include-accessories"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Incluir acessórios obrigatórios do kit
              </label>
              <p className="text-sm text-muted-foreground">
                Kit: <strong>{kit.name}</strong> ({accessories.length} acessório{accessories.length > 1 ? "s" : ""} obrigatório{accessories.length > 1 ? "s" : ""})
              </p>
            </div>
          </div>

          {/* Lista de acessórios */}
          <div className="space-y-2 pl-6">
            {accessories.map(({ asset, canCheckout, blockedReason }) => (
              <div
                key={asset.id}
                className={`flex items-center justify-between p-2 rounded border ${
                  canCheckout ? "bg-muted/30" : "bg-destructive/5 border-destructive/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  {canCheckout ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">{asset.internal_code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {blockedReason ? (
                    <Badge variant="destructive" className="text-xs">
                      {blockedReason}
                    </Badge>
                  ) : (
                    <StatusBadge
                      status={asset.status}
                      customLabel={INVENTORY_STATUS_LABELS[asset.status as keyof typeof INVENTORY_STATUS_LABELS]}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
