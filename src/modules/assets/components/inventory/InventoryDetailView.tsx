import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Package,
  MapPin,
  User,
  Calendar,
  Tag,
  ArrowRightLeft,
  Wrench,
  XCircle,
  History,
  Edit,
  QrCode,
  Link2,
  
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useInventory } from "../../hooks/useInventory";
import { useAssetPermissions } from "../../hooks/useAssetPermissions";
import { InventoryFormDialog } from "./InventoryFormDialog";
import { InventoryMovementDialog } from "./InventoryMovementDialog";
import type { AssetInventory, AssetMovement, AssetMovementType } from "../../types";
import { INVENTORY_STATUS_LABELS, MOVEMENT_TYPE_LABELS } from "../../types";

const statusColors: Record<string, string> = {
  available: "bg-green-500/10 text-green-700 border-green-200",
  loaned: "bg-blue-500/10 text-blue-700 border-blue-200",
  maintenance: "bg-amber-500/10 text-amber-700 border-amber-200",
  written_off: "bg-gray-500/10 text-gray-700 border-gray-200",
};

const movementTypeIcons: Record<AssetMovementType, typeof Package> = {
  checkout: ArrowRightLeft,
  return: ArrowRightLeft,
  transfer: ArrowRightLeft,
  maintenance_start: Wrench,
  maintenance_end: Wrench,
  write_off: XCircle,
};

