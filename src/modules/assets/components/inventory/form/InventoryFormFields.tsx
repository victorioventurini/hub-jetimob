import { UseFormReturn, useWatch } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { BuUserSelect } from "@/components/selects";
import { AutocompleteInput } from "../AutocompleteInput";
import type { InventoryFormData, SubcategoryItem } from "./inventoryFormSchema";

interface InventoryFormFieldsProps {
  form: UseFormReturn<InventoryFormData>;
  isEditing: boolean;
  isInventoryAdmin: boolean;
  subcategories: SubcategoryItem[];
  groupedSubcategories: Record<string, SubcategoryItem[]>;
  itemHasParentCategory: { id: string; name: string } | null;
  rootLocations: Array<{ id: string; name: string; is_default?: boolean }>;
  availableRooms: Array<{ id: string; name: string }>;
  brands: string[];
  duplicateError: string | null;
  onCodeChange: (value: string, onChange: (value: string) => void) => void;
}

export function InventoryFormFields({
  form,
  isEditing,
  isInventoryAdmin,
  groupedSubcategories,
  itemHasParentCategory,
  rootLocations,
  availableRooms,
  brands,
  duplicateError,
  onCodeChange,
}: InventoryFormFieldsProps) {
  const watchNoSerialNumber = form.watch("no_serial_number");
  const watchAssignedTo = form.watch("assigned_to_user_id");
  const selectedLocationId = useWatch({
    control: form.control,
    name: "home_location_id",
  });

  return (
    <>
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
                  onChange={(e) => onCodeChange(e.target.value, field.onChange)}
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
                {itemHasParentCategory && isEditing && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-warning bg-warning-muted">
                      Categoria atual (legado)
                    </div>
                    <SelectItem 
                      value={itemHasParentCategory.id} 
                      className="pl-6 text-warning"
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
                <FormControl>
                  <BuUserSelect
                    value={field.value}
                    onValueChange={(val) => field.onChange(val)}
                    placeholder="Selecione um colaborador..."
                    allowNone
                    noneLabel="Nenhum (disponível)"
                    className="w-full"
                    excludeExternal
                  />
                </FormControl>
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
    </>
  );
}
