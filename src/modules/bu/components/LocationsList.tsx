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
  Power,
  PowerOff,
  DoorOpen,
  ChevronRight,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  const [parentLocationId, setParentLocationId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<BuLocation | null>(null);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

  // Separate root locations from rooms
  const rootLocations = locations.filter(l => !l.parent_location_id);
  const getChildLocations = (parentId: string) => 
    locations.filter(l => l.parent_location_id === parentId);

  const handleEdit = (location: BuLocation) => {
    setEditingLocation(location);
    setParentLocationId(null);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingLocation(null);
    setParentLocationId(null);
    setDialogOpen(true);
  };

  const handleCreateRoom = (parentId: string) => {
    setEditingLocation(null);
    setParentLocationId(parentId);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!locationToDelete) return;

    try {
      await deleteMutation.mutateAsync({
        id: locationToDelete.id,
        bu_id: buId,
      });
      toast.success(locationToDelete.parent_location_id ? "Sala removida com sucesso!" : "Sede removida com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover");
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
      toast.success(newStatus === "active" ? "Ativado!" : "Desativado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar status");
    }
  };

  const confirmDelete = (location: BuLocation) => {
    setLocationToDelete(location);
    setDeleteConfirmOpen(true);
  };

  const toggleExpand = (locationId: string) => {
    setExpandedLocations(prev => {
      const next = new Set(prev);
      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        next.add(locationId);
      }
      return next;
    });
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

  const renderLocationItem = (location: BuLocation, isRoom = false) => {
    const childLocations = getChildLocations(location.id);
    const hasChildren = childLocations.length > 0;
    const isExpanded = expandedLocations.has(location.id);

    return (
      <div key={location.id} className={isRoom ? "ml-6 border-l-2 border-muted pl-4" : ""}>
        <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(location.id)}>
          <div
            className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isRoom ? "bg-secondary" : "bg-primary/10"}`}>
                {isRoom ? (
                  <DoorOpen className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <MapPin className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {hasChildren && (
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                        <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </Button>
                    </CollapsibleTrigger>
                  )}
                  <span className="font-medium">{location.name}</span>
                  {location.is_default && !isRoom && (
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
                  {!isRoom && location.city && location.state && (
                    <span>
                      {location.city}, {location.state}
                    </span>
                  )}
                  {hasChildren && (
                    <span className="text-xs">
                      {childLocations.length} sala{childLocations.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {!isRoom && location.formatted_address && (
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
                  {!isRoom && (
                    <DropdownMenuItem onClick={() => handleCreateRoom(location.id)}>
                      <DoorOpen className="mr-2 h-4 w-4" />
                      Adicionar Sala
                    </DropdownMenuItem>
                  )}
                  {!location.is_default && !isRoom && (
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

          {hasChildren && (
            <CollapsibleContent className="mt-2 space-y-2">
              {childLocations.map(child => renderLocationItem(child, true))}
            </CollapsibleContent>
          )}

          {/* Add room button under expanded location */}
          {!isRoom && isExpanded && canManage && (
            <div className="ml-6 mt-2 pl-4 border-l-2 border-muted">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => handleCreateRoom(location.id)}
              >
                <Plus className="h-4 w-4" />
                Adicionar Sala
              </Button>
            </div>
          )}
        </Collapsible>
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Sedes e Salas
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
          {rootLocations.length === 0 ? (
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
              {rootLocations.map((location) => renderLocationItem(location))}
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
          parentLocationId={parentLocationId}
        />
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remover {locationToDelete?.parent_location_id ? "Sala" : "Sede"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{locationToDelete?.name}"?
              {!locationToDelete?.parent_location_id && getChildLocations(locationToDelete?.id || "").length > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  Atenção: Esta sede possui salas cadastradas que também serão afetadas.
                </span>
              )}
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
