import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ArrowRight, User, MapPin, Wrench, XCircle } from "lucide-react";
import { 
  useInventory, 
  useAssetGroups, 
  useLocations, 
  useAssetProfiles, 
  useBuAdmins, 
  useAuthorizers, 
  useAssetPermissionsV2 
} from "@/modules/assets/hooks";
import { useIdentity } from "@/hooks/useIdentity";
import { KitCheckoutInfo } from "./KitCheckoutInfo";
import { BuUserSelect } from "@/components/selects";
import type { AssetInventory, AssetMovementType } from "../../types";
import { MOVEMENT_TYPE_LABELS } from "../../types";

const baseSchema = z.object({
  movement_type: z.enum(["checkout", "return", "transfer", "maintenance_start", "maintenance_end", "write_off"]),
  notes: z.string().optional(),
  due_at: z.string().optional(),
});

const checkoutSchema = baseSchema.extend({
  movement_type: z.literal("checkout"),
  to_user_id: z.string().min(1, "Selecione o colaborador"),
  authorized_by_user_id: z.string().min(1, "Selecione quem autoriza"),
});

const returnSchema = baseSchema.extend({
  movement_type: z.literal("return"),
  to_location_id: z.string().min(1, "Selecione a localização"),
});

const transferSchema = baseSchema.extend({
  movement_type: z.literal("transfer"),
  to_holder_type: z.enum(["location", "user"]),
  to_location_id: z.string().optional(),
  to_user_id: z.string().optional(),
  authorized_by_user_id: z.string().min(1, "Selecione quem autoriza"),
});

const maintenanceStartSchema = baseSchema.extend({
  movement_type: z.literal("maintenance_start"),
});

const maintenanceEndSchema = baseSchema.extend({
  movement_type: z.literal("maintenance_end"),
});

const writeOffSchema = baseSchema.extend({
  movement_type: z.literal("write_off"),
  authorized_by_user_id: z.string().min(1, "Selecione quem autoriza"),
  notes: z.string().min(5, "Motivo obrigatório (mínimo 5 caracteres)"),
});

interface InventoryMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AssetInventory;
  initialType?: AssetMovementType;
}

