/**
 * GiftItemDialog - Formulário expandido para cadastro de itens de brinde
 * Usa campos estruturados: categoria, fornecedor, localização, etc.
 */

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useGifts, useAssetCategoriesQuery, useLocations } from "../../hooks";
import { SupplierCombobox } from "./SupplierCombobox";
import { AssetPhotoUpload } from "../shared/AssetPhotoUpload";
import { buildSubcategoryList } from "../inventory/form/inventoryFormSchema";

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(200, "Nome muito longo"),
  category_id: z.string().min(1, "Subcategoria obrigatória"),
  supplier_id: z.string().uuid().optional().nullable(),
  home_location_id: z.string().min(1, "Localização obrigatória"),
  room_id: z.string().optional(),
  acquired_at: z.string().optional(),
  acquisition_value: z.coerce.number().min(0, "Valor inválido").optional(),
  quantity_total: z.coerce.number().int().min(1, "Quantidade deve ser >= 1"),
  photos: z.array(z.string()).optional(),
  notes: z.string().max(2000, "Observações muito longas").optional(),
});

type FormData = z.infer<typeof schema>;

interface GiftItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GiftItemDialog({ open, onOpenChange }: GiftItemDialogProps) {
  const { createItem, isCreatingItem } = useGifts();
  const { data: categories = [] } = useAssetCategoriesQuery();
  const { rootLocations, getRooms, defaultLocation } = useLocations();
  const [tempItemId] = useState(() => `new-${Date.now()}`);

  // Build subcategory list grouped by parent
  const subcategories = useMemo(() => buildSubcategoryList(categories), [categories]);
  const groupedSubcategories = useMemo(() => {
    const groups: Record<string, typeof subcategories> = {};
    subcategories.forEach((sub) => {
      if (!groups[sub.parentName]) {
        groups[sub.parentName] = [];
      }
      groups[sub.parentName].push(sub);
    });
    return groups;
  }, [subcategories]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      category_id: "",
      supplier_id: null,
      home_location_id: defaultLocation?.id || "",
      room_id: "",
      acquired_at: "",
      acquisition_value: undefined,
      quantity_total: 1,
      photos: [],
      notes: "",
    },
  });

  // Watch location to show rooms
  const selectedLocationId = form.watch("home_location_id");
  const availableRooms = selectedLocationId ? getRooms(selectedLocationId) : [];

  useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        category_id: "",
        supplier_id: null,
        home_location_id: defaultLocation?.id || "",
        room_id: "",
        acquired_at: "",
        acquisition_value: undefined,
        quantity_total: 1,
        photos: [],
        notes: "",
      });
    }
  }, [open, form, defaultLocation?.id]);

  // Reset room when location changes
  useEffect(() => {
    form.setValue("room_id", "");
  }, [selectedLocationId, form]);

  const onSubmit = (data: FormData) => {
    // If room is selected, use it as the location
    const finalLocationId = data.room_id || data.home_location_id;
    
    createItem({
      name: data.name,
      category_id: data.category_id,
      supplier_id: data.supplier_id || null,
      home_location_id: finalLocationId,
      acquired_at: data.acquired_at || null,
      acquisition_value: data.acquisition_value || null,
      quantity_total: data.quantity_total,
      photos: data.photos || [],
      notes: data.notes || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Item de Brinde</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nome */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Camiseta Oficial" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subcategoria */}
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategoria *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a subcategoria..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(groupedSubcategories).map(([parentName, subs]) => (
                        <SelectGroup key={parentName}>
                          <SelectLabel>{parentName}</SelectLabel>
                          {subs.map((sub) => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fornecedor */}
            <FormField
              control={form.control}
              name="supplier_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor</FormLabel>
                  <FormControl>
                    <SupplierCombobox
                      value={field.value || null}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    Busque por nome ou CNPJ
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Localização e Sala */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="home_location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localização *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rootLocations.map((loc) => (
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

              <FormField
                control={form.control}
                name="room_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sala</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={availableRooms.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={availableRooms.length === 0 ? "Nenhuma sala" : "Selecione..."} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableRooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Data, Valor e Quantidade */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="acquired_at"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Aquisição</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date?.toISOString().split("T")[0])}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="acquisition_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Total</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity_total"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Fotos */}
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <ImageIcon className="h-4 w-4" />
                <span>Fotos do Item</span>
              </div>
              <FormField
                control={form.control}
                name="photos"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <AssetPhotoUpload
                        value={field.value || []}
                        onChange={field.onChange}
                        folder="gifts"
                        itemId={tempItemId}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Observações */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações adicionais..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isCreatingItem} loadingText="Salvando...">
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