export function InventoryDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getItem, getItemByCode, getMovements, items, isLoading } = useInventory();
  const { canManageInventory, isInventoryAdmin } = useAssetPermissions();

  const [item, setItem] = useState<AssetInventory | null>(null);
  const [movements, setMovements] = useState<AssetMovement[]>([]);
  const [isLoadingItem, setIsLoadingItem] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [movementType, setMovementType] = useState<AssetMovementType | undefined>();
  

  // Try to get from cache first, then fetch if needed
  useEffect(() => {
    if (!id) return;

    // Check if id is a UUID or an internal_code
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const cachedItem = items.find((i) => isUUID ? i.id === id : i.internal_code === id);
    if (cachedItem) {
      setItem(cachedItem);
      setIsLoadingItem(false);
    }

    // Always fetch fresh data
    const fetchData = async () => {
      let fetchedItem: AssetInventory | null = null;
      
      if (isUUID) {
        fetchedItem = await getItem(id);
      } else {
        fetchedItem = await getItemByCode(id);
      }
      
      if (fetchedItem) {
        setItem(fetchedItem);
        const fetchedMovements = await getMovements(fetchedItem.id);
        setMovements(fetchedMovements);
      }
      setIsLoadingItem(false);
    };

    fetchData();
  }, [id, items, getItem, getItemByCode, getMovements]);

  const handleOpenMovement = (type?: AssetMovementType) => {
    setMovementType(type);
    setMovementDialogOpen(true);
  };

  const handleOpenPublicLink = () => {
    if (!item) return;
    const publicUrl = `${window.location.origin}/p/assets/${item.internal_code}`;
    window.open(publicUrl, '_blank');
  };


  if (isLoading || isLoadingItem) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-medium">Item não encontrado</h2>
        <Button variant="link" onClick={() => navigate("/assets/inventory")}>
          Voltar para lista
        </Button>
      </div>
    );
  }

  // Actions available based on status
  const showCheckout = item.status === "available";
  const showReturn = item.status === "loaned";
  const showTransfer = item.status === "available" || item.status === "loaned";
  const showMaintenance = item.status === "available" || item.status === "maintenance";
  const showWriteOff = isInventoryAdmin && item.status !== "written_off";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/assets/inventory")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{item.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Tag className="h-4 w-4" />
            <span>{item.internal_code}</span>
            {item.category && (
              <>
                <span>•</span>
                <span>{item.category.name}</span>
              </>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenPublicLink}
          className="gap-2"
        >
          <Link2 className="h-4 w-4" />
          Link público
        </Button>
        <Badge variant="outline" className={cn("text-sm", statusColors[item.status])}>
          {INVENTORY_STATUS_LABELS[item.status]}
        </Badge>
      </div>

      {/* Quick Actions */}
      {canManageInventory && item.status !== "written_off" && (
        <Card>
          <CardContent className="flex flex-wrap gap-2 py-4">
            {showCheckout && (
              <Button size="sm" onClick={() => handleOpenMovement("checkout")}>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Emprestar
              </Button>
            )}
            {showReturn && (
              <Button size="sm" onClick={() => handleOpenMovement("return")}>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Devolver
              </Button>
            )}
            {showTransfer && (
              <Button size="sm" variant="outline" onClick={() => handleOpenMovement("transfer")}>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transferir
              </Button>
            )}
            {showMaintenance && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleOpenMovement(
                    item.status === "maintenance" ? "maintenance_end" : "maintenance_start"
                  )
                }
              >
                <Wrench className="h-4 w-4 mr-2" />
                {item.status === "maintenance" ? "Finalizar Manutenção" : "Iniciar Manutenção"}
              </Button>
            )}
            {isInventoryAdmin && (
              <Button size="sm" variant="outline" onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
            {showWriteOff && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleOpenMovement("write_off")}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="movements">Movimentações</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Location & Holder */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Localização Atual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {item.current_holder_type === "location" && item.current_location && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{item.current_location.name}</p>
                      <p className="text-sm text-muted-foreground">Em sede</p>
                    </div>
                  </div>
                )}
                {item.current_holder_type === "user" && item.current_user && (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={item.current_user.avatar_url || undefined} />
                      <AvatarFallback>
                        {item.current_user.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{item.current_user.full_name}</p>
                      <p className="text-sm text-muted-foreground">Em posse de colaborador</p>
                    </div>
                  </div>
                )}
                <Separator />
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Localização Base</p>
                    <p className="font-medium">{item.home_location?.name || "Não definida"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalhes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {item.brand && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Marca</span>
                    <span className="font-medium">{item.brand}</span>
                  </div>
                )}
                {item.model && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modelo</span>
                    <span className="font-medium">{item.model}</span>
                  </div>
                )}
                {isInventoryAdmin && item.serial_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Número de Série</span>
                    <span className="font-medium">{item.serial_number}</span>
                  </div>
                )}
                {item.acquired_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data de Aquisição</span>
                    <span className="font-medium">
                      {format(new Date(item.acquired_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}
                {isInventoryAdmin && item.acquisition_value && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor de Aquisição</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(item.acquisition_value)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantidade</span>
                  <span className="font-medium">
                    {item.quantity_available} / {item.quantity_total}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Description & Notes */}
          {(item.description || item.notes) && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                {item.description && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Descrição</h4>
                    <p>{item.description}</p>
                  </div>
                )}
                {item.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Observações</h4>
                    <p>{item.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Movimentações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma movimentação registrada
                </p>
              ) : (
                <div className="space-y-4">
                  {movements.map((movement) => {
                    const Icon = movementTypeIcons[movement.movement_type] || ArrowRightLeft;
                    return (
                      <div
                        key={movement.id}
                        className="flex items-start gap-4 p-4 rounded-lg border bg-card"
                      >
                        <div className="p-2 rounded-lg bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {MOVEMENT_TYPE_LABELS[movement.movement_type]}
                            </span>
                            {movement.to_user && (
                              <span className="text-sm text-muted-foreground">
                                → {movement.to_user.full_name}
                              </span>
                            )}
                            {movement.to_location && (
                              <span className="text-sm text-muted-foreground">
                                → {movement.to_location.name}
                              </span>
                            )}
                          </div>
                          {movement.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{movement.notes}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(movement.occurred_at), "dd/MM/yyyy HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                            {movement.performed_by && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {movement.performed_by.full_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {item && (
        <>
          <InventoryFormDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            item={item}
          />
          <InventoryMovementDialog
            open={movementDialogOpen}
            onOpenChange={setMovementDialogOpen}
            item={item}
            initialType={movementType}
          />
        </>
      )}
    </div>
  );
}