export function InventoryMovementDialog({
  open,
  onOpenChange,
  item,
  initialType,
}: InventoryMovementDialogProps) {
  const { profileId } = useIdentity();
  const { createMovement, isCreatingMovement, updateItem } = useInventory();
  const { getRequiredAccessories } = useAssetGroups();
  const { locations, defaultLocation } = useLocations();
  const { profiles } = useAssetProfiles();
  const { admins } = useBuAdmins();
  const { authorizers } = useAuthorizers();
  const { isInventoryAdmin, canManageInventory } = useAssetPermissionsV2();

  const [movementType, setMovementType] = useState<AssetMovementType>(initialType || "checkout");
  const [includeKitAccessories, setIncludeKitAccessories] = useState(false);
  const wasOpenRef = useRef(false);

  // Determine available movement types based on current item status
  const availableTypes: AssetMovementType[] = [];
  if (item.status === "available") {
    availableTypes.push("checkout", "transfer", "maintenance_start");
    if (isInventoryAdmin) availableTypes.push("write_off");
  } else if (item.status === "loaned") {
    availableTypes.push("return", "transfer");
    if (isInventoryAdmin) availableTypes.push("write_off");
  } else if (item.status === "maintenance") {
    availableTypes.push("maintenance_end");
    if (isInventoryAdmin) availableTypes.push("write_off");
  }

  const getSchema = (type: AssetMovementType) => {
    switch (type) {
      case "checkout":
        return checkoutSchema;
      case "return":
        return returnSchema;
      case "transfer":
        return transferSchema;
      case "maintenance_start":
        return maintenanceStartSchema;
      case "maintenance_end":
        return maintenanceEndSchema;
      case "write_off":
        return writeOffSchema;
      default:
        return baseSchema;
    }
  };

  const form = useForm<any>({
    resolver: zodResolver(getSchema(movementType)),
    defaultValues: {
      movement_type: movementType,
      notes: "",
      due_at: "",
      to_user_id: "",
      to_location_id: item.home_location_id || defaultLocation?.id || "",
      to_holder_type: "location",
      authorized_by_user_id: profileId || "",
    },
  });

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;

    if (!justOpened) return;

    const type = initialType || availableTypes[0] || "checkout";
    setMovementType(type);
    setIncludeKitAccessories(false);
    form.reset({
      movement_type: type,
      notes: "",
      due_at: "",
      to_user_id: "",
      to_location_id: item.home_location_id || defaultLocation?.id || "",
      to_holder_type: "location",
      authorized_by_user_id: profileId || "",
    });
  }, [open, initialType, item, profileId, form, defaultLocation, availableTypes]);

  const handleTypeChange = (type: AssetMovementType) => {
    setMovementType(type);
    form.setValue("movement_type", type);
    // Reset type-specific fields
    if (type === "return") {
      form.setValue("to_location_id", item.home_location_id || defaultLocation?.id || "");
    }
  };

  const onSubmit = async (data: any) => {
    const baseMovementData: any = {
      asset_id: item.id,
      movement_type: data.movement_type,
      notes: data.notes || undefined,
      from_holder_type: item.current_holder_type,
      from_location_id: item.current_holder_type === "location" ? item.current_location_id : undefined,
      from_user_id: item.current_holder_type === "user" ? item.current_user_id : undefined,
    };

    // Type-specific fields
    switch (data.movement_type) {
      case "checkout":
        baseMovementData.to_holder_type = "user";
        baseMovementData.to_user_id = data.to_user_id;
        baseMovementData.authorized_by_user_id = data.authorized_by_user_id;
        baseMovementData.due_at = data.due_at || undefined;
        break;

      case "return":
        baseMovementData.to_holder_type = "location";
        baseMovementData.to_location_id = data.to_location_id;
        break;

      case "transfer":
        baseMovementData.to_holder_type = data.to_holder_type;
        if (data.to_holder_type === "location") {
          baseMovementData.to_location_id = data.to_location_id;
        } else {
          baseMovementData.to_user_id = data.to_user_id;
        }
        baseMovementData.authorized_by_user_id = data.authorized_by_user_id;
        break;

      case "write_off":
        baseMovementData.authorized_by_user_id = data.authorized_by_user_id;
        break;
    }

    // Create movement for main item
    createMovement(baseMovementData);

    // If checkout with kit accessories, also create movements for accessories
    if (data.movement_type === "checkout" && includeKitAccessories) {
      try {
        const accessories = await getRequiredAccessories(item.id);
        for (const accessory of accessories) {
          if (accessory.status === "available") {
            createMovement({
              asset_id: accessory.id,
              movement_type: "checkout",
              notes: `Emprestado como acessório do kit (item principal: ${item.internal_code})`,
              from_holder_type: accessory.current_holder_type,
              from_location_id: accessory.current_location_id,
              to_holder_type: "user",
              to_user_id: data.to_user_id,
              authorized_by_user_id: data.authorized_by_user_id,
              due_at: data.due_at || undefined,
            });

            // Update accessory status
            updateItem({
              id: accessory.id,
              status: "loaned",
              current_holder_type: "user",
              current_user_id: data.to_user_id,
              current_location_id: null,
            });
          }
        }
      } catch (error) {
        console.error("Error processing kit accessories:", error);
      }
    }

    // Update item status based on movement type
    const statusUpdate: any = { id: item.id };
    switch (data.movement_type) {
      case "checkout":
        statusUpdate.status = "loaned";
        statusUpdate.current_holder_type = "user";
        statusUpdate.current_user_id = data.to_user_id;
        statusUpdate.current_location_id = null;
        break;
      case "return":
        statusUpdate.status = "available";
        statusUpdate.current_holder_type = "location";
        statusUpdate.current_location_id = data.to_location_id;
        statusUpdate.current_user_id = null;
        break;
      case "transfer":
        if (data.to_holder_type === "location") {
          statusUpdate.current_holder_type = "location";
          statusUpdate.current_location_id = data.to_location_id;
          statusUpdate.current_user_id = null;
          if (item.status === "loaned") statusUpdate.status = "available";
        } else {
          statusUpdate.current_holder_type = "user";
          statusUpdate.current_user_id = data.to_user_id;
          statusUpdate.current_location_id = null;
          statusUpdate.status = "loaned";
        }
        break;
      case "maintenance_start":
        statusUpdate.status = "maintenance";
        break;
      case "maintenance_end":
        statusUpdate.status = item.current_holder_type === "user" ? "loaned" : "available";
        break;
      case "write_off":
        statusUpdate.status = "written_off";
        break;
    }

    updateItem(statusUpdate);
    onOpenChange(false);
  };

  const toHolderType = form.watch("to_holder_type");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            {MOVEMENT_TYPE_LABELS[movementType]}: {item.name}
          </DialogTitle>
          <DialogDescription>
            {item.internal_code} • Status atual: {item.status}
          </DialogDescription>
        </DialogHeader>

        {availableTypes.length === 0 ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Item com status "{item.status}" não pode ser movimentado.
            </AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              {/* Checkout Fields */}
              {movementType === "checkout" && (
                <>
                  <FormField
                    control={form.control}
                    name="to_user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Emprestar para *
                        </FormLabel>
                        <BuUserSelect
                          value={field.value ?? undefined}
                          onValueChange={field.onChange}
                          placeholder="Selecione o colaborador..."
                          excludeExternal
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="due_at"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prazo de Devolução</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>Opcional, mas recomendado</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="authorized_by_user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Autorizado por *</FormLabel>
                        <Select
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Quem autoriza..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {authorizers.length === 0 ? (
                              <SelectItem value="__none__" disabled>
                                Nenhum autorizador encontrado
                              </SelectItem>
                            ) : (
                              authorizers.map((auth) => (
                                <SelectItem 
                                  key={auth.id} 
                                  value={auth.id}
                                  textValue={auth.full_name}
                                >
                                  <span className="flex items-center gap-2">
                                    {auth.full_name}
                                    <span className="text-xs text-muted-foreground">
                                      ({auth.role_label})
                                    </span>
                                  </span>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Apenas Admins e Líderes de Time podem autorizar
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Kit Checkout Info */}
                  <KitCheckoutInfo
                    item={item}
                    includeAccessories={includeKitAccessories}
                    onIncludeAccessoriesChange={setIncludeKitAccessories}
                    targetUserId={form.watch("to_user_id")}
                  />
                </>
              )}

              {/* Return Fields */}
              {movementType === "return" && (
                <FormField
                  control={form.control}
                  name="to_location_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Devolver para *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a sede..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name} {loc.is_default && "(Padrão)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Transfer Fields */}
              {movementType === "transfer" && (
                <>
                  <FormField
                    control={form.control}
                    name="to_holder_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transferir para</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="location">
                              <span className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" /> Localização
                              </span>
                            </SelectItem>
                            <SelectItem value="user">
                              <span className="flex items-center gap-2">
                                <User className="h-4 w-4" /> Colaborador
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {toHolderType === "location" && (
                    <FormField
                      control={form.control}
                      name="to_location_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Localização de Destino *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {locations.map((loc) => (
                                <SelectItem key={loc.id} value={loc.id}>
                                  {loc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {toHolderType === "user" && (
                    <FormField
                      control={form.control}
                      name="to_user_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Colaborador de Destino *</FormLabel>
                          <BuUserSelect
                            value={field.value ?? undefined}
                            onValueChange={(v) => field.onChange(v)}
                            placeholder="Selecione..."
                            excludeExternal
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="authorized_by_user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Autorizado por *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Quem autoriza..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {authorizers.length === 0 ? (
                              <SelectItem value="__none__" disabled>
                                Nenhum autorizador encontrado
                              </SelectItem>
                            ) : (
                              authorizers.map((auth) => (
                                <SelectItem 
                                  key={auth.id} 
                                  value={auth.id}
                                  textValue={auth.full_name}
                                >
                                  <span className="flex items-center gap-2">
                                    {auth.full_name}
                                    <span className="text-xs text-muted-foreground">
                                      ({auth.role_label})
                                    </span>
                                  </span>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Apenas Admins e Líderes de Time podem autorizar
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Write-off Fields */}
              {movementType === "write_off" && (
                <>
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      Atenção: Esta ação é irreversível. O item será baixado do patrimônio.
                    </AlertDescription>
                  </Alert>

                  <FormField
                    control={form.control}
                    name="authorized_by_user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Autorizado por *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um administrador..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {admins.length === 0 ? (
                              <SelectItem value="__none__" disabled>
                                Nenhum administrador encontrado
                              </SelectItem>
                            ) : (
                              admins.map((admin) => (
                                <SelectItem key={admin.id} value={admin.id}>
                                  {admin.full_name}
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({admin.role === "super_admin" ? "Super Admin" : "Admin"})
                                  </span>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Notes (always shown) */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {movementType === "write_off" ? "Motivo da Baixa *" : "Observações"}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={
                          movementType === "write_off"
                            ? "Descreva o motivo da baixa..."
                            : "Observações adicionais..."
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingMovement}
                  variant={movementType === "write_off" ? "destructive" : "default"}
                >
                  {isCreatingMovement ? "Salvando..." : "Confirmar"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
