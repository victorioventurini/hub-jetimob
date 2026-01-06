import { useState, useEffect } from "react";
import { Package, Plus, Trash2, Star, Link2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAssetGroups } from "../../hooks/useAssetGroups";
import { useAssetPermissions } from "../../hooks/useAssetPermissions";
import type { AssetInventory, AssetGroup, AssetGroupItem } from "../../types";
import { INVENTORY_STATUS_LABELS, GROUP_ITEM_ROLE_LABELS } from "../../types";
import { CreateKitDialog } from "./CreateKitDialog";
import { AddToKitDialog } from "./AddToKitDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface KitSectionProps {
  item: AssetInventory;
  onRefresh?: () => void;
}

export function KitSection({ item, onRefresh }: KitSectionProps) {
  const { isInventoryAdmin } = useAssetPermissions();
  const { 
    getGroupByAssetId, 
    checkIfPrimaryOfKit, 
    removeItemFromGroup, 
    setPrimaryItem,
    isRemovingItem 
  } = useAssetGroups();

  const [kit, setKit] = useState<AssetGroup | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [createKitOpen, setCreateKitOpen] = useState(false);
  const [addToKitOpen, setAddToKitOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<AssetGroupItem | null>(null);

  const loadKitData = async () => {
    setIsLoading(true);
    try {
      // Primeiro verificar se é primário de algum kit
      const primaryCheck = await checkIfPrimaryOfKit(item.id);
      if (primaryCheck.isKit && primaryCheck.group) {
        setKit(primaryCheck.group);
        setIsPrimary(true);
      } else {
        // Se não é primário, verificar se pertence a algum kit como acessório
        const group = await getGroupByAssetId(item.id);
        setKit(group);
        setIsPrimary(false);
      }
    } catch (error) {
      console.error("Error loading kit data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadKitData();
  }, [item.id]);

  const handleRefresh = () => {
    loadKitData();
    onRefresh?.();
  };

  const handleRemoveFromKit = (groupItem: AssetGroupItem) => {
    setItemToRemove(groupItem);
    setRemoveConfirmOpen(true);
  };

  const confirmRemove = () => {
    if (itemToRemove) {
      removeItemFromGroup(itemToRemove.id, {
        onSuccess: () => {
          setRemoveConfirmOpen(false);
          setItemToRemove(null);
          handleRefresh();
        },
      });
    }
  };

  const handleSetPrimary = (groupItem: AssetGroupItem) => {
    if (!kit) return;
    setPrimaryItem(
      { groupId: kit.id, assetId: groupItem.asset_id },
      { onSuccess: handleRefresh }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Sem kit associado
  if (!kit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5" />
            Kit / Itens Relacionados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="mb-4">Este item não pertence a nenhum kit.</p>
            {isInventoryAdmin && (
              <div className="flex justify-center gap-2">
                <Button size="sm" onClick={() => setCreateKitOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Kit a partir deste item
                </Button>
              </div>
            )}
          </div>
        </CardContent>

        <CreateKitDialog
          open={createKitOpen}
          onOpenChange={setCreateKitOpen}
          primaryAsset={item}
          onSuccess={handleRefresh}
        />
      </Card>
    );
  }

  // Tem kit associado
  const kitItems = kit.items || [];
  const primaryItem = kitItems.find((i) => i.role === "primary");
  const accessories = kitItems.filter((i) => i.role === "accessory");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5" />
            {isPrimary ? "Kit" : "Pertence ao Kit"}
          </CardTitle>
          <Badge variant="outline">{kit.name}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Aviso se item atual não é o primário */}
        {!isPrimary && primaryItem && (
          <Alert>
            <Link2 className="h-4 w-4" />
            <AlertDescription>
              Este item é acessório do kit <strong>{kit.name}</strong>. 
              O item principal é: <strong>{primaryItem.asset?.name}</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Item Primário */}
        {primaryItem && primaryItem.asset && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              Item Principal
            </h4>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium">{primaryItem.asset.name}</p>
                  <p className="text-sm text-muted-foreground">{primaryItem.asset.internal_code}</p>
                </div>
              </div>
              <StatusBadge 
                status={primaryItem.asset.status || "available"} 
                customLabel={INVENTORY_STATUS_LABELS[primaryItem.asset.status as keyof typeof INVENTORY_STATUS_LABELS]}
              />
            </div>
          </div>
        )}

        {/* Acessórios */}
        {accessories.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Acessórios ({accessories.length})
              </h4>
              <div className="space-y-2">
                {accessories.map((accessory) => (
                  <div
                    key={accessory.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{accessory.asset?.name}</p>
                          {accessory.is_required && (
                            <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{accessory.asset?.internal_code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge 
                        status={accessory.asset?.status || "available"} 
                        customLabel={INVENTORY_STATUS_LABELS[accessory.asset?.status as keyof typeof INVENTORY_STATUS_LABELS]}
                      />
                      {isInventoryAdmin && isPrimary && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleSetPrimary(accessory)}
                            title="Definir como primário"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveFromKit(accessory)}
                            title="Remover do kit"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Ações (apenas se é primário do kit) */}
        {isInventoryAdmin && isPrimary && (
          <>
            <Separator />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setAddToKitOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item ao Kit
              </Button>
            </div>
          </>
        )}
      </CardContent>

      {/* Dialogs */}
      <AddToKitDialog
        open={addToKitOpen}
        onOpenChange={setAddToKitOpen}
        group={kit}
        onSuccess={handleRefresh}
      />

      <AlertDialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remover do Kit
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{itemToRemove?.asset?.name}</strong> do kit?
              Esta ação pode ser desfeita adicionando o item novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              disabled={isRemovingItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
