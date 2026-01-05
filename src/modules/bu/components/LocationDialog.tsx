import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { AddressAutocomplete } from "./AddressAutocomplete";
import { useCreateBuLocation, useUpdateBuLocation } from "../hooks/useBuLocations";
import type { BuLocation, BuLocationType, BuLocationStatus } from "../types/location";
import { LOCATION_TYPE_LABELS, LOCATION_STATUS_LABELS } from "../types/location";

const locationSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  type: z.enum(["headquarters", "office", "warehouse", "remote_hub", "other"]),
  status: z.enum(["active", "inactive"]),
  is_default: z.boolean(),
  formatted_address: z.string().optional(),
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  google_place_id: z.string().optional(),
  notes: z.string().optional(),
});

type LocationFormData = z.infer<typeof locationSchema>;

interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buId: string;
  location?: BuLocation | null;
}

export function LocationDialog({ open, onOpenChange, buId, location }: LocationDialogProps) {
  const isEditing = !!location;
  const createMutation = useCreateBuLocation();
  const updateMutation = useUpdateBuLocation();
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: location?.name || "",
      type: (location?.type as BuLocationType) || "office",
      status: (location?.status as BuLocationStatus) || "active",
      is_default: location?.is_default || false,
      formatted_address: location?.formatted_address || "",
      address_line_1: location?.address_line_1 || "",
      address_line_2: location?.address_line_2 || "",
      district: location?.district || "",
      city: location?.city || "",
      state: location?.state || "",
      country: location?.country || "BR",
      postal_code: location?.postal_code || "",
      latitude: location?.latitude ? Number(location.latitude) : undefined,
      longitude: location?.longitude ? Number(location.longitude) : undefined,
      google_place_id: location?.google_place_id || "",
      notes: location?.notes || "",
    },
  });

  // Reset form when dialog opens or location changes
  React.useEffect(() => {
    if (!open) return;
    
    if (location) {
      form.reset({
        name: location.name,
        type: location.type as BuLocationType,
        status: location.status as BuLocationStatus,
        is_default: location.is_default,
        formatted_address: location.formatted_address || "",
        address_line_1: location.address_line_1 || "",
        address_line_2: location.address_line_2 || "",
        district: location.district || "",
        city: location.city || "",
        state: location.state || "",
        country: location.country || "BR",
        postal_code: location.postal_code || "",
        latitude: location.latitude ? Number(location.latitude) : undefined,
        longitude: location.longitude ? Number(location.longitude) : undefined,
        google_place_id: location.google_place_id || "",
        notes: location.notes || "",
      });
    } else {
      form.reset({
        name: "",
        type: "office",
        status: "active",
        is_default: false,
        formatted_address: "",
        address_line_1: "",
        address_line_2: "",
        district: "",
        city: "",
        state: "",
        country: "BR",
        postal_code: "",
        latitude: undefined,
        longitude: undefined,
        google_place_id: "",
        notes: "",
      });
    }
  }, [open, location, form]);

  const onSubmit = async (data: LocationFormData) => {
    try {
      const formData = {
        name: data.name,
        type: data.type,
        status: data.status,
        is_default: data.is_default,
        formatted_address: data.formatted_address,
        address_line_1: data.address_line_1,
        address_line_2: data.address_line_2,
        district: data.district,
        city: data.city,
        state: data.state,
        country: data.country,
        postal_code: data.postal_code,
        latitude: data.latitude,
        longitude: data.longitude,
        google_place_id: data.google_place_id,
        notes: data.notes,
      };

      if (isEditing && location) {
        await updateMutation.mutateAsync({
          id: location.id,
          bu_id: buId,
          ...formData,
        });
        toast.success("Sede atualizada com sucesso!");
      } else {
        await createMutation.mutateAsync({
          bu_id: buId,
          ...formData,
        });
        toast.success("Sede criada com sucesso!");
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar sede");
    }
  };

  const handleAddressSelect = (details: {
    formatted_address: string;
    address_line_1: string;
    address_line_2?: string;
    district?: string;
    city: string;
    state: string;
    country: string;
    postal_code?: string;
    latitude: number;
    longitude: number;
    google_place_id: string;
  }) => {
    form.setValue("formatted_address", details.formatted_address);
    form.setValue("address_line_1", details.address_line_1);
    form.setValue("address_line_2", details.address_line_2 || "");
    form.setValue("district", details.district || "");
    form.setValue("city", details.city);
    form.setValue("state", details.state);
    form.setValue("country", details.country);
    form.setValue("postal_code", details.postal_code || "");
    form.setValue("latitude", details.latitude);
    form.setValue("longitude", details.longitude);
    form.setValue("google_place_id", details.google_place_id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.stopPropagation()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Sede" : "Nova Sede"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações da sede."
              : "Adicione uma nova sede à Business Unit."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Matriz Florianópolis" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(LOCATION_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_default"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Sede Padrão</FormLabel>
                    <FormDescription>
                      Definir como sede principal da BU
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />

            {/* Address */}
            <div className="space-y-4">
              <h4 className="font-medium">Endereço</h4>
              
              <FormItem>
                <FormLabel>Buscar Endereço</FormLabel>
                <AddressAutocomplete
                  value={form.watch("formatted_address") || ""}
                  onSelect={handleAddressSelect}
                  placeholder="Digite para buscar..."
                />
                <FormDescription>
                  Busque pelo endereço para preencher automaticamente
                </FormDescription>
              </FormItem>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="address_line_1"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Logradouro</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, número" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address_line_2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input placeholder="Sala, andar..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input placeholder="UF" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input placeholder="00000-000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais sobre a sede..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
