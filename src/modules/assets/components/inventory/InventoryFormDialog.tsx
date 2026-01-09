import { useEffect, useState, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
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
  FormDescription,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus } from "lucide-react";
import { useInventory } from "../../hooks/useInventory";
import { useLocations } from "../../hooks/useLocations";
import { useAssetPermissions } from "../../hooks/useAssetPermissions";
import { useAssetProfiles } from "../../hooks/useProfiles";
import { useIdentity } from "@/hooks/useIdentity";
import { useBrands } from "../../hooks/useBrands";
import { AutocompleteInput } from "./AutocompleteInput";
import type { AssetInventory } from "../../types";

const schema = z.object({
  internal_code: z
    .string()
    .min(1, "Código interno obrigatório")
    .max(20, "Código deve ter no máximo 20 caracteres")
    .regex(/^\d+$/, "Código deve conter apenas números"),
  name: z.string().min(1, "Nome obrigatório").max(200, "Nome muito longo"),
  category_id: z.string().min(1, "Subcategoria obrigatória"),
  home_location_id: z.string().min(1, "Localização obrigatória"),
  room_id: z.string().optional(),
  description: z.string().max(1000, "Descrição muito longa").optional(),
  brand: z.string().max(100, "Marca muito longa").optional(),
  model: z.string().max(100, "Modelo muito longo").optional(),
  acquired_at: z.string().optional(),
  serial_number: z.string().max(100, "Número de série muito longo").optional(),
  no_serial_number: z.boolean().optional(),
  acquisition_value: z.coerce.number().optional(),
  notes: z.string().max(2000, "Observações muito longas").optional(),
  // Assignment fields
  assigned_to_user_id: z.string().optional(),
  due_at: z.string().optional(),
}).superRefine((data, ctx) => {
  // Se não marcou "não possui" E serial_number está vazio → erro
  if (!data.no_serial_number && !data.serial_number?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Número de série obrigatório. Marque 'Não possui' se o item não tem.",
      path: ["serial_number"],
    });
  }
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

  return categories
    .filter((cat) => cat.parent_id !== null)
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      parentName: parentMap.get(cat.parent_id!) || "Sem categoria",
    }))
    .sort((a, b) => {
      const parentCompare = a.parentName.localeCompare(b.parentName);
      if (parentCompare !== 0) return parentCompare;
      return a.name.localeCompare(b.name);
    });
}

interface InventoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: AssetInventory | null;
  /** When true, clones the item instead of editing (leaves code blank) */
  cloneMode?: boolean;
}

