import { useEffect, useState } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { AssetCategorySelect } from "../selects/AssetCategorySelect";
import type { AssetInventory } from "../../types";

const schema = z.object({
  internal_code: z
    .string()
    .min(1, "Código interno obrigatório")
    .max(20, "Código deve ter no máximo 20 caracteres")
    .regex(/^\d+$/, "Código deve conter apenas números"),
  name: z.string().min(1, "Nome obrigatório").max(200, "Nome muito longo"),
  category_id: z.string().optional(),
  home_location_id: z.string().min(1, "Localização obrigatória"),
  description: z.string().max(1000, "Descrição muito longa").optional(),
  brand: z.string().max(100, "Marca muito longa").optional(),
  model: z.string().max(100, "Modelo muito longo").optional(),
  acquired_at: z.string().optional(),
  serial_number: z.string().max(100, "Número de série muito longo").optional(),
  acquisition_value: z.coerce.number().optional(),
  notes: z.string().max(2000, "Observações muito longas").optional(),
  // Assignment fields
  assigned_to_user_id: z.string().optional(),
  due_at: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface InventoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: AssetInventory | null;
  /** When true, clones the item instead of editing (leaves code blank) */
  cloneMode?: boolean;
}

export function InventoryFormDialog({ open, onOpenChange, item, cloneMode = false }: InventoryFormDialogProps) {
  const { items, createItem, updateItem, isCreatingItem, isUpdatingItem } = useInventory();
  const { locations, defaultLocation } = useLocations();
  const { isInventoryAdmin } = useAssetPermissions();
  const { profiles } = useAssetProfiles();
  const { user } = useAuth();
  const isEditing = !!item && !cloneMode;
  const isCloning = !!item && cloneMode;
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      internal_code: "",
      name: "",
      category_id: undefined,
      home_location_id: "",
      description: "",
      brand: "",
      model: "",
      acquired_at: "",
      serial_number: "",
      acquisition_value: undefined,
      notes: "",
      assigned_to_user_id: undefined,
      due_at: "",
    },
  });

  const watchAssignedTo = form.watch("assigned_to_user_id");

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
        description: item.description || "",
        brand: item.brand || "",
        model: item.model || "",
        acquired_at: item.acquired_at || "",
        serial_number: item.serial_number || "",
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
        description: item.description || "",
        brand: item.brand || "",
        model: item.model || "",
        acquired_at: item.acquired_at || "",
        serial_number: "",
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
        description: "",
        brand: "",
        model: "",
        acquired_at: "",
        serial_number: "",
        acquisition_value: undefined,
        notes: "",
        assigned_to_user_id: undefined,
        due_at: "",
      });
    }
    setDuplicateError(null);
  }, [open, item, cloneMode, form, defaultLocation]);

  // Check for duplicate code
  const checkDuplicateCode = (code: string): boolean => {
    const trimmedCode = code.trim();
    if (!trimmedCode) return false;
    
    // Check if any existing item has the same code (excluding current item if editing)
    return items.some(
      (i) => i.internal_code === trimmedCode && (!isEditing || i.id !== item?.id)
    );
  };

  const onSubmit = (data: FormData) => {
    // Check for duplicate code before submitting
    if (checkDuplicateCode(data.internal_code)) {
      setDuplicateError("Este código já está em uso por outro item");
      return;
    }

    setDuplicateError(null);

    const payload = {
      internal_code: data.internal_code.trim(),
      name: data.name.trim(),
      category_id: data.category_id || undefined,
      home_location_id: data.home_location_id || undefined,
      description: data.description?.trim() || undefined,
      brand: data.brand?.trim() || undefined,
      model: data.model?.trim() || undefined,
      acquired_at: data.acquired_at || undefined,
      serial_number: isInventoryAdmin ? data.serial_number?.trim() || undefined : undefined,
      acquisition_value: isInventoryAdmin ? data.acquisition_value || undefined : undefined,
      notes: data.notes?.trim() || undefined,
      // Assignment data (only for new items)
      assigned_to_user_id: !isEditing ? data.assigned_to_user_id || undefined : undefined,
      authorized_by_user_id: !isEditing && data.assigned_to_user_id ? user?.id : undefined,
      due_at: !isEditing && data.assigned_to_user_id ? data.due_at || undefined : undefined,
    };

    if (isEditing && item) {
      updateItem({ id: item.id, ...payload });
    } else {
      createItem(payload as any);
    }
    onOpenChange(false);
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
            {/* Row 1: Code, Category */}
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
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <FormControl>
                      <AssetCategorySelect
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Selecione..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: Name */}
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

            {/* Row 3: Location */}
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
                      <Input placeholder="Dell" {...field} />
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
                      <FormLabel>Número de Série</FormLabel>
                      <FormControl>
                        <Input placeholder="SN12345" {...field} />
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
                          {profiles.map((profile) => (
                            <SelectItem key={profile.user_id} value={profile.user_id}>
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
