import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { useInventory } from "../../hooks/useInventory";
import { useLocations } from "../../hooks/useLocations";
import { useBrands } from "../../hooks/useBrands";
import { AutocompleteInput } from "./AutocompleteInput";
import { cn } from "@/lib/utils";

const schema = z.object({
  internal_code: z.string().min(1, "Código interno obrigatório"),
  name: z.string().min(1, "Nome obrigatório"),
  category_id: z.string().min(1, "Subcategoria obrigatória"),
  description: z.string().optional(),
  serial_number: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  location_id: z.string().optional(),
  room_id: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface SubcategoryItem {
  id: string;
  name: string;
  parentName: string;
}

function buildSubcategoryList(
  categories: Array<{ id: string; name: string; parent_id: string | null }>
): SubcategoryItem[] {
  const parentMap = new Map<string, string>();
  categories.forEach((cat) => {
    if (!cat.parent_id) {
      parentMap.set(cat.id, cat.name);
    }
  });

  // Only return subcategories (items with parent_id)
  return categories
    .filter((cat) => cat.parent_id !== null)
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      parentName: parentMap.get(cat.parent_id!) || "Sem categoria",
    }))
    .sort((a, b) => {
      // Sort by parent name first, then by name
      const parentCompare = a.parentName.localeCompare(b.parentName);
      if (parentCompare !== 0) return parentCompare;
      return a.name.localeCompare(b.name);
    });
}

interface InventoryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InventoryItemDialog({ open, onOpenChange }: InventoryItemDialogProps) {
  const { categories, createItem, isCreatingItem } = useInventory();
  const { rootLocations, getRooms, defaultLocation } = useLocations();
  const { brands } = useBrands();

  // Build flat list of subcategories with parent name
  const subcategories = useMemo(() => buildSubcategoryList(categories), [categories]);

  // Group subcategories by parent for display
  const groupedSubcategories = useMemo(() => {
    const groups: Record<string, SubcategoryItem[]> = {};
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
      internal_code: "",
      name: "",
      category_id: undefined,
      description: "",
      serial_number: "",
      brand: "",
      model: "",
      location_id: undefined,
      room_id: undefined,
      notes: "",
    },
  });

  const selectedLocationId = useWatch({
    control: form.control,
    name: "location_id",
  });

  const availableRooms = selectedLocationId ? getRooms(selectedLocationId) : [];

  useEffect(() => {
    if (open) {
      form.reset({
        internal_code: "",
        name: "",
        category_id: undefined,
        description: "",
        serial_number: "",
        brand: "",
        model: "",
        location_id: defaultLocation?.id || undefined,
        room_id: undefined,
        notes: "",
      });
    }
  }, [open, form, defaultLocation]);

  // Clear room when location changes
  useEffect(() => {
    const currentRoomId = form.getValues("room_id");
    if (currentRoomId && selectedLocationId) {
      const rooms = getRooms(selectedLocationId);
      const roomStillValid = rooms.some((r) => r.id === currentRoomId);
      if (!roomStillValid) {
        form.setValue("room_id", undefined);
      }
    }
  }, [selectedLocationId, form, getRooms]);

  const onSubmit = (data: FormData) => {
    // Use room_id as home_location_id if selected, otherwise use location_id
    const homeLocationId = data.room_id || data.location_id || undefined;

    createItem({
      internal_code: data.internal_code,
      name: data.name,
      category_id: data.category_id,
      description: data.description || undefined,
      serial_number: data.serial_number || undefined,
      brand: data.brand || undefined,
      model: data.model || undefined,
      home_location_id: homeLocationId,
      notes: data.notes || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Item de Inventário</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="internal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Interno *</FormLabel>
                    <FormControl>
                      <Input placeholder="INV-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Notebook Dell Latitude" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategoria *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma subcategoria..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(groupedSubcategories).map(([parentName, subs]) => (
                        <div key={parentName}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                            {parentName}
                          </div>
                          {subs.map((sub) => (
                            <SelectItem
                              key={sub.id}
                              value={sub.id}
                              className="pl-4"
                            >
                              {sub.name}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descrição do item..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localização</FormLabel>
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
                      disabled={!selectedLocationId || availableRooms.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !selectedLocationId
                                ? "Selecione local primeiro"
                                : availableRooms.length === 0
                                ? "Nenhuma sala"
                                : "Selecione..."
                            }
                          />
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

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <AutocompleteInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        suggestions={brands}
                        placeholder="Dell, Apple..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input placeholder="Latitude 5520" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serial_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Série</FormLabel>
                    <FormControl>
                      <Input placeholder="SN12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
              <Button type="submit" disabled={isCreatingItem}>
                {isCreatingItem ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