export function InventoryFormDialog({ open, onOpenChange, item, cloneMode = false }: InventoryFormDialogProps) {
  const { items, categories, createItemAsync, updateItemAsync, isCreatingItem, isUpdatingItem } = useInventory();
  const { rootLocations, getRooms, defaultLocation } = useLocations();
  const { isInventoryAdmin } = useAssetPermissions();
  const { profiles } = useAssetProfiles();
  const { profileId } = useIdentity();
  const { brands } = useBrands();
  const isEditing = !!item && !cloneMode;
  const isCloning = !!item && cloneMode;
  const itemId = item?.id ?? null;
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  // Build subcategory list with parent names
  const subcategories = useMemo(() => buildSubcategoryList(categories), [categories]);

  // Check if item has a parent category (legacy/imported data)
  const itemHasParentCategory = useMemo(() => {
    if (!item?.category_id) return null;
    const category = categories.find((c) => c.id === item.category_id);
    // If it's a parent category (no parent_id), return it for display
    if (category && !category.parent_id) {
      return { id: category.id, name: category.name };
    }
    return null;
  }, [item?.category_id, categories]);

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
      home_location_id: "",
      room_id: undefined,
      description: "",
      brand: "",
      model: "",
      acquired_at: "",
      serial_number: "",
      no_serial_number: false,
      acquisition_value: undefined,
      notes: "",
      assigned_to_user_id: undefined,
      due_at: "",
    },
  });

  const watchNoSerialNumber = form.watch("no_serial_number");

  const watchAssignedTo = form.watch("assigned_to_user_id");

  const selectedLocationId = useWatch({
    control: form.control,
    name: "home_location_id",
  });

  const availableRooms = selectedLocationId ? getRooms(selectedLocationId) : [];

  useEffect(() => {
    if (!open) {
      setDuplicateError(null);
      return;
    }

    if (item && !cloneMode) {
      // Editing mode - load all data (no assignment in edit mode)
      form.reset({
        internal_code: item.internal_code,
        name: item.name,
        category_id: item.category_id || undefined,
        home_location_id: item.home_location_id || "",
        room_id: undefined,
        description: item.description || "",
        brand: item.brand || "",
        model: item.model || "",
        acquired_at: item.acquired_at || "",
        serial_number: item.serial_number || "",
        no_serial_number: !item.serial_number,
        acquisition_value: item.acquisition_value || undefined,
        notes: item.notes || "",
        assigned_to_user_id: undefined,
        due_at: "",
      });
    } else if (item && cloneMode) {
      // Clone mode - copy data but leave code blank
      form.reset({
        internal_code: "",
        name: item.name,
        category_id: item.category_id || undefined,
        home_location_id: item.home_location_id || "",
        room_id: undefined,
        description: item.description || "",
        brand: item.brand || "",
        model: item.model || "",
        acquired_at: item.acquired_at || "",
        serial_number: "",
        no_serial_number: false,
        acquisition_value: item.acquisition_value || undefined,
        notes: item.notes || "",
        assigned_to_user_id: undefined,
        due_at: "",
      });
    } else {
      // New item
      form.reset({
        internal_code: "",
        name: "",
        category_id: undefined,
        home_location_id: defaultLocation?.id || "",
        room_id: undefined,
        description: "",
        brand: "",
        model: "",
        acquired_at: "",
        serial_number: "",
        no_serial_number: false,
        acquisition_value: undefined,
        notes: "",
        assigned_to_user_id: undefined,
        due_at: "",
      });
    }
    setDuplicateError(null);
    // NOTE: we intentionally depend on itemId (not the whole item object) to avoid form resets on background refetches.
  }, [open, itemId, cloneMode, form, defaultLocation?.id]);

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

  // Check for duplicate code
  const checkDuplicateCode = (code: string): boolean => {
    const trimmedCode = code.trim();
    if (!trimmedCode) return false;

    // Check if any existing item has the same code (excluding current item if editing)
    return items.some((i) => i.internal_code === trimmedCode && (!isEditing || i.id !== item?.id));
  };

  const onSubmit = async (data: FormData) => {
    // Check for duplicate code before submitting
    if (checkDuplicateCode(data.internal_code)) {
      setDuplicateError("Este código já está em uso por outro item");
      return;
    }

    setDuplicateError(null);

    // Use room_id as location if selected, otherwise use home_location_id
    const finalLocationId = data.room_id || data.home_location_id;

    const payload = {
      internal_code: data.internal_code.trim(),
      name: data.name.trim(),
      category_id: data.category_id || undefined,
      home_location_id: finalLocationId || undefined,
      description: data.description?.trim() || undefined,
      brand: data.brand?.trim() || undefined,
      model: data.model?.trim() || undefined,
      acquired_at: data.acquired_at || undefined,
      serial_number: isInventoryAdmin ? data.serial_number?.trim() || undefined : undefined,
      acquisition_value: isInventoryAdmin ? data.acquisition_value || undefined : undefined,
      notes: data.notes?.trim() || undefined,
      // Assignment data (only for new items)
      assigned_to_user_id: !isEditing ? data.assigned_to_user_id || undefined : undefined,
      authorized_by_user_id: !isEditing && data.assigned_to_user_id ? profileId : undefined,
      due_at: !isEditing && data.assigned_to_user_id ? data.due_at || undefined : undefined,
    };

    try {
      if (isEditing && item) {
        await updateItemAsync({ id: item.id, ...payload } as any);
      } else {
        await createItemAsync(payload as any);
      }
      onOpenChange(false);
    } catch {
      // keep dialog open; the mutation already shows a toast with the real error
    }
  };

  // Clear duplicate error when code changes
  const handleCodeChange = (value: string, onChange: (value: string) => void) => {
    // Only allow digits
    const numericValue = value.replace(/\D/g, "");
    onChange(numericValue);

    if (duplicateError && !checkDuplicateCode(numericValue)) {
      setDuplicateError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Item" : isCloning ? "Clonar Item" : "Novo Item de Inventário"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Atualize as informações do item" 
              : isCloning 
                ? "Preencha o código interno do novo item (baseado no original)"
                : "Preencha os dados do novo item"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Row 1: Code, Name */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="internal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Interno *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="001"
                        inputMode="numeric"
                        maxLength={20}
                        {...field}
                        onChange={(e) => handleCodeChange(e.target.value, field.onChange)}
                      />
                    </FormControl>
                    <FormDescription>Somente números</FormDescription>
                    {duplicateError && (
                      <p className="text-sm font-medium text-destructive">{duplicateError}</p>
                    )}
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

            {/* Row 2: Subcategory */}
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
                      {/* Show legacy parent category if item was imported with one */}
                      {itemHasParentCategory && isEditing && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-amber-600 bg-amber-50">
                            Categoria atual (legado)
                          </div>
                          <SelectItem 
                            value={itemHasParentCategory.id} 
                            className="pl-6 text-amber-700"
                          >
                            {itemHasParentCategory.name} (categoria pai)
                          </SelectItem>
                        </>
                      )}
                      {Object.entries(groupedSubcategories).map(([parentName, subs]) => (
                        <div key={parentName}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-primary">
                            {parentName}
                          </div>
                          {subs.map((sub) => (
                            <SelectItem key={sub.id} value={sub.id} className="pl-6">
                              {sub.name}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  {itemHasParentCategory && isEditing && (
                    <p className="text-xs text-amber-600">
                      Este item foi importado com uma categoria pai. Selecione uma subcategoria para melhor organização.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Row 3: Location and Room */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="home_location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localização Base *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a sede..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rootLocations.map((loc) => (
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
                                ? "Nenhuma sala cadastrada"
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

            {/* Row 4: Description */}
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

            {/* Row 5: Brand, Model, Acquired At */}
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
                name="acquired_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Aquisição</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 6: Admin-only fields */}
            {isInventoryAdmin && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <FormField
                  control={form.control}
                  name="serial_number"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>
                          Número de Série {!watchNoSerialNumber && <span className="text-destructive">*</span>}
                        </FormLabel>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="no_serial_number"
                            checked={watchNoSerialNumber}
                            onCheckedChange={(checked) => {
                              form.setValue("no_serial_number", !!checked);
                              if (checked) {
                                form.clearErrors("serial_number");
                                form.setValue("serial_number", "");
                              }
                            }}
                          />
                          <label htmlFor="no_serial_number" className="text-sm text-muted-foreground cursor-pointer">
                            Não possui
                          </label>
                        </div>
                      </div>
                      <FormControl>
                        <Input 
                          placeholder="SN12345" 
                          disabled={watchNoSerialNumber}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="acquisition_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor de Aquisição (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0,00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Row 7: Notes */}
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

            {/* Assignment section - only for new items */}
            {!isEditing && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <UserPlus className="h-4 w-4" />
                  <span>Atribuição Inicial (opcional)</span>
                </div>
                
                <FormField
                  control={form.control}
                  name="assigned_to_user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Atribuir a</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === "__none__" ? undefined : val)} 
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um colaborador..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum (disponível)</SelectItem>
                          {profiles
                            .filter((profile) => profile.user_id)
                            .map((profile) => (
                              <SelectItem 
                                key={profile.user_id!} 
                                value={profile.user_id!}
                                textValue={profile.full_name}
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage src={profile.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {profile.full_name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{profile.full_name}</span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Se selecionado, o item será criado como emprestado
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchAssignedTo && (
                  <FormField
                    control={form.control}
                    name="due_at"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prazo de Devolução</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>Opcional</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreatingItem || isUpdatingItem}>
                {isCreatingItem || isUpdatingItem ? "Salvando..." : isEditing ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
