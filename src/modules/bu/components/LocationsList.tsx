import { useState } from "react";
import {
  MapPin,
  MoreVertical,
  Plus,
  Building2,
  Star,
  Loader2,
  Pencil,
  Trash2,
  Check,
  Power,
  PowerOff,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

import { LocationDialog } from "./LocationDialog";
import {
  useBuLocations,
  useSoftDeleteBuLocation,
  useSetDefaultBuLocation,
  useUpdateBuLocation,
} from "../hooks/useBuLocations";
import type { BuLocation } from "../types/location";
import { LOCATION_TYPE_LABELS, LOCATION_STATUS_LABELS } from "../types/location";

interface LocationsListProps {
  buId: string;
  canManage?: boolean;
}

export function LocationsList({ buId, canManage = false }: LocationsListProps) {
  const { data: locations = [], isLoading } = useBuLocations(buId);
  const deleteMutation = useSoftDeleteBuLocation();
  const setDefaultMutation = useSetDefaultBuLocation();
  const updateMutation = useUpdateBuLocation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<BuLocation | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<BuLocation | null>(null);

  const handleEdit = (location: BuLocation) => {
    setEditingLocation(location);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingLocation(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!locationToDelete) return;

    try {
      await deleteMutation.mutateAsync({
        id: locationToDelete.id,
        bu_id: buId,
      });
      toast.success("Sede removida com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover sede");
    } finally {
      setDeleteConfirmOpen(false);
      setLocationToDelete(null);
    }
  };

  const handleSetDefault = async (location: BuLocation) => {
    try {
      await setDefaultMutation.mutateAsync({
        id: location.id,
        bu_id: buId,
      });
      toast.success("Sede definida como padrão!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao definir sede padrão");
    }
  };

  const handleToggleStatus = async (location: BuLocation) => {
    const newStatus = location.status === "active" ? "inactive" : "active";
    try {
      await updateMutation.mutateAsync({
        id: location.id,
        bu_id: buId,
        status: newStatus,
      });
      toast.success(newStatus === "active" ? "Sede ativada!" : "Sede desativada!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar status");
    }
  };

  const confirmDelete = (location: BuLocation) => {
    setLocationToDelete(location);
    setDeleteConfirmOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Sedes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Sedes
              </CardTitle>
              <CardDescription>
                Localizações físicas da Business Unit
              </CardDescription>
            </div>
            {canManage && (
              <Button type="button" onClick={handleCreate} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Sede
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhuma sede cadastrada.
              </p>
              {canManage && (
                <Button
                  type="button"
                  onClick={handleCreate}
                  variant="outline"
                  className="mt-4 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Sede
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {locations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{location.name}</span>
                        {location.is_default && (
                          <Badge variant="outline" className="gap-1">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            Padrão
                          </Badge>
                        )}
                        <Badge
                          variant={location.status === "active" ? "default" : "secondary"}
                        >
                          {LOCATION_STATUS_LABELS[location.status as keyof typeof LOCATION_STATUS_LABELS]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">
                          {LOCATION_TYPE_LABELS[location.type as keyof typeof LOCATION_TYPE_LABELS]}
                        </Badge>
                        {location.city && location.state && (
                          <span>
                            {location.city}, {location.state}
                          </span>
                        )}
                      </div>
                      {location.formatted_address && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {location.formatted_address}
                        </p>
                      )}
                    </div>
                  </div>

                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(location)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        {!location.is_default && (
                          <DropdownMenuItem onClick={() => handleSetDefault(location)}>
                            <Star className="mr-2 h-4 w-4" />
                            Definir como Padrão
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleToggleStatus(location)}>
                          {location.status === "active" ? (
                            <>
                              <PowerOff className="mr-2 h-4 w-4" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <Power className="mr-2 h-4 w-4" />
                              Ativar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => confirmDelete(location)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {dialogOpen && (
        <LocationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          buId={buId}
          location={editingLocation}
        />
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Sede</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a sede "{locationToDelete?.name}"?
              Esta ação pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
